"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type Summary = {
  code: string;
  perReward: number;
  rewardMonths: number;
  signups: number;
  monthsEarned: number;
  towardsNext: number;
  needed: number;
  rewards: { atReferralCount: number; months: number; pending: boolean; periodEnd: string | null }[];
  signupList: { email: string; counted: boolean; createdAt: string }[];
};

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Invite friends, earn free months. Shown on the Plan tab. */
export function ReferralCard() {
  const [data, setData] = useState<Summary | null>(null);
  const [copied, setCopied] = useState(false);
  const [showList, setShowList] = useState(false);
  // The server cannot know the address being browsed; the client fills it in.
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/referrals", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) {
          setData(json as Summary);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="card p-4">
        <p className="font-medium">Invite friends, get free months</p>
        <p className="mt-1 text-sm text-muted">Loading your link…</p>
      </div>
    );
  }

  const link = origin ? `${origin}/?ref=${data.code}` : "";
  const pct = Math.round((data.towardsNext / data.perReward) * 100);

  async function share() {
    if (!link) {
      return;
    }
    const message = `I use PlatePing to know if my number plate lands on a ZRP camera list. Free to check a plate: ${link}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "PlatePing", text: message, url: link });
        return;
      } catch {
        // Cancelled: fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium">Invite friends, get free months</p>
        <p className="text-sm text-green">
          {data.monthsEarned} earned
        </p>
      </div>
      <p className="mt-1 text-sm leading-6 text-muted">
        Every {data.perReward} people who sign up with your link give you {data.rewardMonths} free month. There is
        no limit.
      </p>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {data.signups} {data.signups === 1 ? "sign-up" : "sign-ups"}
          </span>
          <span>
            {data.needed} more for the next free month
          </span>
        </div>
        <div className="progress mt-2" role="progressbar" aria-valuemin={0} aria-valuemax={data.perReward} aria-valuenow={data.towardsNext}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p className="mt-4 break-all rounded-xl border border-line bg-bg-2 p-3 text-xs text-muted">{link || "…"}</p>
      <button className="btn btn-primary mt-3" onClick={() => void share()} type="button">
        {copied ? "Link copied" : "Share my link"}
      </button>

      {data.signupList.length > 0 ? (
        <>
          <button
            className="mt-4 text-sm text-green"
            onClick={() => setShowList((open) => !open)}
            type="button"
          >
            {showList ? "Hide who joined" : `See who joined (${data.signupList.length})`}
          </button>
          {showList ? (
            <div className="mt-3 space-y-2">
              {data.signupList.map((s) => (
                <div className="flex items-center justify-between gap-3 text-xs" key={`${s.email}-${s.createdAt}`}>
                  <span className={s.counted ? "text-ink" : "text-muted line-through"}>{s.email}</span>
                  <span className="text-muted">{shortDate(s.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-xs leading-5 text-muted">
          Nobody has joined yet. Send the link to people who drive in Harare.
        </p>
      )}

      {data.rewards.some((r) => r.pending) ? (
        <p className="mt-3 text-xs text-gold">
          You have a free month waiting. It applies to the next workspace you own.
        </p>
      ) : null}

      <p className="mt-3 text-xs leading-5 text-muted">
        Free months are for real people signing up. Accounts made to collect rewards are removed and do not
        count.
      </p>
    </div>
  );
}
