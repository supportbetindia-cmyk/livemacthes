import Link from "next/link";
import { Suspense } from "react";
import { getCurrentMatches, getMatches, getSeriesList, getTeams } from "@/lib/cricket";
import { MatchCard, grid } from "@/components/MatchCard";
import { Empty, PageHeader, Section, Skeleton } from "@/components/ui";
import { getDictionary, getLocale } from "../dictionaries";

// ponytail: substring match over the cached match/series/team lists. Add a search index (e.g. Algolia) if lists grow large.
async function Results({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const dict = await getDictionary();
  if (!q) return <Empty>{dict.search.hint}</Empty>;

  const [lang, current, all, series, teams] = await Promise.all([getLocale(), getCurrentMatches(), getMatches(), getSeriesList(), getTeams()]);
  const hit = (...fields: (string | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(q));

  const matches = [...new Map([...current, ...all].map((m) => [m.id, m])).values()].filter((m) =>
    hit(m.name, m.venue, ...m.teams, ...(m.teamInfo?.map((t) => t.shortname) ?? [])),
  );
  const seriesHits = series.filter((s) => hit(s.name));
  const teamHits = teams.filter((t) => hit(t.name));

  if (!matches.length && !seriesHits.length && !teamHits.length) return <Empty>{dict.search.none}</Empty>;

  const linkCls = "chip text-foreground";
  return (
    <>
      {teamHits.length > 0 && (
        <Section title={dict.search.teams}>
          <div className="flex flex-wrap gap-2">
            {teamHits.map((t) => <Link key={t.id} href={`/${lang}/teams/${t.id}`} className={linkCls}>{t.name}</Link>)}
          </div>
        </Section>
      )}
      {seriesHits.length > 0 && (
        <Section title={dict.search.series}>
          <div className="flex flex-wrap gap-2">
            {seriesHits.map((s) => <Link key={s.id} href={`/${lang}/series/${s.id}`} className={linkCls}>{s.name}</Link>)}
          </div>
        </Section>
      )}
      {matches.length > 0 && (
        <Section title={dict.search.matches}>
          <div className={grid}>
            {matches.map((m) => <MatchCard key={m.id} match={m} lang={lang} t={dict.card} />)}
          </div>
        </Section>
      )}
    </>
  );
}

export async function generateMetadata() {
  return { title: (await getDictionary()).search.title, robots: { index: false } };
}

export default async function SearchPage({ searchParams }: PageProps<"/[lang]/search">) {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader title={dict.search.title} />
      <Suspense fallback={<Skeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}
