import { NextResponse } from "next/server";
import { pruneRateLimits } from "@/lib/rate-limit";
import { remindExpiringPlans } from "@/lib/renewals";
import { bearerMatches } from "@/lib/request";
import { syncFineLists } from "@/lib/scraper";

async function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  return bearerMatches(request.headers.get("authorization"), secret);
}

export async function GET(request: Request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await syncFineLists();
  // Housekeeping that rides along with the six-hourly sync.
  const renewalNotices = await remindExpiringPlans().catch(() => 0);
  await pruneRateLimits().catch(() => undefined);
  return NextResponse.json({ ...result, renewalNotices });
}

export async function POST(request: Request) {
  return GET(request);
}
