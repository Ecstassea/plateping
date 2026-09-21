import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { RateLimitResult } from "@/lib/rate-limit";

const MAX_JSON_BYTES = 16_384;

export async function readJson(request: Request, maxBytes = MAX_JSON_BYTES): Promise<unknown | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  const text = await request.text();
  if (!text || text.length > maxBytes) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first.slice(0, 64);
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp.slice(0, 64);
  }

  return "unknown";
}

export function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const host = request.headers.get("host");
    if (host && originUrl.host === host) {
      return true;
    }

    const appUrl = process.env.APP_URL;
    if (appUrl && originUrl.origin === new URL(appUrl).origin) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function rejectUntrustedOrigin(request: Request) {
  if (isTrustedOrigin(request)) {
    return null;
  }
  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}

export function tooMany(result: Extract<RateLimitResult, { ok: false }>) {
  return NextResponse.json(
    { error: "Too many attempts. Try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSec) },
    },
  );
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function bearerMatches(header: string | null, secret: string) {
  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  const token = header.slice("Bearer ".length);
  const expected = Buffer.from(secret);
  const provided = Buffer.from(token);
  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}
