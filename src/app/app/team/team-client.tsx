"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { formatPlanUsage } from "@/lib/plans";

type Workspace = { id: string; name: string; type: string; role: string };

type Props = {
  organization: { id: string; name: string; inviteCode: string | null };
  limits: { seats: number | null; label: string };
  members: { id: string; role: string; name: string; email: string }[];
  workspaces: Workspace[];
};

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function TeamClient({ organization, limits, members, workspaces }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  // The server cannot know the address the person is browsing, so it renders
  // nothing here and the client fills it in. It never changes afterwards.
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );

  const inviteCode = organization.inviteCode;
  const inviteLink = inviteCode && origin ? `${origin}/join?code=${inviteCode}` : "";

  async function share(what: "link" | "code") {
    const text = what === "link" ? inviteLink : inviteCode ?? "";
    if (!text) {
      return;
    }
    // On a phone this opens the normal share sheet, so the invite can go
    // straight into WhatsApp.
    if (what === "link" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Join our PlatePing fleet",
          text: "Tap this to join our PlatePing workspace and see the company plates.",
          url: text,
        });
        return;
      } catch {
        // Cancelled or unsupported: fall through to copying.
      }
    }
    if (await copy(text)) {
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    }
  }

  async function switchTo(id: string) {
    setSwitching(id);
    const response = await fetch("/api/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: id }),
    });
    setSwitching(null);
    if (response.ok) {
      startTransition(() => {
        router.replace("/app");
        router.refresh();
      });
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

      {inviteCode ? (
        <div className="card p-4">
          <p className="font-medium">Invite your team</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Send this link. It opens PlatePing with the code already filled in, so they only create a login and
            tap Join.
          </p>
          <p className="mt-3 break-all rounded-xl border border-line bg-bg-2 p-3 text-xs text-muted">
            {inviteLink || "…"}
          </p>
          <button className="btn btn-primary mt-3" onClick={() => void share("link")} type="button">
            {copied === "link" ? "Link copied" : "Share the invite link"}
          </button>
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-xs text-muted">Or read them the code</p>
            <p className="mt-1 text-2xl font-semibold tracking-[0.2em]">{inviteCode}</p>
            <button className="btn btn-ghost mt-3" onClick={() => void share("code")} type="button">
              {copied === "code" ? "Code copied" : "Copy code"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">
            Anyone with this code can see the plates and alerts in this workspace. Only give it to people you
            authorise. Never share your password.
          </p>
        </div>
      ) : (
        <div className="card p-4">
          <p className="text-sm text-muted">Invite code</p>
          <p className="mt-2 text-sm text-muted">
            Ask the workspace owner for the invite link. Only the owner can see it.
          </p>
        </div>
      )}

      {workspaces.length > 1 ? (
        <div className="card p-4">
          <p className="font-medium">Your workspaces</p>
          <p className="mt-1 text-sm text-muted">You belong to more than one. Switch between them here.</p>
          <div className="mt-3 space-y-2">
            {workspaces.map((workspace) => {
              const current = workspace.id === organization.id;
              return (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg-2 p-3"
                  key={workspace.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{workspace.name}</p>
                    <p className="text-xs text-muted">
                      {workspace.type === "company" ? "Company" : "Personal"} · {workspace.role}
                    </p>
                  </div>
                  {current ? (
                    <span className="shrink-0 text-xs text-green">Open now</span>
                  ) : (
                    <button
                      className="btn btn-ghost !min-h-0 !w-auto shrink-0 px-3 py-2 text-xs"
                      disabled={switching !== null}
                      onClick={() => void switchTo(workspace.id)}
                      type="button"
                    >
                      {switching === workspace.id ? "Switching…" : "Switch"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">People here</p>
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
