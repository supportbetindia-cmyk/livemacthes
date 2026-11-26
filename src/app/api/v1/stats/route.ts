import { getLeagues, getSeasonStats } from "@/lib/cricket";
import { json } from "@/app/api/v1/respond";

// Stats Corner. Returns the available leagues plus one season's player stats. ?season=<seasonId>
// picks a league; otherwise the featured league (IPL, then T20I, then the first) is used.
export function GET(request: Request) {
  return json(async () => {
    const leagues = await getLeagues();
    const requested = new URL(request.url).searchParams.get("season");
    const featured = leagues.find((l) => l.code === "IPL") ?? leagues.find((l) => l.code === "T20I") ?? leagues[0];
    const seasonId = leagues.some((l) => l.seasonId === requested) ? requested! : featured?.seasonId;
    const players = seasonId ? (await getSeasonStats(seasonId)).players : [];
    return { leagues, seasonId: seasonId ?? null, players };
  });
}
