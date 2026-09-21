import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { messageValue, parsePaynowMessage, paynowConfig, verifyPaynowMessage } from "@/lib/paynow";
import { refreshPaynowPayment } from "@/lib/paynow-payments";

const MAX_BODY_BYTES = 16_384;

// Paynow posts here when a payment changes state. The posted status is only a
// nudge: the plan is granted from what Paynow's poll URL says, using the poll
// URL stored at checkout rather than anything in this message.
export async function POST(request: Request) {
  const config = paynowConfig();
  if (!config) {
    return NextResponse.json({ error: "Paynow is not configured." }, { status: 503 });
  }

  const body = await request.text();
  if (!body || body.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const fields = parsePaynowMessage(body);
  if (!verifyPaynowMessage(fields, config.integrationKey)) {
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  const reference = messageValue(fields, "reference") ?? "";
  const payment = reference
    ? await prisma.payment.findFirst({ where: { orderReference: reference, provider: "paynow" } })
    : null;
  if (!payment) {
    // Acknowledge so Paynow stops retrying; nothing here belongs to us.
    return NextResponse.json({ ok: false, error: "Unknown reference." });
  }

  try {
    await refreshPaynowPayment(payment, config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "poll failed";
    await prisma.payment
      .update({ where: { id: payment.id }, data: { note: `Callback received but confirmation failed: ${message}` } })
      .catch(() => undefined);
    // Ask Paynow to try again later; the customer's own status check also retries.
    return NextResponse.json({ ok: false, error: "Could not confirm with Paynow." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
