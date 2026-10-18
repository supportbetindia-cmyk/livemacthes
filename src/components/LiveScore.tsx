"use client";

import type { Match } from "@/lib/provider";
import { runs } from "./MatchCard";
import { useLiveScores, withLive } from "./useLiveScores";
import { Logo } from "./Logo";

// Match page score block (big team rows + status), updated in real time from Firebase when configured.
export function LiveScore({ match: initial }: { match: Match }) {
  const match = withLive(initial, useLiveScores(initial.matchStarted && !initial.matchEnded));
  const live = match.matchStarted && !match.matchEnded;
  return (
    <>
      <div className="flex max-w-xl flex-col gap-4">
        {match.teams.map((name) => {
          const info = match.teamInfo?.find((t) => t.name === name);
          const scores = match.score?.filter((s) => s.inning.startsWith(name + " ")) ?? [];
          return (
            <div key={name} className="flex items-center gap-3.5">
              <Logo src={info?.img} size={32} />
              <span className="truncate text-lg font-semibold">{name}</span>
              {scores.length > 0 && (
                <span className="ml-auto flex shrink-0 items-baseline gap-2 tabular-nums">
                  {scores.length === 1 && <span className="text-sm text-muted">({scores[0].o} ov)</span>}
                  <span className="text-2xl font-bold tracking-tight">{scores.map(runs).join(" & ")}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
      {match.matchStarted && (
        <p className={`mt-5 text-[15px] font-medium ${live ? "text-red-600 dark:text-red-400" : "text-link"}`}>{match.status}</p>
      )}
    </>
  );
}
