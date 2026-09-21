"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "prompt" | "ios-safari" | "ios-other" | "android-other" | "desktop";

const OPEN_EVENT = "plateping:install-open";
const DISMISS_KEY = "plateping.install.dismissed";

// The browser fires beforeinstallprompt once, often before React has hydrated,
// so it is captured at module scope and read back through an external store.
let deferredPrompt: InstallEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    justInstalled = true;
    emit();
  });
}

export function openInstallSheet() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
}

function isStandalone() {
  if (typeof window === "undefined") {
    return false;
  }
  const iosStandalone = "standalone" in window.navigator && window.navigator.standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) {
    // Only Safari's share sheet reliably offers Add to Home Screen on iOS.
    return /crios|fxios|edgios|opios|duckduckgo/i.test(ua) ? "ios-other" : "ios-safari";
  }
  if (/android/i.test(ua)) {
    return "android-other";
  }
  return "desktop";
}

function ShareGlyph() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
      <path d="M12 15.5V4" strokeLinecap="round" />
      <path d="M8.4 7.6 12 4l3.6 3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 10.5H6a1.5 1.5 0 0 0-1.5 1.5v6.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5h-1.5" />
    </svg>
  );
}

function AddGlyph() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
      <rect height="15" rx="4" width="15" x="4.5" y="4.5" />
      <path d="M12 8.75v6.5M8.75 12h6.5" strokeLinecap="round" />
    </svg>
  );
}

function Step({ index, glyph, children }: { index: number; glyph?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green text-xs font-bold text-[#062113]">
        {index}
      </span>
      <span className="flex flex-1 items-start gap-2 text-sm leading-6 text-muted">
        <span className="flex-1">{children}</span>
        {glyph ? <span className="mt-0.5 shrink-0 text-ink">{glyph}</span> : null}
      </span>
    </li>
  );
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", onChange);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onChange);
  };
}

/** "installed" means there is nothing to offer: hide every install surface. */
function getSnapshot(): Platform | "installed" {
  if (justInstalled || isStandalone()) {
    return "installed";
  }
  return deferredPrompt ? "prompt" : detectPlatform();
}

function useInstallPlatform(): Platform | null {
  // The server cannot know whether the app is already installed, so it renders
  // nothing and the client fills it in after hydration.
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "installed" as const);
  return snapshot === "installed" ? null : snapshot;
}

function SheetBody({ platform, onDone }: { platform: Platform; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const runPrompt = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }
    setBusy(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        deferredPrompt = null;
        emit();
        onDone();
      }
    } finally {
      setBusy(false);
    }
  }, [onDone]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (platform === "prompt") {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-muted">
          PlatePing installs straight to your home screen. No Play Store, about 1 MB, and it opens full screen.
        </p>
        <button className="btn btn-primary mt-5 !w-full" disabled={busy} onClick={() => void runPrompt()} type="button">
          {busy ? "Opening…" : "Install PlatePing"}
        </button>
      </>
    );
  }

  if (platform === "ios-safari") {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-muted">
          iPhone does not allow a one-tap install, so Safari asks you to do it. It takes three taps.
        </p>
        <ol className="mt-5 space-y-4">
          <Step glyph={<ShareGlyph />} index={1}>
            Tap the <span className="text-ink">Share</span> button in the bar at the bottom of Safari. On iPad it is
            at the top right.
          </Step>
          <Step glyph={<AddGlyph />} index={2}>
            Scroll the grey list and tap <span className="text-ink">Add to Home Screen</span>.
          </Step>
          <Step index={3}>
            Tap <span className="text-ink">Add</span>. PlatePing lands next to your other apps.
          </Step>
        </ol>
        <p className="mt-5 text-xs leading-5 text-muted">
          Phone alert banners only work once PlatePing is on the home screen. Apple does not allow them from a Safari
          tab.
        </p>
        <button className="btn btn-ghost mt-4 !w-full" onClick={onDone} type="button">
          Got it
        </button>
      </>
    );
  }

  if (platform === "ios-other") {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-muted">
          You are in another browser. On iPhone, only Safari installs an app that can send you alert banners.
        </p>
        <ol className="mt-5 space-y-4">
          <Step index={1}>Open Safari and go to this address.</Step>
          <Step glyph={<ShareGlyph />} index={2}>
            Tap <span className="text-ink">Share</span>, then <span className="text-ink">Add to Home Screen</span>.
          </Step>
        </ol>
        <button className="btn btn-primary mt-5 !w-full" onClick={() => void copyLink()} type="button">
          {copied ? "Link copied. Paste it into Safari." : "Copy the link"}
        </button>
      </>
    );
  }

  if (platform === "android-other") {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-muted">
          Open the browser menu, the three dots at the top right, then tap{" "}
          <span className="text-ink">Add to Home screen</span> or <span className="text-ink">Install app</span>.
        </p>
        <button className="btn btn-ghost mt-5 !w-full" onClick={onDone} type="button">
          Got it
        </button>
      </>
    );
  }

  return (
    <>
      <p className="mt-2 text-sm leading-6 text-muted">
        PlatePing is built for a phone. Open this page on your iPhone or Android and add it to the home screen.
      </p>
      <button className="btn btn-primary mt-5 !w-full" onClick={() => void copyLink()} type="button">
        {copied ? "Link copied" : "Copy the link"}
      </button>
    </>
  );
}

function InstallSheet({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      aria-labelledby="install-sheet-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl border border-line bg-bg-2 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold" id="install-sheet-title">
            Add PlatePing to your home screen
          </h2>
          <button aria-label="Close" className="-mt-1 p-1 text-2xl leading-none text-muted" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <SheetBody onDone={onClose} platform={platform} />
      </div>
    </div>
  );
}

/** Sticky prompt plus the shared sheet. Mount once, near the root. */
export function InstallPrompt() {
  const platform = useInstallPlatform();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [barVisible, setBarVisible] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!platform) {
      return;
    }
    try {
      if (window.localStorage.getItem(DISMISS_KEY)) {
        return;
      }
    } catch {
      // Private mode. Show the bar anyway.
    }
    // Let the page paint first so the bar never pushes the fold around.
    const timer = setTimeout(() => setBarVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [platform]);

  function dismiss() {
    setBarVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Nothing to remember. The bar returns next visit.
    }
  }

  if (!platform) {
    return null;
  }

  const overTabBar = pathname === "/app" || pathname.startsWith("/app/");

  return (
    <>
      {barVisible ? (
        <div
          className={`fixed inset-x-0 z-40 mx-auto w-full max-w-[430px] px-4 ${
            overTabBar ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]" : "bottom-[max(1rem,env(safe-area-inset-bottom))]"
          }`}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="h-9 w-9 rounded-lg" height={36} src="/icon-192.png" width={36} />
            <div className="flex-1">
              <p className="text-sm font-medium">Install PlatePing</p>
              <p className="text-xs text-muted">Opens full screen. Needed for alert banners.</p>
            </div>
            <button className="btn btn-primary !w-auto !min-h-0 px-3 py-2 text-sm" onClick={() => setOpen(true)} type="button">
              Add
            </button>
            <button aria-label="Not now" className="px-1 text-xl leading-none text-muted" onClick={dismiss} type="button">
              ×
            </button>
          </div>
        </div>
      ) : null}
      {open ? <InstallSheet onClose={() => setOpen(false)} platform={platform} /> : null}
    </>
  );
}

/** Header button. Renders nothing once the app is installed. */
export function InstallButton({ className = "" }: { className?: string }) {
  const platform = useInstallPlatform();
  if (!platform) {
    return null;
  }
  return (
    <button className={`btn btn-ghost !w-auto px-4 text-sm ${className}`} onClick={openInstallSheet} type="button">
      Add to phone
    </button>
  );
}
