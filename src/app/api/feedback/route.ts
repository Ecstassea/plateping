import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmailAlert } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { badRequest, bearerMatches, clientIp, readJson, rejectUntrustedOrigin, tooMany } from "@/lib/request";

const schema = z.object({
  kind: z.enum(["feature", "bug", "other"]),
  message: z.string().trim().min(5).max(2000),
  email: z.string().trim().email().max(120).optional(),
  page: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  const originError = rejectUntrustedOrigin(request);
  if (originError) {
    return originError;
  }

  const ipLimit = await rateLimit(`feedback:ip:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (!ipLimit.ok) {
    return tooMany(ipLimit);
  }

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) {
    return badRequest("Write a few words first (5 to 2000 characters).");
  }

  // Signed-in senders are known; visitors may leave an email for a reply.
  const session = await requireSession();
  const feedback = await prisma.feedback.create({
    data: {
      userId: session?.userId ?? null,
      organizationId: session?.organizationId ?? null,
      email: session?.user.email ?? parsed.data.email ?? null,
      kind: parsed.data.kind,
      message: parsed.data.message,
      page: parsed.data.page ?? null,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  });

  const inbox = process.env.FEEDBACK_TO_EMAIL?.trim();
  if (inbox) {
    const who = feedback.email ?? "an anonymous visitor";
    await sendEmailAlert(
      inbox,
      `PlatePing ${parsed.data.kind === "bug" ? "problem report" : "feedback"} from ${who}`,
      `${parsed.data.message}\n\nKind: ${parsed.data.kind}\nPage: ${parsed.data.page ?? "unknown"}\nWorkspace: ${session?.organization.name ?? "none"}\nId: ${feedback.id}`,
    );
  }

  return NextResponse.json({ ok: true });
}

/** Export for the team: `Authorization: Bearer <MAIL_LIST_SECRET or CRON_SECRET>`. */
export async function GET(request: Request) {
  const secret = process.env.MAIL_LIST_SECRET || process.env.CRON_SECRET;
  if (!secret || !bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const items = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ count: items.length, items });
}
