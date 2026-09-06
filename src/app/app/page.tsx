import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLimits, isEntitled } from "@/lib/plans";
import { HomeClient } from "./home-client";

export default async function AppHomePage() {
  const session = await requireSession();
  if (!session) {
    return null;
  }

  const [vehicleCount, unread, lastSync, listedCount] = await Promise.all([
    prisma.vehicle.count({ where: { organizationId: session.organizationId } }),
    prisma.notification.count({
      where: { userId: session.userId, organizationId: session.organizationId, readAt: null },
    }),
    prisma.syncRun.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.vehicle.findMany({
      where: { organizationId: session.organizationId },
      select: { plateNormalized: true },
    }),
  ]);

  const fines = await prisma.fine.findMany({
    where: { plateNormalized: { in: listedCount.map((vehicle) => vehicle.plateNormalized) } },
    select: { plateNormalized: true },
  });

  return (
    <HomeClient
      name={session.user.name}
      planLabel={getLimits(session.organization).label}
      entitled={isEntitled(session.organization)}
      trialEnds={session.organization.currentPeriodEnd?.toISOString() ?? null}
      vehicleCount={vehicleCount}
      flaggedCount={new Set(fines.map((fine) => fine.plateNormalized)).size}
      unread={unread}
      lastSync={lastSync?.createdAt.toISOString() ?? null}
    />
  );
}
