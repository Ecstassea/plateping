"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
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
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Could not sign in.");
      return;
    }
    router.replace("/app");
  }

  return (
    <div className="phone-shell px-5 pt-[max(4rem,calc(env(safe-area-inset-top)+2.5rem))]">
      <p className="text-xs uppercase tracking-[0.2em] text-green">PlatePing</p>
      <h1 className="mt-3 text-3xl font-semibold">Welcome back</h1>
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
        <Link className="text-green" href="/register">
          Create an account
        </Link>
      </p>
    </div>
  );
}
