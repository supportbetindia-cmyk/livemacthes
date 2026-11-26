import { getNews } from "@/lib/news";
import { json, langOf } from "@/app/api/v1/respond";

// News feed (own articles + RSS), merged and sorted. ?lang=en|hi.
export function GET(request: Request) {
  return json(() => getNews(langOf(request)));
}
