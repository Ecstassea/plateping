import { ViewTransition, type ReactNode } from "react";

// Tab taps carry one of these transition types (see AppShell); everything else
// (a Suspense reveal, back/forward, router.refresh) falls through to `default`.
const DIRECTIONAL = { "tab-forward": "tab-forward", "tab-back": "tab-back" } as const;

/** Wraps a signed-in page: tab taps slide sideways, data reveals fade in. */
export function TabScreen({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      default="none"
      enter={{ ...DIRECTIONAL, default: "screen-in" }}
      exit={{ ...DIRECTIONAL, default: "none" }}
    >
      <div>{children}</div>
    </ViewTransition>
  );
}

/** Wraps a loading.tsx skeleton: slides in like the page will, fades out when data lands. */
export function TabSkeleton({ children }: { children: ReactNode }) {
  return (
    <ViewTransition default="none" enter={{ ...DIRECTIONAL, default: "none" }} exit="screen-out">
      <div>{children}</div>
    </ViewTransition>
  );
}
