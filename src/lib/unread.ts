import { cache } from "react";
import { prisma } from "@/lib/db";

/** Deduped so the app layout and the page inside it share one count query. */
export const countUnread = cache(async (userId: string, organizationId: string) =>
  prisma.notification.count({
    where: { userId, organizationId, readAt: { equals: null } },
  }),
);
