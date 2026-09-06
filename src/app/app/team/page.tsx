"use client";

import { useEffect, useState } from "react";

type TeamData = {
  organization: { name: string; type: string; inviteCode: string };
  role: string;
  limits: { seats: number; label: string };
  members: { id: string; role: string; name: string; email: string }[];
};

export default function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/team")
      .then((response) => response.json())
      .then((json) => setData(json as TeamData));
  }, []);

  if (!data) {
    return <p className="text-sm text-muted">Loading team…</p>;
  }

  const inviteCode = data.organization.inviteCode;

  async function copy() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{data.organization.name}</h1>
        <p className="text-sm text-muted">
          {data.limits.label} · {data.members.length}/{data.limits.seats} seats
        </p>
      </div>

      <div className="card p-4">
        <p className="text-sm text-muted">Invite code</p>
        <p className="mt-1 text-2xl font-semibold tracking-[0.2em]">{data.organization.inviteCode}</p>
        <button className="btn btn-ghost mt-3" onClick={copy} type="button">
          {copied ? "Copied" : "Copy code"}
        </button>
        <p className="mt-3 text-xs text-muted">
          Teammates create their own login, then join at /join with this code. Everyone sees the same
          watched plates and alerts.
        </p>
      </div>

      <div className="space-y-3">
        {data.members.map((member) => (
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
