// The only file that talks to the cricket data provider: Sportmonks Cricket API v2.
// It fetches raw data and maps it to the app's own types below, so pages never see Sportmonks shapes.
// No Next.js imports here, so the standalone live worker (scripts/live-worker.mts) can use it too.

import { reserveProviderRequest, type RequestSource } from "./provider-budget.ts";

export type Score = { r: number; w: number; o: number; inning: string };
export type TeamInfo = { name: string; shortname?: string; img?: string };
export type Match = {
  id: string;
  name: string;
  matchType: string; // "t20" | "odi" | "test"
  status: string;
  venue: string;
  date: string;
  dateTimeGMT: string; // UTC, no "Z" (formatDate adds it)
  teams: string[];
  teamInfo?: TeamInfo[];
  score?: Score[];
  series_id: string;
  matchStarted: boolean;
  matchEnded: boolean;
  seriesName?: string;
};
export type Series = { id: string; name: string; startDate: string; endDate: string; odi: number; t20: number; test: number; matches: number };
export type Team = { id: string; name: string; genericFlag?: string; national: boolean };
export type PointsRow = { teamname: string; shortname?: string; img?: string; matches: number; wins: number; loss: number; nr?: number; points?: number; nrr?: number };
export type Scorecard = {
  inning: string;
  batting: { batsman: { name: string; id?: string }; "dismissal-text"?: string; r: number; b: number; "4s": number; "6s": number; sr: number }[];
  bowling: { bowler: { name: string; id?: string }; o: number; m: number; r: number; w: number; eco: number }[];
}[];
export type LineupPlayer = { id: string; name: string; img?: string; role?: string; captain: boolean; keeper: boolean };
export type MatchInfo = {
  toss?: { team: string; elected: string }; // elected: "batting" | "bowling"
  playerOfMatch?: { id: string; name: string; img?: string };
  lineups: { team: string; players: LineupPlayer[] }[]; // empty until the teams are announced
};
export type Ranking ={ format: "TEST" | "ODI" | "T20I"; gender: "men" | "women"; teams: { position: number; name: string; img?: string; matches: number; points: number; rating: number }[] };
export type League = { id: string; name: string; code: string; seasonId: string; img?: string };
export type PlayerStat = {
  id?: string; name: string; img?: string; team?: string; teamImg?: string; matches: number;
  innings: number; notOuts: number; runs: number; balls: number; highest: number; highestNotOut: boolean; hundreds: number; fifties: number; fours: number; sixes: number;
  bowlInnings: number; ballsBowled: number; conceded: number; wickets: number; bestW: number; bestR: number;
};

// ---------- HTTP ----------

const BASE = "https://cricket.sportmonks.com/api/v2.0";

async function sm<T>(path: string, params: Record<string, string> = {}, source: RequestSource = "web"): Promise<T> {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) throw new Error("SPORTMONKS_API_TOKEN is not set (see .env.example)");
  await reserveProviderRequest(source);
  const res = await fetch(`${BASE}/${path}?${new URLSearchParams({ api_token: token, ...params })}`, { signal: AbortSignal.timeout(10000) });
  const json = await res.json();
  if (!res.ok || json.status === "error") throw new Error(`Sportmonks ${path}: ${JSON.stringify(json.message ?? res.status)}`);
  return json.data as T;
}

// ---------- Raw Sportmonks shapes (only the fields we use) ----------

type SmTeam = { id: number; name: string; code: string; image_path?: string; national_team?: boolean };
type SmRun = { team_id: number; inning: number; score: number; wickets: number; overs: number };
type SmPlayer = { id?: number; fullname: string; image_path?: string };
type SmFixture = {
  id: number;
  season_id: number;
  round?: string;
  type: string;
  status: string;
  note?: string;
  starting_at: string;
  localteam: SmTeam;
  visitorteam: SmTeam;
  runs?: SmRun[];
  venue?: { name: string; city?: string };
  league?: { name: string };
  season?: { name: string };
  batting?: {
    team_id: number; scoreboard: string; sort: number; active: boolean; score: number; ball: number; four_x: number; six_x: number; rate: number;
    batsman?: SmPlayer; result?: { name: string; is_wicket?: boolean; out?: boolean }; catchstump?: SmPlayer; bowler?: SmPlayer; runoutby?: SmPlayer;
  }[];
  bowling?: { team_id: number; scoreboard: string; sort: number; overs: number; medians: number; runs: number; wickets: number; rate: number; bowler?: SmPlayer }[];
  toss_won_team_id?: number | null;
  elected?: string | null;
  manofmatch?: SmPlayer & { id: number };
  lineup?: (SmPlayer & { id: number; position?: { name: string }; lineup: { team_id: number; captain: boolean; wicketkeeper: boolean; substitution: boolean } })[];
};

const BASIC = "localteam,visitorteam,runs,venue,league,season";
const SCORECARD = `${BASIC},batting.batsman,batting.result,batting.catchstump,batting.bowler,batting.runoutby,bowling.bowler,lineup,manofmatch`;

// ---------- Mapping ----------

const NOT_STARTED = ["NS", "Postp.", "Delayed"];
const ENDED = ["Finished", "Aban.", "Cancl."];

const format = (type: string) => (/test|4day/i.test(type) ? "test" : /odi|list a/i.test(type) ? "odi" : "t20");
const utc = (iso: string) => iso.slice(0, 19); // "2026-10-06T13:30:00.000000Z" -> "2026-10-06T13:30:00"
const seriesTitle = (f: SmFixture) => [f.league?.name, f.season?.name].filter(Boolean).join(" ");

// Innings label per team: "India Inning 1", "India Inning 2" (pages match scores to teams by this prefix).
function innings(f: SmFixture) {
  const name = (id: number) => (id === f.localteam.id ? f.localteam.name : f.visitorteam.name);
  const count = new Map<number, number>();
  return [...(f.runs ?? [])]
    .sort((a, b) => a.inning - b.inning)
    .map((r) => {
      const n = (count.get(r.team_id) ?? 0) + 1;
      count.set(r.team_id, n);
      return { teamId: r.team_id, label: `${name(r.team_id)} Inning ${n}`, run: r };
    });
}

function toMatch(f: SmFixture): Match {
  const started = !NOT_STARTED.includes(f.status);
  return {
    id: String(f.id),
    name: `${f.localteam.name} vs ${f.visitorteam.name}${f.round ? `, ${f.round}` : ""}`,
    matchType: format(f.type),
    status: f.note || f.status,
    venue: [f.venue?.name, f.venue?.city].filter(Boolean).join(", "),
    date: f.starting_at.slice(0, 10),
    dateTimeGMT: utc(f.starting_at),
    teams: [f.localteam.name, f.visitorteam.name],
    teamInfo: [f.localteam, f.visitorteam].map((t) => ({ name: t.name, shortname: t.code, img: t.image_path })),
    score: innings(f).map(({ label, run }) => ({ r: run.score, w: run.wickets, o: run.overs, inning: label })),
    series_id: String(f.season_id),
    seriesName: seriesTitle(f) || undefined,
    matchStarted: started,
    matchEnded: ENDED.includes(f.status),
  };
}

const pid = (p?: SmPlayer) => (p?.id ? String(p.id) : undefined);

// "c Axar Patel b Naman Dhir", "lbw b X", "run out (Y)"...
function dismissal(b: NonNullable<SmFixture["batting"]>[number]) {
  const how = b.result?.name?.toLowerCase() ?? "";
  const bowler = b.bowler?.fullname;
  const fielder = b.catchstump?.fullname;
  if (!how) return b.active ? "batting" : "not out";
  if (how.includes("catch")) return fielder && fielder === bowler ? `c & b ${bowler}` : `c ${fielder ?? "?"} b ${bowler ?? "?"}`;
  if (how.includes("bowled")) return `b ${bowler}`;
  if (how.includes("lbw")) return `lbw b ${bowler}`;
  if (how.includes("stump")) return `st ${fielder} b ${bowler}`;
  if (how.includes("run out")) return `run out (${b.runoutby?.fullname ?? fielder ?? ""})`;
  return b.result?.name ?? "";
}

function toScorecard(f: SmFixture): Scorecard {
  // Scoreboards S1, S2, ... are innings in batting order; label them like the match score.
  const labels = innings(f).map((i) => i.label);
  const boards = [...new Set((f.batting ?? []).map((b) => b.scoreboard))].sort();
  return boards.map((board, i) => ({
    inning: labels[i] ?? board,
    batting: (f.batting ?? [])
      .filter((b) => b.scoreboard === board)
      .sort((a, b) => a.sort - b.sort)
      .map((b) => ({ batsman: { name: b.batsman?.fullname ?? "", id: pid(b.batsman) }, "dismissal-text": dismissal(b), r: b.score, b: b.ball, "4s": b.four_x, "6s": b.six_x, sr: b.rate })),
    bowling: (f.bowling ?? [])
      .filter((b) => b.scoreboard === board)
      .sort((a, b) => a.sort - b.sort)
      .map((b) => ({ bowler: { name: b.bowler?.fullname ?? "", id: pid(b.bowler) }, o: b.overs, m: b.medians, r: b.runs, w: b.wickets, eco: b.rate })),
  }));
}

function toInfo(f: SmFixture): MatchInfo {
  const teamName = (id?: number | null) => (id === f.localteam.id ? f.localteam.name : id === f.visitorteam.id ? f.visitorteam.name : undefined);
  const tossTeam = teamName(f.toss_won_team_id);
  const mom = f.manofmatch;
  return {
    toss: tossTeam && f.elected ? { team: tossTeam, elected: f.elected } : undefined,
    playerOfMatch: mom && { id: String(mom.id), name: mom.fullname, img: mom.image_path },
    lineups: [f.localteam, f.visitorteam]
      .map((t) => ({
        team: t.name,
        players: (f.lineup ?? [])
          .filter((p) => p.lineup.team_id === t.id && !p.lineup.substitution)
          .map((p) => ({ id: String(p.id), name: p.fullname, img: p.image_path, role: p.position?.name, captain: p.lineup.captain, keeper: p.lineup.wicketkeeper })),
      }))
      .filter((l) => l.players.length > 0),
  };
}

// Series summary (name, date range, matches per format) from its matches.
export function seriesFromMatches(id: string, ms: Match[]): Series {
  const dates = ms.map((m) => m.date).sort();
  const n = (fmt: string) => ms.filter((m) => m.matchType === fmt).length;
  return { id, name: ms[0]?.seriesName ?? `Series ${id}`, startDate: dates[0] ?? "", endDate: dates.at(-1) ?? "", test: n("test"), odi: n("odi"), t20: n("t20"), matches: ms.length };
}

// ---------- Public API (raw, uncached; cricket.ts adds caching for pages) ----------

const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

export const fetchLive = async (source: RequestSource = "web") => (await sm<SmFixture[]>("livescores", { include: BASIC }, source)).map(toMatch);

// Recent results + upcoming fixtures window. ponytail: fixed window (-4..+21 days); add paging if a plan has >100 matches in it.
export async function fetchMatches() {
  const fs = await sm<SmFixture[]>("fixtures", { "filter[starts_between]": `${day(-4)},${day(21)}`, include: BASIC, sort: "starting_at", per_page: "100" });
  return fs.map(toMatch);
}

// One request with everything the match page needs (score header, scorecard, toss, Playing XI).
export async function fetchMatchDetail(id: string) {
  const f = await sm<SmFixture>(`fixtures/${id}`, { include: SCORECARD });
  return { match: toMatch(f), scorecard: toScorecard(f), info: toInfo(f) };
}

export async function fetchSeries(id: string) {
  const matchList = (await sm<SmFixture[]>("fixtures", { "filter[season_id]": id, include: BASIC, per_page: "100" })).map(toMatch);
  return { info: seriesFromMatches(id, matchList), matchList };
}

export async function fetchPointsTable(id: string): Promise<PointsRow[]> {
  type Row = { position: number; played: number; won: number; lost: number; no_result?: number; points: number; netto_run_rate?: number; team: SmTeam };
  const rows = await sm<Row[]>(`standings/season/${id}`, { include: "team" }).catch(() => []);
  return rows
    .sort((a, b) => a.position - b.position)
    .map((r) => ({ teamname: r.team.name, shortname: r.team.code, img: r.team.image_path, matches: r.played, wins: r.won, loss: r.lost, nr: r.no_result ?? 0, points: r.points, nrr: r.netto_run_rate }));
}

export async function fetchTeams(): Promise<Team[]> {
  return (await sm<SmTeam[]>("teams")).map((t) => ({ id: String(t.id), name: t.name, genericFlag: t.image_path, national: !!t.national_team }));
}

// A team's latest + upcoming matches: the API filters home and away separately, so ask for both and merge.
export async function fetchTeamMatches(id: string) {
  const side = (key: string) => sm<SmFixture[]>("fixtures", { [`filter[${key}]`]: id, include: BASIC, sort: "-starting_at", per_page: "12" });
  const [home, away] = await Promise.all([side("localteam_id"), side("visitorteam_id")]);
  const latest = [...home, ...away].sort((a, b) => b.starting_at.localeCompare(a.starting_at)).slice(0, 12).map(toMatch);
  // Next match first: upcoming soonest-first, then results newest-first.
  return [...latest.filter((m) => !m.matchStarted).reverse(), ...latest.filter((m) => m.matchStarted)];
}

export async function fetchRankings(): Promise<Ranking[]> {
  type Row = { type: Ranking["format"]; gender: Ranking["gender"]; team: (SmTeam & { ranking: { position: number; matches: number; points: number; rating: number } })[] };
  return (await sm<Row[]>("team-rankings")).map((r) => ({
    format: r.type,
    gender: r.gender,
    teams: r.team.map((t) => ({ position: t.ranking.position, name: t.name, img: t.image_path, matches: t.ranking.matches, points: t.ranking.points, rating: t.ranking.rating })),
  }));
}

// ---------- Player profile ----------

export type CareerFormat = "Test" | "ODI" | "T20I" | "T20";
export type BatCareer = { matches: number; innings: number; notOuts: number; runs: number; balls: number; highest: number; hundreds: number; fifties: number; fours: number; sixes: number };
export type BowlCareer = { matches: number; innings: number; balls: number; runs: number; wickets: number; fourW: number; fiveW: number };
export type PlayerProfile = {
  id: string;
  name: string;
  img?: string;
  dob?: string;
  age?: number; // computed when fetched (cached for a day)
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  country?: { name: string; img?: string };
  teams: { id: string; name: string; img?: string; from?: string; to?: string; national: boolean }[];
  formats: { format: CareerFormat; bat: BatCareer; bowl: BowlCareer }[]; // career totals per format
  seasons: { format: CareerFormat; season: string; bat?: BatCareer; bowl?: BowlCareer }[]; // newest first
};

function ageOn(dob: string, now: Date) {
  const b = new Date(dob);
  return now.getFullYear() - b.getFullYear() - (now < new Date(now.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
}

// Sportmonks labels: "Test", "Test/5day", "ODI", "T20I", and "T20" for league/domestic T20 (IPL etc.).
const careerFormat = (type: string): CareerFormat | null =>
  /^test/i.test(type) ? "Test" : type === "ODI" ? "ODI" : type === "T20I" ? "T20I" : type === "T20" ? "T20" : null;
const FORMAT_ORDER: CareerFormat[] = ["Test", "ODI", "T20I", "T20"];

export async function fetchPlayer(id: string): Promise<PlayerProfile> {
  type Bat = { matches: number; innings: number; runs_scored: number; not_outs: number; highest_inning_score: number; balls_faced: number; four_x: number; six_x: number; hundreds: number; fifties: number };
  type Bowl = { matches: number; innings: number; overs: number; runs: number; wickets: number; four_wickets: number; five_wickets: number };
  type Row = SmPlayer & {
    id: number; dateofbirth?: string; battingstyle?: string; bowlingstyle?: string;
    position?: { name: string };
    country?: { name: string; image_path?: string };
    teams?: (SmTeam & { in_squad?: { season_id: number } })[];
    career?: { type: string; season_id: number; season?: { name: string }; batting?: Bat; bowling?: Bowl }[];
  };
  const p = await sm<Row>(`players/${id}`, { include: "career.season,teams,country" });

  const bat = (b?: Bat): BatCareer | undefined =>
    b && { matches: b.matches ?? 0, innings: b.innings ?? 0, notOuts: b.not_outs ?? 0, runs: b.runs_scored ?? 0, balls: b.balls_faced ?? 0, highest: b.highest_inning_score ?? 0, hundreds: b.hundreds ?? 0, fifties: b.fifties ?? 0, fours: b.four_x ?? 0, sixes: b.six_x ?? 0 };
  const bowl = (b?: Bowl): BowlCareer | undefined =>
    b && { matches: b.matches ?? 0, innings: b.innings ?? 0, balls: fromOvers(b.overs ?? 0), runs: b.runs ?? 0, wickets: b.wickets ?? 0, fourW: b.four_wickets ?? 0, fiveW: b.five_wickets ?? 0 };

  const seasons: PlayerProfile["seasons"] = (p.career ?? [])
    .flatMap((c) => {
      const format = careerFormat(c.type);
      return format ? [{ format, season: c.season?.name ?? "", bat: bat(c.batting), bowl: bowl(c.bowling) }] : [];
    })
    .sort((a, b) => b.season.localeCompare(a.season) || FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format));

  // Career totals per format. Matches = the larger of batting/bowling matches per season (a player may only bat or only bowl).
  const formats = FORMAT_ORDER.map((format) => {
    const rows = seasons.filter((s) => s.format === format);
    const sumBat = (k: keyof BatCareer) => rows.reduce((n, r) => n + (r.bat?.[k] ?? 0), 0);
    const sumBowl = (k: keyof BowlCareer) => rows.reduce((n, r) => n + (r.bowl?.[k] ?? 0), 0);
    const matches = rows.reduce((n, r) => n + Math.max(r.bat?.matches ?? 0, r.bowl?.matches ?? 0), 0);
    return {
      format,
      bat: { matches, innings: sumBat("innings"), notOuts: sumBat("notOuts"), runs: sumBat("runs"), balls: sumBat("balls"), highest: Math.max(0, ...rows.map((r) => r.bat?.highest ?? 0)), hundreds: sumBat("hundreds"), fifties: sumBat("fifties"), fours: sumBat("fours"), sixes: sumBat("sixes") },
      bowl: { matches, innings: sumBowl("innings"), balls: sumBowl("balls"), runs: sumBowl("runs"), wickets: sumBowl("wickets"), fourW: sumBowl("fourW"), fiveW: sumBowl("fiveW") },
    };
  }).filter((f) => f.bat.matches > 0);

  // `teams` has one entry per season played; group into teams with a year range (season names like "2019" or "2025/26").
  const seasonName = new Map((p.career ?? []).map((c) => [c.season_id, c.season?.name ?? ""]));
  const year = (sid?: number) => seasonName.get(sid ?? -1)?.slice(0, 4) || undefined;
  const teams = [...Map.groupBy(p.teams ?? [], (t) => t.id)].map(([, ts]) => {
    const years = ts.map((t) => year(t.in_squad?.season_id)).filter(Boolean).sort() as string[];
    const t = ts[0];
    return { id: String(t.id), name: t.name, img: t.image_path, national: !!t.national_team, from: years[0], to: years.at(-1) };
  }).sort((a, b) => Number(b.national) - Number(a.national) || (b.to ?? "").localeCompare(a.to ?? ""));

  return {
    id: String(p.id),
    name: p.fullname,
    img: p.image_path,
    dob: p.dateofbirth,
    age: p.dateofbirth ? ageOn(p.dateofbirth, new Date()) : undefined,
    role: p.position?.name,
    battingStyle: p.battingstyle ?? undefined,
    bowlingStyle: p.bowlingstyle ?? undefined,
    country: p.country && { name: p.country.name, img: p.country.image_path },
    teams,
    formats,
    seasons,
  };
}

export async function fetchLeagues(): Promise<League[]> {
  type Row = { id: number; name: string; code: string; season_id: number; image_path?: string };
  return (await sm<Row[]>("leagues")).map((l) => ({ id: String(l.id), name: l.name, code: l.code, seasonId: String(l.season_id), img: l.image_path }));
}

// Season leaderboard, aggregated from every scorecard in the season (one request: all fixtures with batting + bowling).
export async function fetchSeasonStats(seasonId: string): Promise<{ season: string; players: PlayerStat[] }> {
  const fs = await sm<SmFixture[]>("fixtures", {
    "filter[season_id]": seasonId,
    include: "localteam,visitorteam,season,batting.batsman,batting.result,bowling.bowler",
    per_page: "100",
  });
  const players = new Map<string, PlayerStat & { fixtures: Set<number> }>();
  const get = (p: SmPlayer | undefined, teamId: number, f: SmFixture) => {
    const key = p?.fullname ?? "?";
    if (!players.has(key)) {
      const t = teamId === f.localteam.id ? f.localteam : f.visitorteam;
      players.set(key, { ...emptyStat, id: pid(p), name: key, img: p?.image_path, team: t.code, teamImg: t.image_path, fixtures: new Set() });
    }
    const s = players.get(key)!;
    s.fixtures.add(f.id);
    return s;
  };
  for (const f of fs) {
    for (const b of f.batting ?? []) {
      const s = get(b.batsman, b.team_id, f);
      const out = b.result?.out ?? !!b.result?.is_wicket;
      s.innings++;
      if (!out) s.notOuts++;
      s.runs += b.score;
      s.balls += b.ball;
      s.fours += b.four_x;
      s.sixes += b.six_x;
      if (b.score >= 100) s.hundreds++;
      else if (b.score >= 50) s.fifties++;
      if (b.score > s.highest || (b.score === s.highest && !out)) [s.highest, s.highestNotOut] = [b.score, !out];
    }
    for (const b of f.bowling ?? []) {
      const s = get(b.bowler, b.team_id, f);
      s.bowlInnings++;
      s.ballsBowled += fromOvers(b.overs); // overs like 3.4 = 3 overs 4 balls
      s.conceded += b.runs;
      s.wickets += b.wickets;
      if (b.wickets > s.bestW || (b.wickets === s.bestW && b.runs < s.bestR)) [s.bestW, s.bestR] = [b.wickets, b.runs];
    }
  }
  const list = [...players.values()].filter((p) => p.name !== "?").map(({ fixtures, ...p }) => ({ ...p, matches: fixtures.size }));
  return { season: fs[0]?.season?.name ?? "", players: list };
}

const emptyStat: Omit<PlayerStat, "id" | "name" | "img" | "team" | "teamImg"> = {
  matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0, highest: 0, highestNotOut: false, hundreds: 0, fifties: 0, fours: 0, sixes: 0,
  bowlInnings: 0, ballsBowled: 0, conceded: 0, wickets: 0, bestW: 0, bestR: 0,
};

const fromOvers = (o: number) => Math.floor(o) * 6 + Math.round((o % 1) * 10);

// Derived figures (cricket conventions). Return null when undefined (e.g. average with no dismissals).
export const derived = {
  battingAvg: (p: PlayerStat) => (p.innings - p.notOuts > 0 ? p.runs / (p.innings - p.notOuts) : null),
  strikeRate: (p: PlayerStat) => (p.balls ? (p.runs / p.balls) * 100 : null),
  overs: (p: PlayerStat) => `${Math.floor(p.ballsBowled / 6)}${p.ballsBowled % 6 ? `.${p.ballsBowled % 6}` : ""}`,
  economy: (p: PlayerStat) => (p.ballsBowled ? (p.conceded / p.ballsBowled) * 6 : null),
  bowlingAvg: (p: PlayerStat) => (p.wickets ? p.conceded / p.wickets : null),
  bowlingSR: (p: PlayerStat) => (p.wickets ? p.ballsBowled / p.wickets : null),
};
