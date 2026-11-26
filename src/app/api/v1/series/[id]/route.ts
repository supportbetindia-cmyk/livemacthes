import { getPointsTable, getSeries } from "@/lib/cricket";
import { json } from "@/app/api/v1/respond";

// Series detail: its matches + points table.
export function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return json(async () => {
    const { id } = await ctx.params;
    const [matches, pointsTable] = await Promise.all([getSeries(id), getPointsTable(id)]);
    return { matches, pointsTable };
  });
}
