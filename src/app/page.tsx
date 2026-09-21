import Link from "next/link";
import { CheckForm } from "@/components/CheckForm";
import { EcstasseaMark } from "@/components/EcstasseaMark";
import { EmailCapture } from "@/components/EmailCapture";
import { FeedbackButton } from "@/components/FeedbackButton";
import { InstallButton } from "@/components/InstallPrompt";
import { InstallHint } from "@/components/InstallHint";
import { SiteChrome } from "@/components/SiteChrome";
import { ZimbabweFlag } from "@/components/ZimbabweFlag";
import { COMPANY_PLANS, PERSONAL_PLANS, PLANS, formatPlanMeta, type PaidPlanId } from "@/lib/plans";
import { OFFICIAL_ZRP_LIST_STATEMENT, OFFICIAL_ZRP_SCAM_STATEMENT } from "@/lib/plates";

const steps = [
  {
    title: "Type a number plate",
    body: "We check it against the lists ZRP has published of cars caught by the robot cameras in Harare.",
  },
  {
    title: "Save the cars you drive",
    body: "Your own, the family's, or a whole company fleet. We keep checking every new list for you.",
  },
  {
    title: "Get told the same day",
    body: "A banner on your phone, a notice in the app, and an email if you want one. You then report to ZRP yourself.",
  },
] as const;

const trust = [
  { title: "Official lists only", body: "Every result links to the ZRP statement it came from." },
  { title: "Never a fine payment", body: "We tell you. You report and pay at a police station, never through us." },
  { title: "Built for a phone", body: "Add it to your home screen and alerts arrive like any other app." },
] as const;

const faqs = [
  {
    q: "Is PlatePing the police?",
    a: "No. PlatePing is a private notification service run by Ecstassea Investments. We read the lists the Zimbabwe Republic Police publish and tell you if a plate you watch is on one. We are not connected to ZRP, TelOne or ZINARA.",
  },
  {
    q: "Can I pay my fine here?",
    a: "No, and you never will. There is no way to pay a fine in PlatePing, by card, by mobile money or through any link we send. ZRP has warned that messages asking you to pay a traffic fine online are scams. If your plate is listed, report to ZRP National Traffic at Mkushi Academy.",
  },
  {
    q: "Where do the lists come from?",
    a: "From ZRP press statements listing vehicles captured by the electronic traffic cameras, and public copies of those lists. Every match shows the source and its date.",
  },
  {
    q: "What does it cost?",
    a: "Checking a plate is free. Watching plates and getting alerts starts at $2 a month for two plates, paid with EcoCash, OneMoney, InnBucks, ZimSwitch or card. New accounts get seven days free.",
  },
  {
    q: "Does it work on iPhone?",
    a: "Yes. On Android it installs with one tap. On iPhone, Safari adds it to the home screen in three taps; tap Add to phone anywhere on this page and we show you exactly where to press.",
  },
  {
    q: "My plate is clear. Does that mean I have no fine?",
    a: "It means the plate is not on any published list we hold right now. It is not a court clearance, and new lists appear from time to time, which is exactly why people watch their plates.",
  },
] as const;

function PlanCards({ ids, columns }: { ids: PaidPlanId[]; columns: 2 | 3 }) {
  return (
    <div className={`mt-6 grid gap-4 ${columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
      {ids.map((id) => {
        const plan = PLANS[id];
        return (
          <div key={id} className="card flex flex-col p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg font-semibold">{plan.label}</p>
              <p className="text-xl font-semibold text-green">
                ${plan.priceUsd}
                <span className="text-xs font-normal text-muted">/month</span>
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{plan.blurb}</p>
            <p className="mt-4 text-xs text-muted">{formatPlanMeta(plan)}</p>
            <Link className="btn btn-primary mt-5 !w-full" href="/register">
              Start free trial
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
        <section className="site-wrap grid items-start gap-10 pb-10 pt-10 md:grid-cols-2 md:gap-12 md:pt-16">
          <div>
            <p className="eyebrow">Zimbabwe · ZRP robot camera lists</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
              Know the moment your number plate is on a ZRP camera list.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted md:text-lg">
              PlatePing checks Zimbabwe plates against the lists ZRP publishes and tells you the same day one of
              yours appears. Check a plate free. Watch your cars from $2 a month.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-gold">
              We never take fine payments. If a plate is listed, you report to ZRP yourself.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <InstallButton className="!w-full sm:!w-auto" variant="primary" />
              <Link className="btn btn-ghost !w-full sm:!w-auto" href="/register">
                Create a free account
              </Link>
            </div>
            <p className="mt-3 text-sm text-muted">
              Or{" "}
              <a className="text-green underline" href="#check">
                check a plate first
              </a>
              , no account needed.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              {trust.map((item) => (
                <li className="trust-item" key={item.title}>
                  <span className="trust-dot" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-5">
            <div id="check" className="card p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold">Check a plate</p>
                <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">Free</span>
              </div>
              <p className="mt-1 text-sm text-muted">Try ADX 5897 to see what a listed plate looks like.</p>
              <div className="mt-4">
                <CheckForm />
              </div>
              <p className="mt-4 text-xs leading-5 text-muted">
                Results come from ZRP.{" "}
                <a className="text-green underline" href={OFFICIAL_ZRP_LIST_STATEMENT.href} rel="noreferrer" target="_blank">
                  {OFFICIAL_ZRP_LIST_STATEMENT.shortLabel}
                </a>
              </p>
            </div>
            <div className="ecs-hero mx-auto md:ml-auto md:mr-0">
              <ZimbabweFlag animated />
              <EcstasseaMark instanceId="hero" size={72} />
            </div>
          </div>
        </section>

        <section id="how" className="site-wrap mt-10">
          <p className="eyebrow">How it works</p>
          <h2 className="section-title">Three steps, then we do the watching.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="card p-5">
                <span className="step-number">{index + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="install" className="site-wrap mt-16">
          <InstallHint />
        </section>

        <section id="fleet" className="site-wrap mt-16">
          <p className="eyebrow">Companies</p>
          <h2 className="section-title">One workspace for the whole fleet.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            The owner invites staff with a code. Everyone keeps their own login and sees the same plates and
            alerts. Nobody shares a password.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="card p-5">
              <span className="step-number">1</span>
              <h3 className="mt-4 text-lg font-semibold">Register as a company</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                That creates the workspace and an invite code. Only the owner sees the code, on the Team tab.
              </p>
            </div>
            <div className="card p-5">
              <span className="step-number">2</span>
              <h3 className="mt-4 text-lg font-semibold">Staff make their own logins</h3>
              <p className="mt-2 text-sm leading-6 text-muted">Each person signs up with their own email.</p>
            </div>
            <div className="card p-5">
              <span className="step-number">3</span>
              <h3 className="mt-4 text-lg font-semibold">They enter the code</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                On the Join page. From then on they see the fleet&apos;s plates and alerts. Seats follow the plan.
              </p>
            </div>
          </div>
          <Link className="btn btn-ghost mt-6 !w-auto px-5" href="/join">
            Join a fleet with a code
          </Link>
        </section>

        <section id="plans" className="site-wrap mt-16">
          <p className="eyebrow">Plans</p>
          <h2 className="section-title">From $2 a month. Seven days free first.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            A plan pays for watching plates and sending alerts. It never pays a fine. Pay for one, three or twelve
            months at a time with EcoCash, OneMoney, InnBucks, ZimSwitch or card.
          </p>
          <h3 className="mt-8 text-lg font-semibold">Personal</h3>
          <PlanCards ids={PERSONAL_PLANS} columns={2} />
          <h3 className="mt-10 text-lg font-semibold">Company</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Up to 20 plates, up to 100, or no limit.</p>
          <PlanCards ids={COMPANY_PLANS} columns={3} />
        </section>

        <section id="faq" className="site-wrap mt-16">
          <p className="eyebrow">Questions</p>
          <h2 className="section-title">Straight answers.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {faqs.map((item) => (
              <details className="faq" key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-muted">
            ZRP&apos;s own warning:{" "}
            <a className="text-green underline" href={OFFICIAL_ZRP_SCAM_STATEMENT.href} rel="noreferrer" target="_blank">
              {OFFICIAL_ZRP_SCAM_STATEMENT.shortLabel}
            </a>
            .
          </p>
        </section>

        <section className="site-wrap mt-16 grid gap-6 md:grid-cols-2">
          <EmailCapture />
          <div className="card flex flex-col p-5">
            <p className="font-medium">Missing something?</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Tell us what would make PlatePing more useful to you. A person reads every message.
            </p>
            <div className="mt-5">
              <FeedbackButton className="btn btn-ghost !w-auto px-5" />
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
