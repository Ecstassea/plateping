# Paynow billing

PlatePing sells prepaid periods through hosted checkouts. Paynow (this document) and
Smile&Pay share one `Payment` ledger and one activation helper, `applyPaidPlan`, so a
workspace can only ever be credited once per order reference. Neither gateway renews on
its own: the six-hourly cron reminds owners three days before a plan ends and once more
when it has ended (`src/lib/renewals.ts`).

## Which gateway the Plan screen offers

`activeBillingProvider()` in `src/lib/billing-provider.ts`: Paynow when configured, else
Smile&Pay, else Stripe. `BILLING_PROVIDER=paynow|smilepay|stripe` forces one.

## Environment

| Variable | Purpose |
| --- | --- |
| `PAYNOW_INTEGRATION_ID` | Paynow dashboard → Receive Payments → Integrations → your web integration. |
| `PAYNOW_INTEGRATION_KEY` | Same page. Secret: never commit it or paste it into chat. |
| `PAYNOW_MERCHANT_EMAIL` | The Paynow account's email. In test mode only this address can pay. |
| `PAYNOW_TEST_MODE` | `true` while the integration is in test mode on Paynow; blank once live. |
| `APP_URL` | Public HTTPS address of the site. Paynow posts results back to it, so `localhost` cannot work. |

## Flow

1. Owner picks a plan and 1, 3 or 12 months. `POST /api/billing/paynow/checkout` creates a
   `Payment` row (`PP-XXXXXXXXXX`, provider `paynow`, status `initiated`), signs the
   request, stores Paynow's poll URL, marks the row `pending` and sends the owner to Paynow.
2. Paynow posts a status update to `POST /api/billing/paynow/result`. The SHA-512 hash is
   verified, then the poll URL stored at checkout is asked directly. Nothing in the posted
   message decides anything on its own.
3. The owner lands on `/app/billing?paynow=<reference>`, which polls
   `GET /api/billing/paynow/status` until the payment is final. This also covers a
   callback that never arrived.
4. A confirmed payment whose amount is at least what was due goes through
   `applyPaidPlan` with `months`. The new plan applies straight away; time already paid
   for is kept and the new months are added after it.

Payments that are short, on an unknown plan, or refunded or disputed after crediting are
recorded with a `note` and are not credited or revoked automatically. Review those by hand.

## Testing

`npm test` runs the hash checks against Paynow's published worked examples. (The older
Smile&Pay tests write to the database in `.env.local`; they live behind `npm run test:billing`.)

Before deploying anything, prove the credentials with the keys in `.env.local`:

```
npm run paynow:check            # initiates a $1 test transaction and reads its status
npm run paynow:check -- --wait  # keeps polling while you fake the payment in a browser
```

It talks to Paynow only, writes nothing to the database and credits no plan. A refusal
names the likely cause (wrong ID or key, or an email that is not the integration's owner).

End to end, with the integration still in test mode on Paynow and the variables above set
on a deployed environment:

1. Sign in as a workspace owner whose login email is the Paynow account email, or set
   `PAYNOW_TEST_MODE=true` so the merchant email is sent as the payer.
2. Plan tab → 1 month → Starter → complete the fake payment on Paynow's page.
3. Expect: back on the Plan tab, "Payment received", plan line shows "paid until", a
   `Payment` row with status `paid`, and the workspace `currentPeriodEnd` one month out.
4. Repeat with Paynow's test numbers and tokens for delayed success, cancellation and
   insufficient funds. Cancelled and failed payments must leave the plan unchanged.
5. Replay the result callback (Paynow retries on non-200). The period must not extend twice.
6. Request live status from Paynow's Integration Keys page, then clear `PAYNOW_TEST_MODE`.
