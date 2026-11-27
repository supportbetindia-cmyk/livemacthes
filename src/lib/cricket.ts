// Cricket data for the pages. Since phase 3a it comes from the central API (src/lib/api-client.ts), which is the
// only thing that calls Sportmonks and caches it (and caps lookups of unlisted ids). These caches only save an API
// round trip per render; the public getters below are unchanged.
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { api, NotFound } from "./api-client";
import * as p from "./provider";
import type { League, Match, PlayerProfile, PlayerStat, PointsRow, Ranking, Team } from "./provider";

export type * from "./provider";
export { derived } from "./provider";

function validId(id: string) {
  if (!/^\d{1,10}$/.test(id)) notFound();
  return String(Number(id));
}

// The API already caches live data for 2 minutes, so this one only needs to be short.
const live = { stale: 30, revalidate: 30, expire: 300 };
const tenMinutes = { stale: 300, revalidate: 600, expire: 3600 };
const halfHour = { stale: 300, revalidate: 1800, expire: 7200 };

// A missing id becomes null (cached), anything else (timeout, API down) still throws and isn't cached.
const orNull = <T>(promise: Promise<T>) => promise.catch((e) => (e instanceof NotFound ? null : Promise.reject(e)));

type MatchDetail = Awaited<ReturnType<typeof p.fetchMatchDetail>>;
type SeriesDetail = { matches: Awaited<ReturnType<typeof p.fetchSeries>>; pointsTable: PointsRow[] };

async function cachedCurrentMatches() {
  "use cache";
  cacheLife(live);
  return api<Match[]>("/live");
}

async function cachedMatchDetail(id: string) {
  "use cache";
  const detail = await orNull(api<MatchDetail>(`/match/${id}`));
  if (!detail || detail.match.matchEnded) cacheLife("days");
  else if (detail.match.matchStarted) cacheLife(live);
  else cacheLife(tenMinutes);
  return detail;
}

async function cachedMatches() {
  "use cache";
  cacheLife(tenMinutes);
  return api<Match[]>("/fixtures");
}

async function cachedSeriesDetail(id: string) {
  "use cache";
  cacheLife(halfHour);
  return api<SeriesDetail>(`/series/${id}`);
}

async function cachedTeams() {
  "use cache";
  cacheLife("days");
  return api<Team[]>("/teams");
}

async function cachedPlayer(id: string) {
  "use cache";
  cacheLife("days");
  return orNull(api<PlayerProfile>(`/players/${id}`));
}

async function cachedTeamMatches(id: string) {
  "use cache";
  cacheLife(halfHour);
  return (await api<{ matches: Match[] }>(`/teams/${id}`)).matches;
}

async function cachedRecentMatches(id: string) {
  "use cache";
  cacheLife("hours"); // form only changes when a match ends
  return api<Match[]>(`/teams/${id}/results`);
}

async function cachedHeadToHead(a: string, b: string) {
  "use cache";
  cacheLife("hours");
  return api<Match[]>(`/h2h/${a}/${b}`);
}

async function cachedRankings() {
  "use cache";
  cacheLife("days");
  return api<Ranking[]>("/rankings");
}

async function cachedLeagues() {
  "use cache";
  cacheLife("days");
  return api<League[]>("/leagues");
}

async function cachedSeasonStats(seasonId: string) {
  "use cache";
  cacheLife("hours");
  return api<{ season: string; players: PlayerStat[] }>(`/seasons/${seasonId}/stats`);
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
  return cachedSeasonStats(validId(seasonId));
}

export async function getMatchDetail(id: string) {
  await connection();
  return (await cachedMatchDetail(validId(id))) ?? notFound();
}

// Series matches and points table come from one API request, cached once.
export async function getSeries(id: string) {
  await connection();
  return (await cachedSeriesDetail(validId(id))).matches;
}

export async function getPointsTable(id: string) {
  await connection();
  return (await cachedSeriesDetail(validId(id))).pointsTable;
}

export async function getTeamMatches(id: string) {
  const canonical = validId(id);
  if (!(await getTeams()).some((team) => team.id === canonical)) notFound();
  return cachedTeamMatches(canonical);
}

// Team Form on the match page: past results only. The id comes from match data, not the URL, so a team missing
// from the teams list must not 404 the whole match page as getTeamMatches would.
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
  return (await cachedPlayer(validId(id))) ?? notFound();
}

export const upcoming = (ms: Match[]) =>
  ms.filter((m) => !m.matchStarted).sort((a, b) => a.dateTimeGMT.localeCompare(b.dateTimeGMT));
