import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword, randomInviteCode, verifyPasswordAgainstDummy } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { upsertMailingList } from "@/lib/mailing-list";
import { rateLimit } from "@/lib/rate-limit";
import { recordReferral } from "@/lib/referrals";
import { badRequest, clientIp, readJson, rejectUntrustedOrigin, tooMany } from "@/lib/request";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(80),
  accountType: z.enum(["personal", "company"]),
  companyName: z.string().trim().max(80).optional(),
  marketingOptIn: z.boolean().optional(),
  termsAccepted: z.literal(true),
  /** Referral code of whoever sent them, from a ?ref= link. */
  ref: z.string().trim().max(12).optional(),
});

export async function POST(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const ipLimit = await rateLimit(`register:ip:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (!ipLimit.ok) {
    return tooMany(ipLimit);
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Use a real name, email, a password of at least 8 characters, and accept the terms.");
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    await verifyPasswordAgainstDummy(parsed.data.password);
    return badRequest("Could not create that account. Try signing in.");
  }

  const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const isCompany = parsed.data.accountType === "company";
  const orgName =
    isCompany && parsed.data.companyName
      ? parsed.data.companyName
      : `${parsed.data.name}'s plates`;

  const marketingOptIn = parsed.data.marketingOptIn !== false;

  const signupIp = clientIp(request);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      marketingOptIn,
      termsAcceptedAt: new Date(),
      signupIp,
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

  // Credit whoever referred them. A problem here must never fail the sign-up.
  if (parsed.data.ref) {
    await recordReferral({
      code: parsed.data.ref,
      referredUserId: user.id,
      referredEmail: user.email,
      signupIp,
    }).catch(() => undefined);
  }

  await upsertMailingList({
    email: user.email,
    name: user.name,
    source: "register",
    userId: user.id,
    optedIn: marketingOptIn,
  });

  await createSession({
    userId: user.id,
    orgId: user.memberships[0].organizationId,
  });

  return NextResponse.json({ ok: true });
}
