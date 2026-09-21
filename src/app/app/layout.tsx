import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { getSession, requireSession } from "@/lib/auth";
import { countUnread } from "@/lib/unread";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Signature check only, no database. The shell below streams immediately and
  // the two details that need a query fill in behind their own boundaries, so a
  // home-screen launch paints the chrome before the first round trip finishes.
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell
      orgName={
        <Suspense fallback={<span className="inline-block h-4 w-28 animate-pulse rounded bg-line/70 align-middle" />}>
          <OrgName />
        </Suspense>
      }
      unread={
        <Suspense fallback={null}>
          <UnreadBadge />
        </Suspense>
      }
      userId={session.userId}
    >
      {children}
    </AppShell>
  );
}

async function OrgName() {
  const session = await requireSession();
  if (!session) {
    redirect("/login");
  }
  return <>{session.organization.name}</>;
}

async function UnreadBadge() {
  const session = await requireSession();
  if (!session) {
    return null;
  }
  const unread = await countUnread(session.userId, session.organizationId);
  return unread > 0 ? <span className="ml-1 text-gold">{unread}</span> : null;
}
