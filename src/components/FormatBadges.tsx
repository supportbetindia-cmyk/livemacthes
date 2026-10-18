import type { Series } from "@/lib/provider";

// "2 TEST" "3 ODI" "5 T20" pills for a series.
export function FormatBadges({ series }: { series: Series }) {
  const items = (
    [
      ["Test", series.test],
      ["ODI", series.odi],
      ["T20", series.t20],
    ] as const
  ).filter(([, n]) => n > 0);
  return (
    <div className="hidden shrink-0 gap-1.5 sm:flex">
      {items.map(([label, n]) => (
        <span key={label} className="rounded-md bg-raised px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          {n} {label}
        </span>
      ))}
    </div>
  );
}
