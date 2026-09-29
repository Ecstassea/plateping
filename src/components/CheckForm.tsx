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

function whatsappShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * After a result, the person is at their most interested. This is where they
 * are asked to act: watch the plate (one tap into sign-up, or straight onto
 * their list if they are already in the app), or send the check to someone.
 */
function NextStep({ result, signedIn }: { result: CheckResult; signedIn: boolean }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const plate = result.plateDisplay;
  const plateParam = encodeURIComponent(plate.replace(/\s+/g, ""));

  async function watchNow() {
    setState("saving");
    const response = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plate }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (response.ok) {
      setState("saved");
      return;
    }
    setState("error");
    setMessage(data.error || "Could not add that plate.");
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const shareText = result.listed
    ? `${plate} is on a published ZRP camera list. Check any plate free on PlatePing: ${origin}`
    : `Check if your number plate is on a ZRP camera list, free: ${origin}`;

  return (
    <div className="next-step">
      {signedIn ? (
        state === "saved" ? (
          <p className="text-sm text-green">Watching {plate}. You will be told the day it appears on a new list.</p>
        ) : (
          <button className="btn btn-primary" disabled={state === "saving"} onClick={() => void watchNow()} type="button">
            {state === "saving" ? "Adding…" : `Watch ${plate}`}
          </button>
        )
      ) : (
        <>
          <p className="text-sm font-medium">
            {result.listed
              ? `Get told the day ${plate} appears on the next list.`
              : `Stay clear. Get told the day ${plate} appears on a list.`}
          </p>
          <a className="btn btn-primary mt-3" href={`/register?plate=${plateParam}`}>
            Watch {plate} free for 7 days
          </a>
          <p className="mt-2 text-xs text-muted">No card needed. Nothing renews by itself.</p>
        </>
      )}
      {state === "error" ? <p className="mt-2 text-sm text-danger">{message}</p> : null}
      <a
        className="btn btn-ghost mt-3"
        href={whatsappShareUrl(shareText)}
        rel="noreferrer"
        target="_blank"
      >
        Send to someone on WhatsApp
      </a>
    </div>
  );
}

export function CheckForm({
  compact = false,
  hero = false,
  signedIn = false,
}: {
  compact?: boolean;
  /** Large, first-thing-you-see styling for the landing page. */
  hero?: boolean;
  /** In the app: "Watch" adds the plate straight away instead of sending to sign-up. */
  signedIn?: boolean;
}) {
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    const failed = (error: string) =>
      setResult({ plateDisplay: plate, listed: false, fines: [], error });
    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate }),
      });
      // A server error can come back without a JSON body; never let that
      // leave the person staring at a form that did nothing.
      const data = (await response.json().catch(() => null)) as (CheckResult & { error?: string }) | null;
      if (!response.ok || !data) {
        failed(
          data?.error ||
            (response.status === 429
              ? "Too many checks from this connection. Try again in a few minutes."
              : "We could not check the lists just now. Please try again in a moment."),
        );
        return;
      }
      setResult(data);
    } catch {
      failed("No connection. Check your data or Wi-Fi and try again.");
    } finally {
      setLoading(false);
    }
  }

  const guidance = result?.guidance ?? ZRP_GUIDANCE;

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          aria-label="Number plate"
          className={`field uppercase tracking-[0.18em] ${hero ? "field-hero" : ""}`}
          value={plate}
          onChange={(event) => setPlate(event.target.value.toUpperCase())}
          placeholder="ADX 5897"
          autoComplete="off"
          inputMode="text"
        />
        <button className={`btn btn-primary ${hero ? "btn-hero" : ""}`} disabled={loading} type="submit">
          {loading ? "Checking lists…" : hero ? "Check my plate, free" : "Check this plate"}
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
              <NextStep result={result} signedIn={signedIn} />
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
              <NextStep result={result} signedIn={signedIn} />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
