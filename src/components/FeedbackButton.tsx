"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";

type Kind = "feature" | "bug" | "other";

const KINDS: { id: Kind; label: string }[] = [
  { id: "feature", label: "Feature idea" },
  { id: "bug", label: "Something broke" },
  { id: "other", label: "Other" },
];

const PLACEHOLDERS: Record<Kind, string> = {
  feature: "For example: let me watch a plate for one week only.",
  bug: "What did you tap, and what happened instead?",
  other: "Anything at all. Short is fine.",
};

/**
 * "Tell us what to build." Opens a small form that lands in the Feedback table
 * and, when FEEDBACK_TO_EMAIL is set, in the team's inbox.
 */
export function FeedbackButton({
  className = "btn btn-ghost !w-auto px-4 text-sm",
  label = "Request a feature",
  askEmail = true,
}: {
  className?: string;
  label?: string;
  /** Signed-in screens already know the sender, so they hide the email box. */
  askEmail?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("feature");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  function close() {
    setOpen(false);
    if (state === "sent") {
      setState("idle");
      setMessage("");
      setKind("feature");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    setError("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message,
          email: askEmail && email ? email : undefined,
          page: window.location.pathname,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setState("error");
        setError(data.error || "Could not send that. Please try again.");
        return;
      }
      setState("sent");
    } catch {
      setState("error");
      setError("No connection. Please try again when you are back online.");
    }
  }

  return (
    <>
      <button className={className} onClick={() => setOpen(true)} type="button">
        {label}
      </button>
      {open ? (
        <Sheet onClose={close} title="Tell us what to build" titleId="feedback-title">
          {state === "sent" ? (
            <>
              <p className="mt-2 text-sm leading-6 text-muted">
                Thank you. A person reads every message, and the best ideas end up in the app.
              </p>
              <button className="btn btn-primary mt-5 !w-full" onClick={close} type="button">
                Done
              </button>
            </>
          ) : (
            <form className="mt-2 space-y-3" onSubmit={submit}>
              <p className="text-sm leading-6 text-muted">
                A feature you want, something that went wrong, or anything else.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {KINDS.map((option) => (
                  <button
                    className={`btn !min-h-0 !w-full px-2 py-2 text-xs ${kind === option.id ? "btn-primary" : "btn-ghost"}`}
                    key={option.id}
                    onClick={() => setKind(option.id)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <textarea
                className="field min-h-28 resize-y"
                maxLength={2000}
                minLength={5}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={PLACEHOLDERS[kind]}
                required
                value={message}
              />
              {askEmail ? (
                <input
                  autoComplete="email"
                  className="field"
                  inputMode="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email, if you would like a reply (optional)"
                  type="email"
                  value={email}
                />
              ) : null}
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <button className="btn btn-primary !w-full" disabled={state === "sending"} type="submit">
                {state === "sending" ? "Sending…" : "Send"}
              </button>
            </form>
          )}
        </Sheet>
      ) : null}
    </>
  );
}
