import Link from "next/link";
import { FeedbackButton } from "@/components/FeedbackButton";
import { InstallButton } from "@/components/InstallPrompt";
import { OfficialPressLinks } from "@/components/OfficialPressLinks";

export function SiteFooter() {
  return (
    <footer className="border-t border-line mt-16">
      <div className="site-wrap grid gap-8 py-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-semibold">
            Plate<span className="text-green">Ping</span>
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            Tells you when a Zimbabwe number plate appears on a published ZRP camera list. A notification service
            only. We never take fine payments.
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted">An Ecstassea product</p>
          <p className="text-sm">Ecstassea Investments</p>
        </div>
        <div className="text-sm">
          <p className="font-medium">Product</p>
          <div className="mt-3 flex flex-col items-start gap-2 text-muted">
            <Link href="/#check">Check a plate</Link>
            <Link href="/#plans">Plans</Link>
            <Link href="/register">Create account</Link>
            <Link href="/join">Join a fleet</Link>
            <InstallButton className="text-sm text-muted hover:text-ink" variant="link" />
            <FeedbackButton className="text-sm text-muted hover:text-ink" />
          </div>
        </div>
        <div className="text-sm">
          <p className="font-medium">Legal</p>
          <div className="mt-3 flex flex-col gap-2 text-muted">
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms of use</Link>
            <Link href="/disclaimer">Disclaimer</Link>
          </div>
        </div>
        <div className="text-sm">
          <p className="font-medium">Official</p>
          <p className="mt-3 leading-6 text-muted">
            Not connected to ZRP, TelOne or ZINARA. If anyone asks you to pay a traffic fine online, treat it as a
            scam.
          </p>
          <OfficialPressLinks className="mt-3 text-sm leading-6" />
        </div>
      </div>
    </footer>
  );
}
