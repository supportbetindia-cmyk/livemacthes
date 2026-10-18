// Tests for the match page tabs. Run: npm test
// Uses Node's built-in test runner: no test library to install.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newsAbout, seriesLeaders, topPerformers } from "./match-tabs.ts";
import type { PlayerStat, Scorecard } from "./provider";
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
