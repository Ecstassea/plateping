import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLimits } from "@/lib/plans";

const joinSchema = z.object({
  inviteCode: z.string().trim().min(4).max(16),
});

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const members = await prisma.membership.findMany({
    where: { organizationId: session.organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    organization: {
      id: session.organization.id,
      name: session.organization.name,
      type: session.organization.type,
      inviteCode: session.organization.inviteCode,
      plan: session.organization.plan,
    },
    role: session.role,
    limits: getLimits(session.organization),
    members: members.map((member) => ({
      id: member.id,
      role: member.role,
      name: member.user.name,
      email: member.user.email,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = joinSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter an invite code." }, { status: 400 });
  }

  const organization = await prisma.organization.findUnique({
    where: { inviteCode: parsed.data.inviteCode.toUpperCase() },
    include: { memberships: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Invite code not found." }, { status: 404 });
  }

  const limits = getLimits(organization);
  if (organization.memberships.length >= limits.seats) {
    return NextResponse.json(
      { error: "This workspace is full. The owner needs a Fleet plan for more seats." },
      { status: 402 },
    );
  }

  const already = organization.memberships.find((member) => member.userId === session.userId);
  if (!already) {
    await prisma.membership.create({
      data: {
        userId: session.userId,
        organizationId: organization.id,
        role: "member",
      },
    });
  }

  await createSession({ userId: session.userId, orgId: organization.id });
  return NextResponse.json({ ok: true });
}
