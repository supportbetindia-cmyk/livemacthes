import { getSeasonStats } from "@/lib/cricket";
import { seriesLeaders, type Leader } from "@/lib/match-tabs";
import { Logo } from "@/components/Logo";
import { Empty } from "@/components/ui";
import { PlayerLink } from "@/components/PlayerLink";
import type { Dict } from "@/app/[lang]/dictionaries";

// Series Stats tab: leaderboards for the series this match belongs to.
// Only fetched when this tab is opened: one Sportmonks request per series, cached for hours (same data as Stats Corner).
// Note: for internationals Sportmonks groups a whole year into one season ("Twenty20 International 2026"),
// so the boards cover every T20I that year, not one tour. The heading names the scope.
export async function SeriesStatsTab({ seriesId, seriesName, dict, lang }: { seriesId: string; seriesName?: string; dict: Dict["match"]; lang: string }) {
  const { season, players } = seriesId ? await getSeasonStats(seriesId) : { season: "", players: [] };
  const leaders = seriesLeaders(players);
  const boards: [string, Leader[]][] = [
    [dict.mostRuns, leaders.mostRuns],
    [dict.mostWickets, leaders.mostWickets],
    [dict.highestScore, leaders.highestScore],
    [dict.bestBowling, leaders.bestBowling],
    [dict.mostSixes, leaders.mostSixes],
  ];
  if (leaders.mostRuns.length === 0) return <Empty icon="chart">{dict.noSeriesStats}</Empty>;
  return (
    <>
    <h2 className="mb-4 text-lg font-bold tracking-tight">{seriesName ?? season}</h2>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {boards.map(([title, list]) => list.length > 0 && (
        <section key={title} className="surface p-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</h3>
          <ol className="flex flex-col gap-2.5">
            {list.map(({ player, value }, i) => (
              <li key={player.name} className="flex items-center gap-3 text-sm">
                <span className="w-4 text-muted tabular-nums">{i + 1}</span>
                <Logo src={player.img} size={28} />
                <span className="min-w-0 flex-1">
                  <PlayerLink id={player.id} lang={lang} className="block truncate font-medium">{player.name}</PlayerLink>
                  <span className="block text-xs text-muted">{player.team}</span>
                </span>
                <span className={`tabular-nums ${i === 0 ? "text-lg font-bold text-link" : "font-semibold"}`}>{value}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
    </>
  );
}
