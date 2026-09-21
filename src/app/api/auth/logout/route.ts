import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { rejectUntrustedOrigin } from "@/lib/request";

export async function POST(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  await clearSession();
  return NextResponse.json({ ok: true });
}
