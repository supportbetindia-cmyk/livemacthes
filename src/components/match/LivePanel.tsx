import type { Match, MatchInfo } from "@/lib/provider";
import { runRates } from "@/lib/run-rate";
import { oversToBalls } from "@/lib/score-progress";
import { PlayerLink } from "@/components/PlayerLink";
import type { Dict } from "@/app/[lang]/dictionaries";

export type LiveLabels = Pick<Dict["match"], "batter" | "bowler" | "over" | "need" | "target" | "crr" | "rrr">;

const fixed = (n: number) => n.toFixed(2);

// Under the score banner while a match is live (CREX style): the chase, who is batting and bowling, this over.
// `match` already has the latest Firebase push merged in, so all of it moves with every ball the worker sees.
// The over strip comes from the page's own data, refreshed every few minutes.
export function LivePanel({ match, lastOver, labels, lang }: { match: Match; lastOver?: MatchInfo["lastOver"]; labels: LiveLabels; lang: string }) {
  const rr = runRates(match);
  const { batters = [], bowler } = match.now ?? {};
  if (!rr && !batters.length && !bowler && !lastOver) return null;

  const inn = match.score?.at(-1);
  const chasing = match.teams.find((t) => inn?.inning.startsWith(t + " "));
  const short = match.teamInfo?.find((t) => t.name === chasing)?.shortname || chasing;

  return (
    <section className="surface mt-3 overflow-hidden">
      {rr && (
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold">
              {rr.need !== undefined && rr.ballsLeft !== undefined && rr.need > 0
                ? labels.need.replace("{team}", short ?? "").replace("{runs}", String(rr.need)).replace("{balls}", String(rr.ballsLeft))
                : rr.target !== undefined && `${labels.target} ${rr.target}`}
            </span>
            <span className="tabular-nums text-muted">
              {labels.crr} <b className="text-foreground">{fixed(rr.crr)}</b>
              {rr.rrr !== undefined && rr.need ? <> · {labels.rrr} <b className="text-foreground">{fixed(rr.rrr)}</b></> : null}
            </span>
          </div>
          {rr.target !== undefined && inn && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised" role="presentation">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (inn.r / rr.target) * 100)}%` }} />
            </div>
          )}
        </div>
      )}

      {(batters.length > 0 || bowler) && (
        <div className="overflow-x-auto border-t border-border">
          <table className="data-table">
            {batters.length > 0 && (
              <>
                <thead><tr><th>{labels.batter}</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
                <tbody>
                  {batters.map((b) => (
                    <tr key={b.name}>
                      <td><PlayerLink id={b.id} lang={lang} className="font-medium text-link">{b.name}</PlayerLink></td>
                      <td className="font-bold">{b.r}</td><td>{b.b}</td><td>{b.fours}</td><td>{b.sixes}</td>
                      <td className="text-muted">{b.b ? ((b.r / b.b) * 100).toFixed(1) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
            {bowler && (
              <>
                <thead><tr><th>{labels.bowler}</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr></thead>
                <tbody>
                  <tr>
                    <td><PlayerLink id={bowler.id} lang={lang} className="font-medium text-link">{bowler.name}</PlayerLink></td>
                    <td>{bowler.o}</td><td>{bowler.m}</td><td>{bowler.r}</td><td className="font-bold">{bowler.w}</td>
                    <td className="text-muted">{oversToBalls(bowler.o) ? fixed((bowler.r * 6) / oversToBalls(bowler.o)) : "-"}</td>
                  </tr>
                </tbody>
              </>
            )}
          </table>
        </div>
      )}

      {lastOver && lastOver.balls.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto border-t border-border px-4 py-3 [scrollbar-width:none]">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{labels.over.replace("{n}", String(lastOver.over))}</span>
          <ol className="flex gap-1.5">
            {lastOver.balls.map((b, i) => (
              <li key={i} className={`grid h-8 min-w-8 shrink-0 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${chip(b)}`}>
                {b}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

// Wicket red, boundaries highlighted, extras amber, the rest neutral.
function chip(b: string) {
  if (b === "W") return "bg-red-600 text-white";
  if (b === "6") return "bg-emerald-600 text-white";
  if (b === "4") return "bg-sky-600 text-white";
  if (/[a-z]/.test(b)) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-raised";
}
