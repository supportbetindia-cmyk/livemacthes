import assert from "node:assert/strict";
import { test } from "node:test";
import { headlineScores } from "./score-display.ts";

const score = [
  { r: 137, w: 9, o: 20, inning: "Rocks Inning 1" },
  { r: 137, w: 8, o: 20, inning: "Titans Inning 1" },
  { r: 9, w: 1, o: 1, inning: "Rocks Inning 2" },
  { r: 9, w: 1, o: 1, inning: "Titans Inning 2" },
  { r: 12, w: 0, o: 1, inning: "Rocks Inning 3" },
];

test("headline hides all Super Overs and uses main-innings overs", () => {
  const match = { matchType: "t20", score };
  assert.deepEqual(headlineScores(match, "Rocks"), [score[0]]);
  assert.deepEqual(headlineScores(match, "Titans"), [score[1]]);
  assert.equal(match.score.length, 5, "raw scorecard data remains intact");
});

test("Test headline retains both regular innings", () => {
  assert.deepEqual(headlineScores({ matchType: "test", score: score.slice(0, 4) }, "Rocks"), [score[0], score[2]]);
});

test("ODI headline also excludes tie-break innings", () => {
  assert.deepEqual(headlineScores({ matchType: "odi", score }, "Titans"), [score[1]]);
});

test("unstarted or not-yet-batted team has no fabricated score", () => {
  assert.deepEqual(headlineScores({ matchType: "t20" }, "Rocks"), []);
  assert.deepEqual(headlineScores({ matchType: "t20", score }, "Other team"), []);
});
