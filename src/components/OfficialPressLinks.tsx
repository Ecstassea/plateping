import { OFFICIAL_ZRP_LIST_STATEMENT, OFFICIAL_ZRP_SCAM_STATEMENT } from "@/lib/plates";

export function OfficialPressLinks({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <a
        className="text-green underline"
        href={OFFICIAL_ZRP_LIST_STATEMENT.href}
        rel="noreferrer"
        target="_blank"
      >
        {OFFICIAL_ZRP_LIST_STATEMENT.shortLabel}
      </a>
      <a
        className="mt-2 block text-green underline"
        href={OFFICIAL_ZRP_SCAM_STATEMENT.href}
        rel="noreferrer"
        target="_blank"
      >
        {OFFICIAL_ZRP_SCAM_STATEMENT.shortLabel}
      </a>
    </div>
  );
}
