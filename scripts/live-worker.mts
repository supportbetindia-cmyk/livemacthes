
import { fetchLive, type Match } from "../src/lib/provider.ts";
import { pollDelaySeconds } from "../src/lib/live-poll.ts";

function seconds(name: string, fallback: number, min: number) {
  const n = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(n) || n < min) throw new Error(`${name} must be a whole number of seconds, at least ${min}`);
  return n;
}
const LIVE_SECONDS = seconds("LIVE_POLL_SECONDS", 5, 5);
const IDLE_SECONDS = seconds("IDLE_POLL_SECONDS", 120, 60);
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

type Live = Pick<Match, "score" | "status" | "matchStarted" | "matchEnded" | "now">;

async function connect() {
  if (!databaseURL) return null;
  const { initializeApp } = await import("firebase-admin/app");
  const { firebaseCredential } = await import("../src/lib/firebase-credential.ts");
  const { getDatabase } = await import("firebase-admin/database");
 
  return getDatabase(initializeApp({ credential: firebaseCredential(), databaseURL })).ref("live");
}

const live = await connect();
let last = new Map<string, string>(Object.keys((await live?.get())?.val() ?? {}).map((id) => [id, ""]));

async function tick() {
  const matches = await fetchLive("worker");
  const next = new Map(
    matches
      .filter((m) => m.matchStarted)
      .map((m) => {
        const data: Live = { score: m.score ?? [], status: m.status, matchStarted: m.matchStarted, matchEnded: m.matchEnded, now: m.now };
        return [m.id, JSON.stringify(data)];
      }),
  );

  const updates: Record<string, unknown> = {};
  for (const [id, json] of next) if (last.get(id) !== json) updates[id] = { ...JSON.parse(json), updatedAt: Date.now() };
  for (const id of last.keys()) if (!next.has(id)) updates[id] = null; // match dropped off the live list
  last = next;

  const ids = Object.keys(updates);
  if (ids.length) {
    await live?.update(updates); // one multi-path write; clients only receive the changed children
    console.log(new Date().toLocaleTimeString(), live ? "updated" : "[dry run] would update", ids.join(", "));
  }
  return matches;
}

console.log(
  `live-worker: every ${LIVE_SECONDS}s while a match is live (~${Math.round(3600 / LIVE_SECONDS)} API calls/hour), every ${IDLE_SECONDS}s otherwise` +
    (databaseURL ? "" : " — dry run, set NEXT_PUBLIC_FIREBASE_DATABASE_URL to write to Firebase"),
);
let delay = 0;
for (;;) {
  const matches = await tick().catch((e) => {
    console.error(new Date().toLocaleTimeString(), "tick failed:", e.message);
    return null;
  });
  const nextDelay = pollDelaySeconds(matches, LIVE_SECONDS, IDLE_SECONDS);
  if (nextDelay !== delay) console.log(new Date().toLocaleTimeString(), `checking every ${nextDelay}s`);
  delay = nextDelay;
  await new Promise((r) => setTimeout(r, delay * 1000));
}
