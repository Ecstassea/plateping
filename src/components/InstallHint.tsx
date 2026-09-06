"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void> };

function isIos() {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === "undefined") {
    return false;
  }
  const safariStandalone = "standalone" in window.navigator && window.navigator.standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || safariStandalone;
}

export function InstallHint() {
  const [ios, setIos] = useState(false);
  const [androidPrompt, setAndroidPrompt] = useState<InstallEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setHidden(true);
      return;
    }
    setIos(isIos());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setAndroidPrompt(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden) {
    return null;
  }

  async function installAndroid() {
    if (!androidPrompt) {
      return;
    }
    await androidPrompt.prompt();
    setAndroidPrompt(null);
    setHidden(true);
  }

  if (androidPrompt) {
    return (
      <div className="card mt-4 p-4">
        <p className="font-medium">Install on Android</p>
        <p className="mt-1 text-sm text-muted">Add PlatePing to your home screen. It opens like a normal app.</p>
        <button className="btn btn-primary mt-3" onClick={installAndroid} type="button">
          Add to home screen
        </button>
      </div>
    );
  }

  if (ios) {
    return (
      <div className="card mt-4 p-4">
        <p className="font-medium">Install on iPhone</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Tap the Share button, then <span className="text-ink">Add to Home Screen</span>. It will sit next to your other
          apps and open full screen.
        </p>
      </div>
    );
  }

  return (
    <div className="card mt-4 p-4">
      <p className="font-medium">Works on iPhone and Android</p>
      <p className="mt-1 text-sm leading-6 text-muted">
        Open this site in Safari or Chrome, then add it to your home screen. No App Store or Play Store needed.
      </p>
    </div>
  );
}
