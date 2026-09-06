"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PAID_PLANS, PLANS, type PaidPlanId } from "@/lib/plans";

type Me = {
  organization: {
    plan: string;
    subscriptionStatus: string;
    currentPeriodEnd: string | null;
    type: string;
  };
  entitled: boolean;
  lastSync: { createdAt: string; platesFound: number; source: string } | null;
};

function BillingInner() {
  const params = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [message, setMessage] = useState(params.get("status") === "success" ? "Subscription updated." : "");
  const [loading, setLoading] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/me");
    setMe((await response.json()) as Me);
  }

  useEffect(() => {
    void load();
  }, []);

  async function subscribe(plan: PaidPlanId) {
    setLoading(plan);
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = (await response.json()) as { url?: string; message?: string; error?: string };
    setLoading(null);
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setMessage(data.message || data.error || "Updated.");
    await load();
  }

  async function syncNow() {
    setLoading("sync");
    const response = await fetch("/api/sync", { method: "POST" });
    const data = (await response.json()) as { error?: string };
    setLoading(null);
    setMessage(data.error || "Lists refreshed.");
    await load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Plan</h1>
        <p className="text-sm text-muted">
          {me ? `${me.organization.plan} · ${me.organization.subscriptionStatus}` : "Loading…"}
        </p>
      </div>

      {message ? <p className="text-sm text-gold">{message}</p> : null}

      {PAID_PLANS.map((planId) => {
        const plan = PLANS[planId];
        return (
          <div key={planId} className="card p-4">
            <p className="font-medium">
              {plan.label} · ${plan.priceUsd}/mo
            </p>
            <p className="mt-1 text-sm text-muted">{plan.blurb}</p>
            <p className="mt-2 text-xs text-muted">
              {plan.vehicles} plates · {plan.seats} {plan.seats === 1 ? "user" : "users"}
            </p>
            <button
              className="btn btn-primary mt-3"
              disabled={loading !== null}
              onClick={() => subscribe(planId)}
              type="button"
            >
              {loading === planId ? "Working…" : `Get ${plan.label}`}
            </button>
          </div>
        );
      })}

      <button className="btn btn-ghost" disabled={loading !== null} onClick={syncNow} type="button">
        {loading === "sync" ? "Refreshing…" : "Refresh public lists now"}
      </button>

      <p className="text-xs leading-5 text-muted">
        Subscriptions are for alerts only. ZRP has warned that online fine-payment messages are scams.
        Connect Stripe in production for card billing; without Stripe keys, the buttons activate the
        plan locally so you can launch immediately.
      </p>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading plan…</p>}>
      <BillingInner />
    </Suspense>
  );
}
