import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPaidPlanId, stripePriceEnv } from "@/lib/plans";
import { applyStripeSubscription, getStripe, stripeConfigured } from "@/lib/stripe";

const schema = z.object({
  plan: z.enum(["starter", "family", "fleet"]),
});

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose Starter, Family, or Fleet." }, { status: 400 });
  }

  if (session.role !== "owner") {
    return NextResponse.json({ error: "Only the workspace owner can change billing." }, { status: 403 });
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  if (!stripeConfigured()) {
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.organization.update({
      where: { id: session.organizationId },
      data: {
        plan: parsed.data.plan,
        subscriptionStatus: "active",
        currentPeriodEnd: periodEnd,
      },
    });
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "Stripe is not configured yet, so this workspace was activated locally for 30 days.",
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Billing is unavailable." }, { status: 500 });
  }

  const priceId = isPaidPlanId(parsed.data.plan) ? stripePriceEnv(parsed.data.plan) : undefined;

  if (!priceId) {
    return NextResponse.json({ error: "That plan is not configured." }, { status: 500 });
  }

  const sessionCheckout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: session.user.email,
    client_reference_id: session.organizationId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { organizationId: session.organizationId, plan: parsed.data.plan },
    },
    metadata: { organizationId: session.organizationId, plan: parsed.data.plan },
    success_url: `${appUrl}/app/billing?status=success`,
    cancel_url: `${appUrl}/app/billing?status=cancelled`,
    integration_identifier: `plateping-sub-${Math.random().toString(36).slice(2, 10)}`,
  });

  return NextResponse.json({ url: sessionCheckout.url });
}

export async function DELETE() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (session.role !== "owner") {
    return NextResponse.json({ error: "Only the workspace owner can change billing." }, { status: 403 });
  }

  const stripe = getStripe();
  if (stripe && session.organization.stripeSubscriptionId) {
    await stripe.subscriptions.cancel(session.organization.stripeSubscriptionId);
  }

  await applyStripeSubscription({
    organizationId: session.organizationId,
    status: "canceled",
  });
  await prisma.organization.update({
    where: { id: session.organizationId },
    data: { plan: "free", subscriptionStatus: "canceled" },
  });

  return NextResponse.json({ ok: true });
}
