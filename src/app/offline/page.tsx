import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline — PlatePing",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="phone-shell flex min-h-dvh flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">You are offline</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        PlatePing needs data to read the published ZRP lists. Your watched plates are still saved. Reconnect and
        pull down to try again.
      </p>
      <a className="btn btn-primary mt-6" href="/app">
        Try again
      </a>
      <p className="mt-6 text-xs leading-5 text-muted">
        PlatePing is a notification service only. We cannot take a fine payment.
      </p>
    </div>
  );
}
