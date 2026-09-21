import type { Payment } from "@prisma/client";
import { applyPaidPlan, markPaymentStatus } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { isPaynowFailed, isPaynowPaid, pollPaynowStatus, type PaynowConfig, type PaynowStatus } from "@/lib/paynow";
import { isPaidPlanId } from "@/lib/plans";

const FINAL_STATUSES = new Set(["paid", "cancelled", "failed"]);

export function isFinalPayment(payment: Pick<Payment, "status">) {
  return FINAL_STATUSES.has(payment.status);
}

async function reload(payment: Payment) {
  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
}

/**
 * Applies what Paynow says about a payment. Safe to call from the callback and
 * from the customer's own status poll at the same time: applyPaidPlan credits
 * the workspace at most once, and never for less than the amount due.
 */
export async function settlePaynowPayment(payment: Payment, polled: PaynowStatus) {
  const rawStatus = polled.status.trim();
  const providerTxnRef = polled.paynowReference || undefined;

  if (isPaynowPaid(rawStatus)) {
    const receivedCents = Math.round(polled.amount * 100);
    if (receivedCents < payment.amountCents) {
      await markPaymentStatus({
        orderReference: payment.orderReference,
        status: "failed",
        rawStatus,
        providerTxnRef,
        note: `Paynow reports ${polled.amount.toFixed(2)} paid but ${(payment.amountCents / 100).toFixed(2)} was due. Not credited; review by hand.`,
      });
      return reload(payment);
    }
    if (!isPaidPlanId(payment.plan)) {
      await markPaymentStatus({
        orderReference: payment.orderReference,
        status: "failed",
        rawStatus,
        providerTxnRef,
        note: `Unknown plan "${payment.plan}" on a paid transaction. Not credited; review by hand.`,
      });
      return reload(payment);
    }

    await applyPaidPlan({
      organizationId: payment.organizationId,
      plan: payment.plan,
      months: Math.max(1, payment.months),
      provider: "paynow",
      orderReference: payment.orderReference,
      providerTxnRef,
      rawStatus,
    });
    return reload(payment);
  }

  if (isPaynowFailed(rawStatus)) {
    if (payment.status === "paid") {
      // A refund or dispute after the period was granted. Kept on record for a
      // person to look at; access is not pulled automatically.
      await prisma.payment.update({
        where: { id: payment.id },
        data: { rawStatus, note: `Paynow later reported "${rawStatus}" on a paid transaction. Review by hand.` },
      });
      return reload(payment);
    }
    await markPaymentStatus({
      orderReference: payment.orderReference,
      status: rawStatus.toLowerCase() === "cancelled" ? "cancelled" : "failed",
      rawStatus,
      providerTxnRef,
    });
    return reload(payment);
  }

  // Created, Sent, or anything new: still in progress.
  await markPaymentStatus({ orderReference: payment.orderReference, status: "pending", rawStatus, providerTxnRef });
  return reload(payment);
}

/** Asks Paynow for the latest status of an unfinished payment and applies it. */
export async function refreshPaynowPayment(payment: Payment, config: PaynowConfig) {
  if (isFinalPayment(payment) || !payment.pollUrl) {
    return payment;
  }
  const polled = await pollPaynowStatus(config, payment.pollUrl);
  if (polled.reference && polled.reference !== payment.orderReference) {
    throw new Error(`Paynow poll answered for ${polled.reference}, expected ${payment.orderReference}`);
  }
  return settlePaynowPayment(payment, polled);
}
