"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Me = {
  user: { name: string };
  organization: { name: string; plan: string; type: string };
  unread: number;
  limits: { label: string };
};

const tabs = [
  { href: "/app", label: "Home" },
  { href: "/app/vehicles", label: "Plates" },
  { href: "/app/alerts", label: "Alerts" },
  { href: "/app/team", label: "Team" },
  { href: "/app/billing", label: "Plan" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login");
          return null;
        }
        return response.json();
      })
      .then((data) => {
        if (data) {
          setMe(data as Me);
        }
      });
  }, [router, pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="phone-shell flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 pb-3 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-green">PlatePing</p>
          <p className="text-sm text-muted">{me?.organization.name ?? "Loading…"}</p>
        </div>
        <button className="text-sm text-muted" onClick={logout} type="button">
          Sign out
        </button>
      </header>
      <main className="flex-1 px-5 pb-28">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-[430px] border-t border-line bg-bg-2/95 px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="grid grid-cols-5 gap-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-xl py-2 text-center text-xs ${
                  active ? "bg-card text-green" : "text-muted"
                }`}
              >
                {tab.label}
                {tab.href === "/app/alerts" && me && me.unread > 0 ? (
                  <span className="ml-1 text-gold">{me.unread}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
