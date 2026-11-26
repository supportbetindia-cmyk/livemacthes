import { getTeamMatches, getTeams } from "@/lib/cricket";
import { json } from "@/app/api/v1/respond";

// Team detail: the team's info + its matches. getTeamMatches 404s for an unknown team.
export function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return json(async () => {
    const { id } = await ctx.params;
    const [matches, teams] = await Promise.all([getTeamMatches(id), getTeams()]);
    return { team: teams.find((t) => t.id === String(Number(id))) ?? null, matches };
  });
}
