import { prisma } from "@/lib/db";
import { getLimits } from "@/lib/plans";
import { displayPlate } from "@/lib/plates";

export async function notifyWatchers(plateNormalized: string, offence: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { plateNormalized },
    include: {
      organization: {
        include: { memberships: { include: { user: true } } },
      },
    },
  });

  const title = `${displayPlate(plateNormalized)} is on a ZRP list`;
  const body = `${displayPlate(plateNormalized)} was listed for ${offence}. This is not a payment request. Check the official ZRP contacts in the app.`;

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

      await sendEmailAlert(member.user.email, title, body);
    }
  }
}

async function sendEmailAlert(to: string, title: string, body: string) {
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
