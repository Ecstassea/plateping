"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BILLING_PERIODS, periodLabel, periodPriceUsd, type BillingPeriod } from "@/lib/billing";
import { ReferralCard } from "@/components/ReferralCard";
import type { BillingProvider } from "@/lib/billing-provider";
import {
  COMPANY_PLANS,
  PERSONAL_PLANS,
  PLANS,
  formatPlanMeta,
  type PaidPlanId,
  type PlanId,
} from "@/lib/plans";

export type PaymentRow = {
  reference: string;
  provider: string;
  plan: string;
  months: number;
  amountUsd: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

export type PendingPayment = {
  provider: "paynow" | "smilepay";
  reference: string;
};

type PendingResult = {
  status: "paid" | "cancelled" | "failed" | "pending" | "unknown";
  until: string | null;
  error: string | null;
};

const POLL_EVERY_MS = 3000;
const POLL_LIMIT = 40;
const FINAL: PendingResult["status"][] = ["paid", "cancelled", "failed"];

const PROVIDER_NAME: Record<PendingPayment["provider"], string> = {
  paynow: "Paynow",
  smilepay: "Smile&Pay",
};

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function paymentLabel(status: string) {
  switch (status) {
    case "paid":
      return "Paid";
    case "initiated":
    case "pending":
      return "Waiting for confirmation";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Not completed";
    default:
      return "Needs attention";
  }
}

// Both status endpoints answer slightly differently; fold them into one shape.
function normaliseStatus(
  provider: PendingPayment["provider"],
  ok: boolean,
  data: Record<string, unknown>,
): PendingResult {
  const raw = typeof data.status === "string" ? data.status : "";
  const error = typeof data.error === "string" ? data.error : null;
  if (!ok && !raw) {
    return { status: "unknown", until: null, error: error ?? "Could not check the payment." };
  }
  let status: PendingResult["status"] = "pending";
  if (raw === "paid") {
    status = "paid";
  } else if (raw === "cancelled" || raw === "expired") {
    status = "cancelled";
  } else if (raw === "failed") {
    status = "failed";
  }
  let until: string | null = null;
  if (provider === "paynow") {
    const organization = data.organization as { currentPeriodEnd?: string | null } | null | undefined;
    until = organization?.currentPeriodEnd ?? null;
  } else if (typeof data.periodEnd === "string") {
    until = data.periodEnd;
  }
  return { status, until, error };
}

function statusUrl(pending: PendingPayment) {
  return pending.provider === "paynow"
    ? `/api/billing/paynow/status?reference=${encodeURIComponent(pending.reference)}`
    : `/api/billing/smilepay/status?orderReference=${encodeURIComponent(pending.reference)}`;
}

function PlanCheckoutCard({
  planId,
  months,
  loading,
  disabled,
  onSubscribe,
}: {
  planId: PaidPlanId;
  months: BillingPeriod;
  loading: string | null;
  disabled: boolean;
  onSubscribe: (plan: PaidPlanId) => void;
}) {
  const plan = PLANS[planId];
  const total = periodPriceUsd(planId, months);
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium">{plan.label}</p>
        <p className="text-green">
          ${total} <span className="text-xs text-muted">/ {periodLabel(months)}</span>
        </p>
      </div>
      <p className="mt-1 text-sm text-muted">{plan.blurb}</p>
      <p className="mt-2 text-xs text-muted">
        {formatPlanMeta(plan)} · ${plan.priceUsd}/mo
      </p>
      <button
        className="btn btn-primary mt-3"
        disabled={disabled || loading !== null}
        onClick={() => onSubscribe(planId)}
        type="button"
      >
        {loading === planId ? "Opening checkout…" : `Pay $${total} for ${periodLabel(months)}`}
      </button>
    </div>
  );
}

type Props = {
  plan: PlanId;
  subscriptionStatus: string;
  entitled: boolean;
  currentPeriodEnd: string | null;
  owner: boolean;
  provider: BillingProvider;
  paynowTestMode: boolean;
  pending: PendingPayment | null;
  payments: PaymentRow[];
  initialMessage: string;
};

export function BillingClient({
  plan,
  subscriptionStatus,
  entitled,
  currentPeriodEnd,
  owner,
  provider,
  paynowTestMode,
  pending,
  payments,
  initialMessage,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [months, setMonths] = useState<BillingPeriod>(1);
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<PendingResult | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  // The plan line comes from the server render; after a change, one refresh
  // brings the new values down with the page instead of a separate fetch.
  function reload() {
    startTransition(() => router.refresh());
  }

  // Back from a hosted checkout: ask our server (which asks the gateway) until
  // the payment is final. This also covers a callback that never arrived.
  useEffect(() => {
    if (!pending) {
      return;
    }
    let attempts = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      attempts += 1;
      try {
        const response = await fetch(statusUrl(pending), { cache: "no-store" });
        const data = (await response.json()) as Record<string, unknown>;
        if (stopped) {
          return;
        }
        const next = normaliseStatus(pending.provider, response.ok, data);
        setResult(next);
        if (FINAL.includes(next.status)) {
          if (next.status === "paid") {
            startTransition(() => {
              router.replace("/app/billing");
              router.refresh();
            });
          }
          return;
        }
      } catch {
        // Network blip: try again on the next tick.
      }
      if (!stopped && attempts < POLL_LIMIT) {
        timer = setTimeout(() => void check(), POLL_EVERY_MS);
      } else if (!stopped) {
        setPollTimedOut(true);
      }
    };

    void check();
    return () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [pending, router]);

  async function subscribe(planId: PaidPlanId) {
    setLoading(planId);
    setMessage("");
    const endpoint = provider === "paynow" ? "/api/billing/paynow/checkout" : "/api/billing/checkout";
    const body = provider === "paynow" ? { plan: planId, months } : { plan: planId };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as { url?: string; message?: string; error?: string };
    if (data.url) {
      // The hosted checkout takes over and sends the customer back to this screen.
      window.location.href = data.url;
      return;
    }
    setLoading(null);
    setMessage(data.message || data.error || "Updated.");
    reload();
  }

  async function syncNow() {
    setLoading("sync");
    const response = await fetch("/api/sync", { method: "POST" });
    const data = (await response.json()) as { error?: string };
    setLoading(null);
    setMessage(data.error || "Lists refreshed.");
    reload();
  }

  const planLine = (() => {
    if (!currentPeriodEnd) {
      return `${PLANS[plan].label} · ${subscriptionStatus}`;
    }
    if (entitled) {
      return `${PLANS[plan].label} · ${subscriptionStatus === "trialing" ? "trial until" : "paid until"} ${longDate(currentPeriodEnd)}`;
    }
    return `${PLANS[plan].label} · ended ${longDate(currentPeriodEnd)}`;
  })();

  const canPay = owner && provider !== "none";
  const selectedMonths: BillingPeriod = provider === "paynow" ? months : 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Plan</h1>
        <p className="text-sm text-muted">{planLine}</p>
      </div>

      {pending ? (
        <div className="card space-y-2 p-4">
          <p className="font-medium">
            {result?.status === "paid"
              ? "Payment received"
              : result?.status === "cancelled"
                ? "Payment cancelled"
                : result?.status === "failed"
                  ? "Payment not completed"
                  : `Confirming your payment with ${PROVIDER_NAME[pending.provider]}…`}
          </p>
          <p className="text-sm text-muted">
            {result?.status === "paid"
              ? result.until
                ? `Thank you. Your plan is paid until ${longDate(result.until)}.`
                : "Thank you. Your plan is active."
              : result?.status === "cancelled"
                ? "Nothing was charged. Pick a plan below to try again."
                : result?.status === "failed"
                  ? result.error || "The payment did not complete. Nothing has changed on your plan."
                  : pollTimedOut
                    ? `${PROVIDER_NAME[pending.provider]} is taking longer than usual. Your plan updates on its own once the payment is confirmed; you can also check again.`
                    : "This usually takes a few seconds. Keep this screen open."}
          </p>
          <p className="text-xs text-muted">Reference {pending.reference}</p>
          {pollTimedOut ? (
            <button className="btn btn-ghost" onClick={() => router.refresh()} type="button">
              Check again
            </button>
          ) : null}
        </div>
      ) : null}

      {message ? <p className="text-sm text-gold">{message}</p> : null}
      {owner ? null : (
        <p className="text-sm text-muted">Only the workspace owner can change the plan or refresh lists.</p>
      )}
      {owner && provider === "none" ? (
        <p className="text-sm text-muted">Paid plans are not open yet. Your trial keeps working until it expires.</p>
      ) : null}
      {owner && provider === "paynow" && paynowTestMode ? (
        <p className="text-xs text-gold">
          Paynow is in test mode. Only the Paynow account email can complete a payment, and no money moves.
        </p>
      ) : null}

      {provider === "paynow" ? (
        <div className="card p-4">
          <p className="text-sm font-medium">Pay for</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {BILLING_PERIODS.map((period) => (
              <button
                className={`btn !min-h-0 py-2 text-sm ${months === period ? "btn-primary" : "btn-ghost"}`}
                key={period}
                onClick={() => setMonths(period)}
                type="button"
              >
                {periodLabel(period)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">
            Paynow takes EcoCash, OneMoney, InnBucks, ZimSwitch and Visa or Mastercard. Plans do not renew on
            their own; we remind you three days before yours ends.
          </p>
        </div>
      ) : null}
      {provider === "smilepay" ? (
        <p className="text-sm text-muted">
          Pay with EcoCash, InnBucks, OneMoney, SmileCash, or card (Smile&Pay hosted checkout). Each payment
          covers 30 days; we remind you three days before it ends.
        </p>
      ) : null}

      <p className="text-xs uppercase tracking-[0.18em] text-muted">Personal</p>
      {PERSONAL_PLANS.map((planId) => (
        <PlanCheckoutCard
          key={planId}
          disabled={!canPay}
          loading={loading}
          months={selectedMonths}
          planId={planId}
          onSubscribe={subscribe}
        />
      ))}
      <p className="text-xs uppercase tracking-[0.18em] text-muted">Company</p>
      {COMPANY_PLANS.map((planId) => (
        <PlanCheckoutCard
          key={planId}
          disabled={!canPay}
          loading={loading}
          months={selectedMonths}
          planId={planId}
          onSubscribe={subscribe}
        />
      ))}

      <ReferralCard />

      {payments.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Payments</p>
          {payments.map((payment) => (
            <div className="card flex items-center justify-between gap-3 p-3 text-sm" key={payment.reference}>
              <div className="min-w-0">
                <p className="font-medium">
                  {PLANS[payment.plan as PlanId]?.label ?? payment.plan} · {periodLabel(payment.months)}
                </p>
                <p className="truncate text-xs text-muted">
                  {payment.provider === "paynow" ? "Paynow" : payment.provider === "smilepay" ? "Smile&Pay" : payment.provider}
                  {" · "}
                  {shortDate(payment.paidAt ?? payment.createdAt)} · {payment.reference}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p>${payment.amountUsd.toFixed(2)}</p>
                <p className={`text-xs ${payment.status === "paid" ? "text-green" : "text-muted"}`}>
                  {paymentLabel(payment.status)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <button
        className="btn btn-ghost"
        disabled={!owner || loading !== null}
        onClick={syncNow}
        type="button"
      >
        {loading === "sync" ? "Refreshing…" : "Refresh public lists now"}
      </button>

      <p className="text-xs leading-5 text-muted">
        PlatePing is purely a notification service. We do not offer any way to pay a traffic fine. Payments here
        are for watching and alerts only. Online fine-payment messages are scams.
      </p>
    </div>
  );
}
