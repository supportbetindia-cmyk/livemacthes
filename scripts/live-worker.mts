// Live score worker: polls the cricket API and writes only *changed* scores to Firebase Realtime Database
// at /live/{matchId}. Browsers subscribe there and update instantly; the API is called once for everyone.
//
// Run:  npm run live-worker      (needs a long-running host: your PC, a VPS, Railway, Render, Fly.io...)
// Without NEXT_PUBLIC_FIREBASE_DATABASE_URL it runs as a dry run and just logs what it would write.
import { fetchLive, type Match } from "../src/lib/provider.ts";

const SECONDS = Number(process.env.LIVE_POLL_SECONDS ?? 120);
if (!Number.isSafeInteger(SECONDS) || SECONDS < 120) throw new Error("LIVE_POLL_SECONDS must be an integer of at least 120 for the 2,000/day plan");
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

type Live = Pick<Match, "score" | "status" | "matchStarted" | "matchEnded">;

async function connect() {
  if (!databaseURL) return null;
  const { initializeApp, applicationDefault } = await import("firebase-admin/app");
  const { getDatabase } = await import("firebase-admin/database");
  // Credentials: GOOGLE_APPLICATION_CREDENTIALS = path to the service-account JSON from Firebase console.
  return getDatabase(initializeApp({ credential: applicationDefault(), databaseURL })).ref("live");
}

const live = await connect();
// Start from what's already in the DB so matches that finished while the worker was down get removed.
let last = new Map<string, string>(Object.keys((await live?.get())?.val() ?? {}).map((id) => [id, ""]));

async function tick() {
  const matches = await fetchLive("worker");

  const next = new Map(
    matches
      .filter((m) => m.matchStarted)
      .map((m) => {
        const data: Live = { score: m.score ?? [], status: m.status, matchStarted: m.matchStarted, matchEnded: m.matchEnded };
        return [m.id, JSON.stringify(data)];
      }),
  );

  const updates: Record<string, unknown> = {};
  for (const [id, json] of next) if (last.get(id) !== json) updates[id] = { ...JSON.parse(json), updatedAt: Date.now() };
  for (const id of last.keys()) if (!next.has(id)) updates[id] = null; // match dropped off the live list
  last = next;

  const ids = Object.keys(updates);
  if (!ids.length) return;
  await live?.update(updates); // one multi-path write; clients only receive the changed children
  console.log(new Date().toLocaleTimeString(), live ? "updated" : "[dry run] would update", ids.join(", "));
}

console.log(
  `live-worker: polling every ${SECONDS}s (~${Math.round(86400 / SECONDS)} API calls/day)` +
    (databaseURL ? "" : " — dry run, set NEXT_PUBLIC_FIREBASE_DATABASE_URL to write to Firebase"),
);
for (;;) {
  await tick().catch((e) => console.error(new Date().toLocaleTimeString(), "tick failed:", e.message));
  await new Promise((r) => setTimeout(r, SECONDS * 1000));
}
