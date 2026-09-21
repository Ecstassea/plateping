import Link from "next/link";
import { CheckForm } from "@/components/CheckForm";
import { EcstasseaMark } from "@/components/EcstasseaMark";
import { EmailCapture } from "@/components/EmailCapture";
import { InstallHint } from "@/components/InstallHint";
import { SiteChrome } from "@/components/SiteChrome";
import { ZimbabweFlag } from "@/components/ZimbabweFlag";
import { COMPANY_PLANS, PERSONAL_PLANS, PLANS, formatPlanMeta, type PaidPlanId } from "@/lib/plans";
import { OFFICIAL_ZRP_LIST_STATEMENT } from "@/lib/plates";

const steps = [
  {
    title: "Check a registration",
    body: "Type a Zimbabwe plate. We match it against published ZRP robot / ETMS lists.",
  },
  {
    title: "Watch the ones you drive",
    body: "Save family or fleet plates. We pull new public lists automatically.",
  },
  {
    title: "Get told if it appears",
    body: "In-app alerts, and email if you want it. We do not offer a way to pay the fine. Report only at an official police station.",
  },
] as const;

function PlanCards({ ids, columns }: { ids: PaidPlanId[]; columns: 2 | 3 }) {
  return (
    <div className={`mt-6 grid gap-4 ${columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
      {ids.map((id) => {
        const plan = PLANS[id];
        return (
          <div key={id} className="card flex flex-col p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-medium">{plan.label}</p>
              <p className="text-green">${plan.priceUsd}/mo</p>
            </div>
            <p className="mt-2 text-sm text-muted">{plan.blurb}</p>
            <p className="mt-4 text-xs text-muted">{formatPlanMeta(plan)}</p>
            <Link className="btn btn-primary mt-5 !w-full" href="/register">
              Start {plan.label}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  return (
    <SiteChrome>
      <main>
        <section className="site-wrap grid items-start gap-8 pb-8 pt-8 md:grid-cols-2 md:gap-10 md:pt-10">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-green">
              Zimbabwe · robot cameras
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] md:text-6xl">
              Know if your plate hits a published ZRP list.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted">
              PlatePing is purely a notification service for motorists and companies. Check a
              registration free. Pay a small monthly fee to watch plates and get told if they appear on
              a published list. We do not offer any way to pay a traffic fine.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link className="btn btn-primary !w-full sm:!w-auto" href="/register">
                Create a free account
              </Link>
              <a className="btn btn-ghost !w-full sm:!w-auto" href="#check">
                Check a plate first
              </a>
            </div>
          </div>
          <div className="space-y-6">
            <div className="ecs-hero mx-auto md:ml-auto md:mr-0">
              <ZimbabweFlag animated />
              <EcstasseaMark instanceId="hero" size={88} />
            </div>
            <div id="check" className="card p-5 md:p-6">
              <p className="text-sm font-medium">Quick check</p>
              <p className="mt-1 text-sm text-muted">Try ADX 5897 to see a listed example.</p>
              <div className="mt-4">
                <CheckForm />
              </div>
              <p className="mt-4 text-xs leading-5 text-muted">
                Lists come from ZRP.{" "}
                <a
                  className="text-green underline"
                  href={OFFICIAL_ZRP_LIST_STATEMENT.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {OFFICIAL_ZRP_LIST_STATEMENT.shortLabel}
                </a>
              </p>
            </div>
          </div>
        </section>

        <section id="how" className="site-wrap mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gold">0{index + 1}</p>
              <h2 className="mt-3 text-lg font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
            </div>
          ))}
        </section>

        <section id="fleet" className="site-wrap mt-16">
          <h2 className="text-3xl font-semibold">How a company fleet joins</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            There is no shared company password. The owner invites people with a code. Staff keep their
            own logins.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gold">01</p>
              <h3 className="mt-3 text-lg font-semibold">Owner registers as Company</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                That creates a workspace and an invite code. Only the owner can see the code on the Team
                tab.
              </p>
            </div>
            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gold">02</p>
              <h3 className="mt-3 text-lg font-semibold">Staff create their own accounts</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Each person signs up with their email. Do not share the owner’s password.
              </p>
            </div>
            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gold">03</p>
              <h3 className="mt-3 text-lg font-semibold">They enter the code at Join</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                After sign-in they open Join a fleet, type the code, and see the same plates and alerts.
                Seat limits follow the Fleet plan.
              </p>
            </div>
          </div>
          <Link className="btn btn-ghost mt-6 !w-auto px-5" href="/join">
            Join a fleet
          </Link>
        </section>

        <section id="plans" className="site-wrap mt-16">
          <h2 className="text-3xl font-semibold">Plans from $2 a month</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Subscriptions are for watching plates and alerts only. PlatePing is a notification
            service — there is no way here to pay a ZRP fine. Paynow billing (when connected) is for
            the subscription, not the ticket. Until then, new accounts get a 7-day trial. Companies
            start on Fleet 20 and can move up.
          </p>
          <h3 className="mt-8 text-lg font-semibold">Personal</h3>
          <PlanCards ids={PERSONAL_PLANS} columns={2} />
          <h3 className="mt-10 text-lg font-semibold">Company</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            0–20 plates, 20–100 plates, or unlimited for large fleets.
          </p>
          <PlanCards ids={COMPANY_PLANS} columns={3} />
        </section>

        <section className="site-wrap mt-16 grid gap-6 md:grid-cols-2">
          <EmailCapture />
          <InstallHint />
        </section>
      </main>
    </SiteChrome>
  );
}
