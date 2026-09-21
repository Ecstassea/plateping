import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPlateCap, getLimits, isAtCap } from "@/lib/plans";
import { notifyWatchers } from "@/lib/notify";
import { displayPlate, isPlausiblePlate, normalizePlate, ROBOT_OFFENCE } from "@/lib/plates";
import { rateLimit } from "@/lib/rate-limit";
import { badRequest, readJson, rejectUntrustedOrigin, tooMany } from "@/lib/request";
import { lookupPlate } from "@/lib/scraper";
import { listVehicles } from "@/lib/vehicles";

const schema = z.object({
  plate: z.string().trim().min(4).max(16),
  label: z.string().trim().max(40).optional(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  return NextResponse.json({
    vehicles: await listVehicles(session.organizationId),
    limits: getLimits(session.organization),
  });
}

export async function POST(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Enter a registration number.");
  }

  const plateNormalized = normalizePlate(parsed.data.plate);
  if (!isPlausiblePlate(plateNormalized)) {
    return badRequest("That registration does not look valid.");
  }

  const limits = getLimits(session.organization);
  const count = await prisma.vehicle.count({
    where: { organizationId: session.organizationId },
  });
  if (isAtCap(count, limits.vehicles)) {
    return NextResponse.json(
      { error: `${limits.label} covers ${formatPlateCap(limits.vehicles)}. Upgrade to a larger fleet plan to watch more.` },
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
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id || id.length > 40) {
    return badRequest("Missing vehicle.");
  }

  const deleteLimit = await rateLimit(`vehicles:delete:${session.organizationId}`, 30, 60 * 60 * 1000);
  if (!deleteLimit.ok) {
    return tooMany(deleteLimit);
  }

  await prisma.vehicle.deleteMany({
    where: { id, organizationId: session.organizationId },
  });
  return NextResponse.json({ ok: true });
}
