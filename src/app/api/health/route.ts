import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Wakes the database and reports whether it answers. The database sleeps
 * after a few idle minutes and the first query then takes seconds; pages
 * call this as soon as they open so it is awake by the time someone has
 * typed a plate. Also suitable for an uptime monitor.
 */
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, dbMs: Date.now() - started });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
