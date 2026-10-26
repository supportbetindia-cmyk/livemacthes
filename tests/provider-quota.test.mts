import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mock, test } from "node:test";

// Only these mocks can perform a transaction/fetch. No credentials or live services are used.
let state: unknown = null;
let databaseFailure = false;
let transactionDelay: Promise<void> | undefined;
let tail = Promise.resolve();
let fetches = 0;
let upstreamFailure = false;
let invalidJson = false;
let transactionCalls = 0;
const paths: string[] = [];
const apps: { name: string }[] = [];
mock.module("firebase-admin/app", { namedExports: {
  getApps: () => apps,
  applicationDefault: () => ({}),
  cert: () => ({}),
  initializeApp: (_: unknown, name: string) => { const app = { name }; apps.push(app); return app; },
} });
mock.module("firebase-admin/database", { namedExports: {
  getDatabase: () => ({ ref: (path: string) => {
    assert.equal(path, "_private/sportmonksBudget");
    return { transaction: (update: (value: unknown) => unknown) => {
      transactionCalls++;
      const pending = tail.then(async () => {
        if (transactionDelay) await transactionDelay;
        if (databaseFailure) throw new Error("offline");
        // Firebase may invoke callbacks optimistically and retry. The callback
        // must have no external side effects; only the committed value counts.
        update(null);
        const next = update(structuredClone(state));
        if (next === undefined) return { committed: false };
        state = next;
        return { committed: true };
      });
      tail = pending.then(() => {}, () => {});
      return pending;
    } };
  } }),
} });

process.env.SPORTMONKS_API_TOKEN = "test-token-not-a-real-credential";
process.env.SPORTMONKS_BUDGET_DATABASE_URL = "https://example.invalid";
process.env.SPORTMONKS_DAILY_LIMIT = "12";
process.env.SPORTMONKS_WORKER_RESERVE = "4";
process.env.SPORTMONKS_BUDGET_BATCH = "1";
const { reserveProviderRequest } = await import("../src/lib/provider-budget.ts");
const { fetchMatchDetail, fetchPlayer, fetchSeries, fetchPointsTable, fetchTeamMatches, fetchLive } = await import("../src/lib/provider.ts");

const fixture = { id: 99, season_id: 7, type: "T20", status: "NS", starting_at: "2026-10-19T10:00:00Z", localteam: { id: 1, name: "India", code: "IND" }, visitorteam: { id: 2, name: "Australia", code: "AUS" } };
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request) => {
  fetches++;
  if (upstreamFailure) throw new Error("upstream offline");
  const url = new URL(String(input));
  assert.equal(url.origin, "https://cricket.sportmonks.com");
  paths.push(url.pathname);
  const path = url.pathname.split("/api/v2.0/")[1];
  const data = path === "livescores" ? [fixture] : path.startsWith("fixtures/") ? fixture : path.startsWith("players/") ? { id: 99, fullname: "Test Player", career: [], teams: [] } : [];
  return { ok: true, status: 200, json: async () => { if (invalidJson) throw new Error("bad JSON"); return { data }; } } as Response;
}) as typeof fetch;

function reset() {
  state = null; databaseFailure = false; transactionDelay = undefined;
  fetches = 0; upstreamFailure = false; invalidJson = false;
  process.env.SPORTMONKS_DAILY_LIMIT = "12"; process.env.SPORTMONKS_WORKER_RESERVE = "4";
}

await test("Sportmonks quota boundary", async (t) => {
  t.after(() => { globalThis.fetch = originalFetch; });
  await t.test("distinct IDs share one web cap across all detail routes", async () => {
    reset();
    const attempts = Array.from({ length: 50 }, (_, i) => [
      () => fetchMatchDetail(String(1000 + i)),
      () => fetchPlayer(String(2000 + i)),
      () => fetchSeries(String(3000 + i)),
      () => fetchPointsTable(String(4000 + i)),
      () => fetchTeamMatches(String(5000 + i)),
    ][i % 5]());
    await Promise.allSettled(attempts);
    assert.equal(fetches, 8);
    assert.ok(paths.length > 0);
    const before = fetches;
    await assert.rejects(fetchMatchDetail("0000000099"));
    assert.equal(fetches, before, "numeric aliases cannot bypass aggregate cap");
  });
  await t.test("website cannot spend worker reserve; total cap is exact", async () => {
    reset();
    await Promise.allSettled(Array.from({ length: 30 }, (_, i) => fetchMatchDetail(String(i + 1))));
    assert.equal(fetches, 8);
    await Promise.allSettled(Array.from({ length: 10 }, () => fetchLive("worker")));
    assert.equal(fetches, 12);
    await assert.rejects(fetchLive("worker"));
    await assert.rejects(fetchLive());
    assert.equal(fetches, 12);
  });
  await t.test("new process/module instance cannot reset shared state", async () => {
    reset();
    const secondPath = "../src/lib/provider-budget.ts?second-process";
    const second = await import(secondPath);
    const admissions = await Promise.allSettled(Array.from({ length: 30 }, (_, i) => (i % 2 ? second.reserveProviderRequest : reserveProviderRequest)("web")));
    assert.equal(admissions.filter((a) => a.status === "fulfilled").length, 8);
  });
  await t.test("database failure, malformed state and missing configuration fail closed", async () => {
    reset(); databaseFailure = true;
    await assert.rejects(fetchMatchDetail("1")); assert.equal(fetches, 0);
    databaseFailure = false; state = { hour: "invalid", slots: {} };
    await assert.rejects(fetchMatchDetail("1")); assert.equal(fetches, 0);
    state = null; delete process.env.SPORTMONKS_BUDGET_DATABASE_URL;
    delete process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    await assert.rejects(fetchMatchDetail("1")); assert.equal(fetches, 0);
    process.env.SPORTMONKS_BUDGET_DATABASE_URL = "https://example.invalid";
    process.env.SPORTMONKS_DAILY_LIMIT = "0";
    await assert.rejects(fetchMatchDetail("1")); assert.equal(fetches, 0);
  });
  await t.test("upstream and parser failures are not refunded", async () => {
    reset(); upstreamFailure = true;
    await Promise.allSettled(Array.from({ length: 8 }, (_, i) => fetchMatchDetail(String(i))));
    assert.equal(fetches, 8);
    upstreamFailure = false;
    await assert.rejects(fetchMatchDetail("999")); assert.equal(fetches, 8);
    reset(); invalidJson = true;
    await Promise.allSettled(Array.from({ length: 8 }, (_, i) => fetchMatchDetail(String(i))));
    invalidJson = false;
    await assert.rejects(fetchMatchDetail("999")); assert.equal(fetches, 8);
  });
  await t.test("hour/day boundaries and backwards clock do not reset allowance", async () => {
    reset(); const realNow = Date.now; let now = 100 * 3600000;
    Date.now = () => now;
    try {
      await Promise.all(Array.from({ length: 8 }, () => reserveProviderRequest("web")));
      now += 24 * 3600000;
      await assert.rejects(reserveProviderRequest("web"));
      now -= 2 * 3600000;
      await assert.rejects(reserveProviderRequest("web"));
      now = 125 * 3600000;
      await reserveProviderRequest("web");
    } finally { Date.now = realNow; }
  });
  await t.test("unused batch leases cannot outlive their shared accounting", async () => {
    reset(); process.env.SPORTMONKS_BUDGET_BATCH = "10";
    const realNow = Date.now; let now = 200 * 3600000;
    Date.now = () => now;
    try {
      const idlePath = "../src/lib/provider-budget.ts?idle-batch";
      const freshPath = "../src/lib/provider-budget.ts?fresh-batch";
      const idle = await import(idlePath);
      const fresh = await import(freshPath);
      await idle.reserveProviderRequest("web"); // 7 unused reservations remain locally.
      now += 25 * 3600000;
      const freshWeb = await Promise.allSettled(Array.from({ length: 8 }, () => fresh.reserveProviderRequest("web")));
      const freshWorker = await Promise.allSettled(Array.from({ length: 4 }, () => fresh.reserveProviderRequest("worker")));
      assert.equal(freshWeb.filter((r) => r.status === "fulfilled").length, 8);
      assert.equal(freshWorker.filter((r) => r.status === "fulfilled").length, 4);
      await assert.rejects(idle.reserveProviderRequest("web"), "expired local leases must not permit a 13th call");
    } finally { Date.now = realNow; process.env.SPORTMONKS_BUDGET_BATCH = "1"; }
  });
  await t.test("timeout and late commit never issue a provider request", async () => {
    reset(); let release!: () => void;
    transactionDelay = new Promise<void>((resolve) => { release = resolve; });
    const pending = assert.rejects(fetchMatchDetail("1"));
    await pending;
    assert.equal(fetches, 0);
    release(); await tail;
    assert.equal(fetches, 0);
  });
  await t.test("legitimate historical details and worker updates still map normally", async () => {
    reset();
    const detail = await fetchMatchDetail("99");
    assert.equal(detail.match.name, "India vs Australia");
    assert.equal((await fetchPlayer("99")).name, "Test Player");
    assert.deepEqual(await fetchSeries("7"), { info: { id: "7", name: "Series 7", startDate: "", endDate: "", test: 0, odi: 0, t20: 0, matches: 0 }, matchList: [] });
    assert.equal((await fetchLive("worker"))[0].id, "99");
    assert.equal(fetches, 4);
    assert.ok(transactionCalls >= fetches);
  });
  await t.test("default 2,000/day limit holds under concurrent batch reservations", async () => {
    reset();
    delete process.env.SPORTMONKS_DAILY_LIMIT;
    delete process.env.SPORTMONKS_WORKER_RESERVE;
    process.env.SPORTMONKS_BUDGET_BATCH = "10";
    const freshPath = "../src/lib/provider-budget.ts?full-daily-budget";
    const fresh = await import(freshPath);
    const attempts = await Promise.allSettled(Array.from({ length: 2400 }, (_, i) => fresh.reserveProviderRequest(i % 2 ? "web" : "worker")));
    assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 2000);
    await assert.rejects(fresh.reserveProviderRequest("web"));
    await assert.rejects(fresh.reserveProviderRequest("worker"));
    process.env.SPORTMONKS_BUDGET_BATCH = "1";
  });
  await t.test("private counter has no public Firebase permission", () => {
    const { rules } = JSON.parse(readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"));
    assert.equal(rules[".read"], false); assert.equal(rules[".write"], false);
    assert.equal(rules.live[".read"], true);
    assert.equal(rules._private, undefined);
  });
});
