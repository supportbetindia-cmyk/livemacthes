import Link from "next/link";
import type { Match, Score } from "@/lib/cricket";
import type { Dict } from "@/app/[lang]/dictionaries";
import { formatTime } from "@/lib/i18n";
import { RelativeDay } from "./RelativeDay";
import { Logo } from "./Logo";

export type CardLabels = Dict["card"];

// "247-3" (all out shows just "223"), as on most score sites.
export const runs = (s: Score) => (s.w >= 10 ? `${s.r}` : `${s.r}-${s.w}`);

const short = (m: Match, name: string) => m.teamInfo?.find((t) => t.name === name)?.shortname ?? name;

// "India vs Australia" in 2026 -> "IND vs AUS 2026" (Home tab names).
export const matchTitle = (m: Match) => `${m.teams.map((n) => short(m, n)).join(" vs ")} ${m.date.slice(0, 4)}`;

export function MatchCard({ match, lang, t }: { match: Match; lang: string; t: CardLabels }) {
  const live = match.matchStarted && !match.matchEnded;
  const state = live ? t.live : match.matchEnded ? t.result : t.upcoming;
  // "India vs Australia, 2nd ODI" -> "2nd ODI"
  const detail = match.name.split(", ").slice(1).join(", ") || match.matchType.toUpperCase();
  const series = `/${lang}/series/${match.series_id}`;

  return (
    <div className="match-card surface surface-hover group flex w-full flex-col px-4 pb-3 pt-3.5">
      <Link href={`/${lang}/match/${match.id}`} className="flex flex-1 flex-col">
        {/* UPCOMING ................ 1st T20I • Series • Raipur */}
        <p className="flex min-w-0 items-baseline justify-between gap-3">
          <span className={`shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] ${live ? "text-red-600 dark:text-red-400" : "text-foreground/75"}`}>
            {live && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current align-middle" />}
            {state}
          </span>
          <span className="truncate text-muted">{[detail, match.seriesName, match.venue.split(",").at(-1)?.trim()].filter(Boolean).join(" • ")}</span>
        </p>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            {match.teams.map((name) => {
              const info = match.teamInfo?.find((x) => x.name === name);
              const scores = match.score?.filter((s) => s.inning.startsWith(name + " ")) ?? [];
              return (
                <div key={name} className="flex items-center gap-2.5">
                  <Logo src={info?.img} size={20} />
                  <span className="truncate text-[15px] font-medium">{info?.shortname ?? name}</span>
                  {match.matchStarted && scores.length > 0 && (
                    <span className="ml-auto flex shrink-0 items-baseline gap-1.5 tabular-nums">
                      {/* overs first and faded, then the score, as on cricinfo; overs only for single-innings games */}
                      {scores.length === 1 && <span className="text-[11px] text-muted">({scores[0].o} ov)</span>}
                      <span className="text-[18px] font-bold tracking-tight">{scores.map(runs).join(" & ")}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {!match.matchStarted && (
            <div className="shrink-0 text-right">
              <div className="text-muted"><RelativeDay gmt={match.dateTimeGMT} lang={lang} /></div>
              <div className="text-[17px] font-semibold uppercase leading-6">{formatTime(match.dateTimeGMT, lang)}</div>
            </div>
          )}
        </div>

        <p className={`mt-3 truncate text-[13px] ${live ? "text-red-600 dark:text-red-400" : match.matchEnded ? "text-link" : "text-muted"}`}>
          {match.matchStarted ? match.status : t.yetToBegin}
        </p>
      </Link>

      <div className="mt-3 flex gap-5 border-t border-border pt-2.5 text-[13px] font-medium">
        <Link href={series} className="hover:text-link">{t.schedule}</Link>
        <Link href={`${series}#points`} className="hover:text-link">{t.table}</Link>
      </div>
    </div>
  );
}

export const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
