/**
 * Answers one question: has Paynow granted this integration live status?
 *
 *   npm run paynow:live?
 *
 * Test mode refuses any payer address that is not the merchant's own, with a
 * specific message. Live mode accepts it. Nothing is charged either way: the
 * transaction is created and left unpaid.
 */
import { initiatePaynowPayment, paynowConfig } from "../src/lib/paynow";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Missing file is fine.
  }
}

const config = paynowConfig();
if (!config) {
  console.error("\n✗ No Paynow credentials in .env.local.\n");
  process.exit(1);
}

const appUrl = (process.env.APP_URL?.trim() || "https://plateping.vercel.app").replace(/\/$/, "");
const result = await initiatePaynowPayment(config, {
  reference: `PP-PROBE-${Date.now().toString(36).toUpperCase()}`,
  amountUsd: 1,
  description: "PlatePing live-status probe (not charged)",
  returnUrl: `${appUrl}/app/billing`,
  resultUrl: `${appUrl}/api/billing/paynow/result`,
  // Deliberately not the merchant address.
  authEmail: "live-status-probe@example.com",
});

console.log(`Integration ${config.integrationId} · app setting: ${config.testMode ? "PAYNOW_TEST_MODE=true" : "test mode off"}`);

if (!result.ok && /test mode/i.test(result.error)) {
  console.log("\n● Paynow says: STILL IN TEST MODE.");
  console.log("  Only your own Paynow account email can pay, and no money moves.");
  console.log("  Paynow's words:", result.error);
  console.log("\n  To go live: Paynow dashboard → Integration Keys → request live status.");
} else if (result.ok) {
  console.log("\n● Paynow says: LIVE. It accepted a payment from another person's email address.");
  console.log("  Real money would move. Make sure PAYNOW_TEST_MODE is cleared in Vercel.");
} else {
  console.log("\n● Could not tell. Paynow said:", result.error);
}
