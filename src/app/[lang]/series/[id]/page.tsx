import { Suspense } from "react";
import { getPointsTable, getSeries } from "@/lib/cricket";
import { MatchCard, grid } from "@/components/MatchCard";
import { PageHeader, Section, Skeleton } from "@/components/ui";
import { FormatBadges } from "@/components/FormatBadges";
import { getDictionary, getLocale } from "../../dictionaries";
import { Logo } from "@/components/Logo";

export async function generateMetadata({ params }: PageProps<"/[lang]/series/[id]">) {
  return { title: (await getSeries((await params).id)).info.name };
}

async function SeriesView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dict, lang, { info, matchList }, points] = await Promise.all([getDictionary(), getLocale(), getSeries(id), getPointsTable(id)]);
  const matches = matchList.map((m) => ({ ...m, seriesName: info.name })).sort((a, b) => a.dateTimeGMT.localeCompare(b.dateTimeGMT));

  return (
    <>
      <PageHeader title={info.name} subtitle={`${info.startDate} – ${info.endDate}`}>
        <div className="mt-3">
          <FormatBadges series={info} />
        </div>
      </PageHeader>

      {points.length > 0 && (
        <div id="points" className="scroll-mt-24">
          <Section title={dict.series.pointsTable}>
            <div className="surface overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>{dict.series.team}</th><th>{dict.series.played}</th><th>{dict.series.won}</th><th>{dict.series.lost}</th><th>{dict.series.nr}</th><th>{dict.series.nrr}</th><th>{dict.series.points}</th></tr>
                </thead>
                <tbody>
                  {points.map((p, i) => (
                    <tr key={p.teamname}>
                      <td>
                        <span className="flex items-center gap-3 font-medium">
                          <span className="w-4 text-muted">{i + 1}</span>
                          <Logo src={p.img} size={20} />
                          <span className="hidden sm:inline">{p.teamname}</span>
                          <span className="sm:hidden">{p.shortname ?? p.teamname}</span>
                        </span>
                      </td>
                      <td>{p.matches}</td><td>{p.wins}</td><td>{p.loss}</td><td>{p.nr ?? 0}</td><td className="text-muted">{p.nrr?.toFixed(3) ?? "–"}</td><td className="font-bold">{p.points ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      <Section title={dict.series.matches}>
        <div className={grid}>
          {matches.map((m) => <MatchCard key={m.id} match={m} lang={lang} t={dict.card} />)}
        </div>
      </Section>
    </>
  );
}

export default function SeriesDetailPage({ params }: PageProps<"/[lang]/series/[id]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <SeriesView params={params} />
    </Suspense>
  );
}
