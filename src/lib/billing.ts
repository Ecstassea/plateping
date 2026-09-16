import { prisma } from "@/lib/db";
import { isPaidPlanId, type PaidPlanId } from "@/lib/plans";

export const PLAN_PERIOD_DAYS = 30;

export type ApplyPaidPlanArgs = {
  organizationId: string;
  plan: PaidPlanId | string;
  periodDays?: number;
  provider: "smilepay" | "stripe" | "demo";
  orderReference?: string | null;
  paymentId?: string | null;
  providerTxnRef?: string | null;
  rawStatus?: string | null;
  now?: Date;
};

export type ApplyPaidPlanResult = {
  applied: boolean;
  alreadyApplied: boolean;
  plan: PaidPlanId;
  currentPeriodEnd: Date;
  paymentId?: string;
};

/**
 * Grant a paid plan window (~30 days). Idempotent for Smile&Pay payments:
 * replaying a webhook for an already-paid orderReference does not extend the
 * period again.
 */
export async function applyPaidPlan(args: ApplyPaidPlanArgs): Promise<ApplyPaidPlanResult> {
  if (!isPaidPlanId(args.plan)) {
    throw new Error(`Invalid plan: ${args.plan}`);
  }
  const plan = args.plan;
  const now = args.now ?? new Date();
  const periodDays = args.periodDays ?? PLAN_PERIOD_DAYS;
  const currentPeriodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

  if (args.orderReference) {
    const existing = await prisma.payment.findUnique({
      where: { orderReference: args.orderReference },
    });
    if (existing?.status === "paid") {
      return {
        applied: false,
        alreadyApplied: true,
        plan: isPaidPlanId(existing.plan) ? existing.plan : plan,
        currentPeriodEnd: existing.periodEnd ?? currentPeriodEnd,
        paymentId: existing.id,
      };
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    let paymentId = args.paymentId ?? undefined;

    if (args.orderReference) {
      const payment = await tx.payment.findUnique({
        where: { orderReference: args.orderReference },
      });
      if (!payment) {
        throw new Error(`Payment not found: ${args.orderReference}`);
      }
      if (payment.status === "paid") {
        return {
          applied: false,
          alreadyApplied: true,
          plan: isPaidPlanId(payment.plan) ? payment.plan : plan,
          currentPeriodEnd: payment.periodEnd ?? currentPeriodEnd,
          paymentId: payment.id,
        };
      }
      if (payment.organizationId !== args.organizationId) {
        throw new Error("Payment organization mismatch.");
      }
      if (payment.plan !== plan) {
        throw new Error("Payment plan mismatch.");
      }

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "paid",
          paidAt: now,
          periodEnd: currentPeriodEnd,
          providerTxnRef: args.providerTxnRef ?? payment.providerTxnRef,
          rawStatus: args.rawStatus ?? "PAID",
        },
      });
      paymentId = updated.id;
    }

    await tx.organization.update({
      where: { id: args.organizationId },
      data: {
        plan,
        subscriptionStatus: "active",
        currentPeriodEnd,
        billingProvider: args.provider,
        smilepayLastOrderRef:
          args.provider === "smilepay" ? args.orderReference ?? undefined : undefined,
      },
    });

    return {
      applied: true,
      alreadyApplied: false,
      plan,
      currentPeriodEnd,
      paymentId,
    };
  });

  return result;
}

/** Mark a Smile&Pay payment failed/cancelled without touching entitlement. */
export async function markPaymentStatus(args: {
  orderReference: string;
  status: "pending" | "failed" | "cancelled" | "unknown";
  rawStatus?: string | null;
  providerTxnRef?: string | null;
}) {
  const payment = await prisma.payment.findUnique({
    where: { orderReference: args.orderReference },
  });
  if (!payment || payment.status === "paid") {
    return payment;
  }
  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: args.status,
      rawStatus: args.rawStatus ?? payment.rawStatus,
      providerTxnRef: args.providerTxnRef ?? payment.providerTxnRef,
    },
  });
}
