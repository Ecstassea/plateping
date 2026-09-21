import Link from "next/link";
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
            Zimbabwe plate watch for published ZRP robot / ETMS lists. Purely a notification service. We
            do not offer any way to pay a traffic fine.
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted">An Ecstassea product</p>
          <p className="text-sm">Ecstassea Investments</p>
        </div>
        <div className="text-sm">
          <p className="font-medium">Product</p>
          <div className="mt-3 flex flex-col gap-2 text-muted">
            <Link href="/#check">Check a plate</Link>
            <Link href="/#plans">Plans</Link>
            <Link href="/register">Create account</Link>
            <Link href="/join">Join a fleet</Link>
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
            Not affiliated with ZRP, TelOne, or ZINARA. PlatePing cannot take a fine payment. If
            someone asks you to pay a traffic fine online, treat it as a scam.
          </p>
          <OfficialPressLinks className="mt-3 text-sm leading-6" />
        </div>
      </div>
    </footer>
  );
}
