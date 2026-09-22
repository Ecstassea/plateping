import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { referralSummary } from "@/lib/referrals";

/** Everything the Invite screen needs: the code, the count, and the rewards. */
export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  return NextResponse.json(await referralSummary(session.userId));
}
