# PLAN — Smile&Pay for PlatePing plan subscriptions — 2026-09-16

**Status:** PLAN ONLY — wait Panagiotis `1`  
**Repo:** `~/app for fines for peoples cars` (PlatePing)  
**Gateway:** Smile&Pay (ZB Bank Zimbabwe) — https://smileandpay.zb.co.zw/documentation  
**Sandbox merchant:** https://zbnet.zb.co.zw/wallet_sandbox_merchant/ → Settings → API Keys  

## Product lock (non-negotiable)

- Smile&Pay pays for **PlatePing Starter / Family / Fleet subscriptions only**.
- **Never** collect or route ZRP traffic-fine payments. Keep existing copy, footer, alerts, terms.
- Secrets stay server-side (`.env` / Vercel env). Never put API secret in the browser.

## Why not Stripe alone

Stripe keys are empty; Zimbabwe card/mobile-money reach is weak. Smile&Pay covers EcoCash, InnBucks, OneMoney, SmileCash, Visa/Mastercard via ZB hosted checkout.

Stripe stays optional later for US/EU cards. Prefer order when both configured: **Smile&Pay if `SMILEPAY_*` set**, else Stripe, else demo/`503`.

## Critical shape: not Stripe Billing

Smile&Pay is a **payment gateway** (initiate → customer pays → callback/status), not a recurring Billing product like Stripe subscriptions.

**v1 entitlement model:** each successful payment grants `currentPeriodEnd = now + 30 days` for the chosen plan (same as demo billing today). Renewal = new checkout before/after expiry. Cron already (or add) treats expired `currentPeriodEnd` as not entitled via `isEntitled()`.

Later (out of this ship): email/WhatsApp renew reminders 3 days before expiry; optional auto-prompt in `/app/billing`.

## Architecture

### Env (add to `.env.example`)

```
SMILEPAY_ENV=sandbox
SMILEPAY_SANDBOX_KEY=
SMILEPAY_SANDBOX_SECRET=
SMILEPAY_PRODUCTION_KEY=
SMILEPAY_PRODUCTION_SECRET=
SMILEPAY_CURRENCY=USD
SMILEPAY_RETURN_URL=${APP_URL}/app/billing?status=success
SMILEPAY_RESULT_URL=${APP_URL}/api/billing/smilepay/webhook
# optional hardening
SMILEPAY_WEBHOOK_SECRET_PATH=
SMILEPAY_ALLOWED_IPS=
```

`smilepayConfigured()` = env key+secret for current env present.

### Prisma

Add `Payment` (or `BillingPayment`) table:

- `id`, `organizationId`, `orderReference` (unique), `plan`, `amountCents`, `currency`, `status` (`initiated`|`pending`|`paid`|`failed`|`cancelled`|`unknown`)
- `provider` (`smilepay`), `providerTxnRef?`, `rawStatus?`, `paidAt?`, `periodEnd?`
- timestamps + indexes on `organizationId`, `status`

Optional on `Organization`: `billingProvider` (`smilepay`|`stripe`|null), `smilepayLastOrderRef`.

Keep existing Stripe columns; do not remove.

### Lib

- `src/lib/smilepay.ts` — thin native client (no Laravel package):
  - initiate **Standard Checkout** (hosted) with amount from `PLANS[plan].priceUsd`, currency ISO numeric (`USD=840`, `ZWG=924`)
  - `orderReference` = `pp_${orgId}_${plan}_${nanoid}` (stable, unique)
  - `statusCheck(orderReference)` authenticated GET
  - never log secrets; redact bodies
- `src/lib/billing.ts` — shared `applyPaidPlan({ organizationId, plan, periodDays: 30, provider, orderReference })` used by Smile&Pay verify path and (optionally) Stripe.

### Routes

1. **Checkout** — extend `POST /api/billing/checkout`:
   - if `smilepayConfigured()` → create `Payment` row `initiated`, call Smile&Pay checkout, return `{ url: paymentUrl }`
   - else if `stripeConfigured()` → existing Stripe path
   - else demo / 503 as today

2. **Webhook** — `POST /api/billing/smilepay/webhook` (+ optional secret path segment):
   - Treat body as **hint only** (ZB callbacks are **unsigned**)
   - Look up `Payment` by `orderReference`
   - Call authenticated `statusCheck`
   - Only if gateway says PAID → mark payment paid, `applyPaidPlan` once (idempotent)
   - Mismatch → log suspicious, do not activate
   - Always return 200 after processing attempt (ZB retries)

3. **Return** — existing `/app/billing?status=success` page: poll `GET /api/billing/smilepay/status?orderReference=` (session-scoped) until paid/failed so UX works even if webhook is slow.

4. **Cancel** — Smile&Pay has no Stripe cancel-sub; cancel = stop renewal + set plan free at period end or immediately on owner request (keep current DELETE semantics for “cancel plan”).

### Proxy / CSRF

`src/proxy.ts` already allows Stripe webhook POSTs from other origins — add Smile&Pay webhook path the same way.

### UI copy

- Billing page: “Pay with EcoCash, InnBucks, card (Smile&Pay)” when configured.
- Keep “we do not take fine payments” everywhere.
- Terms: replace “when Paynow is connected” with Smile&Pay (or “Smile&Pay / stated processor”).

### Cron

Optional: `/api/cron/billing-reconcile` every 5–15 min — status-check `pending`/`initiated` payments older than N minutes (same as Smile&Pay SDK reconcile advice). Wire via existing Vercel/Render cron if easy; else document manual first.

## Files to touch (expected)

- `prisma/schema.prisma` (+ migration / `db push`)
- `src/lib/smilepay.ts` (new)
- `src/lib/billing.ts` (new, shared apply)
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/smilepay/webhook/route.ts` (new)
- `src/app/api/billing/smilepay/status/route.ts` (new)
- `src/proxy.ts`
- `.env.example`, `README.md`, `src/app/terms/page.tsx`, billing client copy
- tests: unit for configure + applyPaidPlan idempotency; webhook refuses unsigned PAID without status check

## Acceptance (CLOSED when)

1. Sandbox: owner clicks Starter → redirects to ZB hosted checkout → pays with sandbox rail → webhook/status activates org `plan=starter`, `subscriptionStatus=active`, `currentPeriodEnd≈+30d`.
2. Forged webhook POST claiming PAID without real ZB status → **no** entitlement change.
3. Replay webhook → activates once only.
4. Fine-payment ban copy unchanged; no fine checkout UI.
5. Without Smile&Pay keys, behaviour unchanged (Stripe/demo/503).

## Blockers before execute

1. Panagiotis types **`1`**.
2. Sandbox API key + secret (secure prompt — never paste in chat).
3. Public HTTPS `APP_URL` for webhook (Vercel preview or tunnel for local).

## Out of scope this ship

- Paying ZRP fines
- Real recurring mandates / auto-debit
- PCI SAQ D card capture on our servers (use hosted checkout only)
- Replacing Stripe code (keep parallel)
