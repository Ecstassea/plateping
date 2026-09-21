/**
 * Proves the Paynow credentials work before anything is deployed.
 *
 *   npm run paynow:check                     # initiate a $1.00 test transaction and read its status once
 *   npm run paynow:check -- --wait           # keep polling for 5 minutes so you can fake the payment in a browser
 *   npm run paynow:check -- --poll <pollUrl> # watch a transaction created earlier instead of making a new one
 *
 * Reads PAYNOW_* and APP_URL from .env.local / .env. Talks to Paynow only:
 * nothing is written to the database and no plan is credited. In test mode
 * no money moves.
 */
import { initiatePaynowPayment, paynowConfig, pollPaynowStatus } from "../src/lib/paynow";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Missing file is fine.
  }
}

const wait = process.argv.includes("--wait");
const amountArg = process.argv.find((arg) => /^\d+(\.\d{1,2})?$/.test(arg));
const amountUsd = Number(amountArg ?? "1.00");

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

const config = paynowConfig();
if (!config) {
  fail("PAYNOW_INTEGRATION_ID and PAYNOW_INTEGRATION_KEY are not both set.");
}
if (!config.merchantEmail) {
  fail("PAYNOW_MERCHANT_EMAIL is not set. In test mode Paynow only accepts the merchant's own email as the payer.");
}

const appUrl = (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
const pollArgIndex = process.argv.indexOf("--poll");
const existingPollUrl = pollArgIndex !== -1 ? process.argv[pollArgIndex + 1] : undefined;

console.log(`Paynow integration ${config.integrationId} · ${config.testMode ? "test mode" : "LIVE mode"} · payer ${config.merchantEmail}`);

let pollUrl: string;
if (existingPollUrl) {
  pollUrl = existingPollUrl;
  console.log(`Watching an existing transaction: ${pollUrl}`);
} else {
  const reference = `PP-CHECK-${Date.now().toString(36).toUpperCase()}`;
  console.log(`Initiating ${amountUsd.toFixed(2)} USD as ${reference} ...`);

  const initiation = await initiatePaynowPayment(config, {
    reference,
    amountUsd,
    description: "PlatePing credentials check (not a fine, not a plan)",
    returnUrl: `${appUrl}/app/billing`,
    resultUrl: `${appUrl}/api/billing/paynow/result`,
    authEmail: config.merchantEmail,
  });

  if (!initiation.ok) {
    fail(
      `Paynow refused the transaction: ${initiation.error}\n` +
        "  • \"Invalid Id\" or a hash error means the Integration ID or Key is wrong or from a different integration.\n" +
        "  • An email error means PAYNOW_MERCHANT_EMAIL is not the account that owns the integration.",
    );
  }

  console.log("\n✓ Paynow accepted the request and its signed reply verified.");
  console.log(`  Pay here:  ${initiation.browserUrl}`);
  console.log(`  Poll URL:  ${initiation.pollUrl}`);
  pollUrl = initiation.pollUrl;
}

const keepPolling = wait || Boolean(existingPollUrl);
const deadline = Date.now() + 5 * 60 * 1000;
let last = "";
for (;;) {
  const status = await pollPaynowStatus(config, pollUrl);
  if (status.status !== last) {
    console.log(`  Status:    ${status.status}${status.paynowReference ? ` (Paynow ref ${status.paynowReference})` : ""}`);
    last = status.status;
  }
  const done = ["paid", "awaiting delivery", "delivered", "cancelled", "failed"].includes(status.status.toLowerCase());
  if (!keepPolling || done || Date.now() > deadline) {
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

console.log(
  keepPolling
    ? "\nDone. A status of Paid means the whole loop works end to end."
    : "\nDone. Open the payment link, complete the fake payment, and rerun with --poll <pollUrl> to watch the status change to Paid.",
);
