"use client";

import { useState } from "react";
import {
  OFFICIAL_ZRP_LIST_STATEMENT,
  OFFICIAL_ZRP_SCAM_STATEMENT,
  ZRP_GUIDANCE,
  sourceHref,
  sourceLabel,
  statementDisplayTitle,
} from "@/lib/plates";

type Fine = {
  id: string;
  offence: string;
  location: string | null;
  source: string;
  sourceUrl: string | null;
  statementTitle: string | null;
  publishedOn: string | null;
  status: string;
};

type Guidance = {
  meaning: string;
  action: string;
  station: string;
  phone: string;
  phoneHref: string;
  whatsapp: string;
  whatsappHref: string;
  payWarning: string;
  unpublished: readonly string[];
};

type ListStatus = {
  source: string;
  checkedAt: string;
  platesFound: number;
};

type CheckResult = {
  plateDisplay: string;
  listed: boolean;
  fines: Fine[];
  guidance?: Guidance;
  listStatus?: ListStatus[];
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

  const guidance = result?.guidance ?? ZRP_GUIDANCE;

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
        {compact ? null : (
          <p className="text-xs leading-5 text-muted">
            Notification only. PlatePing does not offer a way to pay a traffic fine.
          </p>
        )}
      </form>

      {result ? (
        <div className="card space-y-3 p-4">
          {result.error ? (
            <p className="text-sm text-danger">{result.error}</p>
          ) : result.listed ? (
            <>
              <p className="text-lg font-semibold text-danger">{result.plateDisplay} is listed</p>
              <p className="text-sm text-muted">{guidance.meaning}</p>
              {result.fines.map((fine) => (
                <div key={fine.id} className="rounded-2xl border border-line bg-bg-2 p-3 text-sm">
                  <p className="font-medium">{fine.offence}</p>
                  {fine.location ? <p className="mt-1 text-muted">{fine.location}</p> : null}
                  {fine.publishedOn ? (
                    <p className="mt-1 text-muted">Published {fine.publishedOn}</p>
                  ) : null}
                  {sourceHref(fine.source, fine.sourceUrl) ? (
                    <a
                      className="mt-2 block text-xs leading-5 text-green underline"
                      href={sourceHref(fine.source, fine.sourceUrl) ?? undefined}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {statementDisplayTitle(fine.source, fine.statementTitle)}
                    </a>
                  ) : fine.statementTitle ? (
                    <p className="mt-2 text-xs leading-5 text-muted">{fine.statementTitle}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted">{sourceLabel(fine.source)}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-line bg-bg-2 p-3 text-sm">
                <p className="font-medium">What ZRP asks you to do</p>
                <p className="mt-1 text-muted">
                  {guidance.action}{" "}
                  <a
                    className="text-green underline"
                    href={OFFICIAL_ZRP_LIST_STATEMENT.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open the official statement
                  </a>
                  .
                </p>
                <p className="mt-2 text-muted">{guidance.station}</p>
                <p className="mt-2">
                  <a className="text-green" href={guidance.phoneHref}>
                    {guidance.phone}
                  </a>
                  {" · "}
                  <a className="text-green" href={guidance.whatsappHref} rel="noreferrer" target="_blank">
                    WhatsApp {guidance.whatsapp}
                  </a>
                </p>
              </div>
              <p className="text-xs leading-5 text-muted">
                {guidance.payWarning}{" "}
                <a
                  className="text-green underline"
                  href={OFFICIAL_ZRP_SCAM_STATEMENT.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {OFFICIAL_ZRP_SCAM_STATEMENT.shortLabel}
                </a>
                .
              </p>
              {compact ? null : (
                <p className="text-xs leading-5 text-muted">
                  ZRP does not publish {guidance.unpublished.join(", ")} on these lists. Confirm the rest at
                  the station.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-green">{result.plateDisplay} is clear</p>
              <p className="text-sm text-muted">
                Not on the public robot / ETMS lists we currently watch. That is not a court clearance.
              </p>
              {result.listStatus && result.listStatus.length > 0 ? (
                <div className="rounded-2xl border border-line bg-bg-2 p-3 text-xs text-muted">
                  {result.listStatus.map((run) => (
                    <p key={`${run.source}-${run.checkedAt}`}>
                      {sourceLabel(run.source)}: {run.platesFound} plates, last pulled{" "}
                      {new Date(run.checkedAt).toLocaleString("en-GB", { timeZone: "Africa/Harare" })}
                    </p>
                  ))}
                </div>
              ) : null}
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
