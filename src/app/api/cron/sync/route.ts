import { NextResponse } from "next/server";
import { syncFineLists } from "@/lib/scraper";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  const url = new URL(request.url);
  const token = url.searchParams.get("secret");

  if (!secret || (header !== `Bearer ${secret}` && token !== secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await syncFineLists();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
