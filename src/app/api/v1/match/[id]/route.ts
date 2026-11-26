import { getMatchDetail } from "@/lib/cricket";
import { json } from "@/app/api/v1/respond";

// Full match detail: { match, scorecard, info, commentary }. 404 for an unknown id.
export function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return json(async () => getMatchDetail((await ctx.params).id));
}
