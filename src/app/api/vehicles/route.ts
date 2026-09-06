import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLimits } from "@/lib/plans";
import { notifyWatchers } from "@/lib/notify";
import { displayPlate, isPlausiblePlate, normalizePlate, ROBOT_OFFENCE } from "@/lib/plates";
import { lookupPlate } from "@/lib/scraper";

const schema = z.object({
  plate: z.string().trim().min(4).max(16),
  label: z.string().trim().max(40).optional(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
  });

  const plates = vehicles.map((vehicle) => vehicle.plateNormalized);
  const fines = await prisma.fine.findMany({
    where: { plateNormalized: { in: plates } },
  });

  return NextResponse.json({
    vehicles: vehicles.map((vehicle) => ({
      ...vehicle,
      listed: fines.some((fine) => fine.plateNormalized === vehicle.plateNormalized),
    })),
    limits: getLimits(session.organization),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a registration number." }, { status: 400 });
  }

  const plateNormalized = normalizePlate(parsed.data.plate);
  if (!isPlausiblePlate(plateNormalized)) {
    return NextResponse.json({ error: "That registration does not look valid." }, { status: 400 });
  }

  const limits = getLimits(session.organization);
  const count = await prisma.vehicle.count({
    where: { organizationId: session.organizationId },
  });
  if (count >= limits.vehicles) {
    return NextResponse.json(
      { error: `${limits.label} covers ${limits.vehicles} plate${limits.vehicles === 1 ? "" : "s"}. Upgrade to watch more.` },
      { status: 402 },
    );
  }

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        organizationId: session.organizationId,
        plateNormalized,
        plateDisplay: displayPlate(plateNormalized),
        label: parsed.data.label || null,
      },
    });

    const check = await lookupPlate(plateNormalized);
    if (check.ok && check.listed && limits.alerts) {
      await notifyWatchers(plateNormalized, ROBOT_OFFENCE);
    }
    return NextResponse.json({
      vehicle,
      listed: check.ok ? check.listed : false,
      fines: check.ok ? check.fines : [],
    });
  } catch {
    return NextResponse.json({ error: "That plate is already on this account." }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing vehicle." }, { status: 400 });
  }

  await prisma.vehicle.deleteMany({
    where: { id, organizationId: session.organizationId },
  });
  return NextResponse.json({ ok: true });
}
