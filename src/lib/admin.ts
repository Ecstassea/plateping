import { prisma } from "@/lib/db";

/** People allowed into the admin screen, from ADMIN_EMAILS (comma separated). */
export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email) && adminEmails().includes(String(email).toLowerCase());
}

/** In-app notice to every admin, for things that need a person, such as a list that could not be read. */
export async function notifyAdmins(title: string, body: string) {
  const emails = adminEmails();
  if (emails.length === 0) {
    return;
  }
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  for (const user of users) {
    const organizationId = user.memberships[0]?.organizationId;
    if (!organizationId) {
      continue;
    }
    const already = await prisma.notification.findFirst({ where: { userId: user.id, title }, select: { id: true } });
    if (already) {
      continue;
    }
    await prisma.notification.create({ data: { userId: user.id, organizationId, title, body } });
  }
}

/** The signed-in admin, or null. Used by every admin route and page. */
export async function requireAdmin() {
  const { requireSession } = await import("@/lib/auth");
  const session = await requireSession();
  if (!session || !isAdminEmail(session.user.email)) {
    return null;
  }
  return session;
}
