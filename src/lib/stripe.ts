import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { PAID_PLANS, planFromPriceId, stripePriceEnv } from "@/lib/plans";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return null;
  }
  return new Stripe(key);
}

export function stripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      PAID_PLANS.every((plan) => stripePriceEnv(plan)),
  );
}

export async function applyStripeSubscription(args: {
  organizationId: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  priceId?: string | null;
  status?: string | null;
  currentPeriodEnd?: number | null;
}) {
  const plan = planFromPriceId(args.priceId);
  await prisma.organization.update({
    where: { id: args.organizationId },
    data: {
      plan,
      stripeCustomerId: args.customerId ?? undefined,
      stripeSubscriptionId: args.subscriptionId ?? undefined,
      stripePriceId: args.priceId ?? undefined,
      subscriptionStatus: args.status ?? "inactive",
      currentPeriodEnd: args.currentPeriodEnd
        ? new Date(args.currentPeriodEnd * 1000)
        : undefined,
    },
  });
}
