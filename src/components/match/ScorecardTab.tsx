import Link from "next/link";
import type { Match, Scorecard } from "@/lib/provider";
import { PlayerLink } from "@/components/PlayerLink";
import { Empty } from "@/components/ui";
import type { Dict } from "@/app/[lang]/dictionaries";

// CREX-style scorecard: a pill per innings switches which one is shown (?inn=N); the selected innings shows
// batting, bowling, fall of wickets and partnerships (each batter's share as a split bar). All from the match data.
export function ScorecardTab({ scorecard, match, selected, lang, id, dict }: { scorecard: Scorecard; match: Match; selected: number; lang: string; id: string; dict: Dict["match"] }) {
  if (scorecard.length === 0) return <Empty>{dict.noScorecard}</Empty>;
  const i = Math.min(Math.max(selected, 0), scorecard.length - 1);
  const inn = scorecard[i];

  const teamOf = (label: string) => match.teamInfo?.find((t) => label.startsWith(t.name + " "));
  const totalOf = (label: string) => match.score?.find((s) => s.inning === label);

  return (
    <div className="flex flex-col gap-4">
      {scorecard.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {scorecard.map((s, n) => {
            const t = teamOf(s.inning);
            const tot = totalOf(s.inning);
            return (
              <Link
                key={s.inning}
                href={`/${lang}/match/${id}?tab=scorecard&inn=${n}`}
                scroll={false}
                aria-current={n === i ? "page" : undefined}
                className="rounded-lg border border-border px-3.5 py-2 text-sm font-semibold tabular-nums aria-[current=page]:border-accent aria-[current=page]:bg-accent aria-[current=page]:text-white"
              >
                <span className="text-muted aria-[current=page]:text-white/80">{t?.shortname || s.inning}</span>{" "}
                {tot && <>{tot.r}-{tot.w} <span className="font-normal opacity-70">({tot.o})</span></>}
              </Link>
            );
          })}
        </div>
      )}

      <section className="surface overflow-hidden">
        <table className="data-table">
          <thead><tr><th>{dict.batter}</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
          <tbody>
            {inn.batting.map((b) => (
              <tr key={b.batsman.name}>
                <td>
                  <PlayerLink id={b.batsman.id} lang={lang} className="block font-medium text-link">{b.batsman.name}</PlayerLink>
                  <div className="text-xs text-muted">{b["dismissal-text"]}</div>
                </td>
                <td className="font-bold">{b.r}</td><td>{b.b}</td><td>{b["4s"]}</td><td>{b["6s"]}</td><td className="text-muted">{b.sr}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="data-table border-t border-border">
          <thead><tr><th>{dict.bowler}</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr></thead>
          <tbody>
            {inn.bowling.map((b) => (
              <tr key={b.bowler.name}>
                <td><PlayerLink id={b.bowler.id} lang={lang} className="font-medium text-link">{b.bowler.name}</PlayerLink></td>
                <td>{b.o}</td><td>{b.m}</td><td>{b.r}</td><td className="font-bold">{b.w}</td><td className="text-muted">{b.eco}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {inn.fow && inn.fow.length > 0 && (
        <section className="surface overflow-hidden">
          <h3 className="border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{dict.fow}</h3>
          <table className="data-table">
            <thead><tr><th>{dict.batter}</th><th>{dict.fowScore}</th><th>{dict.fowOvers}</th></tr></thead>
            <tbody>
              {inn.fow.map((w) => (
                <tr key={w.wicket}>
                  <td className="font-medium">{w.name}</td>
                  <td className="font-bold">{w.score}-{w.wicket}</td>
                  <td className="text-muted">{w.over}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {inn.partnerships && inn.partnerships.length > 0 && (
        <section className="surface overflow-hidden">
          <h3 className="border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{dict.partnerships}</h3>
          <ul className="divide-y divide-border">
            {inn.partnerships.map((p, n) => {
              const [a, b] = p.batsmen;
              const split = (a?.runs ?? 0) + (b?.runs ?? 0);
              return (
                <li key={n} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{a?.name}</span>
                    <span className="shrink-0 font-bold tabular-nums text-accent">{p.runs} <span className="font-normal text-muted">({p.balls})</span></span>
                    <span className="min-w-0 flex-1 truncate text-right font-medium">{b?.name}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                    <span className="w-16 shrink-0 tabular-nums">{a?.runs}<span className="opacity-70"> ({a?.balls})</span></span>
                    <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                      {split > 0 && <span className="bg-emerald-500" style={{ width: `${((a?.runs ?? 0) / split) * 100}%` }} />}
                      {split > 0 && <span className="bg-rose-500" style={{ width: `${((b?.runs ?? 0) / split) * 100}%` }} />}
                    </div>
                    <span className="w-16 shrink-0 text-right tabular-nums">{b?.runs}<span className="opacity-70"> ({b?.balls})</span></span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
