"use client";

import Link from "next/link";
import { CheckForm } from "@/components/CheckForm";

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
          <p className="text-xs text-muted">Plates</p>
          <p className="text-2xl font-semibold">{vehicleCount}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">Flagged</p>
          <p className="text-2xl font-semibold text-danger">{flaggedCount}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-muted">Alerts</p>
          <p className="text-2xl font-semibold text-gold">{unread}</p>
        </div>
      </div>

      <div className="card p-4">
        <p className="mb-3 font-medium">Check a registration</p>
        <CheckForm compact />
      </div>

      <Link href="/app/vehicles" className="btn btn-primary">
        Watch a plate
      </Link>

      <p className="text-xs text-muted">
        Last list sync: {lastSync ? new Date(lastSync).toLocaleString() : "not yet. Open Plan or wait for the cron."}
      </p>
    </div>
  );
}
