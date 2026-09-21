import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertMailingList } from "@/lib/mailing-list";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import {
  badRequest,
  bearerMatches,
  clientIp,
  readJson,
  rejectUntrustedOrigin,
  tooMany,
} from "@/lib/request";

const subscribeSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  name: z.string().trim().max(80).optional(),
});

function canExport(request: Request) {
  const secret = process.env.MAIL_LIST_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  return bearerMatches(request.headers.get("authorization"), secret);
}

export async function POST(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const ipLimit = await rateLimit(`subscribe:ip:${clientIp(request)}`, 8, 60 * 60 * 1000);
  if (!ipLimit.ok) {
    return tooMany(ipLimit);
  }

  const parsed = subscribeSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Enter a valid email address.");
  }

  await upsertMailingList({
    email: parsed.data.email,
    name: parsed.data.name,
    source: "updates",
    optedIn: true,
  });

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  if (!canExport(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const contacts = await prisma.mailingList.findMany({
    where: { optedIn: true },
    orderBy: { createdAt: "desc" },
    select: {
      email: true,
      name: true,
      source: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ count: contacts.length, contacts });
}
