import Link from "next/link";
import { Suspense } from "react";
import { getMatchDetail } from "@/lib/cricket";
import { formatDate } from "@/lib/i18n";
import { LiveScore } from "@/components/LiveScore";
import { PlayingXI } from "@/components/PlayingXI";
import { SummaryTab } from "@/components/match/SummaryTab";
import { SeriesStatsTab } from "@/components/match/SeriesStatsTab";
import { NewsTab } from "@/components/match/NewsTab";
import { CommentaryTab } from "@/components/match/CommentaryTab";
import { HeadToHead, TeamForm } from "@/components/match/FormAndH2H";
import { runs } from "@/components/MatchCard";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Empty, Skeleton } from "@/components/ui";
import { alternates, getDictionary, getLocale, type Dict } from "../../dictionaries";
import type { Scorecard } from "@/lib/provider";
import { JsonLd } from "@/components/JsonLd";
import { PlayerLink } from "@/components/PlayerLink";

// Google result + share preview: "India vs Australia, 2nd ODI live score, scorecard… India won by 5 wkts".
export async function generateMetadata({ params }: PageProps<"/[lang]/match/[id]">) {
  const { id } = await params;
  const [dict, { match }] = await Promise.all([getDictionary(), getMatchDetail(id)]);
  const title = match.seriesName ? `${match.name}, ${match.seriesName}` : match.name;
  const description = [dict.seo.match.replace("{match}", match.name), match.matchStarted && match.status].filter(Boolean).join(" ");
  return {
    title,
    description,
    alternates: await alternates(`/match/${id}`),
    openGraph: { type: "website", siteName: dict.nav.brand, title, description },
    twitter: { card: "summary", title, description },
  };
}

// Tabs are links (?tab=summary): each one is a server render, and the match data is cached, so switching costs no API request.
const TABS = ["info", "summary", "scorecard", "commentary", "stats", "news"] as const;

async function MatchView({ params, searchParams }: Pick<PageProps<"/[lang]/match/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const { tab: rawTab, view: rawView } = await searchParams;
  const tab = TABS.find((t) => t === rawTab) ?? "info";
  const view = rawView === "over" ? "over" : "live";
  const [dict, lang, { match, scorecard, info, commentary }] = await Promise.all([getDictionary(), getLocale(), getMatchDetail(id)]);
  const live = match.matchStarted && !match.matchEnded;
  // "India vs Australia, 2nd ODI" -> "2nd ODI"
  const detail = match.name.split(", ").slice(1).join(", ") || match.matchType.toUpperCase();
  const short = match.teams.map((t) => match.teamInfo?.find((i) => i.name === t)?.shortname || t);
  const tabLabel = { info: dict.match.info, summary: dict.match.summary, scorecard: dict.match.scorecard, commentary: dict.match.commentary, stats: dict.match.seriesStats, news: dict.match.news };

  return (
    <>
      {live && <AutoRefresh matchId={match.id} />}
      <JsonLd
        data={{
          "@type": "SportsEvent",
          name: match.name,
          sport: "Cricket",
          startDate: match.dateTimeGMT.endsWith("Z") ? match.dateTimeGMT : `${match.dateTimeGMT}Z`,
          eventStatus: "https://schema.org/EventScheduled",
          location: { "@type": "Place", name: match.venue || match.name },
          competitor: match.teams.map((name) => ({ "@type": "SportsTeam", name })),
          ...(match.seriesName && { superEvent: { "@type": "SportsEvent", name: match.seriesName } }),
        }}
      />
      <h1 className="mb-3 text-sm text-muted md:text-base">{match.name}{match.seriesName && `, ${match.seriesName}`}</h1>
      <LiveScore match={match} upcomingLabel={formatDate(match.dateTimeGMT, lang)} lastOver={info.lastOver} labels={dict.match} lang={lang} />

      <nav className="mt-2 mb-6 flex gap-6 overflow-x-auto whitespace-nowrap border-b border-border [scrollbar-width:none]" aria-label={match.name}>
        {TABS.map((t) => (
          <Link
            key={t}
            href={`?tab=${t}`}
            scroll={false}
            aria-current={tab === t ? "page" : undefined}
            className="-mb-px border-b-2 border-transparent py-3 text-sm font-semibold text-muted hover:text-foreground aria-[current=page]:border-red-500 aria-[current=page]:text-foreground md:text-base"
          >
            {tabLabel[t]}
          </Link>
        ))}
      </nav>

      {tab === "info" ? (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
          <div className="flex min-w-0 flex-col gap-6">
          <section className="surface p-5 md:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-border pb-5">
              <div className="flex -space-x-2">
                {match.teamInfo?.map((t) => <Logo key={t.name} src={t.img} size={36} className="ring-2 ring-card" />)}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-muted">{detail}</div>
                {match.series_id ? (
                  <Link href={`/${lang}/series/${match.series_id}`} className="flex items-center font-semibold hover:underline md:text-lg">
                    <span className="truncate">{match.seriesName ?? dict.match.series}</span>
                    <Icon name="chevronRight" className="h-4 w-4 text-link" />
                  </Link>
                ) : (
                  <span className="font-semibold">{match.seriesName}</span>
                )}
              </div>
            </div>
            <ul className="flex flex-col gap-4 text-sm md:text-[15px]">
              <li className="flex items-center gap-3"><Icon name="calendar" className="h-5 w-5 text-muted" />{formatDate(match.dateTimeGMT, lang)}</li>
              {match.venue && <li className="flex items-center gap-3"><Icon name="mapPin" className="h-5 w-5 text-muted" />{match.venue}</li>}
              <li className="flex items-center gap-3"><Icon name="ball" className="h-5 w-5 text-muted" />{match.matchType.toUpperCase()}</li>
              {info.playerOfMatch && (
                <li className="flex items-center gap-3">
                  <Icon name="trophy" className="h-5 w-5 text-muted" />
                  <span className="text-muted">{dict.match.playerOfMatch}:</span>
                  <PlayerLink id={info.playerOfMatch.id} lang={lang} className="font-semibold text-link">{info.playerOfMatch.name}</PlayerLink>
                </li>
              )}
            </ul>
          </section>
          {/* Own requests (cached for hours): stream in after the rest of the page. */}
          <Suspense fallback={<div className="surface h-48 animate-pulse" />}>
            <TeamForm match={match} dict={dict.match} lang={lang} />
          </Suspense>
          <Suspense fallback={<div className="surface h-64 animate-pulse" />}>
            <HeadToHead match={match} dict={dict.match} lang={lang} />
          </Suspense>
          </div>

          <aside className="surface p-5 md:p-6">
            {info.toss && (
              <p className="mb-5 flex items-center gap-2.5 rounded-md bg-raised px-3 py-2.5 text-sm">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-amber-500" />
                {dict.match.toss.replace("{team}", info.toss.team).replace("{elected}", info.toss.elected === "batting" ? dict.match.batting : dict.match.bowling)}
              </p>
            )}
            <h2 className="mb-4 text-lg font-bold tracking-tight">{short.join(" & ")} {dict.match.playingXI}</h2>
            {info.lineups.length > 0 ? <PlayingXI lineups={info.lineups} short={short} lang={lang} benchLabel={dict.match.onBench} /> : <p className="text-sm text-muted">{dict.match.xiPending}</p>}
          </aside>
        </div>
      ) : tab === "summary" ? (
        <SummaryTab match={match} scorecard={scorecard} info={info} dict={dict.match} lang={lang} />
      ) : tab === "commentary" ? (
        <CommentaryTab commentary={commentary} view={view} lang={lang} id={id} dict={dict.match} />
      ) : tab === "stats" ? (
        <Suspense fallback={<Skeleton />}>
          <SeriesStatsTab seriesId={match.series_id} seriesName={match.seriesName} dict={dict.match} lang={lang} />
        </Suspense>
      ) : tab === "news" ? (
        <Suspense fallback={<Skeleton />}>
          <NewsTab teams={match.teams} dict={dict.match} lang={lang} />
        </Suspense>
      ) : scorecard.length === 0 ? (
        <Empty>{dict.match.noScorecard}</Empty>
      ) : (
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
                <Wickets inn={inn} dict={dict.match} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// Under each innings: fall of wickets ("52-1 (Makhanya, 5.4)") and partnerships with a bar for their size.
function Wickets({ inn, dict }: { inn: Scorecard[number]; dict: Dict["match"] }) {
  const { fow = [], partnerships = [] } = inn;
  const best = Math.max(1, ...partnerships.map((p) => p.runs));
  const label = "mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";
  return (
    <>
      {fow.length > 0 && (
        <div className="border-t border-border px-4 py-3 text-sm">
          <p className={label}>{dict.fow}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
            {fow.map((w) => (
              <span key={w.wicket}><b className="tabular-nums text-foreground">{w.score}-{w.wicket}</b> ({w.name}, {w.over})</span>
            ))}
          </p>
        </div>
      )}
      {partnerships.length > 0 && (
        <div className="border-t border-border px-4 py-3 text-sm">
          <p className={label}>{dict.partnerships}</p>
          <ul className="flex flex-col gap-2.5">
            {partnerships.map((p, i) => (
              <li key={i}>
                <div className="flex justify-between gap-3">
                  <span className="truncate">{p.names.join(" & ")}</span>
                  <span className="shrink-0 tabular-nums"><b>{p.runs}</b> <span className="text-muted">({p.balls}{dict.ballsShort})</span></span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-raised" role="presentation">
                  <div className="h-full rounded-full bg-accent/70" style={{ width: `${(p.runs / best) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default function MatchPage({ params, searchParams }: PageProps<"/[lang]/match/[id]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <MatchView params={params} searchParams={searchParams} />
    </Suspense>
  );
}
