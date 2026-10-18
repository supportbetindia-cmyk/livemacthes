import { getNews } from "@/lib/news";
import { newsAbout } from "@/lib/match-tabs";
import { Empty, NewsCard } from "@/components/ui";
import type { Dict } from "@/app/[lang]/dictionaries";

// News tab: stories about either team, from the same (cached) feed as the News page. No cricket API request.
export async function NewsTab({ teams, dict, lang }: { teams: string[]; dict: Dict["match"]; lang: string }) {
  const items = newsAbout(await getNews(lang), teams).slice(0, 12);
  if (items.length === 0) return <Empty>{dict.noNews}</Empty>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((n) => <NewsCard key={n.link} item={n} lang={lang} />)}
    </div>
  );
}
