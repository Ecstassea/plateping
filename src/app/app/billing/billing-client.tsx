"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  COMPANY_PLANS,
  PERSONAL_PLANS,
  PLANS,
  formatPlanMeta,
  type PaidPlanId,
  type PlanId,
} from "@/lib/plans";

function PlanCheckoutCard({
  planId,
  loading,
  disabled,
  onSubscribe,
}: {
  planId: PaidPlanId;
  loading: string | null;
  disabled: boolean;
  onSubscribe: (plan: PaidPlanId) => void;
}) {
  const plan = PLANS[planId];
  return (
    <div className="card p-4">
      <p className="font-medium">
        {plan.label} · ${plan.priceUsd}/mo
      </p>
      <p className="mt-1 text-sm text-muted">{plan.blurb}</p>
      <p className="mt-2 text-xs text-muted">{formatPlanMeta(plan)}</p>
      <button
        className="btn btn-primary mt-3"
        disabled={disabled || loading !== null}
        onClick={() => onSubscribe(planId)}
        type="button"
      >
        {loading === planId ? "Working…" : `Get ${plan.label}`}
      </button>
    </div>
  );
}

type Props = {
  plan: PlanId;
  subscriptionStatus: string;
  owner: boolean;
  initialMessage: string;
  smilepayConfigured: boolean;
  orderReference?: string;
};

export function BillingClient({
  plan,
  subscriptionStatus,
  owner,
  initialMessage,
  smilepayConfigured,
  orderReference,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState<string | null>(null);
  const polledRef = useRef<string | null>(null);

  function reload() {
    startTransition(() => router.refresh());
  }

  useEffect(() => {
    if (!orderReference || !smilepayConfigured) {
      return;
    }
    if (polledRef.current === orderReference) {
      return;
    }
    polledRef.current = orderReference;

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const response = await fetch(
          `/api/billing/smilepay/status?orderReference=${encodeURIComponent(orderReference!)}`,
        );
        const data = (await response.json()) as {
          status?: string;
          error?: string;
          periodEnd?: string;
        };
        if (cancelled) {
          return;
        }
        if (data.status === "paid") {
          setMessage("Payment confirmed. Your plan is active for about 30 days.");
          reload();
          return;
        }
        if (data.status === "failed" || data.status === "cancelled") {
          setMessage(data.error || "Payment did not complete. Your plan is unchanged.");
          return;
        }
        if (attempts < 12) {
          setTimeout(poll, 2500);
        } else {
          setMessage(
            "Payment is still processing. Refresh this page in a minute — we will activate the plan once Smile&Pay confirms.",
          );
        }
      } catch {
        if (!cancelled && attempts < 12) {
          setTimeout(poll, 3000);
        }
      }
    }

    setMessage("Confirming payment with Smile&Pay…");
    void poll();
    return () => {
      cancelled = true;
    };
  }, [orderReference, smilepayConfigured]);

  async function subscribe(planId: PaidPlanId) {
    setLoading(planId);
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planId }),
    });
    const data = (await response.json()) as {
      url?: string;
      message?: string;
      error?: string;
      orderReference?: string;
    };
    setLoading(null);
    if (data.url) {
      window.location.href = data.url;
      return;
    }
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Plan</h1>
        <p className="text-sm text-muted">
          {PLANS[plan].label} · {subscriptionStatus}
        </p>
      </div>

      {message ? <p className="text-sm text-gold">{message}</p> : null}
      {owner ? null : (
        <p className="text-sm text-muted">Only the workspace owner can change the plan or refresh lists.</p>
      )}

      {smilepayConfigured ? (
        <p className="text-sm text-muted">
          Pay with EcoCash, InnBucks, OneMoney, SmileCash, or card (Smile&Pay hosted checkout).
        </p>
      ) : null}

      <p className="text-xs uppercase tracking-[0.18em] text-muted">Personal</p>
      {PERSONAL_PLANS.map((planId) => (
        <PlanCheckoutCard
          key={planId}
          disabled={!owner}
          loading={loading}
          planId={planId}
          onSubscribe={subscribe}
        />
      ))}
      <p className="text-xs uppercase tracking-[0.18em] text-muted">Company</p>
      {COMPANY_PLANS.map((planId) => (
        <PlanCheckoutCard
          key={planId}
          disabled={!owner}
          loading={loading}
          planId={planId}
          onSubscribe={subscribe}
        />
      ))}

      <button
        className="btn btn-ghost"
        disabled={!owner || loading !== null}
        onClick={syncNow}
        type="button"
      >
        {loading === "sync" ? "Refreshing…" : "Refresh public lists now"}
      </button>

      <p className="text-xs leading-5 text-muted">
        PlatePing is purely a notification service. We do not offer any way to pay a traffic fine.
        Subscriptions (when Smile&Pay or another stated processor is connected) are for watching and
        alerts only. Online fine-payment messages are scams. Plan buttons stay locked until billing is
        connected.
      </p>
    </div>
  );
}
