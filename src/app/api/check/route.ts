import { z } from "zod";
import { formatListDate, sourceHref, statementDisplayTitle } from "@/lib/plates";
import { rateLimit } from "@/lib/rate-limit";
import { badRequest, clientIp, readJson, rejectUntrustedOrigin, tooMany } from "@/lib/request";
import { lookupPlate } from "@/lib/scraper";

const schema = z.object({
  plate: z.string().trim().min(4).max(16),
});

export async function POST(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const ipLimit = await rateLimit(`check:ip:${clientIp(request)}`, 30, 60 * 60 * 1000);
  if (!ipLimit.ok) {
    return tooMany(ipLimit);
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Enter a registration number.");
  }

  const result = await lookupPlate(parsed.data.plate);
  if (!result.ok) {
    return badRequest(result.error);
  }

  return Response.json({
    plateDisplay: result.plateDisplay,
    plateNormalized: result.plateNormalized,
    listed: result.listed,
    guidance: result.guidance,
    listStatus: result.listStatus.map((run) => ({
      source: run.source,
      checkedAt: run.createdAt,
      platesFound: run.platesFound,
    })),
    fines: result.fines.map((fine) => ({
      id: fine.id,
      offence: fine.offence,
      location: fine.location,
      source: fine.source,
      sourceUrl: sourceHref(fine.source, fine.sourceUrl),
      statementTitle: statementDisplayTitle(fine.source, fine.statementTitle),
      publishedOn: formatListDate(fine.listedAt),
      status: fine.status,
    })),
  });
}
