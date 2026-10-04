"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { displayListPlate, parsePastedList, type ParsedList } from "@/lib/plate-list";

export type StatementRow = {
  id: string;
  url: string;
  title: string;
  source: string;
  status: string;
  plateCount: number;
  publishedOn: string | null;
  importedBy: string | null;
  note: string | null;
};

export type RunRow = {
  id: string;
  source: string;
  status: string;
  platesFound: number;
  newFines: number;
  error: string | null;
  createdAt: string;
};

type Props = {
  listedPlates: number;
  watched: number;
  unverified: number;
  statements: StatementRow[];
  runs: RunRow[];
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Harare" });
}

function day(iso: string | null) {
  return iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "No date";
}

async function post(body: unknown) {
  const response = await fetch("/api/admin/lists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, data };
}

export function AdminLists({ listedPlates, watched, unverified, statements, runs }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<"page" | "text">("page");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [publishedOn, setPublishedOn] = useState("");
  const [text, setText] = useState("");
  const [pagePreview, setPagePreview] = useState<ParsedList | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const textPreview = useMemo(() => (mode === "text" && text.trim() ? parsePastedList(text) : null), [mode, text]);
  const preview = mode === "page" ? pagePreview : textPreview;
  const needsReview = statements.filter((s) => s.status === "needs_review");
  const lastRun = runs[0];

  function refresh() {
    startTransition(() => router.refresh());
  }

  function startImport(statement: StatementRow) {
    setMode("text");
    setUrl(statement.url);
    setTitle(statement.title);
    setPublishedOn(statement.publishedOn ?? "");
    setText("");
    setMessage("");
    setError("");
    document.getElementById("import")?.scrollIntoView({ behavior: "smooth" });
  }

  async function readPage() {
    setBusy("read");
    setError("");
    setMessage("");
    setPagePreview(null);
    const { ok, data } = await post({ action: "preview", url });
    setBusy(null);
    if (!ok) {
      setError(String(data.error ?? "Could not read that page."));
      return;
    }
    setTitle(String(data.title ?? ""));
    setPublishedOn(String(data.publishedOn ?? ""));
    setPagePreview({
      plates: (data.plates as string[]) ?? [],
      unusual: (data.unusual as string[]) ?? [],
      duplicates: Number(data.duplicates ?? 0),
    });
  }

  async function doImport() {
    if (!preview) {
      return;
    }
    setBusy("import");
    setError("");
    const { ok, data } = await post({ action: "import", url, title, publishedOn, plates: preview.plates });
    setBusy(null);
    if (!ok) {
      setError(String(data.error ?? "Import failed."));
      return;
    }
    setMessage(
      `Imported. ${data.added} new plate${data.added === 1 ? "" : "s"} added (${data.total} on this list). ${data.alertedPlates} of them ${data.alertedPlates === 1 ? "is" : "are"} watched; everyone watching on an active plan has been alerted.`,
    );
    setText("");
    setPagePreview(null);
    refresh();
  }

  async function syncNow() {
    setBusy("sync");
    setError("");
    setMessage("");
    const { ok, data } = await post({ action: "sync" });
    setBusy(null);
    const source = (data.sources as { status: string; statementsSeen: number; imported: number; newFines: number; needsReview: number; error?: string }[] | undefined)?.[0];
    if (!ok || !source) {
      setError(String(data.error ?? "The check did not run."));
      return;
    }
    if (source.status === "error") {
      setError(`ZRP's site could not be read: ${source.error ?? "unknown error"}`);
    } else {
      setMessage(
        `Checked ZRP. ${source.statementsSeen} vehicle-list statement${source.statementsSeen === 1 ? "" : "s"} on its recent pages, ${source.imported} newly imported, ${source.newFines} new plates${source.needsReview ? `, ${source.needsReview} need importing by hand` : ""}.`,
      );
    }
    refresh();
  }

  async function dismiss(id: string) {
    setBusy(id);
    await post({ action: "dismiss", id });
    setBusy(null);
    refresh();
  }

  const canImport = Boolean(preview && preview.plates.length > 0 && url && title.trim().length >= 5 && /^\d{4}-\d{2}-\d{2}$/.test(publishedOn));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Admin</p>
        <h1 className="text-2xl font-semibold">ZRP lists</h1>
        <p className="text-sm text-muted">What PlatePing checks plates against, and how new lists get in.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3">
          <p className="text-xs text-muted">Listed plates</p>
          <p className="text-xl font-semibold">{listedPlates.toLocaleString("en-GB")}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">ZRP lists</p>
          <p className="text-xl font-semibold">{statements.filter((s) => s.status === "imported").length}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">Watched</p>
          <p className="text-xl font-semibold">{watched}</p>
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">Automatic check of ZRP&apos;s website</p>
            <p className="text-xs text-muted">Runs every 6 hours. Lists published as a table are imported and alerted automatically.</p>
          </div>
        </div>
        {lastRun ? (
          <p className={`text-sm ${lastRun.status === "ok" ? "text-green" : "text-danger"}`}>
            Last run {when(lastRun.createdAt)}: {lastRun.status === "ok" ? "worked" : "failed"}
            {lastRun.error ? ` · ${lastRun.error}` : ""}
          </p>
        ) : (
          <p className="text-sm text-muted">No runs yet.</p>
        )}
        <button className="btn btn-ghost" disabled={busy !== null} onClick={() => void syncNow()} type="button">
          {busy === "sync" ? "Checking ZRP…" : "Check ZRP now"}
        </button>
      </div>

      {message ? <p className="rounded-xl border border-green/40 bg-green/5 p-3 text-sm text-green">{message}</p> : null}
      {error ? <p className="rounded-xl border border-danger/40 bg-danger/5 p-3 text-sm text-danger">{error}</p> : null}

      {needsReview.length > 0 ? (
        <div className="card space-y-3 border-gold/50 p-4">
          <p className="font-medium text-gold">Needs importing by hand</p>
          <p className="text-xs text-muted">ZRP published these, but the plates are in an image or file.</p>
          {needsReview.map((s) => (
            <div className="space-y-2 rounded-xl border border-line bg-bg-2 p-3" key={s.id}>
              <p className="text-sm">{s.title}</p>
              <a className="block truncate text-xs text-green underline" href={s.url} rel="noreferrer" target="_blank">
                {s.url}
              </a>
              <div className="flex gap-2">
                <button className="btn btn-primary !min-h-0 py-2 text-sm" onClick={() => startImport(s)} type="button">
                  Import this list
                </button>
                <button className="btn btn-ghost !min-h-0 py-2 text-sm" disabled={busy === s.id} onClick={() => void dismiss(s.id)} type="button">
                  Not a vehicle list
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="card space-y-3 p-4" id="import">
        <p className="font-medium">Import a list</p>
        <div className="grid grid-cols-2 gap-2">
          <button className={`btn !min-h-0 py-2 text-sm ${mode === "page" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("page")} type="button">
            From a ZRP web page
          </button>
          <button className={`btn !min-h-0 py-2 text-sm ${mode === "text" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("text")} type="button">
            From text or a photo
          </button>
        </div>

        <label className="block text-xs text-muted" htmlFor="admin-url">
          {mode === "page" ? "Link to the ZRP statement" : "Link to where ZRP published it (website, Facebook or X post)"}
        </label>
        <input className="field" id="admin-url" inputMode="url" onChange={(e) => setUrl(e.target.value)} placeholder="https://zrp.gov.zw/?p=8290" value={url} />

        {mode === "page" ? (
          <button className="btn btn-ghost" disabled={busy !== null || !url} onClick={() => void readPage()} type="button">
            {busy === "read" ? "Reading the page…" : "Read the page"}
          </button>
        ) : (
          <>
            <label className="block text-xs text-muted" htmlFor="admin-text">
              Plates, one per line or separated by commas
            </label>
            <textarea
              className="field min-h-40 font-mono text-sm"
              id="admin-text"
              onChange={(e) => setText(e.target.value)}
              placeholder={"ADX 5897\nAFV 7440\nAFA 8656"}
              value={text}
            />
            <p className="text-xs leading-5 text-muted">
              List in a photo? On iPhone, open the photo, press and hold on the text, tap Select All and Copy. On
              Android, use Google Lens, then Copy text. Paste it here; anything that is not a plate is ignored.
            </p>
          </>
        )}

        {(mode === "text" || pagePreview) && (
          <>
            <label className="block text-xs text-muted" htmlFor="admin-title">
              Statement title
            </label>
            <input className="field" id="admin-title" onChange={(e) => setTitle(e.target.value)} placeholder="ZRP press statement: list of vehicles captured…" value={title} />
            <label className="block text-xs text-muted" htmlFor="admin-date">
              Date ZRP published it
            </label>
            <input className="field" id="admin-date" onChange={(e) => setPublishedOn(e.target.value)} type="date" value={publishedOn} />
          </>
        )}

        {preview ? (
          <div className="space-y-2 rounded-xl border border-line bg-bg-2 p-3 text-sm">
            <p>
              <span className="font-semibold">{preview.plates.length}</span> plates found
              {preview.duplicates ? `, ${preview.duplicates} repeat${preview.duplicates === 1 ? "" : "s"} removed` : ""}.
            </p>
            {preview.unusual.length > 0 ? (
              <p className="text-xs text-gold">
                Not in the usual format, check these are real plates: {preview.unusual.slice(0, 30).join(", ")}
                {preview.unusual.length > 30 ? "…" : ""}
              </p>
            ) : null}
            <p className="font-mono text-xs text-muted">
              {preview.plates.slice(0, 40).map(displayListPlate).join(" · ")}
              {preview.plates.length > 40 ? ` · and ${preview.plates.length - 40} more` : ""}
            </p>
          </div>
        ) : null}

        <button className="btn btn-primary" disabled={!canImport || busy !== null} onClick={() => void doImport()} type="button">
          {busy === "import" ? "Importing and alerting…" : preview ? `Import ${preview.plates.length} plates and alert watchers` : "Import"}
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Lists in PlatePing</p>
        {statements.length === 0 ? <p className="text-sm text-muted">None yet.</p> : null}
        {statements.map((s) => (
          <div className="card space-y-1 p-3" key={s.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{day(s.publishedOn)}</p>
              <span className={`text-xs ${s.status === "imported" ? "text-green" : s.status === "needs_review" ? "text-gold" : "text-muted"}`}>
                {s.status === "imported" ? `${s.plateCount} plates` : s.status === "needs_review" ? "Needs importing" : "Dismissed"}
              </span>
            </div>
            <p className="text-xs text-muted">{s.title}</p>
            <a className="block truncate text-xs text-green underline" href={s.url} rel="noreferrer" target="_blank">
              {s.source === "zrp.gov.zw" ? "ZRP website" : "Source"}: {s.url}
            </a>
            {s.importedBy ? <p className="text-xs text-muted">Imported by {s.importedBy}</p> : null}
          </div>
        ))}
      </div>

      {unverified > 0 ? (
        <p className="text-xs leading-5 text-muted">
          {unverified} older plates from an unofficial copy of a list are kept but hidden: they did not match ZRP&apos;s
          own statements, so they are never shown to customers or alerted on.
        </p>
      ) : null}
    </div>
  );
}
