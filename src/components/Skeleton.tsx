export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-line/70 ${className}`} />;
}

/** Shared shape for the signed-in tabs so a tap paints instantly. */
export function ScreenSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-5" role="status" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton className="h-24 w-full" key={index} />
        ))}
      </div>
    </div>
  );
}
