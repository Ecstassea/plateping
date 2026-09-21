import { NextResponse } from "next/server";
import { z } from "zod";
import { isOwner, requireSession } from "@/lib/auth";
import { isBillingPeriod, periodLabel, periodPriceUsd, randomPaymentReference } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { initiatePaynowPayment, paynowConfig } from "@/lib/paynow";
import { PAID_PLAN_IDS, PLANS } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import { badRequest, readJson, rejectUntrustedOrigin, tooMany } from "@/lib/request";

const schema = z.object({
  plan: z.enum(PAID_PLAN_IDS),
  months: z.number().int(),
});

function publicOrigin(request: Request) {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return new URL(request.url).origin;
}

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

  const config = paynowConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Paynow is not connected yet. Your trial still works until it expires." },
      { status: 503 },
    );
  }

  const limit = await rateLimit(`paynow:checkout:${session.organizationId}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return tooMany(limit);
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Choose a plan and a period.");
  }
  const { plan, months } = parsed.data;
  if (!isBillingPeriod(months)) {
    return badRequest("Choose 1, 3 or 12 months.");
  }

  const amountUsd = periodPriceUsd(plan, months);
  const origin = publicOrigin(request);

  const payment = await prisma.payment.create({
    data: {
      organizationId: session.organizationId,
      userId: session.userId,
      orderReference: randomPaymentReference(),
      plan,
      months,
      amountCents: Math.round(amountUsd * 100),
      currency: "USD",
      status: "initiated",
      provider: "paynow",
    },
  });

  // While the integration is in test mode Paynow only accepts the merchant's
  // own address as the payer; once live the customer's address goes through.
  const authEmail = config.testMode && config.merchantEmail ? config.merchantEmail : session.user.email;

  const initiation = await initiatePaynowPayment(config, {
    reference: payment.orderReference,
    amountUsd,
    description: `PlatePing ${PLANS[plan].label}, ${periodLabel(months)} (watching and alerts, not a fine)`,
    returnUrl: `${origin}/app/billing?paynow=${payment.orderReference}`,
    resultUrl: `${origin}/api/billing/paynow/result`,
    authEmail,
  });

  if (!initiation.ok) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "failed", rawStatus: "initiate_failed", note: initiation.error },
    });
    return NextResponse.json({ error: `Paynow could not start the payment. ${initiation.error}` }, { status: 502 });
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "pending", rawStatus: "initiated", pollUrl: initiation.pollUrl },
  });
  await prisma.organization.update({
    where: { id: session.organizationId },
    data: { billingProvider: "paynow" },
  });

  return NextResponse.json({ url: initiation.browserUrl, reference: payment.orderReference, provider: "paynow" });
}
