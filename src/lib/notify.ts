import { prisma } from "@/lib/db";
import { getLimits } from "@/lib/plans";
import { displayPlate, OFFICIAL_ZRP_LIST_STATEMENT } from "@/lib/plates";
import { sendPushAlert } from "@/lib/push";

export async function notifyWatchers(plateNormalized: string, offence: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { plateNormalized },
    include: {
      organization: {
        include: { memberships: { include: { user: true } } },
      },
    },
  });

  const title = `${displayPlate(plateNormalized)} is on a ZRP robot list`;
  const body = `${displayPlate(plateNormalized)} was listed for ${offence} in Harare CBD. PlatePing is a notification service only and cannot take a fine payment. ZRP asks the owner to report to National Traffic at Mkushi Academy, or call 0242 703631 / WhatsApp 0712 800 197. Official statement: ${OFFICIAL_ZRP_LIST_STATEMENT.href}. This is not a payment request. Pay only at an official police station.`;

  for (const vehicle of vehicles) {
    const limits = getLimits(vehicle.organization);
    if (!limits.alerts) {
      continue;
    }

    for (const member of vehicle.organization.memberships) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: member.userId,
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
