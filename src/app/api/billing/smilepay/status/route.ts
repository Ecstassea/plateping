import { NextResponse } from "next/server";
import { applyPaidPlan, markPaymentStatus } from "@/lib/billing";
import { isOwner, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPaidPlanId } from "@/lib/plans";
import { smilepayConfigured, statusCheck } from "@/lib/smilepay";
import { rejectUntrustedOrigin, tooMany } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const limit = await rateLimit(`smilepay-status:${session.organizationId}`, 60, 60 * 1000);
  if (!limit.ok) {
    return tooMany(limit);
  }

  const url = new URL(request.url);
  const orderReference = url.searchParams.get("orderReference")?.trim();
  if (!orderReference) {
    return NextResponse.json({ error: "Missing orderReference." }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { orderReference },
  });
  if (!payment || payment.organizationId !== session.organizationId) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }
  if (!isOwner(session)) {
    return NextResponse.json({ error: "Only the workspace owner can check billing." }, { status: 403 });
  }

  if (payment.status === "paid") {
    return NextResponse.json({
      status: "paid",
      plan: payment.plan,
      periodEnd: payment.periodEnd,
      orderReference,
    });
  }

  if (!smilepayConfigured()) {
    return NextResponse.json({
      status: payment.status,
      plan: payment.plan,
      orderReference,
      message: "Smile&Pay is not configured.",
    });
  }

  try {
    const gateway = await statusCheck(orderReference);
    if (gateway.status === "paid" && isPaidPlanId(payment.plan)) {
      const applied = await applyPaidPlan({
        organizationId: payment.organizationId,
        plan: payment.plan,
        provider: "smilepay",
        orderReference,
        providerTxnRef: gateway.transactionReference,
        rawStatus: gateway.rawStatus ?? "PAID",
      });
      return NextResponse.json({
        status: "paid",
        plan: applied.plan,
        periodEnd: applied.currentPeriodEnd,
        orderReference,
        alreadyApplied: applied.alreadyApplied,
      });
    }

    if (gateway.status === "failed" || gateway.status === "cancelled" || gateway.status === "expired") {
      await markPaymentStatus({
        orderReference,
        status: gateway.status === "expired" ? "cancelled" : gateway.status,
        rawStatus: gateway.rawStatus,
        providerTxnRef: gateway.transactionReference,
      });
    } else if (gateway.status === "pending" || gateway.status === "processing") {
      await markPaymentStatus({
        orderReference,
        status: "pending",
        rawStatus: gateway.rawStatus,
        providerTxnRef: gateway.transactionReference,
      });
    }

    return NextResponse.json({
      status: gateway.status,
      plan: payment.plan,
      orderReference,
      rawStatus: gateway.rawStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: payment.status,
        plan: payment.plan,
        orderReference,
        error: error instanceof Error ? error.message : "Status check failed.",
      },
      { status: 502 },
    );
  }
}
