import type { Match } from "./provider.ts";
import { oversToBalls } from "./score-progress.ts";

// Current run rate; in a limited-overs chase also the target, runs needed, balls left and required rate.
// Uses only the score, so it updates with every live score push.
export function runRates({ score = [], maxOvers, target }: Pick<Match, "score" | "maxOvers" | "target">) {
  const inn = score.at(-1);
  if (!inn) return undefined;
  const balls = oversToBalls(inn.o);
  const crr = balls ? (inn.r * 6) / balls : 0;
  if (!maxOvers || score.length !== 2) return { crr }; // Tests, first innings, super overs
  const goal = target ?? score[0].r + 1;
  const need = Math.max(0, goal - inn.r);
  const ballsLeft = Math.max(0, maxOvers * 6 - balls);
  return { crr, target: goal, need, ballsLeft, rrr: ballsLeft ? (need * 6) / ballsLeft : undefined };
}
