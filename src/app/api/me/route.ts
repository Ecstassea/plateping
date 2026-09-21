import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLimits, isEntitled } from "@/lib/plans";
import { badRequest, readJson, rejectUntrustedOrigin } from "@/lib/request";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const unread = await prisma.notification.count({
    where: { userId: session.userId, organizationId: session.organizationId, readAt: { equals: null } },
  });

  const lastSync = await prisma.syncRun.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, platesFound: true, source: true, status: true },
  });

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    organization: {
      id: session.organization.id,
      name: session.organization.name,
      type: session.organization.type,
      plan: session.organization.plan,
      subscriptionStatus: session.organization.subscriptionStatus,
      currentPeriodEnd: session.organization.currentPeriodEnd,
    },
    role: session.role,
    limits: getLimits(session.organization),
    entitled: isEntitled(session.organization),
    unread,
    lastSync,
  });
}

const switchSchema = z.object({
  orgId: z.string().trim().min(8).max(40),
});

export async function POST(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = switchSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Missing workspace.");
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId: parsed.data.orgId,
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "You are not on that workspace." }, { status: 403 });
  }

  await createSession({ userId: session.userId, orgId: membership.organizationId });
  return NextResponse.json({ ok: true });
}
