import { NextResponse } from "next/server";
import { isOwner, requireSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { rejectUntrustedOrigin, tooMany } from "@/lib/request";
import { syncFineLists } from "@/lib/scraper";

export async function POST(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  if (!isOwner(session)) {
    return NextResponse.json({ error: "Only the workspace owner can refresh lists." }, { status: 403 });
  }

  const syncLimit = await rateLimit(`sync:org:${session.organizationId}`, 2, 15 * 60 * 1000);
  if (!syncLimit.ok) {
    return tooMany(syncLimit);
  }
  // One refresh every few minutes is plenty, however many owners press the button.
  const globalLimit = await rateLimit("sync:global", 1, 5 * 60 * 1000);
  if (!globalLimit.ok) {
    return NextResponse.json({ error: "The lists were refreshed a moment ago. Try again in a few minutes." }, { status: 429 });
  }

  const result = await syncFineLists();
  return NextResponse.json({
    sources: result.sources.map((source) => ({
      source: source.source,
      status: source.status,
      platesFound: source.platesFound,
      newFines: source.newFines,
    })),
  });
}
