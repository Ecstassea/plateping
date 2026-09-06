import Link from "next/link";
import { CheckForm } from "@/components/CheckForm";
import { InstallHint } from "@/components/InstallHint";
import { PAID_PLANS, PLANS } from "@/lib/plans";

export default function HomePage() {
  return (
    <div className="phone-shell px-5 pb-16 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1.5rem))]">
      <p className="text-xs uppercase tracking-[0.22em] text-green">Zimbabwe · robot cameras</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight">
        Put in the reg.
        <span className="block text-green">We watch the lists.</span>
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        ZRP publishes traffic-light / ETMS offender plates. PlatePing pulls those public lists, checks
        your registration, and notifies you if it comes up. We never collect fine payments.
      </p>

      <div className="card mt-8 p-4">
        <p className="mb-3 text-sm font-medium">Quick check</p>
        <CheckForm />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/register" className="btn btn-primary">
          Create account
        </Link>
        <Link href="/login" className="btn btn-ghost">
          Sign in
        </Link>
      </div>

      <InstallHint />

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold">$2 a month to start</h2>
        {PAID_PLANS.map((id) => {
          const plan = PLANS[id];
          return (
            <div key={id} className="card p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-medium">{plan.label}</p>
                <p className="text-green">${plan.priceUsd}/mo</p>
              </div>
              <p className="mt-1 text-sm text-muted">{plan.blurb}</p>
              <p className="mt-2 text-xs text-muted">
                {plan.vehicles} plates · {plan.seats} {plan.seats === 1 ? "user" : "users"}
              </p>
            </div>
          );
        })}
      </section>

      <p className="mt-8 text-xs leading-5 text-muted">
        Not affiliated with ZRP, TelOne, or ZINARA. Official lists and stations remain the source of
        truth. If someone asks you to pay a traffic fine online, treat it as a scam unless ZRP says
        otherwise.
      </p>
    </div>
  );
}
