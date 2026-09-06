"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"personal" | "company">("personal");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, accountType, companyName }),
    });
    const data = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(data.error || "Could not create the account.");
      return;
    }
    router.replace("/app");
  }

  return (
    <div className="phone-shell px-5 pt-[max(3.5rem,calc(env(safe-area-inset-top)+2rem))]">
      <p className="text-xs uppercase tracking-[0.2em] text-green">7-day trial included</p>
      <h1 className="mt-3 text-3xl font-semibold">Watch your plates</h1>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`btn ${accountType === "personal" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setAccountType("personal")}
        >
          Personal
        </button>
        <button
          type="button"
          className={`btn ${accountType === "company" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setAccountType("company")}
        >
          Company
        </button>
      </div>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          className="field"
          placeholder={accountType === "company" ? "Your name" : "Name"}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        {accountType === "company" ? (
          <input
            className="field"
            placeholder="Company or fleet name"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            required
          />
        ) : null}
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
          autoComplete="new-password"
          placeholder="Password (6+ characters)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
        />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Creating…" : "Start watching"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link className="text-green" href="/login">
          Sign in
        </Link>
      </p>
      <p className="mt-3 text-sm text-muted">
        Joining a fleet?{" "}
        <Link className="text-green" href="/join">
          Enter an invite code
        </Link>
      </p>
    </div>
  );
}
