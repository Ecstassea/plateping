"use client";

import { useEffect } from "react";

export function PwaProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;

    const register = async () => {
      try {
        // updateViaCache: "none" stops the browser from serving a stale worker
        // from HTTP cache, which is how installed apps get stuck on old builds.
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      } catch {
        // Install still works on iPhone without a service worker.
      }
    };

    // A home-screen app can stay open for days. Check for a new build whenever
    // the user comes back to it.
    const checkForUpdate = () => {
      if (registration && document.visibilityState === "visible") {
        void registration.update().catch(() => undefined);
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", () => void register(), { once: true });
    }

    document.addEventListener("visibilitychange", checkForUpdate);
    return () => document.removeEventListener("visibilitychange", checkForUpdate);
  }, []);

  return null;
}
