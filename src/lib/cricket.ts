// Cached data access for pages. Provider calls + types live in provider.ts.
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
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

export async function getCurrentMatches() {
  "use cache";
  cacheLife(live);
  return p.fetchLive();
}

async function cachedMatchDetail(id: string) {
  "use cache";
  cacheLife(live);
  return p.fetchMatchDetail(id);
}

export async function getMatches() {
  "use cache";
  cacheLife("minutes");
  return p.fetchMatches();
}

// Built from the cached match list: no extra API request.
export async function getSeriesList() {
  const bySeries = Map.groupBy(await getMatches(), (m) => m.series_id);
  return [...bySeries].map(([id, ms]) => p.seriesFromMatches(id, ms)).sort((a, b) => a.startDate.localeCompare(b.startDate));
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

export async function getTeams() {
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

export async function getRankings() {
  "use cache";
  cacheLife("days");
  return p.fetchRankings();
}

export async function getLeagues() {
  "use cache";
  cacheLife("days");
  return p.fetchLeagues();
}

export async function getSeasonStats(seasonId: string) {
  "use cache";
  cacheLife("hours");
  return p.fetchSeasonStats(seasonId);
}

export const upcoming = (ms: Match[]) =>
  ms.filter((m) => !m.matchStarted).sort((a, b) => a.dateTimeGMT.localeCompare(b.dateTimeGMT));

export const getMatchDetail = (id: string) => cachedMatchDetail(validId(id));

export const getSeries = (id: string) => cachedSeries(validId(id));

export const getPointsTable = (id: string) => cachedPointsTable(validId(id));

export async function getTeamMatches(id: string) {
  const canonical = validId(id);
  if (!(await getTeams()).some((team) => team.id === canonical)) notFound();
  return cachedTeamMatches(canonical);
}
export const getPlayer = (id: string) => cachedPlayer(validId(id));
