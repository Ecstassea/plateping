import { prisma } from "@/lib/db";

export type ListStats = {
  /** Distinct vehicles on the published lists we hold. */
  listedPlates: number;
  /** When the lists were last pulled successfully. */
  lastCheckedAt: Date | null;
};

/**
 * Real numbers for the landing page. Never invented: if the database cannot
 * be reached, this returns null and the page simply leaves the figure out.
 */
export async function getListStats(): Promise<ListStats | null> {
  try {
    const [rows, lastRun] = await Promise.all([
      prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT "plateNormalized")::int AS count FROM "Fine"`,
      prisma.syncRun.findFirst({
        where: { status: "ok" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);
    const listedPlates = rows[0]?.count ?? 0;
    if (listedPlates === 0) {
      return null;
    }
    return { listedPlates, lastCheckedAt: lastRun?.createdAt ?? null };
  } catch {
    return null;
  }
}
