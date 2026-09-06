"use client";

import { useEffect, useState } from "react";

type Alert = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  async function load() {
    const response = await fetch("/api/alerts");
    const data = (await response.json()) as { alerts: Alert[] };
    if (response.ok) {
      setAlerts(data.alerts);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead() {
    await fetch("/api/alerts", { method: "POST" });
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Alerts</h1>
        <button className="text-sm text-green" onClick={markRead} type="button">
          Mark read
        </button>
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing yet. When a watched plate hits a published list, it shows up here and we email you if
          Resend is configured.
        </p>
      ) : (
        alerts.map((alert) => (
          <div key={alert.id} className="card space-y-2 p-4">
            <p className="font-medium">{alert.title}</p>
            <p className="text-sm text-muted">{alert.body}</p>
            <p className="text-xs text-muted">{new Date(alert.createdAt).toLocaleString()}</p>
          </div>
        ))
      )}
    </div>
  );
}
