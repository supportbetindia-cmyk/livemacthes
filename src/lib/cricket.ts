// Cached data access for pages. Provider calls + types live in provider.ts.
//
// Every exported getter first awaits `connection()`: cricket data is fetched when a visitor asks for a page,
// never while `next build` prerenders. So builds make no Sportmonks calls (no budget used, no deploy failing
// because the API or budget is unavailable), and the "use cache" results below are still shared by all visitors.
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import * as p from "./provider";
import type { Match } from "./provider";

export type * from "./provider";
export { derived } from "./provider";

// IDs come straight from the URL (/match/<id>, /series/<id>, /teams/<id>). Only plain numbers may reach the
// provider: anything else ("../leagues", "abc") would build a different Sportmonks URL with our token,
// and every junk value would cost an uncached API call. 404 instead.
function validId(id: string) {
  if (!/^\d{1,10}$/.test(id)) notFound();
  return String(Number(id));
}

// Share two-minute refreshes across visitors to fit the 2,000/day provider plan.
const live = { stale: 120, revalidate: 120, expire: 300 };

// ---------- Cached fetches (shared across visitors) ----------

async function cachedCurrentMatches() {
  "use cache";
  cacheLife(live);
  return p.fetchLive();
}

async function cachedMatchDetail(id: string) {
  "use cache";
  cacheLife(live);
  return p.fetchMatchDetail(id);
}

async function cachedMatches() {
  "use cache";
  cacheLife("minutes");
  return p.fetchMatches();
}

async function cachedSeries(id: string) {
  "use cache";
  cacheLife("minutes");
  return p.fetchSeries(id);
}

async function cachedPointsTable(id: string) {
  "use cache";
  cacheLife("minutes");
  return p.fetchPointsTable(id);
}

async function cachedTeams() {
  "use cache";
  cacheLife("days");
  return p.fetchTeams();
}

async function cachedPlayer(id: string) {
  "use cache";
  cacheLife("days");
  return p.fetchPlayer(id);
}

async function cachedTeamMatches(id: string) {
  "use cache";
  cacheLife("minutes");
  return p.fetchTeamMatches(id);
}

async function cachedRecentMatches(id: string) {
  "use cache";
  cacheLife("hours"); // form only changes when a match ends
  return p.fetchTeamResults(id);
}

async function cachedHeadToHead(a: string, b: string) {
  "use cache";
  cacheLife("hours");
  return p.fetchHeadToHead(a, b);
}

async function cachedRankings() {
  "use cache";
  cacheLife("days");
  return p.fetchRankings();
}

async function cachedLeagues() {
  "use cache";
  cacheLife("days");
  return p.fetchLeagues();
}

async function cachedSeasonStats(seasonId: string) {
  "use cache";
  cacheLife("hours");
  return p.fetchSeasonStats(seasonId);
}

// ---------- Public getters (request time only) ----------

export async function getCurrentMatches() {
  await connection();
  return cachedCurrentMatches();
}

export async function getMatches() {
  await connection();
  return cachedMatches();
}

// Built from the cached match list: no extra API request.
export async function getSeriesList() {
  const bySeries = Map.groupBy(await getMatches(), (m) => m.series_id);
  return [...bySeries].map(([id, ms]) => p.seriesFromMatches(id, ms)).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function getTeams() {
  await connection();
  return cachedTeams();
}

export async function getRankings() {
  await connection();
  return cachedRankings();
}

export async function getLeagues() {
  await connection();
  return cachedLeagues();
}

export async function getSeasonStats(seasonId: string) {
  await connection();
  return cachedSeasonStats(seasonId);
}

export async function getMatchDetail(id: string) {
  await connection();
  return cachedMatchDetail(validId(id));
}

export async function getSeries(id: string) {
  await connection();
  return cachedSeries(validId(id));
}

export async function getPointsTable(id: string) {
  await connection();
  return cachedPointsTable(validId(id));
}

export async function getTeamMatches(id: string) {
  const canonical = validId(id);
  if (!(await getTeams()).some((team) => team.id === canonical)) notFound();
  return cachedTeamMatches(canonical);
}

// Team Form on the match page: past results only, cached for hours. The id comes from match data, not the URL,
// so a team missing from the teams list must not 404 the whole match page as getTeamMatches would.
export async function getRecentMatches(teamId: string) {
  await connection();
  return cachedRecentMatches(validId(teamId));
}

// Sorted ids: IND-WI and WI-IND share one cache entry.
export async function getHeadToHead(a: string, b: string) {
  await connection();
  const [x, y] = [validId(a), validId(b)].sort();
  return cachedHeadToHead(x, y);
}

export async function getPlayer(id: string) {
  await connection();
  return cachedPlayer(validId(id));
}

export const upcoming = (ms: Match[]) =>
  ms.filter((m) => !m.matchStarted).sort((a, b) => a.dateTimeGMT.localeCompare(b.dateTimeGMT));
