import type { ReactNode } from "react";
import { SiteChrome } from "@/components/SiteChrome";
import { LEGAL_EFFECTIVE, LEGAL_NOTIFICATION_ONLY } from "@/lib/legal";

export function LegalDoc({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <SiteChrome>
      <article className="legal-copy site-wrap max-w-3xl py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-green">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted">Effective {LEGAL_EFFECTIVE}</p>
        <p className="mt-4 rounded-2xl border border-line bg-card p-4 text-sm leading-6 text-ink">
          {LEGAL_NOTIFICATION_ONLY}
        </p>
        {children}
      </article>
    </SiteChrome>
  );
}
