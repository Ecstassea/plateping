"use client";

import { useEffect } from "react";

export const REFERRAL_STORAGE_KEY = "plateping.ref";

/** Reads a referral code from the current URL, without needing Suspense. */
function codeFromUrl() {
  try {
    const code = new URLSearchParams(window.location.search).get("ref") ?? "";
    return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  } catch {
    return "";
  }
}

/** The code someone arrived with, whether it is still in the URL or not. */
export function storedReferralCode() {
  if (typeof window === "undefined") {
    return "";
  }
  const fromUrl = codeFromUrl();
  if (fromUrl.length >= 5) {
    return fromUrl;
  }
  try {
    const saved = window.localStorage.getItem(REFERRAL_STORAGE_KEY) ?? "";
    return saved.length >= 5 ? saved : "";
  } catch {
    return "";
  }
}

/**
 * Someone arriving on a referral link rarely signs up on that first screen.
 * This remembers the code so the person who shared it still gets credit when
 * the account is finally created.
 */
export function ReferralCapture() {
  useEffect(() => {
    const code = codeFromUrl();
    if (code.length < 5) {
      return;
    }
    try {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, code);
    } catch {
      // Private mode: the code still works while it stays in the URL.
    }
  }, []);

  return null;
}
