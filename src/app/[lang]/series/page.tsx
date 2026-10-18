import Link from "next/link";
import { Suspense } from "react";
import { getSeriesList } from "@/lib/cricket";
import { Empty, PageHeader, Skeleton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { FormatBadges } from "@/components/FormatBadges";
import { getDictionary, getLocale } from "../dictionaries";

async function SeriesList() {
  const [dict, lang, series] = await Promise.all([getDictionary(), getLocale(), getSeriesList()]);
  if (!series.length) return <Empty>{dict.series.empty}</Empty>;
  return (
    <ul className="surface divide-y divide-border overflow-hidden">
      {series.map((s) => (
        <li key={s.id}>
          <Link href={`/${lang}/series/${s.id}`} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-raised">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-semibold group-hover:text-link">{s.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <Icon name="calendar" className="h-3.5 w-3.5" /> {s.startDate} – {s.endDate}
              </p>
            </div>
            <FormatBadges series={s} />
            <Icon name="chevronRight" className="h-5 w-5 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function generateMetadata() {
  return { title: (await getDictionary()).series.title };
}

export default async function SeriesPage() {
  const dict = await getDictionary();
  return (
    <>
      <PageHeader title={dict.series.title} />
      <Suspense fallback={<Skeleton />}>
        <SeriesList />
      </Suspense>
    </>
  );
}
