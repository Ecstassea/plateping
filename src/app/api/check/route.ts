import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupPlate } from "@/lib/scraper";

const schema = z.object({
  plate: z.string().trim().min(4).max(16),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a registration number." }, { status: 400 });
  }

  const result = await lookupPlate(parsed.data.plate);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    plateDisplay: result.plateDisplay,
    plateNormalized: result.plateNormalized,
    listed: result.listed,
    fines: result.fines.map((fine) => ({
      id: fine.id,
      offence: fine.offence,
      location: fine.location,
      source: fine.source,
      sourceUrl: fine.sourceUrl,
      estimatedUsd: fine.estimatedUsd,
      status: fine.status,
      listedAt: fine.listedAt,
    })),
  });
}
