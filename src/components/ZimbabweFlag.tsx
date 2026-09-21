/** Static flag of Zimbabwe. Kept still on purpose: no filters, no motion. */
export function ZimbabweFlag({
  className = "",
  title = "Flag of Zimbabwe",
}: {
  className?: string;
  title?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={title} className={`zw-flag shrink-0 ${className}`.trim()} height={40} src="/zimbabwe-flag.svg" width={80} />;
}
