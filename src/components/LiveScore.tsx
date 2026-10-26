"use client";

import type { Match, MatchInfo } from "@/lib/provider";
import { LivePanel, type LiveLabels } from "./match/LivePanel";
import { runs } from "./MatchCard";
import { useLiveScores, withLive } from "./useLiveScores";
import { Logo } from "./Logo";

// Match page hero (CREX style): team | status | team, updated in real time from Firebase when configured.
// Always dark, in both themes, like a broadcast scoreboard.
type Props = { match: Match; upcomingLabel: string; lastOver?: MatchInfo["lastOver"]; labels: LiveLabels; lang: string };

export function LiveScore({ match: initial, upcomingLabel, lastOver, labels, lang }: Props) {
  const match = withLive(initial, useLiveScores(initial.matchStarted && !initial.matchEnded));
  const live = match.matchStarted && !match.matchEnded;
  const side = (i: number) => {
    const name = match.teams[i];
    const info = match.teamInfo?.find((t) => t.name === name);
    const scores = match.score?.filter((s) => s.inning.startsWith(name + " ")) ?? [];
    return (
      <div className={`flex min-w-0 items-center gap-3 md:gap-4 ${i ? "flex-row-reverse text-right" : ""}`}>
        <Logo src={info?.img} size={48} fit="cover" className="bg-raised h-10! w-10! md:h-12! md:w-12!" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white/70 md:text-lg" title={name}>{info?.shortname || name}</div>
          {scores.length > 0 && (
            <div className="whitespace-nowrap tabular-nums">
              <span className="text-xl font-bold tracking-tight text-white md:text-3xl">{scores.map(runs).join(" & ")}</span>
              <span className="ml-1.5 text-xs text-white/60 md:text-base">({scores.at(-1)!.o})</span>
            </div>
          )}
        </div>
      </div>
    );
  };
  return (
    <>
      {/* Phone: both teams on one row, status below. Desktop: team | status | team. */}
      <div className="grid grid-cols-2 items-center gap-x-3 gap-y-4 rounded-xl bg-[#1c1b19] px-4 py-5 md:grid-cols-[1fr_auto_1fr] md:gap-8 md:px-10 md:py-10">
        {side(0)}
        <p className={`order-last col-span-2 text-center text-sm font-semibold md:order-none md:col-span-1 md:max-w-xs md:text-2xl ${live ? "text-red-400" : "text-amber-400"}`}>
          {live && <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-current align-middle" />}
          {match.matchStarted ? match.status : upcomingLabel}
        </p>
        {side(1)}
      </div>
      {live && <LivePanel match={match} lastOver={lastOver} labels={labels} lang={lang} />}
    </>
  );
}
