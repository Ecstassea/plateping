"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const steps = [
  {
    title: "Create your own login",
    body: "Each person uses their own email and password. Do not share the owner’s password.",
  },
  {
    title: "Get the invite code",
    body: "Only the company owner can see it. They copy it from Team inside the app and send it to you.",
  },
  {
    title: "Enter the code here",
    body: "You must be signed in. You then see the same watched plates and alerts as the rest of that fleet.",
  },
] as const;

export function JoinForm() {
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
      router.replace("/login?next=/join");
      return;
    }
    if (!response.ok) {
      setError(data.error || "Could not join that workspace.");
      return;
    }
    router.replace("/app/team");
  }

  return (
    <div className="site-wrap max-w-lg py-12">
      <h1 className="text-3xl font-semibold">Join a company fleet</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Staff do not get a shared login. The owner keeps the invite code private. After you join,
        everyone in that workspace sees the same plates and alerts. PlatePing is a notification
        service only — there is no way here to pay a traffic fine. Only watch cars the company has
        authorised.
      </p>

      <ol className="mt-8 space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="card p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Step {index + 1}</p>
            <p className="mt-2 font-medium">{step.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit} className="card mt-8 space-y-3 p-4">
        <p className="font-medium">Invite code</p>
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
        <p className="text-xs leading-5 text-muted">
          Need an account first?{" "}
          <Link className="text-green underline" href="/register">
            Register
          </Link>
          {" · "}
          <Link className="text-green underline" href="/login?next=/join">
            Sign in
          </Link>
          . If the fleet is full, the owner must move to a larger plan.
        </p>
      </form>
    </div>
  );
}
