"use client";

import { useEffect } from "react";

const KEY = "plateping.warm";

/** Wakes the database once per visit, in the background, so the first check is quick. */
export function WarmUp() {
  useEffect(() => {
    try {
      const last = Number(window.sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last < 4 * 60 * 1000) {
        return;
      }
      window.sessionStorage.setItem(KEY, String(Date.now()));
    } catch {
      // Private mode: warm anyway.
    }
    void fetch("/api/health", { cache: "no-store", keepalive: true }).catch(() => undefined);
  }, []);
  return null;
}
