import Link from "next/link";
import { Suspense } from "react";
import { getMatchDetail } from "@/lib/cricket";
import { formatDate } from "@/lib/i18n";
import { LiveScore } from "@/components/LiveScore";
import { runs } from "@/components/MatchCard";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/ui";
import { getDictionary, getLocale } from "../../dictionaries";
import { PlayerLink } from "@/components/PlayerLink";

export async function generateMetadata({ params }: PageProps<"/[lang]/match/[id]">) {
  const { match } = await getMatchDetail((await params).id);
  return { title: match.name };
}

async function MatchView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dict, lang, { match, scorecard }] = await Promise.all([getDictionary(), getLocale(), getMatchDetail(id)]);
  const live = match.matchStarted && !match.matchEnded;
  const state = live ? dict.card.live : match.matchEnded ? dict.card.result : dict.card.upcoming;
  // "India vs Australia, 2nd ODI" -> "2nd ODI"
  const detail = match.name.split(", ").slice(1).join(", ") || match.matchType.toUpperCase();

  return (
    <>
      {live && <AutoRefresh />}
      <article className="surface mb-8 p-6 md:p-8">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${live ? "text-red-600 dark:text-red-400" : "text-foreground/75"}`}>
            {live && <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current align-middle" />}
            {state}
          </span>
          <span className="text-muted">{detail}</span>
          {match.series_id && (
            <Link href={`/${lang}/series/${match.series_id}`} className="flex items-center text-link hover:underline">
              {dict.match.series} <Icon name="chevronRight" className="h-4 w-4" />
            </Link>
          )}
        </div>
        <h1 className="mb-6 text-2xl font-bold tracking-tight md:text-[28px]">{match.name}</h1>

        <LiveScore match={match} />

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-sm text-muted">
          <span className="flex items-center gap-1.5"><Icon name="calendar" className="h-4 w-4" />{formatDate(match.dateTimeGMT, lang)}</span>
          <span className="flex items-center gap-1.5"><Icon name="mapPin" className="h-4 w-4" />{match.venue}</span>
          <span className="flex items-center gap-1.5"><Icon name="ball" className="h-4 w-4" />{match.matchType.toUpperCase()}</span>
          {live && <span className="ml-auto text-xs">{dict.match.autoUpdate}</span>}
        </div>
      </article>

      {scorecard && scorecard.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold tracking-tight">{dict.match.scorecard}</h2>
          <div className="flex flex-col gap-6">
            {scorecard.map((inn) => {
              const total = match.score?.find((s) => s.inning === inn.inning);
              return (
                <div key={inn.inning} className="surface overflow-hidden">
                  <div className="flex items-baseline justify-between gap-3 px-4 py-3.5">
                    <h3 className="font-semibold">{inn.inning}</h3>
                    {total && (
                      <span className="tabular-nums">
                        <span className="mr-2 text-xs text-muted">({total.o} ov)</span>
                        <span className="text-lg font-bold">{runs(total)}</span>
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr><th>{dict.match.batter}</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>
                      </thead>
                      <tbody>
                        {inn.batting.map((b) => (
                          <tr key={b.batsman.name}>
                            <td>
                              <PlayerLink id={b.batsman.id} lang={lang} className="block font-medium text-link">{b.batsman.name}</PlayerLink>
                              <div className="text-xs text-muted">{b["dismissal-text"]}</div>
                            </td>
                            <td className="font-bold">{b.r}</td><td>{b.b}</td><td>{b["4s"]}</td><td>{b["6s"]}</td><td className="text-muted">{b.sr}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <table className="data-table">
                      <thead>
                        <tr><th>{dict.match.bowler}</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr>
                      </thead>
                      <tbody>
                        {inn.bowling.map((b) => (
                          <tr key={b.bowler.name}>
                            <td><PlayerLink id={b.bowler.id} lang={lang} className="font-medium text-link">{b.bowler.name}</PlayerLink></td>
                            <td>{b.o}</td><td>{b.m}</td><td>{b.r}</td><td className="font-bold">{b.w}</td><td className="text-muted">{b.eco}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

export default function MatchPage({ params }: PageProps<"/[lang]/match/[id]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <MatchView params={params} />
    </Suspense>
  );
}
