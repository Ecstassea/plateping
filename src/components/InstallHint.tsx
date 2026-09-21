"use client";

import { openInstallSheet } from "@/components/InstallPrompt";

export function InstallHint() {
  return (
    <div className="card flex items-start gap-4 p-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="h-16 w-16 shrink-0 rounded-2xl" height={64} src="/icon.svg" width={64} />
      <div className="flex-1">
        <p className="font-medium">Works like an app. No app store.</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          One tap on Android, three taps on iPhone. It opens full screen from its own icon, and it is the only way
          an iPhone will show you alert banners.
        </p>
        <button className="btn btn-primary mt-4 !w-auto px-5" onClick={openInstallSheet} type="button">
          Add to my phone
        </button>
      </div>
    </div>
  );
}
