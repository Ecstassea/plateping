import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/LegalDoc";
import { LEGAL_OPERATOR, LEGAL_PRODUCT } from "@/lib/legal";
import { OFFICIAL_ZRP_LIST_STATEMENT, OFFICIAL_ZRP_SCAM_STATEMENT } from "@/lib/plates";

export const metadata: Metadata = {
  title: "Disclaimer — PlatePing",
  description: "PlatePing is a notification service only, is not ZRP, and does not offer a way to pay a fine.",
};

export default function DisclaimerPage() {
  return (
    <LegalDoc title="Disclaimer">
      <p>
        {LEGAL_PRODUCT} is a private product of {LEGAL_OPERATOR}. Read this before you rely on a check
        or an alert.
      </p>

      <h2>Not the police</h2>
      <p>
        We are not the Zimbabwe Republic Police, TelOne, ZINARA, or any court. We do not speak for them.
        Official instructions are on ZRP’s own statements, including the{" "}
        <a href={OFFICIAL_ZRP_LIST_STATEMENT.href} rel="noreferrer" target="_blank">
          17 May 2025 list of vehicles captured at Harare robots
        </a>
        .
      </p>

      <h2>No way to pay a fine here</h2>
      <p>
        {LEGAL_PRODUCT} is purely a notification service. There is no checkout, wallet, Paynow button,
        or other channel in this product to pay a ZRP fine. If a plate is listed, we only tell you and
        point you to ZRP’s own instructions. ZRP has warned that messages asking you to pay a traffic
        fine online are scams. Pay only at an official police station.{" "}
        <a href={OFFICIAL_ZRP_SCAM_STATEMENT.href} rel="noreferrer" target="_blank">
          Read the 14 June 2025 ZRP warning
        </a>
        . Anyone who asks you to pay a ticket through PlatePing, WhatsApp, or a random link is not us
        and is not ZRP.
      </p>

      <h2>Lists can be incomplete</h2>
      <p>
        We watch published plate lists. ZRP does not publish the ticket number, the exact amount, the
        camera, or the registered owner on those lists. A “clear” result only means we do not currently
        see that registration on the public lists we pull. It is not legal advice and not proof you
        have no case.
      </p>

      <h2>Use only plates you are allowed to watch</h2>
      <p>
        Watch your own cars, or a fleet your company authorised. Using PlatePing to follow someone
        else’s car without permission is not allowed under our terms.
      </p>

      <p>
        <Link href="/terms">Terms of use</Link>
        {" · "}
        <Link href="/privacy">Privacy policy</Link>
      </p>
    </LegalDoc>
  );
}
