import type { Match, MatchInfo, Scorecard } from "@/lib/provider";
import { topPerformers } from "@/lib/match-tabs";
import { runs } from "@/components/MatchCard";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Empty } from "@/components/ui";
import { PlayerLink } from "@/components/PlayerLink";
import type { Dict } from "@/app/[lang]/dictionaries";

// Summary tab: Player of the Match, then the top 2 batters and bowlers of every innings.
// Uses the scorecard the match page already fetched: no extra API request.
export function SummaryTab({ match, scorecard, info, dict, lang }: { match: Match; scorecard: Scorecard; info: MatchInfo; dict: Dict["match"]; lang: string }) {
  if (scorecard.length === 0) return <Empty>{dict.noScorecard}</Empty>;
  return (
    <div className="flex flex-col gap-6">
      {info.playerOfMatch && (
        <PlayerLink id={info.playerOfMatch.id} lang={lang} className="surface flex items-center gap-4 p-4 hover:no-underline">
          <Logo src={info.playerOfMatch.img} size={56} />
          <span>
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
              <Icon name="trophy" className="h-4 w-4" />{dict.playerOfMatch}
            </span>
            <span className="text-lg font-bold">{info.playerOfMatch.name}</span>
          </span>
        </PlayerLink>
      )}

      {topPerformers(scorecard).map((inn) => {
        const total = match.score?.find((s) => s.inning === inn.inning);
        return (
          <section key={inn.inning} className="surface overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
              <h3 className="font-semibold">{inn.inning}</h3>
              {total && <span className="tabular-nums"><span className="mr-2 text-xs text-muted">({total.o} ov)</span><span className="text-lg font-bold">{runs(total)}</span></span>}
            </div>
            <div className="grid sm:grid-cols-2 sm:divide-x divide-border">
              <List title={dict.topBatters}>
                {inn.batters.map((b) => (
                  <Row key={b.batsman.name} name={b.batsman.name} id={b.batsman.id} lang={lang}>
                    <b>{b.r}</b> <span className="text-muted">({b.b})</span>
                  </Row>
                ))}
              </List>
              <List title={dict.topBowlers}>
                {inn.bowlers.map((b) => (
                  <Row key={b.bowler.name} name={b.bowler.name} id={b.bowler.id} lang={lang}>
                    <b>{b.w}-{b.r}</b> <span className="text-muted">({b.o})</span>
                  </Row>
                ))}
              </List>
            </div>
          </section>
        );
      })}
    </div>
  );
}

const List = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="px-4 py-3">
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
    <ul className="flex flex-col gap-2">{children}</ul>
  </div>
);

const Row = ({ name, id, lang, children }: { name: string; id?: string; lang: string; children: React.ReactNode }) => (
  <li className="flex items-center justify-between gap-3 text-sm">
    <PlayerLink id={id} lang={lang} className="truncate font-medium text-link">{name}</PlayerLink>
    <span className="shrink-0 tabular-nums">{children}</span>
  </li>
);
