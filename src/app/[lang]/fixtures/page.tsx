import Link from "next/link";
import { Suspense } from "react";
import { getMatches, upcoming } from "@/lib/cricket";
import { formatDate } from "@/lib/i18n";
import { MatchCard, grid } from "@/components/MatchCard";
import { Empty, PageHeader, Skeleton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { getDictionary, getLocale } from "../dictionaries";

const FORMATS = ["test", "odi", "t20"];

async function Fixtures({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const [dict, lang, matches] = await Promise.all([getDictionary(), getLocale(), getMatches()]);
  const list = upcoming(matches).filter((m) => !type || m.matchType === type);

  // Group by day.
  const days = Map.groupBy(list, (m) => formatDate(m.dateTimeGMT, lang, false));

  const tab = (value: string | undefined, label: string) => (
    <Link
      key={label}
      href={value ? `?type=${value}` : "?"}
      aria-current={type === value ? "page" : undefined}
      className="chip"
    >
      {label}
    </Link>
  );

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-2">
        {tab(undefined, dict.fixtures.all)}
        {FORMATS.map((f) => tab(f, f.toUpperCase()))}
      </div>
      {!list.length && <Empty>{dict.fixtures.empty}</Empty>}
      {[...days].map(([day, ms]) => (
        <section key={day} className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">
            <Icon name="calendar" className="h-4 w-4" /> {day}
          </h2>
          <div className={grid}>
            {ms.map((m) => <MatchCard key={m.id} match={m} lang={lang} t={dict.card} />)}
          </div>
        </section>
      ))}
    </>
  );
}

export async function generateMetadata() {
  return { title: (await getDictionary()).fixtures.title };
}

export default async function FixturesPage({ searchParams }: PageProps<"/[lang]/fixtures">) {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader title={dict.fixtures.title} />
      <Suspense fallback={<Skeleton />}>
        <Fixtures searchParams={searchParams} />
      </Suspense>
    </>
  );
}
