// Which of two snapshots of the same match is further along. Used so a live score never jumps backwards:
// the page gets one snapshot from the server and one from Firebase (live worker), and either can be the older one
// (worker blocked by the API limit, crashed, or simply a few seconds behind).
import type { Match } from "./provider.ts";

type Snapshot = Pick<Match, "score" | "matchEnded">;

// Overs are base 6: 18.2 = 18 overs + 2 balls = 110 balls.
export const oversToBalls = (o: number) => Math.floor(o) * 6 + Math.round((o % 1) * 10);

// One number that only grows as the match goes on: finished > more innings > more balls in the latest innings >
// more runs (wides and no-balls add runs without a ball).
export function progress({ score = [], matchEnded }: Snapshot) {
  const last = score.at(-1);
  const balls = last ? oversToBalls(last.o) : 0;
  return (matchEnded ? 1e9 : 0) + score.length * 1e6 + balls * 1e3 + (last?.r ?? 0);
}

export const isNotBehind = (candidate: Snapshot, current: Snapshot) => progress(candidate) >= progress(current);
