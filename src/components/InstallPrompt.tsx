"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Sheet } from "@/components/Sheet";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// prompt          Android Chrome, Samsung Internet, desktop Chrome: a real one-tap install.
// ios-safari      iPhone in Safari: Apple only allows it through the Share menu.
// ios-browser     iPhone in Chrome, Firefox, Edge: their own Share menu can add it too.
// in-app-ios      Instagram, WhatsApp, Facebook etc. on iPhone: must open Safari first.
// in-app-android  Same apps on Android: one tap can hand the page to Chrome.
// android-browser Android browser without the install event: menu route.
// desktop         A computer: point them at their phone.
type Platform =
  | "prompt"
  | "ios-safari"
  | "ios-browser"
  | "in-app-ios"
  | "in-app-android"
  | "android-browser"
  | "desktop";

const OPEN_EVENT = "plateping:install-open";
const DISMISS_KEY = "plateping.install.dismissed";
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|Twitter|LinkedIn|Snapchat|BytedanceWebview|musical_ly|TikTok|Messenger|; wv\)/i;

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

function inAppName() {
  const ua = navigator.userAgent;
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/WhatsApp/i.test(ua)) return "WhatsApp";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
  if (/Messenger/i.test(ua)) return "Messenger";
  if (/TikTok|musical_ly|Bytedance/i.test(ua)) return "TikTok";
  if (/LinkedIn/i.test(ua)) return "LinkedIn";
  if (/Twitter/i.test(ua)) return "X";
  return "this app";
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const inApp = IN_APP.test(ua);
  if (ios) {
    if (inApp) {
      return "in-app-ios";
    }
    return /crios|fxios|edgios|opios|duckduckgo|brave/i.test(ua) ? "ios-browser" : "ios-safari";
  }
  if (/android/i.test(ua)) {
    return inApp ? "in-app-android" : "android-browser";
  }
  return "desktop";
}

function chromeIntentUrl() {
  const { host, pathname, search, href } = window.location;
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}

function ShareGlyph() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
      <path d="M12 15.5V4" strokeLinecap="round" />
      <path d="M8.4 7.6 12 4l3.6 3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 10.5H6a1.5 1.5 0 0 0-1.5 1.5v6.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5h-1.5" />
    </svg>
  );
}

function AddGlyph() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
      <rect height="15" rx="4" width="15" x="4.5" y="4.5" />
      <path d="M12 8.75v6.5M8.75 12h6.5" strokeLinecap="round" />
    </svg>
  );
}

function MenuGlyph() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function Step({ index, glyph, children }: { index: number; glyph?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green text-xs font-bold text-[#062113]">
        {index}
      </span>
      <span className="flex flex-1 items-start justify-between gap-3 text-sm leading-6 text-muted">
        <span className="flex-1">{children}</span>
        {glyph ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-ink">
            {glyph}
          </span>
        ) : null}
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

function CopyLinkButton({ primary = false }: { primary?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button className={`btn ${primary ? "btn-primary" : "btn-ghost"} mt-4 !w-full`} onClick={() => void copyLink()} type="button">
      {copied ? "Link copied" : "Copy the link"}
    </button>
  );
}

function SheetBody({ platform, onDone }: { platform: Platform; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

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

  if (platform === "prompt") {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-muted">
          One tap. No app store, about 1 MB, and it opens full screen with its own icon.
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
          Apple does not allow a one-tap install, so Safari does it in three taps.
        </p>
        <ol className="mt-5 space-y-4">
          <Step glyph={<ShareGlyph />} index={1}>
            Tap <span className="text-ink">Share</span>: the square with an arrow, in the bar at the bottom of the screen.
            On iPad it is at the top right.
          </Step>
          <Step glyph={<AddGlyph />} index={2}>
            Scroll down the grey list and tap <span className="text-ink">Add to Home Screen</span>.
          </Step>
          <Step index={3}>
            Tap <span className="text-ink">Add</span> at the top right. PlatePing lands next to your other apps.
          </Step>
        </ol>
        <p className="mt-5 text-xs leading-5 text-muted">
          Alert banners on iPhone only work from the home-screen app, not from a Safari tab.
        </p>
        <button className="btn btn-ghost mt-4 !w-full" onClick={onDone} type="button">
          Got it
        </button>
      </>
    );
  }

  if (platform === "ios-browser") {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-muted">
          This browser can add PlatePing to your home screen too.
        </p>
        <ol className="mt-5 space-y-4">
          <Step glyph={<ShareGlyph />} index={1}>
            Tap <span className="text-ink">Share</span>, usually at the top right next to the address.
          </Step>
          <Step glyph={<AddGlyph />} index={2}>
            Tap <span className="text-ink">Add to Home Screen</span>, then <span className="text-ink">Add</span>.
          </Step>
        </ol>
        <p className="mt-5 text-xs leading-5 text-muted">
          If you do not see that option, open this page in Safari and use its Share button.
        </p>
        <CopyLinkButton />
      </>
    );
  }

  if (platform === "in-app-ios") {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-muted">
          You are inside {inAppName()}, which cannot add apps to the home screen. Open the page in Safari first.
        </p>
        <ol className="mt-5 space-y-4">
          <Step glyph={<MenuGlyph />} index={1}>
            Tap the menu or share button in the corner and choose <span className="text-ink">Open in Safari</span>, or
            copy the link below and paste it into Safari.
          </Step>
          <Step glyph={<ShareGlyph />} index={2}>
            In Safari tap <span className="text-ink">Share</span>, then <span className="text-ink">Add to Home Screen</span>.
          </Step>
        </ol>
        <CopyLinkButton primary />
      </>
    );
  }

  if (platform === "in-app-android") {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-muted">
          You are inside {inAppName()}, which cannot install apps. Chrome can, in one tap.
        </p>
        <a className="btn btn-primary mt-5 !w-full" href={chromeIntentUrl()}>
          Open in Chrome
        </a>
        <p className="mt-3 text-xs leading-5 text-muted">
          If nothing happens, copy the link and paste it into Chrome.
        </p>
        <CopyLinkButton />
      </>
    );
  }

  if (platform === "android-browser") {
    return (
      <>
        <p className="mt-2 text-sm leading-6 text-muted">Two taps from the browser menu.</p>
        <ol className="mt-5 space-y-4">
          <Step glyph={<MenuGlyph />} index={1}>
            Tap the menu, the three dots at the top right.
          </Step>
          <Step glyph={<AddGlyph />} index={2}>
            Tap <span className="text-ink">Add to Home screen</span> or <span className="text-ink">Install app</span>.
          </Step>
        </ol>
        <button className="btn btn-ghost mt-5 !w-full" onClick={onDone} type="button">
          Got it
        </button>
      </>
    );
  }

  return (
    <>
      <p className="mt-2 text-sm leading-6 text-muted">
        PlatePing is built for a phone. Open this page on your iPhone or Android and tap Add to phone there.
      </p>
      <CopyLinkButton primary />
    </>
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
    if (!platform || platform === "desktop") {
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
  const oneTap = platform === "prompt";

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
            <img alt="" className="h-10 w-10 rounded-xl" height={40} src="/icon-192.png" width={40} />
            <div className="flex-1">
              <p className="text-sm font-medium">Get PlatePing on your phone</p>
              <p className="text-xs text-muted">{oneTap ? "One tap. Needed for alert banners." : "Opens full screen. Needed for alert banners."}</p>
            </div>
            <button className="btn btn-primary !w-auto !min-h-0 px-3 py-2 text-sm" onClick={() => setOpen(true)} type="button">
              {oneTap ? "Install" : "Add"}
            </button>
            <button aria-label="Not now" className="px-1 text-xl leading-none text-muted" onClick={dismiss} type="button">
              ×
            </button>
          </div>
        </div>
      ) : null}
      {open ? (
        <Sheet onClose={() => setOpen(false)} title="Put PlatePing on your phone" titleId="install-sheet-title">
          <SheetBody onDone={() => setOpen(false)} platform={platform} />
        </Sheet>
      ) : null}
    </>
  );
}

/** Header or footer button. Renders nothing once the app is installed. */
export function InstallButton({
  className = "",
  variant = "button",
}: {
  className?: string;
  variant?: "button" | "primary" | "link";
}) {
  const platform = useInstallPlatform();
  if (!platform) {
    return null;
  }
  const label = platform === "desktop" ? "Get the app" : platform === "prompt" ? "Install the app" : "Add to phone";
  const base =
    variant === "link"
      ? ""
      : variant === "primary"
        ? "btn btn-primary !w-auto px-5"
        : "btn btn-ghost !w-auto px-4 text-sm";
  return (
    <button className={`${base} ${className}`.trim()} onClick={openInstallSheet} type="button">
      {label}
    </button>
  );
}
