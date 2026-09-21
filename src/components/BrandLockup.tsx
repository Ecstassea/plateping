import Link from "next/link";

export function BrandLockup({
  compact = false,
  href,
  icon = false,
}: {
  compact?: boolean;
  href?: string;
  /** Show the plate app icon beside the name. */
  icon?: boolean;
}) {
  const mark = (
    <span className="flex items-center gap-2.5">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="h-8 w-8 rounded-lg" height={32} src="/icon.svg" width={32} />
      ) : null}
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
    </span>
  );

  if (!href) {
    return mark;
  }

  return <Link href={href}>{mark}</Link>;
}
