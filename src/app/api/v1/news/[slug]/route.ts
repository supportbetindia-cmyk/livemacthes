import { notFound } from "next/navigation";
import { getArticle } from "@/lib/news";
import { json, langOf } from "@/app/api/v1/respond";

// A single own article by slug. ?lang=en|hi. 404 if there is no such article.
export function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  return json(async () => (await getArticle((await ctx.params).slug, langOf(request))) ?? notFound());
}
