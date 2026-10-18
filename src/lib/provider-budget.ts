// Server/worker-only admission control. Public Firebase rules deny access to this subtree.
import { getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { firebaseCredential } from "./firebase-credential.ts";

export type RequestSource = "web" | "worker";
type Slot = { web: number; worker: number };
type Budget = { hour: number; slots: Record<string, Slot> };

function positiveInteger(value: string | undefined, fallback: number) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("Invalid Sportmonks request-budget configuration");
  return n;
}

// Requests reserved in Firebase but not used yet by this server process. Reserving in batches means one
// Firebase transaction per BATCH API calls instead of one per call. Unused reservations stay counted
// (conservative: the shared cap can only be under-used, never exceeded).
const leases: Record<RequestSource, number> = { web: 0, worker: 0 };
// At most one reservation transaction in flight per source: parallel API calls queue behind it instead of
// running competing transactions on the same counter (which made them retry until they timed out).
const inflight: Partial<Record<RequestSource, Promise<void>>> = {};

export async function reserveProviderRequest(source: RequestSource) {
  while (leases[source] === 0) {
    inflight[source] ??= reserveBatch(source).finally(() => {
      inflight[source] = undefined;
    });
    await inflight[source]; // a failure rejects every waiter: no request ever bypasses the budget
  }
  leases[source]--;
}

async function reserveBatch(source: RequestSource) {
  const batch = positiveInteger(process.env.SPORTMONKS_BUDGET_BATCH, 10);
  const limit = positiveInteger(process.env.SPORTMONKS_DAILY_LIMIT, 2000);
  const reserve = positiveInteger(process.env.SPORTMONKS_WORKER_RESERVE, 1000);
  if (reserve >= limit) throw new Error("Sportmonks worker reserve must be smaller than the daily limit");
  const databaseURL = process.env.SPORTMONKS_BUDGET_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!databaseURL) throw new Error("Sportmonks shared budget database is not configured");

  // A named Admin app avoids conflicting with the worker's default live-feed app.
  const appName = "sportmonks-budget";
  const app = getApps().find((a) => a.name === appName) ?? initializeApp({ credential: firebaseCredential(), databaseURL }, appName);
  const budget = getDatabase(app).ref("_private/sportmonksBudget");
  const nowHour = Math.floor(Date.now() / 3600000);
  // Set by the last (committed) run of `update`; Firebase may call it several times before committing.
  let granted = 0;
  const update = (current: unknown): Budget | undefined => {
    let state: Budget = { hour: nowHour, slots: {} };
    if (current !== null) {
      if (!current || typeof current !== "object" || Array.isArray(current)) throw new Error("Invalid Sportmonks budget state");
      state = current as Budget;
      if (!Number.isSafeInteger(state.hour) || state.hour < 0 || !state.slots || typeof state.slots !== "object" || Array.isArray(state.slots)) {
        throw new Error("Invalid Sportmonks budget state");
      }
    }
    // Keep the current hour plus the preceding 24 whole hours. Counting up to
    // 25 hours is conservative: no rolling 24-hour interval can exceed the cap.
    // A clock moving backwards must not discard already-counted requests.
    const hour = Math.max(nowHour, state.hour);
    const slots: Record<string, Slot> = {};
    let total = 0;
    let web = 0;
    let worker = 0;
    for (const [key, slot] of Object.entries(state.slots)) {
      const slotHour = Number(key);
      if (!/^\d+$/.test(key) || !Number.isSafeInteger(slotHour) || slotHour > state.hour || !slot ||
          !Number.isSafeInteger(slot.web) || slot.web < 0 || !Number.isSafeInteger(slot.worker) || slot.worker < 0) {
        throw new Error("Invalid Sportmonks budget state");
      }
      if (slotHour < hour - 24) continue;
      slots[key] = { web: slot.web, worker: slot.worker };
      web += slot.web;
      worker += slot.worker;
      total += slot.web + slot.worker;
    }
    // Reserve up to `batch` requests, never more than what is left for this source or in total.
    const left = Math.min(limit - total, source === "web" ? limit - reserve - web : reserve - worker);
    granted = Math.min(batch, left);
    if (granted <= 0) return undefined;
    const key = String(hour);
    const slot = slots[key] ?? { web: 0, worker: 0 };
    slots[key] = { ...slot, [source]: slot[source] + granted };
    return { hour, slots };
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      budget.transaction(update, undefined, false),
      // 15s: the first Firebase connection from a cold server can take several seconds on its own.
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Budget timeout")), 15000); }),
    ]);
    if (!result.committed || granted <= 0) throw new Error("Sportmonks request budget exhausted");
    leases[source] += granted;
  } catch (cause) {
    // Never bypass the budget on database errors, malformed state or timeouts.
    // A late transaction may consume a reservation, but must never start a fetch.
    // `cause` keeps the real reason (timeout, permission, exhausted…) in server logs.
    throw new Error("Cricket data request limit reached or shared budget unavailable. Try again later.", { cause });
  } finally {
    clearTimeout(timer);
  }
}
