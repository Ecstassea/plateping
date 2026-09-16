import { NextResponse } from "next/server";
import {
  assertWebhookSecretPath,
  clientIpAllowed,
  processSmilePayWebhook,
} from "@/lib/smilepay-webhook";

export const runtime = "nodejs";

function requestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip");
}

async function handle(request: Request, secretFromPath?: string) {
  // If a secret path is configured, the bare /webhook URL must not accept posts.
  if (process.env.SMILEPAY_WEBHOOK_SECRET_PATH?.trim()) {
    if (!assertWebhookSecretPath(secretFromPath)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
  }

  const ip = requestIp(request);
  if (!clientIpAllowed(ip)) {
    console.error("Smile&Pay webhook blocked by IP allowlist", { ip });
    // Still 200 so scanners learn little; do not activate.
    return NextResponse.json({ received: true, blocked: true });
  }

  let payload: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      payload = JSON.parse(text) as Record<string, unknown>;
    }
  } catch {
    payload = {};
  }

  const result = await processSmilePayWebhook(payload);
  return NextResponse.json({
    received: true,
    orderReference: result.orderReference,
    reason: result.reason,
  });
}

export async function POST(request: Request) {
  return handle(request);
}
