import { Suspense } from "react";
import { getCurrentMatches, getMatches, upcoming } from "@/lib/cricket";
import { getNews } from "@/lib/news";
import { MatchCarousel } from "@/components/MatchCarousel";
import { Empty, NewsCard, NewsFeatured, QuickLinks, Section, Skeleton } from "@/components/ui";
import { alternates, getDictionary, getLocale } from "./dictionaries";

export async function generateMetadata() {
  return { alternates: await alternates() };
}

async function TopMatches() {
  const [dict, lang, current, all] = await Promise.all([getDictionary(), getLocale(), getCurrentMatches(), getMatches()]);
  const matches = [...new Map([...all, ...current].map((m) => [m.id, m])).values()];
  const started = matches.filter((m) => m.matchStarted);
  // Top tab: live first, then the 6 latest results, then the next 10 fixtures (~20 cards instead of the whole window).
  const top = [
    ...started.filter((m) => !m.matchEnded),
    ...started.filter((m) => m.matchEnded).sort((a, b) => b.dateTimeGMT.localeCompare(a.dateTimeGMT)).slice(0, 6),
    ...upcoming(matches).slice(0, 10),
  ];
  if (!matches.length) return <Empty>{dict.home.noLive}</Empty>;
  return (
    <MatchCarousel
      matches={matches}
      top={top}
      lang={lang}
      labels={{ top: dict.home.top, live: dict.home.liveTab, schedule: dict.home.schedule, card: dict.card }}
    />
  );
}

async function TopNews() {
  const [dict, lang] = await Promise.all([getDictionary(), getLocale()]);
  const [lead, ...rest] = await getNews(lang);
  if (!lead) return <Empty>{dict.news.empty}</Empty>;
  return (
    <>
      <NewsFeatured item={lead} lang={lang} />
      <Section title={dict.home.latestNews} href={`/${lang}/news`} linkLabel={dict.home.viewAll}>
        <div className="grid sm:mt-6 sm:gap-3 md:grid-cols-2">
          {rest.slice(0, 6).map((n) => <NewsCard key={n.link} item={n} lang={lang} />)}
        </div>
      </Section>
    </>
  );
}

export default async function Home() {
  const [dict, lang] = await Promise.all([getDictionary(), getLocale()]);
  const quick = [
    ["/fixtures", dict.home.schedule],
    ["/rankings", dict.rankings.title],
    ["/series", dict.nav.series],
    ["/stats", dict.nav.stats],
    ["/teams", dict.nav.teams],
    ["/news", dict.nav.news],
  ].map(([href, label]) => ({ href: `/${lang}${href}`, label }));
  return (
    <>
      {/* The page's main heading for Google and screen readers; the match cards already say it visually. */}
      <h1 className="sr-only">{dict.seo.homeTitle}</h1>
      <Suspense fallback={<div className="mb-10 flex gap-5"><Skeleton /><Skeleton /><Skeleton /></div>}>
        <TopMatches />
      </Suspense>
      <QuickLinks links={quick} />
      <Suspense fallback={<Skeleton />}>
        <TopNews />
      </Suspense>
    </>
  );
}
