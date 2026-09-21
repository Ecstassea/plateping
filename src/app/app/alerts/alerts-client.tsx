"use client";

import { useState } from "react";
import type { AlertView } from "@/lib/alerts";
import { emitInboxChanged } from "@/lib/inbox";
import { OFFICIAL_ZRP_LIST_STATEMENT } from "@/lib/plates";

// Seeded from the server render. Marking read updates in place, so there is no
// second fetch just to show the list. The unread badge in the tab bar is
// refreshed once by AppShell when the inbox event fires.
export function AlertsClient({ initialAlerts }: { initialAlerts: AlertView[] }) {
  const [alerts, setAlerts] = useState<AlertView[]>(initialAlerts);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  async function markRead(id?: string) {
    setPending(id ?? "all");
    setError("");
    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(id ? { id } : {}),
    });
    const data = (await response.json()) as { error?: string };
    setPending(null);
    if (!response.ok) {
      setError(data.error || "Could not mark that alert as read.");
      return;
    }

    const readAt = new Date().toISOString();
    setAlerts((current) =>
      current.map((alert) =>
        !alert.readAt && (!id || alert.id === id) ? { ...alert, readAt } : alert,
      ),
    );
    emitInboxChanged();
  }

  const unreadCount = alerts.filter((alert) => !alert.readAt).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <button
          className="text-sm text-green disabled:text-muted"
          disabled={unreadCount === 0 || pending !== null}
          onClick={() => void markRead()}
          type="button"
        >
          {pending === "all" ? "Updating…" : "Mark all read"}
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {alerts.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing yet. When a plate you watch appears on a published ZRP list, the notice lands here, on your
          phone, and in your email. A notice is information only. PlatePing never takes a fine payment.
        </p>
      ) : (
        alerts.map((alert) => {
          const unread = !alert.readAt;
          return (
            <div
              key={alert.id}
              className={`card space-y-2 p-4 ${unread ? "border-gold/50" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{alert.title}</p>
                {unread ? <span className="text-xs text-gold">New</span> : null}
              </div>
              <p className="text-sm text-muted">{alert.body}</p>
              <a
                className="block text-xs text-green underline"
                href={OFFICIAL_ZRP_LIST_STATEMENT.href}
                rel="noreferrer"
                target="_blank"
              >
                {OFFICIAL_ZRP_LIST_STATEMENT.shortLabel}
              </a>
              <p className="text-xs text-muted">{new Date(alert.createdAt).toLocaleString()}</p>
              {unread ? (
                <button
                  className="text-sm text-green disabled:text-muted"
                  disabled={pending !== null}
                  onClick={() => void markRead(alert.id)}
                  type="button"
                >
                  {pending === alert.id ? "Updating…" : "Mark as read"}
                </button>
              ) : (
                <p className="text-xs text-muted">Read</p>
              )}
            </div>
          );
        })
      )}
      <p className="text-xs leading-5 text-muted">
        PlatePing only notifies you. It never takes a fine payment. If a plate is listed, report to ZRP yourself.
      </p>
    </div>
  );
}
