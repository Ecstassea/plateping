"use client";

import Link from "next/link";
import { CheckForm } from "@/components/CheckForm";
import { FeedbackButton } from "@/components/FeedbackButton";

type Props = {
  name: string;
  planLabel: string;
  entitled: boolean;
  trialEnds: string | null;
  vehicleCount: number;
  flaggedCount: number;
  unread: number;
  lastSync: string | null;
};

export function HomeClient({
  name,
  planLabel,
  entitled,
  trialEnds,
  vehicleCount,
  flaggedCount,
  unread,
  lastSync,
}: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Hi {name.split(" ")[0]}</h1>
        <p className="text-sm text-muted">
          {planLabel}
          {entitled && trialEnds ? ` · trial until ${new Date(trialEnds).toLocaleDateString()}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3">
          <p className="text-xs text-muted">Watched</p>
          <p className="text-2xl font-semibold">{vehicleCount}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">On a list</p>
          <p className="text-2xl font-semibold text-danger">{flaggedCount}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">Unread</p>
          <p className="text-2xl font-semibold text-gold">{unread}</p>
        </div>
      </div>

      <div className="card p-4">
        <p className="mb-3 font-medium">Check a registration</p>
        <CheckForm compact />
      </div>

      <Link className="btn btn-primary" href="/app/vehicles" transitionTypes={["tab-forward"]}>
        Watch a plate
      </Link>

      <p className="text-xs leading-5 text-muted">
        {lastSync
          ? `Lists last checked ${new Date(lastSync).toLocaleString("en-GB", { timeZone: "Africa/Harare" })}.`
          : "Lists have not been checked yet. The owner can refresh them from the Plan tab."}{" "}
        PlatePing only notifies you. It never takes a fine payment.
      </p>

      <div className="card flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-medium">Missing something?</p>
          <p className="text-xs text-muted">Tell us what to build next.</p>
        </div>
        <FeedbackButton askEmail={false} className="btn btn-ghost !w-auto !min-h-0 px-3 py-2 text-xs" label="Send an idea" />
      </div>
    </div>
  );
}
