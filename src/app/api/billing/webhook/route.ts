import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { applyStripeSubscription, getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const organizationId = session.client_reference_id || session.metadata?.organizationId;
      if (organizationId && session.subscription && session.customer) {
        const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
        await applyStripeSubscription({
          organizationId,
          customerId: String(session.customer),
          subscriptionId: subscription.id,
          priceId: subscription.items.data[0]?.price.id,
          status: subscription.status,
          currentPeriodEnd: subscription.items.data[0]?.current_period_end,
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const organizationId = subscription.metadata.organizationId;
      if (organizationId) {
        await applyStripeSubscription({
          organizationId,
          customerId: String(subscription.customer),
          subscriptionId: subscription.id,
          priceId: subscription.items.data[0]?.price.id,
          status: subscription.status,
          currentPeriodEnd: subscription.items.data[0]?.current_period_end,
        });
      }
      break;
    }
    default: {
      break;
    }
  }

  return NextResponse.json({ received: true });
}
