import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/LegalDoc";
import { LEGAL_OPERATOR, LEGAL_PRODUCT } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy policy — PlatePing",
  description: "How PlatePing collects, uses, and stores account and plate-watch data.",
};

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy policy">
      <p>
        {LEGAL_PRODUCT} is operated by {LEGAL_OPERATOR} (“we”, “us”), the data controller, in
        Zimbabwe. This policy explains what we collect when you use plateping.vercel.app, including
        the home-screen app.
      </p>

      <h2>What PlatePing is</h2>
      <p>
        PlatePing is purely a notification service. It matches Zimbabwe registrations against{" "}
        <strong>already published</strong> ZRP robot / ETMS lists and related public copies of those
        lists. We do not issue tickets, we do not offer any way to pay a traffic fine, and we are not
        the Zimbabwe Republic Police.
      </p>

      <h2>Data we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> name, email, password hash, whether you opted into product emails, and
          the time you accepted these terms.
        </li>
        <li>
          <strong>Workspace:</strong> personal or company name, plan, invite code, teammates, and the
          plates you choose to watch (registration and optional label).
        </li>
        <li>
          <strong>Alerts:</strong> in-app notifications, optional email alerts, and optional web-push
          subscriptions for a device you enable.
        </li>
        <li>
          <strong>Public list cache:</strong> plate numbers and statement details copied from published
          ZRP lists so we can check and watch them.
        </li>
        <li>
          <strong>Technical:</strong> a signed session cookie, IP-based rate limits, and basic request
          logs from our host.
        </li>
        <li>
          <strong>Mailing list:</strong> email (and name if you gave it) when you subscribe without an
          account, or when you leave the register checkbox on.
        </li>
      </ul>
      <p>We do not ask for national ID numbers, vehicle owner names, ticket numbers, or card details.</p>

      <h2>Why we use it</h2>
      <p>
        To create your login, run your workspace, check and watch plates you submit, send alerts you
        asked for, prevent abuse, bill a subscription through Paynow or Smile&Pay when connected, and (only with consent)
        email product news. Published plate lists are public information. Account data is processed so
        we can perform the service you requested, under the Cyber and Data Protection Act [Chapter
        12:07].
      </p>

      <h2>Who can see a watched plate</h2>
      <p>
        Everyone in the same workspace can see that workspace’s plates and alerts. If you join a fleet
        with an invite code, the owner and other members of that company can see plates watched there.
        Do not join a workspace unless you trust the owner.
      </p>

      <h2>Who we share with</h2>
      <p>
        We use processors to run the product: website hosting (currently Vercel), database hosting
        (currently Neon), email delivery if configured (for example Resend), and browser/OS push
        services if you turn on phone alerts. Those processors may store data outside Zimbabwe,
        including in the United States or the European Union. We do not sell your email or plate list.
        We may disclose data if Zimbabwe law requires it.
      </p>

      <h2>Cookies and the home-screen app</h2>
      <p>
        We use an essential HttpOnly session cookie so you stay signed in. We do not use advertising
        cookies. If you add PlatePing to your home screen and enable phone alerts, your device stores a
        push subscription that we keep until it expires or you remove it.
      </p>

      <h2>How long we keep data</h2>
      <p>
        Account, workspace, and watch lists stay until you delete them or we close the service. Alerts
        stay on the account until you remove the account. Mailing-list rows stay until you unsubscribe.
        Rate-limit rows are short-lived. Backups follow our host’s retention.
      </p>

      <h2>Your choices</h2>
      <p>
        You can correct your name, leave a workspace, remove watched plates, turn off marketing email,
        and disable phone alerts in the device. To access or delete your account data, email us from
        the same address as the account, subject “PlatePing data request”, to {LEGAL_OPERATOR}, Harare,
        Zimbabwe. We may need to verify it is you.
      </p>

      <h2>Children</h2>
      <p>PlatePing is for people 18 or older.</p>

      <h2>Changes</h2>
      <p>
        We may update this policy. The date at the top will change. Continued use after a change means
        you accept the new policy.
      </p>

      <p>
        Also read the <Link href="/terms">Terms of use</Link> and{" "}
        <Link href="/disclaimer">Disclaimer</Link>.
      </p>
    </LegalDoc>
  );
}
