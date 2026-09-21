import { NextResponse } from "next/server";
import { z } from "zod";
import { isOwner, requireSession } from "@/lib/auth";
import { activeBillingProvider } from "@/lib/billing-provider";
import { prisma } from "@/lib/db";
import { PAID_PLAN_IDS, PLANS, isPaidPlanId, stripePriceEnv } from "@/lib/plans";
import { applyStripeSubscription, getStripe, stripeConfigured } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";
import { badRequest, readJson, rejectUntrustedOrigin, tooMany } from "@/lib/request";
import {
  initiateStandardCheckout,
  makeOrderReference,
  webhookResultUrl,
  webhookReturnUrl,
} from "@/lib/smilepay";

const schema = z.object({
  plan: z.enum(PAID_PLAN_IDS),
});

export async function POST(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  if (!isOwner(session)) {
    return NextResponse.json({ error: "Only the workspace owner can change billing." }, { status: 403 });
  }

  const checkoutLimit = await rateLimit(`billing:${session.organizationId}`, 8, 60 * 60 * 1000);
  if (!checkoutLimit.ok) {
    return tooMany(checkoutLimit);
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Choose a plan.");
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const plan = parsed.data.plan;
  const planMeta = PLANS[plan];

  // Paynow has its own route (/api/billing/paynow/checkout). Here: Smile&Pay
  // when it is the active provider, else Stripe, else demo / 503.
  const provider = activeBillingProvider();
  if (provider === "smilepay") {
    const orderReference = makeOrderReference(session.organizationId, plan);
    const amountCents = Math.round(planMeta.priceUsd * 100);

    await prisma.payment.create({
      data: {
        organizationId: session.organizationId,
        orderReference,
        plan,
        amountCents,
        currency: (process.env.SMILEPAY_CURRENCY || "USD").trim().toUpperCase() === "ZWG" ? "ZWG" : "USD",
        status: "initiated",
        provider: "smilepay",
      },
    });

    try {
      const initiated = await initiateStandardCheckout({
        orderReference,
        amountUsd: planMeta.priceUsd,
        itemName: `PlatePing ${planMeta.label}`,
        itemDescription: `${planMeta.label} plan — watching and alerts only (not a fine payment)`,
        returnUrl: webhookReturnUrl(appUrl, orderReference),
        resultUrl: webhookResultUrl(appUrl),
        email: session.user.email,
        firstName: session.user.name?.split(/\s+/)[0] || undefined,
        mobilePhoneNumber: session.user.phone || undefined,
      });

      if (!initiated.ok || !initiated.paymentUrl) {
        await prisma.payment.update({
          where: { orderReference },
          data: {
            status: "failed",
            rawStatus: initiated.responseCode || "initiate_failed",
            providerTxnRef: initiated.transactionReference,
          },
        });
        return NextResponse.json(
          { error: initiated.message || "Could not start Smile&Pay checkout." },
          { status: 502 },
        );
      }

      await prisma.payment.update({
        where: { orderReference },
        data: {
          status: "pending",
          providerTxnRef: initiated.transactionReference,
          rawStatus: initiated.responseCode || "initiated",
        },
      });

      await prisma.organization.update({
        where: { id: session.organizationId },
        data: {
          smilepayLastOrderRef: orderReference,
          billingProvider: "smilepay",
        },
      });

      return NextResponse.json({
        url: initiated.paymentUrl,
        orderReference,
        provider: "smilepay",
      });
    } catch (error) {
      await prisma.payment.update({
        where: { orderReference },
        data: { status: "failed", rawStatus: "initiate_error" },
      });
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Smile&Pay checkout failed.",
        },
        { status: 502 },
      );
    }
  }

  if (provider !== "stripe" || !stripeConfigured()) {
    if (process.env.ALLOW_DEMO_BILLING !== "true") {
      return NextResponse.json(
        { error: "Paid plans are not open yet. Your trial still works until it expires." },
        { status: 503 },
      );
    }

    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.organization.update({
      where: { id: session.organizationId },
      data: {
        plan,
        subscriptionStatus: "active",
        currentPeriodEnd: periodEnd,
        billingProvider: "demo",
      },
    });
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "Demo billing is on, so this workspace was activated locally for 30 days.",
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Billing is unavailable." }, { status: 500 });
  }

  const priceId = isPaidPlanId(plan) ? stripePriceEnv(plan) : undefined;

  if (!priceId) {
    return NextResponse.json({ error: "That plan is not configured." }, { status: 500 });
  }

  const sessionCheckout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: session.user.email,
    client_reference_id: session.organizationId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { organizationId: session.organizationId, plan },
    },
    metadata: { organizationId: session.organizationId, plan },
    success_url: `${appUrl}/app/billing?status=success`,
    cancel_url: `${appUrl}/app/billing?status=cancelled`,
    integration_identifier: `plateping-sub-${session.organizationId}-${Date.now()}`,
  });

  return NextResponse.json({ url: sessionCheckout.url, provider: "stripe" });
}

export async function DELETE(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (!isOwner(session)) {
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
