import { randomInt } from "node:crypto";
import { addMonths } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { isPaidPlanId, normalizePlan, type PaidPlanId } from "@/lib/plans";

/** Sign-ups needed for one free month. */
export const REFERRALS_PER_REWARD = 10;
export const REWARD_MONTHS = 1;
/** What someone on the free plan is put on when they earn a month. */
const DEFAULT_REWARD_PLAN: PaidPlanId = "starter";

/** Unambiguous characters only: these get read out and typed. */
function randomCode(length = 7) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}

export function cleanReferralCode(value: string | null | undefined) {
  const code = (value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return code.length >= 5 ? code : "";
}

/** Everyone gets a code the first time they look for one. */
export async function ensureReferralCode(userId: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (existing?.referralCode) {
    return existing.referralCode;
  }
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomCode();
    try {
      const updated = await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return updated.referralCode as string;
    } catch {
      // Collision on the unique column: try another.
    }
  }
  throw new Error("Could not allocate a referral code");
}

/**
 * Records that a new account came from someone's referral link, then pays out
 * a free month each time the referrer crosses another ten sign-ups.
 *
 * Never lets anyone refer themselves, and never counts the same new account
 * twice. Called during registration; a failure here must not stop the sign-up.
 */
export async function recordReferral(args: {
  code: string;
  referredUserId: string;
  referredEmail: string;
  signupIp?: string | null;
}) {
  const code = cleanReferralCode(args.code);
  if (!code) {
    return null;
  }

  const referrer = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
  if (!referrer || referrer.id === args.referredUserId) {
    return null;
  }

  // Cheap check first so the ordinary duplicate does not log a constraint
  // error. The unique column below is still what actually guarantees it.
  const already = await prisma.referral.findUnique({
    where: { referredUserId: args.referredUserId },
    select: { id: true },
  });
  if (already) {
    return null;
  }

  try {
    await prisma.referral.create({
      data: {
        referrerUserId: referrer.id,
        referredUserId: args.referredUserId,
        code,
        referredEmail: args.referredEmail,
        signupIp: args.signupIp ?? null,
      },
    });
  } catch {
    // This account was already attributed to someone.
    return null;
  }

  return grantDueRewards(referrer.id);
}

/**
 * Pays out every milestone the person has reached but not yet been given.
 * The unique milestone column makes this safe to run repeatedly.
 */
export async function grantDueRewards(userId: string) {
  const counted = await prisma.referral.count({ where: { referrerUserId: userId, counted: true } });
  const earned = Math.floor(counted / REFERRALS_PER_REWARD);
  if (earned === 0) {
    return { counted, granted: 0 };
  }

  const already = await prisma.referralReward.findMany({
    where: { userId },
    select: { atReferralCount: true },
  });
  const done = new Set(already.map((r) => r.atReferralCount));

  let granted = 0;
  for (let milestone = REFERRALS_PER_REWARD; milestone <= earned * REFERRALS_PER_REWARD; milestone += REFERRALS_PER_REWARD) {
    if (done.has(milestone)) {
      continue;
    }
    const ok = await grantOneMonth(userId, milestone);
    if (ok) {
      granted += 1;
    }
  }
  return { counted, granted };
}

/** Adds a month to a workspace the person owns, on top of whatever they have. */
async function grantOneMonth(userId: string, milestone: number) {
  // The free month lands on a workspace they actually control.
  const ownership = await prisma.membership.findFirst({
    where: { userId, role: "owner" },
    orderBy: { createdAt: "asc" },
    include: { organization: true },
  });

  if (!ownership) {
    // Nothing of their own to credit yet: hold it until they have one.
    try {
      await prisma.referralReward.create({
        data: { userId, atReferralCount: milestone, months: REWARD_MONTHS, pending: true },
      });
      return true;
    } catch {
      return false;
    }
  }

  const org = ownership.organization;
  const now = new Date();
  const base = org.currentPeriodEnd && org.currentPeriodEnd > now ? org.currentPeriodEnd : now;
  const periodEnd = addMonths(base, REWARD_MONTHS);
  const current = normalizePlan(org.plan);
  const plan = isPaidPlanId(current) ? current : DEFAULT_REWARD_PLAN;

  try {
    // The unique milestone is claimed first, so two requests cannot both pay out.
    await prisma.referralReward.create({
      data: {
        userId,
        organizationId: org.id,
        atReferralCount: milestone,
        months: REWARD_MONTHS,
        plan,
        periodEnd,
      },
    });
  } catch {
    return false;
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: { plan, subscriptionStatus: "active", currentPeriodEnd: periodEnd },
  });

  await prisma.notification.create({
    data: {
      userId,
      organizationId: org.id,
      title: `You earned a free month of PlatePing`,
      body: `${milestone} people have joined PlatePing through your link, so we have added ${REWARD_MONTHS} free month to ${org.name}. Your plan now runs to ${periodEnd.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Harare" })}. Keep sharing your link for another free month every ${REFERRALS_PER_REWARD} sign-ups.`,
    },
  });

  return true;
}

/** Everything the Invite screen shows. */
export async function referralSummary(userId: string) {
  const code = await ensureReferralCode(userId);
  // Pay out anything owed, for instance a reward held while they had no workspace.
  await grantDueRewards(userId).catch(() => undefined);

  const [referrals, rewards] = await Promise.all([
    prisma.referral.findMany({
      where: { referrerUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { referredEmail: true, createdAt: true, counted: true },
    }),
    prisma.referralReward.findMany({
      where: { userId },
      orderBy: { atReferralCount: "asc" },
      select: { atReferralCount: true, months: true, periodEnd: true, createdAt: true, pending: true },
    }),
  ]);

  const counted = referrals.filter((r) => r.counted).length;
  return {
    code,
    perReward: REFERRALS_PER_REWARD,
    rewardMonths: REWARD_MONTHS,
    signups: counted,
    monthsEarned: rewards.reduce((total, r) => total + r.months, 0),
    towardsNext: counted % REFERRALS_PER_REWARD,
    needed: (REFERRALS_PER_REWARD - (counted % REFERRALS_PER_REWARD)) % REFERRALS_PER_REWARD || REFERRALS_PER_REWARD,
    rewards: rewards.map((r) => ({
      atReferralCount: r.atReferralCount,
      months: r.months,
      pending: r.pending,
      periodEnd: r.periodEnd?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    signupList: referrals.map((r) => ({
      email: maskEmail(r.referredEmail),
      counted: r.counted,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/** Enough to recognise your own friend, not enough to harvest addresses. */
export function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  const head = name.slice(0, 2);
  return `${head}${"•".repeat(Math.max(1, Math.min(6, name.length - 2)))}@${domain}`;
}
