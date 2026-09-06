"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode }),
    });
    const data = (await response.json()) as { error?: string };
    setLoading(false);
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (!response.ok) {
      setError(data.error || "Could not join that workspace.");
      return;
    }
    router.replace("/app/team");
  }

  return (
    <div className="phone-shell px-5 pt-[max(4rem,calc(env(safe-area-inset-top)+2.5rem))]">
      <h1 className="text-3xl font-semibold">Join a company</h1>
      <p className="mt-3 text-sm text-muted">
        Sign in first, then enter the invite code from the fleet owner.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input
          className="field uppercase tracking-[0.2em]"
          placeholder="INVITE CODE"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
          required
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Joining…" : "Join workspace"}
        </button>
      </form>
      <Link className="mt-6 inline-block text-sm text-green" href="/login">
        Back to sign in
      </Link>
    </div>
  );
}
