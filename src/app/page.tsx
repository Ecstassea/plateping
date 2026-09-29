import Link from "next/link";
import { CheckForm } from "@/components/CheckForm";
import { EmailCapture } from "@/components/EmailCapture";
import { FeedbackButton } from "@/components/FeedbackButton";
import { HeroPhone } from "@/components/HeroPhone";
import { InstallButton } from "@/components/InstallPrompt";
import { InstallHint } from "@/components/InstallHint";
import { SiteChrome } from "@/components/SiteChrome";
import { ZimbabweFlag } from "@/components/ZimbabweFlag";
import { getListStats } from "@/lib/list-stats";
import { COMPANY_PLANS, PERSONAL_PLANS, PLANS, formatPlanMeta, type PaidPlanId } from "@/lib/plans";
import { OFFICIAL_ZRP_LIST_STATEMENT, OFFICIAL_ZRP_SCAM_STATEMENT } from "@/lib/plates";

// The list count is real and refreshed hourly; the page itself stays static and fast.
export const revalidate = 3600;

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" strokeLinecap="round" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M4 13.5 5.6 8.8A2 2 0 0 1 7.5 7.5h9a2 2 0 0 1 1.9 1.3L20 13.5" strokeLinecap="round" />
      <rect height="5.5" rx="1.6" width="17" x="3.5" y="13" />
      <circle cx="7.5" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" strokeLinejoin="round" />
      <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

const steps = [
  {
    icon: <SearchIcon />,
    title: "Check a plate",
    body: "Type any Zimbabwe registration. We match it against the lists ZRP has published of cars caught by the robot cameras in Harare.",
  },
  {
    icon: <CarIcon />,
    title: "Watch the cars you drive",
    body: "Your own, the family's, or a whole company fleet. Every new list is checked against them for you.",
  },
  {
    icon: <BellIcon />,
    title: "Hear about it first",
    body: "A banner on your phone, a notice in the app, and an email if you want one. You then report to ZRP yourself.",
  },
] as const;

const reasons = [
  {
    title: "Lists arrive without warning",
    body: "ZRP publishes them as press statements. Nobody phones the owner, so most people only hear about it from someone else.",
  },
  {
    title: "Clear today is not clear next month",
    body: "A new list can include a plate that was clean yesterday. A single check only tells you about today.",
  },
  {
    title: "We check so you do not have to",
    body: "Every six hours we pull the published lists again and compare every plate you watch. You only hear from us when it matters.",
  },
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
    q: "How do I get a free month?",
    a: "Share your invite link, on the Plan tab once you are signed in. A free month is earned once someone you brought pays for a plan of their own: ten paying people earn one month, and one paying company earns three. Free months are added on top of whatever you already have, with no cap. Sign-ups that never pay earn nothing, so there is no point making up accounts.",
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

function PlanCards({ ids, columns, popular }: { ids: PaidPlanId[]; columns: 2 | 3; popular?: PaidPlanId }) {
  return (
    <div className={`mt-6 grid gap-4 ${columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
      {ids.map((id) => {
        const plan = PLANS[id];
        const isPopular = id === popular;
        return (
          <div key={id} className={`card flex flex-col p-5 ${isPopular ? "plan-popular" : ""}`}>
            {isPopular ? <span className="plan-badge">Most popular</span> : null}
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg font-semibold">{plan.label}</p>
              <p className="text-2xl font-semibold text-green">
                ${plan.priceUsd}
                <span className="text-xs font-normal text-muted">/month</span>
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{plan.blurb}</p>
            <p className="mt-4 text-xs text-muted">{formatPlanMeta(plan)}</p>
            <Link className={`btn mt-5 !w-full ${isPopular ? "btn-primary" : "btn-ghost"}`} href="/register">
              Start free trial
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export default async function HomePage() {
  const stats = await getListStats();
  const listed = stats ? stats.listedPlates.toLocaleString("en-GB") : null;

  return (
    <SiteChrome>
      <main>
        <section className="site-wrap grid items-center gap-10 pb-14 pt-8 md:grid-cols-[1.1fr_0.9fr] md:gap-14 md:pt-14">
          <div>
            <p className="eyebrow">Zimbabwe · ZRP robot camera lists</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Is your car on a ZRP camera list?
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted md:text-lg">
              {listed ? (
                <>
                  <span className="font-semibold text-ink">{listed} vehicles</span> are on the lists ZRP has
                  published. Type any Zimbabwe plate and find out in seconds. Free, no account.
                </>
              ) : (
                <>Type any Zimbabwe plate and find out in seconds. Free, no account.</>
              )}
            </p>

            <div className="hero-check mt-6" id="check">
              <CheckForm hero />
            </div>

            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
              <li className="trust-inline">Official ZRP lists</li>
              <li className="trust-inline">Re-checked every 6 hours</li>
              <li className="trust-inline">We never take fine payments</li>
            </ul>
          </div>
          <div className="hidden md:block">
            <HeroPhone />
          </div>
        </section>

        <section className="band py-12 md:py-16">
          <div className="site-wrap">
            <p className="eyebrow">Why watch a plate</p>
            <h2 className="section-title">Clear today does not mean clear next month.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {reasons.map((reason) => (
                <div className="card p-5" key={reason.title}>
                  <h3 className="text-lg font-semibold">{reason.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{reason.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link className="btn btn-primary !w-full sm:!w-auto" href="/register">
                Watch my plates free for 7 days
              </Link>
              <p className="text-sm text-muted">No card needed. Nothing renews by itself.</p>
            </div>
          </div>
        </section>

        <section id="how" className="site-wrap mt-16">
          <p className="eyebrow">How it works</p>
          <h2 className="section-title">Three steps, then we do the watching.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="step-icon">{step.icon}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-muted">Step {index + 1}</span>
                </div>
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
            Add every vehicle once and the whole team sees the alerts. Staff join with a link you send them; nobody
            shares a password.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="card p-5">
              <span className="step-number">1</span>
              <h3 className="mt-4 text-lg font-semibold">Register as a company</h3>
              <p className="mt-2 text-sm leading-6 text-muted">That creates your workspace and an invite link.</p>
            </div>
            <div className="card p-5">
              <span className="step-number">2</span>
              <h3 className="mt-4 text-lg font-semibold">Send the link on WhatsApp</h3>
              <p className="mt-2 text-sm leading-6 text-muted">Staff tap it, make a login, and they are in.</p>
            </div>
            <div className="card p-5">
              <span className="step-number">3</span>
              <h3 className="mt-4 text-lg font-semibold">Everyone sees the alerts</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                The same plates, the same notices, the moment a vehicle is listed. Seats follow the plan.
              </p>
            </div>
          </div>
          <Link className="btn btn-ghost mt-6 !w-auto px-5" href="/register">
            Start a company trial
          </Link>
        </section>

        <section id="plans" className="band mt-16 py-12 md:py-16">
          <div className="site-wrap">
            <p className="eyebrow">Plans</p>
            <h2 className="section-title">From $2 a month. Seven days free first.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              A plan pays for watching plates and sending alerts. It never pays a fine. Pay for one, three or
              twelve months at a time with EcoCash, OneMoney, InnBucks, ZimSwitch or card.
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <li className="trust-inline">7 days free</li>
              <li className="trust-inline">No card to start</li>
              <li className="trust-inline">Nothing renews by itself</li>
            </ul>
            <h3 className="mt-8 text-lg font-semibold">Personal</h3>
            <PlanCards ids={PERSONAL_PLANS} columns={2} popular="starter" />
            <h3 className="mt-10 text-lg font-semibold">Company</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Up to 20 plates, up to 100, or no limit.</p>
            <PlanCards ids={COMPANY_PLANS} columns={3} popular="fleet" />
            <p className="mt-6 inline-flex max-w-2xl items-start gap-2 rounded-2xl border border-green/40 bg-green/5 p-4 text-sm leading-6">
              <span aria-hidden="true">🎁</span>
              <span>
                <span className="font-medium">Bring people, pay less.</span>{" "}
                <span className="text-muted">
                  Ten friends who take a paid plan through your link earn you one free month. One company that
                  does earns you three. No limit either way. Your link is on the Plan tab once you are in.
                </span>
              </span>
            </p>
          </div>
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
            . Lists come from ZRP:{" "}
            <a className="text-green underline" href={OFFICIAL_ZRP_LIST_STATEMENT.href} rel="noreferrer" target="_blank">
              {OFFICIAL_ZRP_LIST_STATEMENT.shortLabel}
            </a>
            .
          </p>
        </section>

        <section className="site-wrap mt-16">
          <div className="final-cta">
            <div>
              <h2 className="text-2xl font-semibold md:text-3xl">Ten seconds to know where you stand.</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Free, no account, and nothing to install first.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a className="btn btn-primary !w-full sm:!w-auto" href="#check">
                Check my plate
              </a>
              <InstallButton className="!w-full sm:!w-auto" />
            </div>
          </div>
        </section>

        <section className="site-wrap mt-10 grid gap-6 md:grid-cols-2">
          <EmailCapture />
          <div className="card flex flex-col p-5">
            <div className="flex items-center gap-3">
              <ZimbabweFlag />
              <p className="font-medium">Made in Zimbabwe, for Zimbabwe</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Missing something? Tell us what would make PlatePing more useful to you. A person reads every
              message.
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
