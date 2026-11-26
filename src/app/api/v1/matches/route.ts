import { getCurrentMatches, getMatches, upcoming } from "@/lib/cricket";
import { json } from "@/app/api/v1/respond";

// Home lists. Shares the website's cached match data, so no extra provider request.
export function GET() {
  return json(async () => {
    const [live, all] = await Promise.all([getCurrentMatches(), getMatches()]);
    return { live, upcoming: upcoming(all), recent: all.filter((m) => m.matchEnded) };
  });
}
