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
          <Link href="/#plans">Plans</Link>
          <Link href="/#faq">Questions</Link>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <InstallButton className="hidden whitespace-nowrap sm:inline-flex" />
          <Link className="whitespace-nowrap px-1 text-sm text-muted sm:hidden" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-ghost hidden !w-auto whitespace-nowrap px-4 text-sm sm:inline-flex" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-primary !min-h-0 !w-auto whitespace-nowrap px-3 py-2 text-sm sm:!min-h-12 sm:px-4" href="/register">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
