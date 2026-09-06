"use client";

import { useState } from "react";
import { ZRP_REPORT } from "@/lib/plates";

type Fine = {
  id: string;
  offence: string;
  location: string | null;
  source: string;
  sourceUrl: string | null;
  estimatedUsd: string | null;
  status: string;
  listedAt: string | null;
};

type CheckResult = {
  plateDisplay: string;
  listed: boolean;
  fines: Fine[];
  error?: string;
};

export function CheckForm({ compact = false }: { compact?: boolean }) {
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate }),
      });
      const data = (await response.json()) as CheckResult & { error?: string };
      if (!response.ok) {
        setResult({ plateDisplay: plate, listed: false, fines: [], error: data.error });
        return;
      }
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="field uppercase tracking-[0.18em]"
          value={plate}
          onChange={(event) => setPlate(event.target.value.toUpperCase())}
          placeholder="ADX 5897"
          autoComplete="off"
          inputMode="text"
        />
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? "Checking lists…" : "Check this plate"}
        </button>
      </form>

      {result ? (
        <div className="card space-y-3 p-4">
          {result.error ? (
            <p className="text-sm text-danger">{result.error}</p>
          ) : result.listed ? (
            <>
              <p className="text-lg font-semibold text-danger">{result.plateDisplay} is listed</p>
              <p className="text-sm text-muted">
                Found on a published ZRP robot / traffic-light list. This is an unofficial alert, not a
                court summons.
              </p>
              {result.fines.map((fine) => (
                <div key={fine.id} className="rounded-2xl border border-line bg-bg-2 p-3 text-sm">
                  <p className="font-medium">{fine.offence}</p>
                  <p className="mt-1 text-muted">{fine.location}</p>
                  <p className="mt-1 text-gold">{fine.estimatedUsd}</p>
                  <p className="mt-2 text-xs text-muted">Source: {fine.source}</p>
                </div>
              ))}
              <p className="text-xs leading-5 text-muted">{ZRP_REPORT}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-green">{result.plateDisplay} is clear</p>
              <p className="text-sm text-muted">
                Not on the lists we currently watch. New ZRP lists are pulled automatically.
              </p>
              {compact ? null : (
                <p className="text-xs text-muted">
                  Create a free account to watch the plate and get notified if it appears later.
                </p>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
