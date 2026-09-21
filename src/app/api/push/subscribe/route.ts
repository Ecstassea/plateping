import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publicVapidKey } from "@/lib/push";
import { rateLimit } from "@/lib/rate-limit";
import { badRequest, readJson, rejectUntrustedOrigin, tooMany } from "@/lib/request";

const schema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({
    p256dh: z.string().min(10).max(200),
    auth: z.string().min(8).max(200),
  }),
});

const forgetSchema = z.object({
  endpoint: z.string().url().max(2048),
});

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  return NextResponse.json({
    publicKey: publicVapidKey(),
    enabled: Boolean(publicVapidKey()),
  });
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

  const limit = await rateLimit(`push:${session.userId}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return tooMany(limit);
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Could not save this device for alerts.");
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userId: session.userId,
    },
    update: {
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userId: session.userId,
    },
  });

  return NextResponse.json({ ok: true });
}

/** Sign-out on a shared phone: detach this device from the account. */
export async function DELETE(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = forgetSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Missing device.");
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: session.userId },
  });
  return NextResponse.json({ ok: true });
}
