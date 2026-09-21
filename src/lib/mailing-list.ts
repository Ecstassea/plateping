import { prisma } from "@/lib/db";

export type MailSource = "register" | "updates";

export const MARKETING_CONSENT =
  "Email me about new ZRP lists, PlatePing news, and new products we launch. We will not sell your address.";

export async function upsertMailingList(args: {
  email: string;
  name?: string | null;
  source: MailSource;
  userId?: string | null;
  optedIn: boolean;
}) {
  const email = args.email.trim().toLowerCase();
  const now = new Date();

  await prisma.mailingList.upsert({
    where: { email },
    create: {
      email,
      name: args.name?.trim() || null,
      source: args.source,
      userId: args.userId || null,
      optedIn: args.optedIn,
      unsubscribedAt: args.optedIn ? null : now,
    },
    update: {
      name: args.name?.trim() || undefined,
      userId: args.userId || undefined,
      optedIn: args.optedIn,
      unsubscribedAt: args.optedIn ? null : now,
    },
  });
}
