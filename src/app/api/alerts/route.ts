import { NextResponse } from "next/server";
import { z } from "zod";
import { listAlerts } from "@/lib/alerts";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readJson, rejectUntrustedOrigin } from "@/lib/request";

const markSchema = z.object({
  id: z.string().trim().min(8).max(40).optional(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  return NextResponse.json({ alerts: await listAlerts(session.userId, session.organizationId) });
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

  const parsed = markSchema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Could not update that alert." }, { status: 400 });
  }

  const now = new Date();
  const result = parsed.data.id
    ? await prisma.notification.updateMany({
        where: {
          id: parsed.data.id,
          userId: session.userId,
          organizationId: session.organizationId,
          readAt: { equals: null },
        },
        data: { readAt: now },
      })
    : await prisma.notification.updateMany({
        where: {
          userId: session.userId,
          organizationId: session.organizationId,
          readAt: { equals: null },
        },
        data: { readAt: now },
      });

  return NextResponse.json({ ok: true, updated: result.count });
}
