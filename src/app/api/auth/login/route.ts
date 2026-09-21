import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword, verifyPasswordAgainstDummy } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { badRequest, clientIp, readJson, rejectUntrustedOrigin, tooMany } from "@/lib/request";

const schema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1).max(80),
});

export async function POST(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const ipLimit = await rateLimit(`login:ip:${clientIp(request)}`, 8, 15 * 60 * 1000);
  if (!ipLimit.ok) {
    return tooMany(ipLimit);
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Enter a valid email and password.");
  }

  const emailLimit = await rateLimit(`login:email:${parsed.data.email}`, 5, 15 * 60 * 1000);
  if (!emailLimit.ok) {
    return tooMany(emailLimit);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { memberships: true },
  });

  const passwordOk = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : (await verifyPasswordAgainstDummy(parsed.data.password), false);

  if (!user || !passwordOk) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }

  const membership = user.memberships[0];
  if (!membership) {
    return badRequest("This account has no workspace.");
  }

  await createSession({ userId: user.id, orgId: membership.organizationId });
  return NextResponse.json({ ok: true });
}
