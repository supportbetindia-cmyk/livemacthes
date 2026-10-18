// Server/worker-only admission control. Public Firebase rules deny access to this subtree.
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

export type RequestSource = "web" | "worker";
type Slot = { web: number; worker: number };
type Budget = { hour: number; slots: Record<string, Slot> };

function positiveInteger(value: string | undefined, fallback: number) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("Invalid Sportmonks request-budget configuration");
  return n;
}

export async function reserveProviderRequest(source: RequestSource) {
  const limit = positiveInteger(process.env.SPORTMONKS_DAILY_LIMIT, 2000);
  const reserve = positiveInteger(process.env.SPORTMONKS_WORKER_RESERVE, 1000);
  if (reserve >= limit) throw new Error("Sportmonks worker reserve must be smaller than the daily limit");
  const databaseURL = process.env.SPORTMONKS_BUDGET_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!databaseURL) throw new Error("Sportmonks shared budget database is not configured");

  // A named Admin app avoids conflicting with the worker's default live-feed app.
  const appName = "sportmonks-budget";
  const app = getApps().find((a) => a.name === appName) ?? initializeApp({ credential: applicationDefault(), databaseURL }, appName);
  const budget = getDatabase(app).ref("_private/sportmonksBudget");
  const nowHour = Math.floor(Date.now() / 3600000);
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
    if (total >= limit || (source === "web" ? web >= limit - reserve : worker >= reserve)) return undefined;
    const key = String(hour);
    const slot = slots[key] ?? { web: 0, worker: 0 };
    slots[key] = { ...slot, [source]: slot[source] + 1 };
    return { hour, slots };
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      budget.transaction(update, undefined, false),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Budget timeout")), 5000); }),
    ]);
    if (!result.committed) throw new Error("Sportmonks request budget exhausted");
  } catch {
    // Never bypass the budget on database errors, malformed state or timeouts.
    // A late transaction may consume a reservation, but must never start a fetch.
    throw new Error("Cricket data request limit reached or shared budget unavailable. Try again later.");
  } finally {
    clearTimeout(timer);
  }
}
