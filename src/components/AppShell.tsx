"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useTransition, type ReactNode } from "react";
import { INBOX_CHANGED_EVENT } from "@/lib/inbox";
import { BrandLockup } from "@/components/BrandLockup";
import { FeedbackButton } from "@/components/FeedbackButton";
import { InstallButton } from "@/components/InstallPrompt";
import { PushEnable, forgetPushSubscription } from "@/components/PushEnable";

type Props = {
  orgName: ReactNode;
  unread: ReactNode;
  userId: string;
  children: ReactNode;
};

const tabs = [
  { href: "/app", label: "Home" },
  { href: "/app/vehicles", label: "Plates" },
  { href: "/app/alerts", label: "Alerts" },
  { href: "/app/team", label: "Team" },
  { href: "/app/billing", label: "Plan" },
] as const;

// Named so the header and tab bar hold still while page content slides between them.
const HEADER_STYLE = { viewTransitionName: "app-header" } as const;
const TABS_STYLE = { viewTransitionName: "app-tabs" } as const;

export function AppShell({ orgName, unread, userId, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const activeIndex = tabs.findIndex((tab) => tab.href === pathname);

  // The layout already rendered the unread badge on the server, so a change
  // only needs one refresh rather than a round trip to /api/me.
  useEffect(() => {
    const onInboxChanged = () => startTransition(() => router.refresh());
    window.addEventListener(INBOX_CHANGED_EVENT, onInboxChanged);
    return () => window.removeEventListener(INBOX_CHANGED_EVENT, onInboxChanged);
  }, [router]);

  async function logout() {
    // Stop alert banners reaching this phone once its owner has signed out.
    await forgetPushSubscription();
    await fetch("/api/auth/logout", { method: "POST" });
    startTransition(() => {
      router.replace("/login");
      // Drop the signed-in screens from the client cache behind the back button.
      router.refresh();
    });
  }

  return (
    <div className="phone-shell flex min-h-dvh flex-col">
      <header
        className="flex items-center justify-between px-5 pb-3 pt-[max(1.5rem,env(safe-area-inset-top))]"
        style={HEADER_STYLE}
      >
        <div>
          <BrandLockup compact />
          <p className="mt-1 text-sm text-muted">{orgName}</p>
        </div>
        <div className="flex items-center gap-2">
          <InstallButton className="!min-h-0 px-3 py-1.5 text-xs" />
          <button className="text-sm text-muted" onClick={logout} type="button">
            Sign out
          </button>
        </div>
      </header>
      <PushEnable userId={userId} />
      <main className="flex-1 px-5 pb-28">
        {children}
        <p className="mt-8 pb-2 text-center text-[11px] leading-5 text-muted">
          <Link className="underline" href="/privacy">
            Privacy
          </Link>
          {" · "}
          <Link className="underline" href="/terms">
            Terms
          </Link>
          {" · "}
          <Link className="underline" href="/disclaimer">
            Disclaimer
          </Link>
          {" · "}
          <FeedbackButton askEmail={false} className="underline" label="Send feedback" />
        </p>
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] border-t border-line bg-bg-2/95 px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
        style={TABS_STYLE}
      >
        <div className="grid grid-cols-5 gap-1">
          {tabs.map((tab, index) => {
            const active = index === activeIndex;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch
                transitionTypes={[index < activeIndex ? "tab-back" : "tab-forward"]}
                className={`rounded-xl py-2 text-center text-xs ${active ? "bg-card text-green" : "text-muted"}`}
              >
                {tab.label}
                {tab.href === "/app/alerts" ? unread : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
