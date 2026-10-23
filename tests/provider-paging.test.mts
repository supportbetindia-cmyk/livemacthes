// Paging of Sportmonks lists (provider.ts smAll). Offline: Firebase and Sportmonks are faked, nothing real is called.
// Run: npm test
import assert from "node:assert/strict";
import { mock, test } from "node:test";

// Budget database that always grants requests (the budget itself is covered by provider-quota.test.mts).
let budget: unknown = null;
mock.module("firebase-admin/app", { namedExports: { getApps: () => [], initializeApp: (_: unknown, name: string) => ({ name }), applicationDefault: () => ({}), cert: () => ({}) } });
mock.module("firebase-admin/database", { namedExports: {
  getDatabase: () => ({ ref: () => ({ transaction: async (update: (v: unknown) => unknown) => {
    const next = update(structuredClone(budget));
    if (next === undefined) return { committed: false };
    budget = next;
    return { committed: true };
  } }) }),
} });
process.env.SPORTMONKS_API_TOKEN = "test-token-not-a-real-credential";
process.env.SPORTMONKS_BUDGET_DATABASE_URL = "https://example.invalid";
process.env.SPORTMONKS_DAILY_LIMIT = "1000";
process.env.SPORTMONKS_WORKER_RESERVE = "10";

const { fetchSeries, fetchMatchDetail, MAX_PAGES, NotFound } = await import("../src/lib/provider.ts");

// Fake Sportmonks: `pages[n]` is the list of match ids on page n+1; `lastPage` is what page 1 reports (undefined = no meta).
let pages: number[][] = [];
let lastPage: number | undefined;
let requested: number[] = [];
const fixture = (id: number) => ({ id, season_id: 7, type: "T20", status: "Finished", starting_at: `2026-10-${String(1 + (id % 28)).padStart(2, "0")}T10:00:00Z`, localteam: { id: 1, name: "India", code: "IND" }, visitorteam: { id: 2, name: "Australia", code: "AUS" } });
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = new URL(String(input));
  assert.equal(url.searchParams.get("per_page"), "100");
  const page = Number(url.searchParams.get("page") ?? 1);
  requested.push(page);
  const body = { data: (pages[page - 1] ?? []).map(fixture), ...(lastPage && { meta: { last_page: lastPage } }) };
  return { ok: true, status: 200, json: async () => body } as Response;
}) as typeof fetch;

const ids = async () => (await fetchSeries("7")).matchList.map((m) => Number(m.id)).sort((a, b) => a - b);
const setup = (p: number[][], last: number | undefined) => { pages = p; lastPage = last; requested = []; budget = null; };

test("loads every page and merges them", async () => {
  setup([[1, 2], [3, 4], [5]], 3);
  assert.deepEqual(await ids(), [1, 2, 3, 4, 5]);
  assert.deepEqual(requested.sort(), [1, 2, 3]);
});

test("a list without page info is one request", async () => {
  setup([[1, 2]], undefined);
  assert.deepEqual(await ids(), [1, 2]);
  assert.deepEqual(requested, [1]);
});

test("a match that moved between pages is kept once", async () => {
  setup([[1, 2], [2, 3]], 2);
  assert.deepEqual(await ids(), [1, 2, 3]);
});

test("a missing id is NotFound (cacheable); other errors are not", async (t) => {
  const reply = (status: number) => { budget = null; t.mock.method(globalThis, "fetch", async () => ({ ok: false, status, json: async () => ({ status: "error", message: "x" }) })); };
  reply(404);
  await assert.rejects(fetchMatchDetail("9999999"), NotFound);
  t.mock.restoreAll();
  reply(500);
  await assert.rejects(fetchMatchDetail("1"), (e) => !(e instanceof NotFound));
});

test(`stops at ${MAX_PAGES} pages to protect the request budget`, async () => {
  setup(Array.from({ length: 50 }, (_, i) => [i + 1]), 50);
  assert.equal((await ids()).length, MAX_PAGES);
  assert.equal(requested.length, MAX_PAGES);
});
