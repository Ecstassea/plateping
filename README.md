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

SQLite is for local only. On Render or Vercel the disk is ephemeral, so point `DATABASE_URL` at Postgres and change `provider = "sqlite"` in `prisma/schema.prisma` to `postgresql`, then run `npx prisma db push`.

### Vercel

1. Create a Neon/Postgres database.
2. Set `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `CRON_SECRET`.
3. Deploy. Vercel cron hits `/api/cron/sync` every 6 hours. Add `CRON_SECRET` so Vercel sends `Authorization: Bearer …`.

### Render

1. Create a web service from this repo and a Render Postgres instance.
2. Bind the app with `npm run start` so it listens on `0.0.0.0:$PORT`.
3. Add a Render cron job that `curl`s `/api/cron/sync` with the bearer secret.

### Stripe

Create three products (**Starter**, **Family**, and **Fleet**, not three prices on one product). Put the price IDs in:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_FAMILY`
- `STRIPE_PRICE_FLEET`

Webhook URL: `/api/billing/webhook`.

If Stripe is not set, the plan buttons activate the workspace locally so you can launch without billing first.

Email alerts need `RESEND_API_KEY` and `ALERT_FROM_EMAIL`. In-app alerts still work without email.

If you charge US or EU cards later, turn on Stripe Tax in the Dashboard and complete a registration before enabling automatic tax. This app does not enable automatic tax.

## Legal / product rules

- Not affiliated with ZRP, TelOne, or ZINARA.
- Users should only watch vehicles they own or operate.
- Never ask anyone to pay a ZRP fine through this app.
