import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword, randomInviteCode } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6).max(80),
  accountType: z.enum(["personal", "company"]),
  companyName: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Check your name, email and password." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }

  const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isCompany = parsed.data.accountType === "company";
  const orgName =
    isCompany && parsed.data.companyName
      ? parsed.data.companyName
      : `${parsed.data.name}'s plates`;

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      memberships: {
        create: {
          role: "owner",
          organization: {
            create: {
              name: orgName,
              type: isCompany ? "company" : "personal",
              inviteCode: randomInviteCode(),
              plan: isCompany ? "fleet" : "starter",
              subscriptionStatus: "trialing",
              currentPeriodEnd: trialEnd,
            },
          },
        },
      },
    },
    include: { memberships: true },
  });

  await createSession({
    userId: user.id,
    orgId: user.memberships[0].organizationId,
  });

  return NextResponse.json({ ok: true });
}
