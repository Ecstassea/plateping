import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { isPaynowReference } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { paynowConfig } from "@/lib/paynow";
import { isFinalPayment, refreshPaynowPayment } from "@/lib/paynow-payments";
import { rateLimit } from "@/lib/rate-limit";
import { badRequest, tooMany } from "@/lib/request";

// The Plan screen polls this after the customer comes back from Paynow. It
// also covers the case where Paynow's callback never reached us.
export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const reference = new URL(request.url).searchParams.get("reference") ?? "";
  if (!isPaynowReference(reference)) {
    return badRequest("Missing payment.");
  }

  let payment = await prisma.payment.findFirst({
    where: { orderReference: reference, organizationId: session.organizationId, provider: "paynow" },
  });
  if (!payment) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  const config = paynowConfig();
  let confirmError: string | null = null;
  if (config && !isFinalPayment(payment)) {
    const limit = await rateLimit(`paynow:status:${payment.id}`, 90, 15 * 60 * 1000);
    if (!limit.ok) {
      return tooMany(limit);
    }
    try {
      payment = await refreshPaynowPayment(payment, config);
    } catch (error) {
      confirmError = error instanceof Error ? error.message : "Could not reach Paynow.";
    }
  }

  const organization = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { plan: true, subscriptionStatus: true, currentPeriodEnd: true },
  });

  return NextResponse.json({
    reference: payment.orderReference,
    status: payment.status,
    rawStatus: payment.rawStatus,
    plan: payment.plan,
    months: payment.months,
    amountUsd: payment.amountCents / 100,
    paidAt: payment.paidAt?.toISOString() ?? null,
    periodEnd: payment.periodEnd?.toISOString() ?? null,
    error: payment.note ?? confirmError,
    organization: organization
      ? {
          plan: organization.plan,
          subscriptionStatus: organization.subscriptionStatus,
          currentPeriodEnd: organization.currentPeriodEnd?.toISOString() ?? null,
        }
      : null,
  });
}
