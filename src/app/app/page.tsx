import { TabScreen } from "@/components/TabScreen";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLimits, isEntitled } from "@/lib/plans";
import { countUnread } from "@/lib/unread";
import { countFlaggedVehicles } from "@/lib/vehicles";
import { HomeClient } from "./home-client";

export default async function AppHomePage() {
  const session = await requireSession();
  if (!session) {
    return null;
  }

  // One parallel batch after the membership lookup, so the home screen costs
  // two database round trips in total.
  const [vehicleCount, flaggedCount, unread, lastSync] = await Promise.all([
    prisma.vehicle.count({ where: { organizationId: session.organizationId } }),
    countFlaggedVehicles(session.organizationId),
    countUnread(session.userId, session.organizationId),
    prisma.syncRun.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  return (
    <TabScreen>
      <HomeClient
        name={session.user.name}
        planLabel={getLimits(session.organization).label}
        entitled={isEntitled(session.organization)}
        trialEnds={session.organization.currentPeriodEnd?.toISOString() ?? null}
        vehicleCount={vehicleCount}
        flaggedCount={flaggedCount}
        unread={unread}
        lastSync={lastSync?.createdAt.toISOString() ?? null}
      />
    </TabScreen>
  );
}
