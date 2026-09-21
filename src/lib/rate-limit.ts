import { prisma } from "@/lib/db";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = new Date();

  // One conditional UPDATE both checks and consumes a slot, so two requests
  // arriving together cannot both squeeze past the cap.
  const consumed = await prisma.rateLimit.updateMany({
    where: { key, resetAt: { gt: now }, hits: { lt: limit } },
    data: { hits: { increment: 1 } },
  });
  if (consumed.count > 0) {
    return { ok: true };
  }

  const existing = await prisma.rateLimit.findUnique({ where: { key } });
  if (existing && existing.resetAt > now) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000)),
    };
  }

  // No window yet, or the previous one has lapsed: open a fresh one.
  const resetAt = new Date(now.getTime() + windowMs);
  await prisma.rateLimit.upsert({
    where: { key },
    create: { key, hits: 1, resetAt },
    update: { hits: 1, resetAt },
  });
  return { ok: true };
}

/** Drops windows that have lapsed, so the table stays the size of the active set. */
export async function pruneRateLimits() {
  const result = await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
  return result.count;
}
