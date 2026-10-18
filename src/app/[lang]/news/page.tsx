import { Suspense } from "react";
import { getNews } from "@/lib/news";
import { Empty, NewsCard, NewsFeatured, PageHeader, Skeleton } from "@/components/ui";
import { getDictionary, getLocale } from "../dictionaries";

async function NewsList() {
  const [dict, lang] = await Promise.all([getDictionary(), getLocale()]);
  const [lead, ...rest] = await getNews(lang);
  if (!lead) return <Empty>{dict.news.empty}</Empty>;
  return (
    <>
      <NewsFeatured item={lead} lang={lang} />
      <div className="grid gap-4 md:grid-cols-2">
        {rest.map((n) => <NewsCard key={n.link} item={n} lang={lang} />)}
      </div>
    </>
  );
}

export async function generateMetadata() {
  return { title: (await getDictionary()).news.title };
}

export default async function NewsPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader title={dict.news.title} />
      <Suspense fallback={<Skeleton />}>
        <NewsList />
      </Suspense>
    </>
  );
}
