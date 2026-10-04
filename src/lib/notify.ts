import { prisma } from "@/lib/db";
import { getLimits } from "@/lib/plans";
import { displayPlate, OFFICIAL_ZRP_LIST_STATEMENT } from "@/lib/plates";
import { sendPushAlert } from "@/lib/push";

/** The ZRP statement a listing came from, quoted in the alert. */
export type ListingSource = {
  title: string;
  url: string | null;
  publishedOn: Date | null;
};

function listDate(date: Date | null) {
  return date
    ? date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Harare" })
    : null;
}

/**
 * Tells everyone watching a plate that it appears on a ZRP list. The title
 * names the list's date, so the same plate on a later list alerts again, while
 * the same list never alerts twice.
 */
export async function notifyWatchers(plateNormalized: string, listing: ListingSource) {
  const vehicles = await prisma.vehicle.findMany({
    where: { plateNormalized },
    include: {
      organization: {
        include: { memberships: { include: { user: true } } },
      },
    },
  });

  const plate = displayPlate(plateNormalized);
  const date = listDate(listing.publishedOn);
  const title = date ? `${plate} is on the ZRP list of ${date}` : `${plate} is on a ZRP camera list`;
  const link = listing.url ?? OFFICIAL_ZRP_LIST_STATEMENT.href;
  const body = `${plate} appears on a list published by ZRP${date ? ` on ${date}` : ""} of vehicles captured by the traffic cameras: ${listing.title}. ZRP asks the owner to report to the police within the time given in the statement, at National Traffic, Mkushi Academy, or by calling 0242 703631 / WhatsApp 0712 800 197. Read the statement: ${link}. PlatePing is a notification service only. This is not a payment request; pay only at an official police station.`;

  for (const vehicle of vehicles) {
    const limits = getLimits(vehicle.organization);
    if (!limits.alerts) {
      continue;
    }
    // Plates beyond the plan's cap (for instance after moving to a smaller
    // plan) are paused: the oldest plates up to the cap keep alerting.
    if (limits.vehicles !== null) {
      const allowed = await prisma.vehicle.findMany({
        where: { organizationId: vehicle.organizationId },
        orderBy: { createdAt: "asc" },
        take: limits.vehicles,
        select: { id: true },
      });
      if (!allowed.some((v) => v.id === vehicle.id)) {
        continue;
      }
    }

    for (const member of vehicle.organization.memberships) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: member.userId,
          organizationId: vehicle.organizationId,
          plateNormalized,
          title,
        },
      });
      if (existing) {
        continue;
      }

      await prisma.notification.create({
        data: {
          userId: member.userId,
          organizationId: vehicle.organizationId,
          plateNormalized,
          title,
          body,
        },
      });

      await sendPushAlert(member.userId, title, body);
      await sendEmailAlert(member.user.email, title, body);
    }
  }
}

export async function sendEmailAlert(to: string, title: string, body: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  if (!key || !from) {
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: title,
        text: body,
      }),
    });
  } catch {
    // In-app alerts still land even if email fails.
  }
}
