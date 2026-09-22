"use client";

import { useState } from "react";
import { openInstallSheet, runInstallPrompt, useInstallState } from "@/components/InstallPrompt";

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-4 space-y-2.5">
      {items.map((item, index) => (
        <li className="flex gap-3 text-sm leading-6 text-muted" key={index}>
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green text-xs font-bold text-[#062113]">
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The landing-page install card. It shows the real steps for the phone the
 * visitor is actually holding, so nobody has to tap to find out how.
 */
export function InstallHint() {
  const { platform, installed, oneTap } = useInstallState();
  const [busy, setBusy] = useState(false);

  if (installed) {
    return (
      <div className="card flex items-start gap-4 p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" className="h-14 w-14 shrink-0 rounded-2xl" height={56} src="/icon.svg" width={56} />
        <div>
          <p className="font-medium">PlatePing is on your phone</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            You are using the installed app. Turn on alerts inside it so a listed plate reaches you straight away.
          </p>
        </div>
      </div>
    );
  }

  const newIos = platform === "ios-safari-26";
  const iphoneSafari = newIos || platform === "ios-safari";

  return (
    <div className="card p-5 md:p-6">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" className="h-14 w-14 shrink-0 rounded-2xl" height={56} src="/icon.svg" width={56} />
        <div className="min-w-0">
          <p className="text-lg font-semibold">Works like an app. No app store.</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            It opens full screen from its own icon, uses about 1 MB, and it is the only way an iPhone will show
            you alert banners.
          </p>
        </div>
      </div>

      {oneTap ? (
        <>
          <p className="mt-4 text-sm leading-6 text-muted">Your browser can install it in one tap.</p>
          <button
            className="btn btn-primary mt-4 !w-auto px-5"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await runInstallPrompt();
              } finally {
                setBusy(false);
              }
            }}
            type="button"
          >
            {busy ? "Opening…" : "Install PlatePing"}
          </button>
        </>
      ) : iphoneSafari ? (
        <>
          <p className="mt-4 text-sm font-medium">On this iPhone, three taps:</p>
          <Steps
            items={[
              newIos ? (
                <>
                  Tap the <span className="text-ink">three dots</span> beside the web address, then{" "}
                  <span className="text-ink">Share</span>.
                </>
              ) : (
                <>
                  Tap <span className="text-ink">Share</span>, the square with an arrow, in the bar at the bottom.
                </>
              ),
              <>
                Scroll down and tap <span className="text-ink">Add to Home Screen</span>.
              </>,
              <>
                Tap <span className="text-ink">Add</span>.
              </>,
            ]}
          />
          <button className="btn btn-ghost mt-4 !w-auto px-5" onClick={openInstallSheet} type="button">
            Show me with pictures
          </button>
        </>
      ) : (
        <button className="btn btn-primary mt-4 !w-auto px-5" onClick={openInstallSheet} type="button">
          Add to my phone
        </button>
      )}
    </div>
  );
}
