// Tests for the live worker's polling rule. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { pollDelaySeconds } from "./live-poll.ts";
import type { Match } from "./provider";

const match = (matchStarted: boolean, matchEnded: boolean) => ({ id: "1", matchStarted, matchEnded }) as Match;

test("fast while any match is in play", () => {
  assert.equal(pollDelaySeconds([match(true, true), match(true, false)], 5, 120), 5);
});

test("slow when nothing is in play (finished or not started yet)", () => {
  assert.equal(pollDelaySeconds([match(true, true), match(false, false)], 5, 120), 120);
  assert.equal(pollDelaySeconds([], 5, 120), 120);
});

test("slow after a failed check, so an outage isn't hit every 5 seconds", () => {
  assert.equal(pollDelaySeconds(null, 5, 120), 120);
});
