import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { syncFineLists } from "@/lib/scraper";

export async function POST() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const result = await syncFineLists();
  return NextResponse.json(result);
}
