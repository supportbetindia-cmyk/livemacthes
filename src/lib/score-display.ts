import type { Match, Score } from "./provider";

// Keep Super Over figures out of headline scores. Test matches still show both innings.
export function headlineScores(match: Pick<Match, "score" | "matchType">, team: string): Score[] {
  const scores = match.score?.filter((score) => score.inning.startsWith(team + " ")) ?? [];
  return match.matchType === "test" ? scores : scores.slice(0, 1);
}
