// Tests for the "never show an older score" rule. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { isNotBehind } from "./score-progress.ts";

const inn = (o: number, r: number, w = 0, inning = "A Inning 1") => ({ o, r, w, inning });
const snap = (score: ReturnType<typeof inn>[], matchEnded = false) => ({ score, matchEnded });

test("older live score (fewer overs) is rejected; newer is accepted", () => {
  const server = snap([inn(18.2, 200, 4)]);
  assert.equal(isNotBehind(snap([inn(15.1, 160, 3)]), server), false); // the "3 overs behind" bug
  assert.equal(isNotBehind(snap([inn(18.3, 204, 4)]), server), true);
});

test("same snapshot counts as not behind", () => {
  assert.equal(isNotBehind(snap([inn(18.2, 200, 4)]), snap([inn(18.2, 200, 4)])), true);
});

test("18.2 overs is ahead of 17.5 (overs are base 6, not decimals)", () => {
  assert.equal(isNotBehind(snap([inn(18.2, 190)]), snap([inn(17.5, 190)])), true);
  assert.equal(isNotBehind(snap([inn(17.5, 190)]), snap([inn(18.2, 190)])), false);
});

test("a wide (more runs, same ball) is ahead", () => {
  assert.equal(isNotBehind(snap([inn(10.3, 81)]), snap([inn(10.3, 80)])), true);
});

test("second innings is ahead of any first-innings score", () => {
  const first = snap([inn(20, 210, 5)]);
  const second = snap([inn(20, 210, 5), inn(0.1, 4, 0, "B Inning 1")]);
  assert.equal(isNotBehind(second, first), true);
  assert.equal(isNotBehind(first, second), false);
});

test("a finished result is never replaced by a stale 'still live' score", () => {
  const finished = snap([inn(20, 210, 5), inn(19.4, 211, 6, "B Inning 1")], true);
  const staleLive = snap([inn(20, 210, 5), inn(19.4, 211, 6, "B Inning 1")], false);
  assert.equal(isNotBehind(staleLive, finished), false);
  assert.equal(isNotBehind(finished, staleLive), true);
});

test("no score yet is behind any score", () => {
  assert.equal(isNotBehind(snap([]), snap([inn(0.1, 1)])), false);
});
