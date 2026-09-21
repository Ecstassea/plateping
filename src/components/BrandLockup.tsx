import Link from "next/link";

export function BrandLockup({
  compact = false,
  href,
}: {
  compact?: boolean;
  href?: string;
}) {
  const mark = (
    <span className="flex flex-col">
      <span
        className={
          compact ? "text-xs uppercase tracking-[0.2em] text-green" : "text-lg font-semibold tracking-tight"
        }
      >
        {compact ? (
          "PlatePing"
        ) : (
          <>
            Plate<span className="text-green">Ping</span>
          </>
        )}
      </span>
      <span
        className={
          compact
            ? "mt-0.5 text-[9px] uppercase tracking-[0.16em] text-muted"
            : "hidden text-[10px] uppercase tracking-[0.18em] text-muted sm:block"
        }
      >
        An Ecstassea product
      </span>
    </span>
  );

  if (!href) {
    return mark;
  }

  return <Link href={href}>{mark}</Link>;
}
