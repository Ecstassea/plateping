import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, isOwner, randomInviteCode, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLimits, isAtCap } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import { badRequest, readJson, rejectUntrustedOrigin, tooMany } from "@/lib/request";

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
      inviteCode: isOwner(session) ? session.organization.inviteCode : null,
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
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const joinLimit = await rateLimit(`team:join:${session.userId}`, 10, 60 * 60 * 1000);
  if (!joinLimit.ok) {
    return tooMany(joinLimit);
  }

  const parsed = joinSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Enter an invite code.");
  }

  const organization = await prisma.organization.findUnique({
    where: { inviteCode: parsed.data.inviteCode.toUpperCase() },
    include: { memberships: true },
  });

  if (!organization) {
    return NextResponse.json({ error: "Invite code not found." }, { status: 404 });
  }

  const limits = getLimits(organization);
  if (isAtCap(organization.memberships.length, limits.seats)) {
    return NextResponse.json(
      { error: "This workspace is full. The owner needs a larger Fleet plan for more seats." },
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

const removeSchema = z.object({
  memberId: z.string().trim().min(8).max(40),
});

/**
 * Removes someone from the workspace. The owner can remove any member; anyone
 * can remove themselves (leave). Access ends on their next request, because
 * every request re-checks membership.
 */
export async function DELETE(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = removeSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Choose who to remove.");
  }

  const target = await prisma.membership.findFirst({
    where: { id: parsed.data.memberId, organizationId: session.organizationId },
  });
  if (!target) {
    return NextResponse.json({ error: "That person is not in this workspace." }, { status: 404 });
  }

  const leaving = target.userId === session.userId;
  if (!leaving && !isOwner(session)) {
    return NextResponse.json({ error: "Only the workspace owner can remove people." }, { status: 403 });
  }
  if (target.role === "owner") {
    // A workspace must always have an owner to pay for it and manage it.
    return NextResponse.json(
      { error: "The owner cannot be removed or leave. Contact us to hand the workspace to someone else." },
      { status: 400 },
    );
  }

  await prisma.membership.delete({ where: { id: target.id } });

  if (leaving) {
    // Move them back into a workspace they still belong to.
    const next = await prisma.membership.findFirst({
      where: { userId: session.userId },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await createSession({ userId: session.userId, orgId: next.organizationId });
    }
  }

  return NextResponse.json({ ok: true, left: leaving });
}

/** Owner only: replaces the invite code so an old, shared code stops working. */
export async function PATCH(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (!isOwner(session)) {
    return NextResponse.json({ error: "Only the workspace owner can change the invite code." }, { status: 403 });
  }

  const limit = await rateLimit(`team:rotate:${session.organizationId}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return tooMany(limit);
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const updated = await prisma.organization.update({
        where: { id: session.organizationId },
        data: { inviteCode: randomInviteCode() },
        select: { inviteCode: true },
      });
      return NextResponse.json({ ok: true, inviteCode: updated.inviteCode });
    } catch {
      // Collision with another workspace's code: try again.
    }
  }
  return NextResponse.json({ error: "Could not create a new code. Try again." }, { status: 500 });
}
