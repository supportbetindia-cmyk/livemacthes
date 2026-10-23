// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { hourlyLimit } from "./hourly-limit.ts";

test("allows max per hour, then refuses until the next hour", () => {
  const take = hourlyLimit(2);
  const h = 3600000 * 500;
  assert.deepEqual([take(h), take(h + 1), take(h + 2)], [true, true, false]);
  assert.equal(take(h + 3600000), true);
});
