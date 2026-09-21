import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { PLANS, isPaidPlanId, type PaidPlanId } from "@/lib/plans";

export const PLAN_PERIOD_DAYS = 30;

// Neither Zimbabwean gateway offers automatic renewals, so plans are bought for
// a period and renewed by the owner. The cron job reminds them before it ends.
export const BILLING_PERIODS = [1, 3, 12] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export function isBillingPeriod(value: number): value is BillingPeriod {
  return (BILLING_PERIODS as readonly number[]).includes(value);
}

export function periodPriceUsd(plan: PaidPlanId, months: BillingPeriod) {
  return PLANS[plan].priceUsd * months;
}

export function periodLabel(months: number) {
  return months === 1 ? "1 month" : `${months} months`;
}

/** Paynow order reference. Shows on the customer's statement, so short and readable. */
export function randomPaymentReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 10; i += 1) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return `PP-${code}`;
}

export function isPaynowReference(value: string) {
  return /^PP-[A-Z2-9]{10}$/.test(value);
}

export function addMonths(date: Date, months: number) {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export type BillingProviderName = "paynow" | "smilepay" | "stripe" | "demo";

export type ApplyPaidPlanArgs = {
  organizationId: string;
  plan: PaidPlanId | string;
  /** Length of the period in days (default 30). Ignored when `months` is given. */
  periodDays?: number;
  /** Length of the period in calendar months. */
  months?: number;
  provider: BillingProviderName;
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

function periodEndFrom(base: Date, args: ApplyPaidPlanArgs) {
  if (args.months && args.months > 0) {
    return addMonths(base, args.months);
  }
  const days = args.periodDays ?? PLAN_PERIOD_DAYS;
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Grant a paid period. The new plan applies straight away; time already paid
 * for (or trial time still running) is kept and the new period is added after
 * it, so renewing early never loses days.
 *
 * Idempotent per order reference: a webhook replay, or the customer's status
 * poll racing the webhook, credits the workspace once. The payment row is
 * claimed with a single conditional UPDATE, so only one caller proceeds.
 */
export async function applyPaidPlan(args: ApplyPaidPlanArgs): Promise<ApplyPaidPlanResult> {
  if (!isPaidPlanId(args.plan)) {
    throw new Error(`Invalid plan: ${args.plan}`);
  }
  const plan = args.plan;
  const now = args.now ?? new Date();

  if (args.orderReference) {
    const existing = await prisma.payment.findUnique({
      where: { orderReference: args.orderReference },
    });
    if (existing?.status === "paid") {
      return {
        applied: false,
        alreadyApplied: true,
        plan: isPaidPlanId(existing.plan) ? existing.plan : plan,
        currentPeriodEnd: existing.periodEnd ?? now,
        paymentId: existing.id,
      };
    }
  }

  return prisma.$transaction(async (tx) => {
    let paymentId = args.paymentId ?? undefined;

    const organization = await tx.organization.findUnique({
      where: { id: args.organizationId },
      select: { currentPeriodEnd: true },
    });
    if (!organization) {
      throw new Error("Organization not found.");
    }
    const base =
      organization.currentPeriodEnd && organization.currentPeriodEnd > now ? organization.currentPeriodEnd : now;
    const currentPeriodEnd = periodEndFrom(base, args);

    if (args.orderReference) {
      const payment = await tx.payment.findUnique({
        where: { orderReference: args.orderReference },
      });
      if (!payment) {
        throw new Error(`Payment not found: ${args.orderReference}`);
      }
      if (payment.organizationId !== args.organizationId) {
        throw new Error("Payment organization mismatch.");
      }
      if (payment.plan !== plan) {
        throw new Error("Payment plan mismatch.");
      }

      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: "paid" } },
        data: {
          status: "paid",
          paidAt: now,
          periodEnd: currentPeriodEnd,
          providerTxnRef: args.providerTxnRef ?? payment.providerTxnRef,
          rawStatus: args.rawStatus ?? "PAID",
        },
      });
      if (claimed.count === 0) {
        const settled = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
        return {
          applied: false,
          alreadyApplied: true,
          plan,
          currentPeriodEnd: settled.periodEnd ?? currentPeriodEnd,
          paymentId: settled.id,
        };
      }
      paymentId = payment.id;
    }

    await tx.organization.update({
      where: { id: args.organizationId },
      data: {
        plan,
        subscriptionStatus: "active",
        currentPeriodEnd,
        billingProvider: args.provider,
        smilepayLastOrderRef: args.provider === "smilepay" ? args.orderReference ?? undefined : undefined,
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
}

/** Record a failed, cancelled or still-pending payment without touching entitlement. */
export async function markPaymentStatus(args: {
  orderReference: string;
  status: "pending" | "failed" | "cancelled" | "unknown";
  rawStatus?: string | null;
  providerTxnRef?: string | null;
  note?: string | null;
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
      note: args.note === undefined ? payment.note : args.note,
    },
  });
}
