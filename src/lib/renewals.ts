import { prisma } from "@/lib/db";
import { sendEmailAlert } from "@/lib/notify";
import { sendPushAlert } from "@/lib/push";

const DAY_MS = 24 * 60 * 60 * 1000;

function endDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Harare" });
}

/**
 * Prepaid plans do not renew themselves. Owners hear three days before a plan
 * ends and once more when it has ended, in the app, by push and by email.
 * Runs with the six-hourly cron; each notice is sent once.
 */
export async function remindExpiringPlans(now = new Date()) {
  const organizations = await prisma.organization.findMany({
    where: {
      subscriptionStatus: { in: ["active", "trialing"] },
      currentPeriodEnd: { gt: new Date(now.getTime() - 2 * DAY_MS), lte: new Date(now.getTime() + 3 * DAY_MS) },
    },
    include: {
      memberships: { where: { role: "owner" }, include: { user: { select: { id: true, email: true } } } },
    },
  });

  let sent = 0;
  for (const organization of organizations) {
    const ends = organization.currentPeriodEnd;
    if (!ends) {
      continue;
    }
    const expired = ends <= now;
    const title = expired
      ? `Your PlatePing plan for ${organization.name} has ended`
      : `Your PlatePing plan for ${organization.name} ends on ${endDate(ends)}`;
    const body = expired
      ? `Watching and alerts for ${organization.name} are paused. Open the Plan tab in PlatePing and pay for the next period (EcoCash, OneMoney, InnBucks or card) to keep getting notices when a plate is listed. This is a plan renewal for PlatePing, not a traffic fine; PlatePing never takes fine payments.`
      : `Your ${organization.name} plan ends on ${endDate(ends)}. Open the Plan tab in PlatePing and pay for the next period (EcoCash, OneMoney, InnBucks or card) so alerts carry on. This is a plan renewal for PlatePing, not a traffic fine; PlatePing never takes fine payments.`;

    for (const membership of organization.memberships) {
      const already = await prisma.notification.findFirst({
        where: { userId: membership.userId, title, createdAt: { gt: new Date(now.getTime() - 10 * DAY_MS) } },
        select: { id: true },
      });
      if (already) {
        continue;
      }

      await prisma.notification.create({
        data: { userId: membership.userId, organizationId: organization.id, title, body },
      });
      await sendPushAlert(membership.userId, title, body);
      await sendEmailAlert(membership.user.email, title, body);
      sent += 1;
    }
  }
  return sent;
}
