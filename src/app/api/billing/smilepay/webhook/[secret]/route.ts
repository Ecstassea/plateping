import { NextResponse } from "next/server";
import {
  assertWebhookSecretPath,
  clientIpAllowed,
  processSmilePayWebhook,
} from "@/lib/smilepay-webhook";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ secret: string }> };

function requestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request, context: Ctx) {
  const { secret } = await context.params;
  if (!assertWebhookSecretPath(secret)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const ip = requestIp(request);
  if (!clientIpAllowed(ip)) {
    console.error("Smile&Pay webhook blocked by IP allowlist", { ip });
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
