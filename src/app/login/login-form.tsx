"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cleanInviteCode, joinWithCode } from "@/lib/join";

// Only places inside this app; never an absolute URL someone pasted into a link.
function safeNextPath(value: string | null) {
  if (value === "/join") {
    return "/join";
  }
  return value && /^\/app(?:\/[a-z-]+)?$/.test(value) ? value : "/app";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const inviteCode = cleanInviteCode(params.get("join"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setLoading(false);
      setError(data.error || "Could not sign in.");
      return;
    }

    if (inviteCode) {
      const joined = await joinWithCode(inviteCode);
      setLoading(false);
      router.replace(joined ? "/app/team" : `/join?code=${inviteCode}`);
      return;
    }

    setLoading(false);
    router.replace(safeNextPath(params.get("next")));
  }

  return (
    <div className="site-wrap max-w-md py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-green">PlatePing</p>
      <h1 className="mt-3 text-3xl font-semibold">Welcome back</h1>
      {inviteCode ? (
        <p className="mt-3 text-sm leading-6 text-muted">
          Sign in and we will add you to the workspace for invite code{" "}
          <span className="text-ink">{inviteCode}</span>.
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input
          className="field"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className="field"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link className="text-green" href={inviteCode ? `/register?join=${inviteCode}` : "/register"}>
          Create an account
        </Link>
      </p>
      <p className="mt-3 text-sm text-muted">
        Joining a company fleet?{" "}
        <Link className="text-green" href="/join">
          How invite codes work
        </Link>
      </p>
    </div>
  );
}
