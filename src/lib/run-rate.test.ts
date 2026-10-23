// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { runRates } from "./run-rate.ts";

const inn = (r: number, o: number, inning: string) => ({ r, o, w: 0, inning });

test("T20 chase: target, need, balls left, required and current rate", () => {
  const rr = runRates({ maxOvers: 20, score: [inn(179, 20, "A Inning 1"), inn(100, 12, "B Inning 1")] });
  assert.deepEqual(rr, { crr: 100 / 12, target: 180, need: 80, ballsLeft: 48, rrr: 10 });
});

test("overs are base 6: 12.3 overs = 75 balls", () => {
  assert.equal(runRates({ maxOvers: 20, score: [inn(150, 20, "A"), inn(75, 12.3, "B")] })?.ballsLeft, 45);
});

test("rain-revised target wins over first innings + 1", () => {
  assert.equal(runRates({ maxOvers: 15, target: 140, score: [inn(179, 20, "A"), inn(0, 0, "B")] })?.target, 140);
});

test("first innings and Tests: current rate only", () => {
  assert.deepEqual(runRates({ maxOvers: 20, score: [inn(60, 6, "A")] }), { crr: 10 });
  assert.deepEqual(runRates({ score: [inn(300, 90, "A"), inn(20, 6, "B")] }), { crr: 20 / 6 });
});

test("chase won: nothing more needed, no negative numbers", () => {
  assert.deepEqual(runRates({ maxOvers: 20, score: [inn(116, 18.5, "A"), inn(117, 15, "B")] }), { crr: 117 / 15, target: 117, need: 0, ballsLeft: 30, rrr: 0 });
});
