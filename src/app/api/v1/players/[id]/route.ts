import { getPlayer } from "@/lib/cricket";
import { json } from "@/app/api/v1/respond";

// Player profile. 404 for an unknown id.
export function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return json(async () => getPlayer((await ctx.params).id));
}
