import Link from "next/link";
import type { BallEvent } from "@/lib/provider";
import { Empty } from "@/components/ui";
import type { Dict } from "@/app/[lang]/dictionaries";

type Over = { inning: string; over: number; balls: BallEvent[] };

// Group the flat ball list (oldest first) into overs, keeping their order.
function toOvers(commentary: BallEvent[]): Over[] {
  const overs: Over[] = [];
  for (const b of commentary) {
    const last = overs.at(-1);
    if (last && last.inning === b.inning && last.over === b.over) last.balls.push(b);
    else overs.push({ inning: b.inning, over: b.over, balls: [b] });
  }
  return overs;
}

const chipCls = (label: string) =>
  label === "W" ? "bg-red-600 text-white"
    : label === "6" ? "bg-emerald-600 text-white"
      : label === "4" ? "bg-sky-600 text-white"
        : /[a-z]/.test(label) ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
          : "bg-raised";

const Chip = ({ label }: { label: string }) => (
  <span className={`grid h-7 min-w-7 shrink-0 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${chipCls(label)}`}>{label}</span>
);

const outcome = (b: BallEvent) => (b.wicket ? "OUT" : b.label === "4" ? "FOUR" : b.label === "6" ? "SIX" : b.runs === 1 ? "1 run" : `${b.runs} runs`);

// Ball-by-ball commentary, from the match data the page already has (no extra API request).
// Two views via ?view=: "live" (every ball, newest first) and "over" (one row per over). Refreshes with the page.
export function CommentaryTab({ commentary, view, lang, id, dict }: { commentary: BallEvent[]; view: "live" | "over"; lang: string; id: string; dict: Dict["match"] }) {
  if (commentary.length === 0) return <Empty>{dict.noCommentary}</Empty>;
  const overs = toOvers(commentary).reverse(); // newest over first

  const tab = (v: "live" | "over", label: string) => (
    <Link
      href={`/${lang}/match/${id}?tab=commentary&view=${v}`}
      scroll={false}
      aria-current={view === v ? "page" : undefined}
      className="rounded-full px-4 py-1.5 text-sm font-semibold text-muted aria-[current=page]:bg-accent aria-[current=page]:text-white"
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 self-start rounded-full bg-raised p-1">
        {tab("live", dict.commentaryLive)}
        {tab("over", dict.commentaryOver)}
      </div>

      {view === "over" ? (
        <div className="surface divide-y divide-border">
          {overs.map((o) => {
            const runs = o.balls.reduce((s, b) => s + b.runs, 0);
            const wkts = o.balls.filter((b) => b.wicket).length;
            return (
              <div key={`${o.inning}-${o.over}`} className="flex items-center gap-3 px-4 py-3">
                <span className="w-12 shrink-0 text-sm font-semibold text-muted">{dict.over.replace("{n}", String(o.over))}</span>
                <div className="flex flex-1 flex-wrap gap-1.5">{o.balls.map((b, i) => <Chip key={i} label={b.label} />)}</div>
                <span className="shrink-0 text-sm tabular-nums"><b>{runs}</b> <span className="text-muted">{wkts ? `· ${wkts}${dict.wktShort}` : ""}</span></span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {overs.map((o) => (
            <section key={`${o.inning}-${o.over}`} className="surface overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-sm">
                <span className="font-semibold">{dict.over.replace("{n}", String(o.over))}</span>
                <span className="truncate text-muted">{o.balls[0]?.bowler}</span>
              </div>
              <ul className="divide-y divide-border">
                {[...o.balls].reverse().map((b, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <Chip label={b.label} />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="text-muted">{b.bowler} {dict.commentaryTo} </span>
                      <span className="font-medium">{b.batsman}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">{outcome(b)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
