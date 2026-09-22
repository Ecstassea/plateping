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

  const [members, myWorkspaces] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: session.organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // Someone who joined a fleet still owns the workspace they registered with,
    // so they need a way back to it.
    prisma.membership.findMany({
      where: { userId: session.userId },
      include: { organization: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const limits = getLimits(session.organization);

  return (
    <TabScreen>
      <TeamClient
        organization={{
          id: session.organization.id,
          name: session.organization.name,
          inviteCode: isOwner(session) ? session.organization.inviteCode : null,
        }}
        workspaces={myWorkspaces.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          type: m.organization.type,
          role: m.role,
        }))}
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
