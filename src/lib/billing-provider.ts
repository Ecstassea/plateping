import { paynowConfigured } from "@/lib/paynow";
import { smilepayConfigured } from "@/lib/smilepay";
import { stripeConfigured } from "@/lib/stripe";

export type BillingProvider = "paynow" | "smilepay" | "stripe" | "none";

/**
 * Which gateway the Plan screen offers. Paynow first once it is configured,
 * then Smile&Pay, then Stripe. `BILLING_PROVIDER` forces one of them, which is
 * handy while a gateway is being tested or wound down.
 */
export function activeBillingProvider(): BillingProvider {
  const available: Record<Exclude<BillingProvider, "none">, boolean> = {
    paynow: paynowConfigured(),
    smilepay: smilepayConfigured(),
    stripe: stripeConfigured(),
  };

  const forced = process.env.BILLING_PROVIDER?.trim().toLowerCase();
  if (forced === "paynow" || forced === "smilepay" || forced === "stripe") {
    return available[forced] ? forced : "none";
  }

  if (available.paynow) {
    return "paynow";
  }
  if (available.smilepay) {
    return "smilepay";
  }
  if (available.stripe) {
    return "stripe";
  }
  return "none";
}
