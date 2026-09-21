import Link from "next/link";
import { BrandLockup } from "@/components/BrandLockup";
import { InstallButton } from "@/components/InstallPrompt";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-bg/80 backdrop-blur">
      <div className="site-wrap flex items-center justify-between gap-4 py-4">
        <BrandLockup href="/" />
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link href="/#check">Check a plate</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#fleet">Fleets</Link>
          <Link href="/#plans">Plans</Link>
        </nav>
        <div className="flex items-center gap-2">
          <InstallButton className="hidden sm:inline-flex" />
          <Link className="btn btn-ghost !w-auto px-4 text-sm" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-primary !w-auto px-4 text-sm" href="/register">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
