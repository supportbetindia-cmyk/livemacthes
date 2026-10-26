
import { test } from "node:test";
import assert from "node:assert/strict";
import { headToHead, newsAbout, seriesLeaders, teamForm, topPerformers } from "./match-tabs.ts";
import type { Match, PlayerStat, Scorecard } from "./provider";
import type { NewsItem } from "./news";

const bat = (name: string, r: number, b: number) => ({ batsman: { name }, r, b, "4s": 0, "6s": 0, sr: 0 });
const bowl = (name: string, w: number, r: number) => ({ bowler: { name }, o: 4, m: 0, r, w, eco: 0 });

test("Summary: top 2 batters by runs, fewer balls wins a tie", () => {
  const card: Scorecard = [{ inning: "India Inning 1", batting: [bat("A", 20, 15), bat("B", 68, 41), bat("C", 20, 10)], bowling: [] }];
  const [inn] = topPerformers(card);
  assert.deepEqual(inn.batters.map((b) => b.batsman.name), ["B", "C"]);
});

test("Summary: top 2 bowlers by wickets, fewer runs wins a tie", () => {
  const card: Scorecard = [{ inning: "India Inning 1", batting: [], bowling: [bowl("X", 1, 20), bowl("Y", 3, 30), bowl("Z", 3, 24)] }];
  const [inn] = topPerformers(card);
  assert.deepEqual(inn.bowlers.map((b) => b.bowler.name), ["Z", "Y"]);
});

test("Summary: does not reorder the real scorecard", () => {
  const card: Scorecard = [{ inning: "I", batting: [bat("A", 1, 1), bat("B", 50, 30)], bowling: [] }];
  topPerformers(card);
  assert.equal(card[0].batting[0].batsman.name, "A");
});

// A season player with everything zero, plus the fields a test cares about.
const player = (name: string, s: Partial<PlayerStat>): PlayerStat => ({
  name, matches: 1, innings: 1, notOuts: 0, runs: 0, balls: 0, highest: 0, highestNotOut: false, hundreds: 0, fifties: 0, fours: 0, sixes: 0,
  bowlInnings: 0, ballsBowled: 0, conceded: 0, wickets: 0, bestW: 0, bestR: 0, ...s,
});
const names = (list: { player: PlayerStat }[]) => list.map((l) => l.player.name);

test("Series Stats: most runs, highest first", () => {
  const leaders = seriesLeaders([player("A", { runs: 40 }), player("B", { runs: 120 }), player("C", { runs: 75 })]);
  assert.deepEqual(names(leaders.mostRuns), ["B", "C", "A"]);
  assert.equal(leaders.mostRuns[0].value, "120");
});

test("Series Stats: most wickets, fewer runs conceded wins a tie; non-bowlers left out", () => {
  const leaders = seriesLeaders([player("A", { wickets: 5, conceded: 90 }), player("B", { wickets: 5, conceded: 60 }), player("C", {})]);
  assert.deepEqual(names(leaders.mostWickets), ["B", "A"]);
});

test("Series Stats: highest score shows * for not out and ranks it above the same score out", () => {
  const leaders = seriesLeaders([player("A", { highest: 68 }), player("B", { highest: 68, highestNotOut: true })]);
  assert.deepEqual(names(leaders.highestScore), ["B", "A"]);
  assert.deepEqual(leaders.highestScore.map((l) => l.value), ["68*", "68"]);
});

test("Series Stats: best bowling is most wickets, then fewest runs, shown as W/R", () => {
  const leaders = seriesLeaders([player("A", { bestW: 3, bestR: 30 }), player("B", { bestW: 3, bestR: 24 }), player("C", { bestW: 4, bestR: 40 })]);
  assert.deepEqual(leaders.bestBowling.map((l) => l.value), ["4/40", "3/24", "3/30"]);
});

test("Series Stats: shows at most n players", () => {
  const many = Array.from({ length: 9 }, (_, i) => player(`P${i}`, { runs: i + 1 }));
  assert.equal(seriesLeaders(many, 5).mostRuns.length, 5);
});

const news = (title: string, excerpt = ""): NewsItem => ({ title, excerpt, link: "https://example.com", date: "", source: "test" });
const titles = (list: NewsItem[]) => list.map((n) => n.title);

test("News: keeps stories that mention either team in the title or summary", () => {
  const items = [news("Kohli shines for India"), news("Big win", "West Indies chase it down"), news("Australia beat England")];
  assert.deepEqual(titles(newsAbout(items, ["India", "West Indies"])), ["Kohli shines for India", "Big win"]);
});

test("News: 'India' does not match 'West Indies' (whole words only)", () => {
  assert.deepEqual(newsAbout([news("West Indies squad named")], ["India"]), []);
});

test("News: ignores upper/lower case", () => {
  assert.equal(newsAbout([news("INDIA WIN THE SERIES")], ["India"]).length, 1);
});

// A finished India (1) vs West Indies (2) match on a given day; winner = team id, or none for no result.
const game = (id: string, day: string, winnerId?: string, s: Partial<Match> = {}): Match => ({
  id, name: "", matchType: "t20", status: "", venue: "", date: day, dateTimeGMT: `${day}T14:00:00`, teams: ["India", "West Indies"],
  teamInfo: [{ id: "1", name: "India" }, { id: "2", name: "West Indies" }], series_id: "9", matchStarted: true, matchEnded: true, winnerId, ...s,
});

test("Team Form: W / L / NR from the winner, newest first", () => {
  const form = teamForm([game("a", "2026-10-01", "1"), game("b", "2026-10-05", "2"), game("c", "2026-10-03")], "1", "now");
  assert.deepEqual(form.map((f) => f.result), ["L", "NR", "W"]);
});

test("Team Form: skips the match being viewed and matches not finished yet", () => {
  const form = teamForm([game("now", "2026-10-09", "1"), game("next", "2026-10-20", undefined, { matchEnded: false }), game("a", "2026-10-01", "1")], "1", "now");
  assert.deepEqual(form.map((f) => f.match.id), ["a"]);
});

test("Team Form: at most 5", () => {
  const many = Array.from({ length: 8 }, (_, i) => game(`m${i}`, `2026-10-0${i + 1}`, "1"));
  assert.equal(teamForm(many, "1", "now").length, 5);
});

test("Head to Head: counts wins per team; no-results count for neither", () => {
  const h = headToHead([game("a", "2026-10-01", "1"), game("b", "2026-10-02", "2"), game("c", "2026-10-03", "1"), game("d", "2026-10-04")], "1", "2", "now");
  assert.deepEqual([h.winsA, h.winsB, h.matches.length], [2, 1, 4]);
});

test("Head to Head: ignores matches against other teams", () => {
  const vsAustralia = game("x", "2026-10-01", "1", { teamInfo: [{ id: "1", name: "India" }, { id: "3", name: "Australia" }] });
  assert.equal(headToHead([vsAustralia], "1", "2", "now").matches.length, 0);
});
