import { prisma } from "@/lib/db";

export type AlertView = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

/** Shared by the Alerts screen and /api/alerts so both stay in step. */
export async function listAlerts(userId: string, organizationId: string): Promise<AlertView[]> {
  const alerts = await prisma.notification.findMany({
    where: { userId, organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, body: true, createdAt: true, readAt: true },
  });

  return alerts.map((alert) => ({
    id: alert.id,
    title: alert.title,
    body: alert.body,
    createdAt: alert.createdAt.toISOString(),
    readAt: alert.readAt?.toISOString() ?? null,
  }));
}
