// Logic behind the match page tabs (Summary, Series Stats, News).
// Plain functions on data we already fetched: no API calls, no React, so they are easy to test
// (see match-tabs.test.ts, run with `npm test`).
import type { Match, PlayerStat, Scorecard } from "./provider";
import type { NewsItem } from "./news";

// ---------- Summary tab ----------

type Batter = Scorecard[number]["batting"][number];
type Bowler = Scorecard[number]["bowling"][number];

// Best 2 batters and 2 bowlers of each innings.
// Batters: most runs, then fewer balls. Bowlers: most wickets, then fewer runs conceded.
export function topPerformers(scorecard: Scorecard, n = 2) {
  return scorecard.map((inn) => ({
    inning: inn.inning,
    batters: [...inn.batting].sort((a: Batter, b: Batter) => b.r - a.r || a.b - b.b).slice(0, n),
    bowlers: [...inn.bowling].sort((a: Bowler, b: Bowler) => b.w - a.w || a.r - b.r).slice(0, n),
  }));
}

// ---------- Series Stats tab ----------

export type Leader = { player: PlayerStat; value: string };

// Top `n` players of the series for each category, with the value to show ("68*", "3/24"...).
// Players with nothing in a category (0 sixes, 0 wickets) are left out of it.
export function seriesLeaders(players: PlayerStat[], n = 5) {
  const top = (keep: (p: PlayerStat) => boolean, rank: (a: PlayerStat, b: PlayerStat) => number, value: (p: PlayerStat) => string | number): Leader[] =>
    players.filter(keep).sort(rank).slice(0, n).map((p) => ({ player: p, value: String(value(p)) }));
  return {
    mostRuns: top((p) => p.runs > 0, (a, b) => b.runs - a.runs || a.balls - b.balls, (p) => p.runs),
    mostWickets: top((p) => p.wickets > 0, (a, b) => b.wickets - a.wickets || a.conceded - b.conceded, (p) => p.wickets),
    mostSixes: top((p) => p.sixes > 0, (a, b) => b.sixes - a.sixes || b.runs - a.runs, (p) => p.sixes),
    // A not-out score ranks above the same score out: 68* beats 68.
    highestScore: top((p) => p.innings > 0, (a, b) => b.highest - a.highest || Number(b.highestNotOut) - Number(a.highestNotOut), (p) => `${p.highest}${p.highestNotOut ? "*" : ""}`),
    bestBowling: top((p) => p.bestW > 0, (a, b) => b.bestW - a.bestW || a.bestR - b.bestR, (p) => `${p.bestW}/${p.bestR}`),
  };
}

// ---------- News tab ----------

// News that mentions either team by full name, as a whole word ("India" does not match "West Indies").
export function newsAbout(items: NewsItem[], teams: string[]) {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b(${teams.map(escape).join("|")})\\b`, "i");
  return items.filter((n) => pattern.test(`${n.title} ${n.excerpt ?? ""}`));
}

// ---------- Match info: Team Form + Head to Head ----------

export type FormResult = "W" | "L" | "NR";

const finishedExcept = (matches: Match[], currentId: string) =>
  matches.filter((m) => m.matchEnded && m.id !== currentId).sort((a, b) => b.dateTimeGMT.localeCompare(a.dateTimeGMT));

const resultFor = (m: Match, teamId: string): FormResult => (!m.winnerId ? "NR" : m.winnerId === teamId ? "W" : "L");

// A team's last `n` finished matches (newest first), not counting the match being viewed.
export function teamForm(matches: Match[], teamId: string, currentId: string, n = 5) {
  return finishedExcept(matches, currentId).slice(0, n).map((match) => ({ match, result: resultFor(match, teamId) }));
}

// Last `n` finished meetings of teams a and b, and how many each won.
export function headToHead(matches: Match[], a: string, b: string, currentId: string, n = 10) {
  const both = (m: Match) => [a, b].every((id) => m.teamInfo?.some((t) => t.id === id));
  const list = finishedExcept(matches.filter(both), currentId).slice(0, n);
  return {
    matches: list,
    winsA: list.filter((m) => m.winnerId === a).length,
    winsB: list.filter((m) => m.winnerId === b).length,
  };
}
