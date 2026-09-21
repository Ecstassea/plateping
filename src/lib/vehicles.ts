import { prisma } from "@/lib/db";
import { formatListDate, sourceHref } from "@/lib/plates";

export type VehicleListing = {
  offence: string;
  location: string | null;
  source: string;
  sourceUrl: string | null;
  publishedOn: string | null;
};

export type VehicleView = {
  id: string;
  plateDisplay: string;
  label: string | null;
  listed: boolean;
  listings: VehicleListing[];
};

/** Shared by the Plates screen and /api/vehicles so both stay in step. */
export async function listVehicles(organizationId: string): Promise<VehicleView[]> {
  const vehicles = await prisma.vehicle.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, plateDisplay: true, plateNormalized: true, label: true },
  });

  if (vehicles.length === 0) {
    return [];
  }

  const fines = await prisma.fine.findMany({
    where: { plateNormalized: { in: vehicles.map((vehicle) => vehicle.plateNormalized) } },
  });

  return vehicles.map((vehicle) => {
    const matches = fines.filter((fine) => fine.plateNormalized === vehicle.plateNormalized);
    return {
      id: vehicle.id,
      plateDisplay: vehicle.plateDisplay,
      label: vehicle.label,
      listed: matches.length > 0,
      listings: matches.map((fine) => ({
        offence: fine.offence,
        location: fine.location,
        source: fine.source,
        sourceUrl: sourceHref(fine.source, fine.sourceUrl),
        publishedOn: formatListDate(fine.listedAt),
      })),
    };
  });
}

/** One round trip: how many of this workspace's watched plates are on any list. */
export async function countFlaggedVehicles(organizationId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(DISTINCT v."plateNormalized")::int AS count
    FROM "Vehicle" v
    INNER JOIN "Fine" f ON f."plateNormalized" = v."plateNormalized"
    WHERE v."organizationId" = ${organizationId}`;
  return rows[0]?.count ?? 0;
}
