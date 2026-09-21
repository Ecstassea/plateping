"use client";

import { useState } from "react";
import { MARKETING_CONSENT } from "@/lib/mailing-list";

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Could not save that email.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="card p-4">
        <p className="font-medium">You are on the list</p>
        <p className="mt-1 text-sm text-muted">
          We will email this address about new ZRP lists, PlatePing news, and new products. Create an
          account if you also want plate alerts.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-4">
      <p className="font-medium">Get emails from PlatePing</p>
      <p className="text-sm text-muted">
        Leave your email if you are not ready for an account. {MARKETING_CONSENT}{" "}
        <a className="text-green underline" href="/privacy">
          Privacy policy
        </a>
        .
      </p>
      <input
        className="field"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@email.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button className="btn btn-primary" disabled={loading} type="submit">
        {loading ? "Saving…" : "Add my email"}
      </button>
    </form>
  );
}
