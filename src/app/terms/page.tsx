import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/LegalDoc";
import { LEGAL_JURISDICTION, LEGAL_OPERATOR, LEGAL_PRODUCT } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of use — PlatePing",
  description: "Terms for using PlatePing, including accounts, fleets, alerts, and acceptable use.",
};

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of use">
      <p>
        These terms are a contract between you and {LEGAL_OPERATOR} for {LEGAL_PRODUCT} at
        plateping.vercel.app, including the home-screen app. By creating an account or using the
        service you agree to them. If you do not agree, do not use PlatePing.
      </p>

      <h2>The service</h2>
      <p>
        PlatePing is purely a notification service. You can look up a Zimbabwe registration against
        published ZRP robot / ETMS lists, watch plates you add, and receive alerts if a watched plate
        appears. We do not offer any way to pay a traffic fine. Subscriptions (when billing is live)
        pay for watching and alerts only, never for a ZRP fine or traffic deposit.
      </p>
      <p>
        We are not affiliated with ZRP, TelOne, or ZINARA. A “clear” check is not a court clearance, a
        licence disc, or proof that no offence exists.
      </p>

      <h2>Accounts</h2>
      <p>
        You must be 18 or older, give accurate details, and keep your password secret. You are
        responsible for activity on your login. We may suspend accounts that abuse the service, scrape
        us, or break these terms.
      </p>

      <h2>Plates you may watch</h2>
      <p>
        You may only add plates you own, or plates your employer or the vehicle’s owner has authorised
        you to watch (for example a company fleet). You must not use PlatePing to track other people,
        harass anyone, or build an unrelated database of registrations.
      </p>

      <h2>Company workspaces and invite codes</h2>
      <ol>
        <li>The person who creates a Company account is the workspace owner.</li>
        <li>PlatePing gives that workspace an invite code. Only the owner can see and copy it.</li>
        <li>
          Teammates create their own PlatePing login, then open Join a fleet and enter the code. They
          become members of that workspace.
        </li>
        <li>
          Members see the same watched plates and alerts as the owner. The owner is responsible for who
          they give the code to, and for staying within the plan’s plate and seat limits.
        </li>
        <li>
          If the workspace is full, or the subscription/trial is no longer entitled, new people cannot
          join until the owner upgrades or removes someone.
        </li>
      </ol>

      <h2>Alerts and lists</h2>
      <p>
        We copy public lists as they are published. Official sites can be down, republishes can lag,
        and ZRP does not publish ticket numbers or amounts on these lists. Alerts can be late, missed,
        or duplicated. Turn on phone alerts only from the home-screen app if you want lock-screen
        banners; they need your permission.
      </p>

      <h2>Plans and payment</h2>
      <p>
        Plan limits (plates and seats) are described on the site. Trials last seven days unless we say
        otherwise. When Paynow, Smile&Pay or another stated processor is connected, each successful subscription payment
        grants about 30 days of watching and alerts until you renew or cancel. Fees are for the software service, not for settling a fine. Chargebacks or unpaid
        invoices may pause watching.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>No paying or collecting traffic fines through PlatePing. The product has no fine-payment function.</li>
        <li>No pretending to be ZRP or sending payment-scam messages.</li>
        <li>No attacking, overloading, or reverse-engineering the service.</li>
        <li>No using another person’s account without permission.</li>
      </ul>

      <h2>Your responsibility and indemnity</h2>
      <p>
        You indemnify {LEGAL_OPERATOR} against claims that arise from plates you watch without
        authority, invite codes you share, teammates you add, or use of PlatePing that breaks these
        terms or the law. Company owners are responsible for their workspace.
      </p>

      <h2>Intellectual property</h2>
      <p>
        PlatePing, the site, and related marks belong to {LEGAL_OPERATOR}. You may not copy the
        product, scrape it to rebuild a competing service, or suggest we are ZRP.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided “as is”. We do not warrant that a plate is listed or clear, that an
        alert will arrive in time, or that published lists are complete. You remain responsible for
        reporting to ZRP as they instruct on their statements.
      </p>

      <h2>Liability</h2>
      <p>
        To the fullest extent allowed by {LEGAL_JURISDICTION} law, {LEGAL_OPERATOR} is not liable for
        lost profits, clamping, court outcomes, missed reporting deadlines, or indirect loss from using
        or not being able to use PlatePing. Our total liability for a claim is limited to the
        subscription fees you paid us for PlatePing in the three months before the claim, or US$20 if
        you paid nothing.
      </p>
      <p>Nothing in these terms limits liability that Zimbabwe law does not allow us to limit.</p>

      <h2>Privacy</h2>
      <p>
        Our <Link href="/privacy">Privacy policy</Link> explains what we collect. Our{" "}
        <Link href="/disclaimer">Disclaimer</Link> repeats that we are not ZRP and never take fine
        payments.
      </p>

      <h2>Law</h2>
      <p>
        These terms are governed by the laws of {LEGAL_JURISDICTION}. Courts of Zimbabwe have exclusive
        jurisdiction, except that we may seek an injunction anywhere to protect the service.
      </p>
    </LegalDoc>
  );
}
