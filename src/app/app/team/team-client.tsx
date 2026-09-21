"use client";

import { useState } from "react";
import { formatPlanUsage } from "@/lib/plans";

type Props = {
  organization: { name: string; inviteCode: string | null };
  limits: { seats: number | null; label: string };
  members: { id: string; role: string; name: string; email: string }[];
};

export function TeamClient({ organization, limits, members }: Props) {
  const [copied, setCopied] = useState(false);
  const inviteCode = organization.inviteCode;

  async function copy() {
    if (!inviteCode) {
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is unavailable in some in-app browsers; the code is on screen anyway.
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{organization.name}</h1>
        <p className="text-sm text-muted">
          {limits.label} · {formatPlanUsage(members.length, limits.seats, "seats")}
        </p>
      </div>

      <div className="card p-4">
        <p className="text-sm text-muted">Invite code</p>
        {inviteCode ? (
          <>
            <p className="mt-1 text-2xl font-semibold tracking-[0.2em]">{inviteCode}</p>
            <button className="btn btn-ghost mt-3" onClick={copy} type="button">
              {copied ? "Copied" : "Copy code"}
            </button>
            <p className="mt-3 text-xs text-muted">
              Teammates create their own login, then join at /join with this code. Everyone in this
              workspace sees the same watched plates and alerts. Only give the code to people you
              authorise. Do not share your password.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Ask the workspace owner for the invite code. You cannot see it unless you are the owner.
          </p>
        )}
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="card p-4">
            <p className="font-medium">{member.name}</p>
            <p className="text-sm text-muted">{member.email}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-green">{member.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
