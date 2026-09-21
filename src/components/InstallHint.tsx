"use client";

import { openInstallSheet } from "@/components/InstallPrompt";

export function InstallHint() {
  return (
    <div className="card flex flex-col p-5">
      <p className="font-medium">Put PlatePing on your phone</p>
      <p className="mt-2 text-sm leading-6 text-muted">
        It installs from this page in a few taps. No App Store, no Play Store, no download. It opens full screen and
        it is the only way iPhone will show you alert banners.
      </p>
      <button className="btn btn-primary mt-5 !w-full" onClick={openInstallSheet} type="button">
        Show me how
      </button>
    </div>
  );
}
