import { NextResponse } from "next/server";
import { createSession, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLimits, isEntitled } from "@/lib/plans";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const unread = await prisma.notification.count({
    where: { userId: session.userId, organizationId: session.organizationId, readAt: null },
  });

  const lastSync = await prisma.syncRun.findFirst({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    organization: session.organization,
    role: session.role,
    limits: getLimits(session.organization),
    entitled: isEntitled(session.organization),
    unread,
    lastSync,
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json()) as { orgId?: string };
  if (!body.orgId) {
    return NextResponse.json({ error: "Missing workspace." }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId: body.orgId,
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "You are not on that workspace." }, { status: 403 });
  }

  await createSession({ userId: session.userId, orgId: membership.organizationId });
  return NextResponse.json({ ok: true });
}
