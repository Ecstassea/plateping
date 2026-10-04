import { prisma } from "@/lib/db";
import { ZRP_GUIDANCE, displayPlate, isPlausiblePlate, normalizePlate } from "@/lib/plates";
import { syncOfficialStatements } from "@/lib/zrp-lists";

/**
 * Pulls ZRP's published vehicle lists. ZRP's own statements are the only
 * source: a third-party copy used earlier did not match them and its rows are
 * kept as "unverified", never shown or alerted on.
 *
 * Every run is recorded honestly. A run that could not reach ZRP is an error
 * with the reason, never "ok, 0 plates".
 */
export async function syncFineLists() {
  const official = await syncOfficialStatements();
  await prisma.syncRun.create({
    data: {
      source: official.source,
      status: official.status,
      platesFound: official.platesFound,
      newFines: official.newFines,
      error: official.error ?? (official.needsReview ? `${official.needsReview} list(s) need importing by hand` : null),
    },
  });
  return { sources: [official] };
}

export async function lookupPlate(rawPlate: string) {
  const plateNormalized = normalizePlate(rawPlate);
  if (!isPlausiblePlate(plateNormalized)) {
    return { ok: false as const, error: "Enter a valid Zimbabwe registration, e.g. ADX 5897." };
  }

  const [fines, listStatus] = await Promise.all([
    prisma.fine.findMany({
      where: { plateNormalized, status: "listed" },
      orderBy: [{ listedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.syncRun.findMany({
      where: { status: "ok", source: "zrp.gov.zw" },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { source: true, createdAt: true, platesFound: true },
    }),
  ]);

  return {
    ok: true as const,
    plateNormalized,
    plateDisplay: displayPlate(plateNormalized),
    listed: fines.length > 0,
    fines,
    guidance: ZRP_GUIDANCE,
    listStatus,
  };
}
