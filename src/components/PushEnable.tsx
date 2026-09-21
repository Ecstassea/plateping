"use client";

import { useEffect, useState } from "react";

const SYNC_KEY = "plateping.push.synced";
const SYNC_TTL_MS = 24 * 60 * 60 * 1000;
// Inlined at build time, so the usual launch needs no request just to learn the key.
const INLINE_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function vapidKey() {
  if (INLINE_VAPID_KEY) {
    return INLINE_VAPID_KEY;
  }
  const response = await fetch("/api/push/subscribe");
  const data = (await response.json()) as { publicKey?: string };
  return data.publicKey ?? "";
}

// PwaProvider registers the worker on load; wait for that one rather than
// racing it with a second registration.
async function serviceWorker() {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("service worker not ready")), 4000);
  });
  try {
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } catch {
    return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  }
}

type SyncMarker = { endpoint: string; userId: string; at: number };

function recentlySynced(endpoint: string, userId: string) {
  try {
    const raw = window.localStorage.getItem(SYNC_KEY);
    if (!raw) {
      return false;
    }
    const saved = JSON.parse(raw) as Partial<SyncMarker>;
    return (
      saved.endpoint === endpoint &&
      saved.userId === userId &&
      typeof saved.at === "number" &&
      Date.now() - saved.at < SYNC_TTL_MS
    );
  } catch {
    return false;
  }
}

function rememberSynced(endpoint: string, userId: string) {
  try {
    const marker: SyncMarker = { endpoint, userId, at: Date.now() };
    window.localStorage.setItem(SYNC_KEY, JSON.stringify(marker));
  } catch {
    // Private mode: the subscription is simply re-sent next launch.
  }
}

function forgetMarker() {
  try {
    window.localStorage.removeItem(SYNC_KEY);
  } catch {
    // Nothing stored.
  }
}

async function savePushSubscription(userId: string) {
  try {
    const registration = await serviceWorker();
    const existing = await registration.pushManager.getSubscription();
    // Already on the server for this person and this device: no request needed.
    if (existing && recentlySynced(existing.endpoint, userId)) {
      return true;
    }

    const key = await vapidKey();
    if (!key) {
      return false;
    }

    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      }));

    const save = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    if (save.ok) {
      rememberSynced(subscription.endpoint, userId);
    }
    return save.ok;
  } catch {
    return false;
  }
}

/**
 * Called on sign-out: detaches this device from the account on the server and in
 * the browser, so alerts for the previous person stop arriving on a shared phone.
 */
export async function forgetPushSubscription() {
  forgetMarker();
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) {
      return;
    }
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
      keepalive: true,
    }).catch(() => undefined);
    await subscription.unsubscribe().catch(() => undefined);
  } catch {
    // Best effort; the server-side row is also dropped when a push bounces.
  }
}

type Status = "hidden" | "ask" | "on" | "blocked";

function pushSupported() {
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

// Reads the browser's permission state and, when already granted, makes sure
// the server knows this device.
async function resolveStatus(userId: string): Promise<Status> {
  if (!pushSupported()) {
    return "hidden";
  }
  if (Notification.permission === "denied") {
    return "blocked";
  }
  if (Notification.permission === "granted") {
    return (await savePushSubscription(userId)) ? "on" : "ask";
  }
  return "ask";
}

export function PushEnable({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Status>("hidden");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void resolveStatus(userId).then((next) => {
      if (!cancelled) {
        setStatus(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("blocked");
        return;
      }
      setStatus((await savePushSubscription(userId)) ? "on" : "blocked");
    } finally {
      setBusy(false);
    }
  }

  if (status === "hidden") {
    return null;
  }

  if (status === "on") {
    return <p className="px-5 pb-2 text-xs text-muted">Phone alerts are on for this device.</p>;
  }

  if (status === "blocked") {
    return (
      <p className="px-5 pb-2 text-xs text-muted">
        Phone banners are blocked in browser settings. Alerts still appear in the app when you open it.
      </p>
    );
  }

  return (
    <div className="px-5 pb-3">
      <button className="btn btn-ghost text-sm" disabled={busy} onClick={() => void enable()} type="button">
        {busy ? "Turning on…" : "Turn on phone alerts"}
      </button>
      <p className="mt-2 text-xs leading-5 text-muted">
        Best after Add to Home Screen. On iPhone this only works from the home-screen app, not from Safari
        tabs.
      </p>
    </div>
  );
}
