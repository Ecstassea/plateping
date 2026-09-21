# PlatePing

Phone-ready Zimbabwe robot-fine watcher. A user or company enters a registration number. We pull published ZRP traffic-light lists, store matches, and notify people. We never take fine payments.

## What it watches

The public lookup people have been using is [zrp.netlify.app](https://zrp.netlify.app/). It searches plates ZRP published after the Harare robot / ETMS camera lists (May 2025 onward). Official pages such as [zrp.gov.zw/?p=8290](https://zrp.gov.zw/?p=8290) published the same kind of list.

PlatePing scrapes those public sources every 6 hours, plus whenever someone taps **Refresh public lists now**. There is still no official live “pay this ticket” portal. ZRP has also said online fine-payment messages are scams. This app only notifies.

## Plans

| Plan | Price | Plates | Seats | Alerts |
| --- | --- | --- | --- | --- |
| Free check | $0 | 0 | 1 | Look up only |
| Starter | $2 / month | 2 | 1 | Yes |
| Family | $5 / month | 6 | 3 | Yes |
| Fleet | $12 / month | 20 | 10 | Yes |

New accounts get a 7-day Driver or Fleet trial.

## Local run

```bash
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo logins, password `demo1234`:

- `demo@plateping.co` — personal, includes listed plate `ADX 5897`
- `fleet@plateping.co` — company, invite code `FLEET001`

On a phone it installs as a home-screen app. No App Store or Play Store listing is required.

- **iPhone:** Safari → Share → Add to Home Screen
- **Android:** Chrome → Add to Home Screen, or the in-app install prompt

## Production

Production uses Postgres. Set `DATABASE_URL` (pooled) and `DIRECT_URL` (direct Neon URL), then run `npx prisma db push`.

### Vercel

1. Create a Neon/Postgres database.
2. Set `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `CRON_SECRET`.
3. Deploy. Vercel cron hits `/api/cron/sync` every 6 hours. Add `CRON_SECRET` so Vercel sends `Authorization: Bearer …`.

### Render

1. Create a web service from this repo and a Render Postgres instance.
2. Bind the app with `npm run start` so it listens on `0.0.0.0:$PORT`.
3. Add a Render cron job that `curl`s `/api/cron/sync` with the bearer secret.

### Paynow (Zimbabwe) — preferred once configured

1. Paynow dashboard → Receive Payments → Integrations → your web integration: copy the Integration ID and Key.
2. Set `PAYNOW_INTEGRATION_ID`, `PAYNOW_INTEGRATION_KEY`, `PAYNOW_MERCHANT_EMAIL`, and `PAYNOW_TEST_MODE=true` until Paynow marks the integration live.
3. Result URL is `/api/billing/paynow/result`; `APP_URL` must be the public HTTPS address.
4. `npm run paynow:check` proves the keys before deploying. Plans are bought for 1, 3 or 12 months. Details and the test plan: `docs/PAYNOW.md`.

### Smile&Pay (ZB Bank)

Plan subscriptions only (Starter / Family / Fleet). **Never** used for ZRP fine payments.

1. Register at the [sandbox merchant portal](https://zbnet.zb.co.zw/wallet_sandbox_merchant/), then **Settings → API Keys**.
2. Set in `.env` / Vercel:
   - `SMILEPAY_ENV=sandbox` (or `production`)
   - `SMILEPAY_SANDBOX_KEY` / `SMILEPAY_SANDBOX_SECRET` (or production pair)
   - `APP_URL` must be a public HTTPS origin so ZB can POST the result URL
3. Webhook (result URL): `/api/billing/smilepay/webhook` (optionally append `SMILEPAY_WEBHOOK_SECRET_PATH`)
4. Callbacks are **unsigned**. PlatePing always re-checks payment status with the authenticated API before activating a plan.

Prefer order when several gateways are configured: **Paynow → Smile&Pay → Stripe → demo/`503`**. Force one with `BILLING_PROVIDER=paynow|smilepay|stripe`.

Each successful payment sets `subscriptionStatus=active` and `currentPeriodEnd ≈ now + 30 days`. Renewal is a new checkout (not Stripe-style auto-debit).

### Stripe

Create three products (**Starter**, **Family**, and **Fleet**, not three prices on one product). Put the price IDs in:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_FAMILY`
- `STRIPE_PRICE_FLEET`

Webhook URL: `/api/billing/webhook`.

If no gateway is set, plan buttons return 503 unless `ALLOW_DEMO_BILLING=true` (local only).

Email alerts need `RESEND_API_KEY` and `ALERT_FROM_EMAIL`. In-app alerts still work without email.

If you charge US or EU cards later, turn on Stripe Tax in the Dashboard and complete a registration before enabling automatic tax. This app does not enable automatic tax.

## Legal / product rules

- Not affiliated with ZRP, TelOne, or ZINARA.
- Users should only watch vehicles they own or operate.
- Never ask anyone to pay a ZRP fine through this app.
