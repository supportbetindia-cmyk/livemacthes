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

export function MatchCard({ match, lang, t, compact = false }: { match: Match; lang: string; t: CardLabels; compact?: boolean }) {
  const live = match.matchStarted && !match.matchEnded;
  const state = live ? t.live : match.matchEnded ? t.result : t.upcoming;
  // "India vs Australia, 2nd ODI" -> "2nd ODI"
  const detail = match.name.split(", ").slice(1).join(", ") || match.matchType.toUpperCase();
  const series = `/${lang}/series/${match.series_id}`;

  const latestInning = live ? match.score?.at(-1)?.inning : undefined;

  return (
    <div className="match-card group flex w-full flex-col min-h-[172px] rounded-2xl border border-border bg-card px-4 py-4 shadow-card transition-colors hover:border-link/40 dark:border-transparent dark:bg-[#151e24]">
      <Link href={`/${lang}/match/${match.id}`} className="flex flex-1 flex-col">
        <p className="truncate text-[11px] leading-[18px] text-muted dark:text-[#9da3a8]" title={[detail, match.venue].filter(Boolean).join(", ")}>
          {[detail, match.venue].filter(Boolean).join(", ")}
        </p>

        <div className="my-3.5 flex min-w-0 items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {match.teams.map((name) => {
              const info = match.teamInfo?.find((x) => x.name === name);
              const scores = match.score?.filter((s) => s.inning.startsWith(name + " ")) ?? [];
              const latest = latestInning?.startsWith(name + " ");
              return (
                <div key={name} className="flex min-w-0 items-center gap-2">
                  <Logo src={info?.img} size={24} fit="cover" className="bg-raised" />
                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="max-w-20 truncate text-[15px] font-medium text-foreground/75 dark:text-[#c2c6c9]" title={name}>
                      {info?.shortname ?? name}
                    </span>
                    {match.matchStarted && scores.length > 0 && (
                      <span className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
                        <span className={`text-[18px] font-semibold leading-6 tracking-tight ${latest ? "text-[#2479bb] dark:text-[#65b5f5]" : "text-foreground/75 dark:text-[#a2a8ad]"}`}>
                          {scores.map(runs).join(" & ")}
                        </span>
                        {scores.length === 1 && <span className="text-[12px] text-muted dark:text-[#b6bbc0]">{scores[0].o.toFixed(1)}</span>}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex w-[64px] shrink-0 flex-col items-center justify-center self-stretch border-l border-border pl-3 text-center dark:border-[#253139]">
            {match.matchStarted ? (
              <span className={`text-[16px] font-medium leading-5 ${live ? "text-red-600 dark:text-[#ff6469]" : "text-muted"}`}>{state}</span>
            ) : (
              <>
                <span className="text-[11px] leading-4 text-muted"><RelativeDay gmt={match.dateTimeGMT} lang={lang} /></span>
                <span className="mt-1 text-[13px] font-semibold leading-5">{formatTime(match.dateTimeGMT, lang)}</span>
              </>
            )}
          </div>
        </div>

        <p className={`mt-auto line-clamp-2 text-[12px] font-medium leading-[18px] ${live ? "text-amber-700 dark:text-[#ffb52e]" : match.matchEnded ? "text-link" : "text-muted"}`}>
          {match.matchStarted ? match.status : t.yetToBegin}
        </p>
      </Link>

      {!compact && (
        <div className="mt-3 flex gap-5 border-t border-border/60 pt-2 text-[11px] font-medium text-muted dark:border-white/10">
          <Link href={series} className="transition-colors hover:text-link">{t.schedule}</Link>
          <Link href={`${series}#points`} className="transition-colors hover:text-link">{t.table}</Link>
        </div>
      )}
    </div>
  );
}

export const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
