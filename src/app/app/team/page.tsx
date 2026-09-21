import { TabScreen } from "@/components/TabScreen";
import { isOwner, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLimits } from "@/lib/plans";
import { TeamClient } from "./team-client";

// Rendered on the server and prefetched with the tab, so the screen is on the
// phone before it is tapped instead of loading after a second request.
export default async function TeamPage() {
  const session = await requireSession();
  if (!session) {
    return null;
  }

  const members = await prisma.membership.findMany({
    where: { organizationId: session.organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const limits = getLimits(session.organization);

  return (
    <TabScreen>
      <TeamClient
        organization={{
          name: session.organization.name,
          inviteCode: isOwner(session) ? session.organization.inviteCode : null,
        }}
        limits={{ seats: limits.seats, label: limits.label }}
        members={members.map((member) => ({
          id: member.id,
          role: member.role,
          name: member.user.name,
          email: member.user.email,
        }))}
      />
    </TabScreen>
  );
}
