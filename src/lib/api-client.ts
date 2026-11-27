// Client for the central API (repo live-score-api). Since phase 3a it is the only service that calls Sportmonks;
// the websites read their cricket data from it.
// API_URL: defaults to the production API. API_INTERNAL_KEY: shared secret sent as x-internal-key, so this server
// (one IP for all its visitors) isn't held to the API's per-IP rate limit.
const BASE = (process.env.API_URL || "https://api.livematch.co").replace(/\/$/, "");
const KEY = process.env.API_INTERNAL_KEY;

// The API answered 404: the id doesn't exist. Callers cache this as "no such thing".
export class NotFound extends Error {}

export async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/v1${path}`, {
    headers: KEY ? { "x-internal-key": KEY } : undefined,
    // 20s: a cold season leaderboard is up to 10 provider requests on the API side.
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 404) throw new NotFound(`API ${path}: not found`);
  const body = await res.text();
  if (!res.ok) throw new Error(`API ${path}: HTTP ${res.status} ${body.slice(0, 200)}`);
  return JSON.parse(body) as T;
}
