import Link from "next/link";
import { Suspense } from "react";
import { derived, getLeagues, getSeasonStats, type PlayerStat } from "@/lib/cricket";
import { Dropdown } from "@/components/Dropdown";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Empty, Skeleton } from "@/components/ui";
import { getDictionary, getLocale, type Dict } from "../dictionaries";
import { PlayerLink } from "@/components/PlayerLink";

type T = Dict["stats"];
const MIN_BALLS = 60; // qualification for rate stats (10 overs)
const ROWS = 50;

const fmt = (n: number | null, d = 2) => (n === null ? "–" : n.toFixed(d));

// Each stat: which table (batting/bowling), how to rank, the highlighted column, and its value.
const STATS = {
  "most-runs": { label: (t: T) => t.mostRuns, kind: "bat", rank: (a: PlayerStat, b: PlayerStat) => b.runs - a.runs, col: "runs", value: (p: PlayerStat) => p.runs },
  "most-wickets": {
    label: (t: T) => t.mostWickets, kind: "bowl", col: "wkts", value: (p: PlayerStat) => p.wickets,
    rank: (a: PlayerStat, b: PlayerStat) => b.wickets - a.wickets || (derived.economy(a) ?? 99) - (derived.economy(b) ?? 99),
  },
  "most-sixes": { label: (t: T) => t.mostSixes, kind: "bat", rank: (a: PlayerStat, b: PlayerStat) => b.sixes - a.sixes || b.runs - a.runs, col: "s6", value: (p: PlayerStat) => p.sixes },
  "best-strike-rate": {
    label: (t: T) => t.bestSR, kind: "bat", min: (p: PlayerStat) => p.balls >= MIN_BALLS, col: "sr", value: (p: PlayerStat) => fmt(derived.strikeRate(p)),
    rank: (a: PlayerStat, b: PlayerStat) => (derived.strikeRate(b) ?? 0) - (derived.strikeRate(a) ?? 0),
  },
  "best-economy": {
    label: (t: T) => t.bestEcon, kind: "bowl", min: (p: PlayerStat) => p.ballsBowled >= MIN_BALLS, col: "econ", value: (p: PlayerStat) => fmt(derived.economy(p)),
    rank: (a: PlayerStat, b: PlayerStat) => (derived.economy(a) ?? 99) - (derived.economy(b) ?? 99),
  },
} as const;
type StatKey = keyof typeof STATS;

// "Virat Kohli" -> "V KOHLI" for the podium.
const shortName = (name: string) => {
  const parts = name.split(" ");
  return (parts.length > 1 ? `${parts[0][0]} ${parts.slice(1).join(" ")}` : name).toUpperCase();
};

function Avatar({ p, size }: { p: PlayerStat; size: number }) {
  if (p.img) return <Logo src={p.img} size={size} className="bg-white/10 ring-2 ring-white/20" />;
  const initials = p.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3ccf87] to-[#1b6d8f] font-bold text-white ring-2 ring-white/20" style={{ width: size, height: size, fontSize: size / 3 }}>
      {initials}
    </span>
  );
}

function Podium({ top, lang }: { top: { p: PlayerStat; v: string | number }[]; lang: string }) {
  // Order 2nd, 1st, 3rd; the winner stands taller.
  const order = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <div className="flex items-end justify-center gap-4 sm:gap-8">
      {order.map(({ p, v }) => {
        const first = p === top[0].p;
        return (
          <PlayerLink key={p.name} id={p.id} lang={lang} className={`flex w-24 flex-col items-center text-center hover:no-underline sm:w-32 ${first ? "-translate-y-4" : ""}`}>
            <p className={`w-full truncate font-bold tracking-tight text-white/85 ${first ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>{shortName(p.name)}</p>
            <p className={`font-bold leading-none text-white ${first ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}>{v}</p>
            <div className="mt-3">
              <Avatar p={p} size={first ? 88 : 64} />
            </div>
          </PlayerLink>
        );
      })}
    </div>
  );
}

async function StatsView({ searchParams }: { searchParams: Promise<{ league?: string; stat?: string }> }) {
  const sp = await searchParams;
  const [dict, lang, leagues] = await Promise.all([getDictionary(), getLocale(), getLeagues()]);
  const t = dict.stats;
  const statKey: StatKey = sp.stat && sp.stat in STATS ? (sp.stat as StatKey) : "most-runs";
  const stat = STATS[statKey];
  // Default to the IPL when available.
  const league = leagues.find((l) => l.id === sp.league) ?? leagues.find((l) => l.code === "IPL") ?? leagues[0];
  const { season, players } = league ? await getSeasonStats(league.seasonId) : { season: "", players: [] };

  const pool = players.filter((p) => (stat.kind === "bat" ? p.innings > 0 : p.bowlInnings > 0) && (!("min" in stat) || stat.min(p)));
  const rows = [...pool].sort(stat.rank).slice(0, ROWS);
  const title = t.titleIn.replace("{stat}", stat.label(t)).replace("{league}", `${league?.name ?? ""} ${season}`.trim());
  const href = (s: string, l = league?.id) => `?stat=${s}&league=${l}`;

  const bat = [
    ["runs", t.runs, (p: PlayerStat) => p.runs],
    ["mat", t.mat, (p: PlayerStat) => p.matches],
    ["inns", t.inns, (p: PlayerStat) => p.innings],
    ["hs", t.hs, (p: PlayerStat) => `${p.highest}${p.highestNotOut ? "*" : ""}`],
    ["avg", t.avg, (p: PlayerStat) => fmt(derived.battingAvg(p))],
    ["sr", t.sr, (p: PlayerStat) => fmt(derived.strikeRate(p))],
    ["s100", t.s100, (p: PlayerStat) => p.hundreds],
    ["s50", t.s50, (p: PlayerStat) => p.fifties],
    ["s4", t.s4, (p: PlayerStat) => p.fours],
    ["s6", t.s6, (p: PlayerStat) => p.sixes],
  ] as const;
  const bowl = [
    ["wkts", t.wkts, (p: PlayerStat) => p.wickets],
    ["mat", t.mat, (p: PlayerStat) => p.matches],
    ["inns", t.inns, (p: PlayerStat) => p.bowlInnings],
    ["overs", t.overs, (p: PlayerStat) => derived.overs(p)],
    ["runs", t.runs, (p: PlayerStat) => p.conceded],
    ["bbi", t.bbi, (p: PlayerStat) => `${p.bestW}/${p.bestR}`],
    ["avg", t.avg, (p: PlayerStat) => fmt(derived.bowlingAvg(p))],
    ["econ", t.econ, (p: PlayerStat) => fmt(derived.economy(p))],
    ["sr", t.sr, (p: PlayerStat) => fmt(derived.bowlingSR(p), 1)],
  ] as const;
  const cols = stat.kind === "bat" ? bat : bowl;
  const hl = (key: string) => (key === stat.col ? "bg-link/10 font-bold text-foreground" : "");

  const option = (active: boolean) => `flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-raised ${active ? "font-semibold text-accent" : ""}`;

  return (
    <>
      {/* Hero: dark banner with title, filters and the top three */}
      <section className="relative -mx-4 -mt-6 mb-0 overflow-hidden bg-[#121417] px-4 pb-0 pt-10 text-white sm:mx-0 sm:mt-0 sm:rounded-2xl sm:px-10">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgb(60_207_135/0.18),transparent_55%),radial-gradient(ellipse_at_10%_90%,rgb(27_109_143/0.25),transparent_50%)]" />
        <div className="relative flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div className="border-l-4 border-[#f2b04b] pb-10 pl-5 md:pb-14">
            <h1 className="max-w-md text-3xl font-bold leading-tight tracking-tight md:text-[40px]">{title}</h1>
            {"min" in stat && <p className="mt-2 text-sm text-white/60">{t.minBalls.replace("{n}", String(MIN_BALLS))}</p>}
            <div className="mt-6 text-foreground">
              <Dropdown
                summary={<span className="text-white">{t.applyFilters}</span>}
                summaryClassName="inline-flex rounded-lg border border-white/40 px-5 py-2.5 text-[15px] font-medium transition hover:border-white"
                panelClassName="absolute left-0 z-30 mt-3 flex max-h-[70vh] w-72 flex-col overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-[0_8px_30px_rgb(0_0_0/0.25)]"
              >
                <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t.statType}</p>
                {(Object.keys(STATS) as StatKey[]).map((k) => (
                  <Link key={k} href={href(k)} className={option(k === statKey)}>
                    {STATS[k].label(t)} {k === statKey && <Icon name="chevronRight" className="h-4 w-4" />}
                  </Link>
                ))}
                <hr className="my-2 border-border" />
                <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t.league}</p>
                {leagues.map((l) => (
                  <Link key={l.id} href={href(statKey, l.id)} className={option(l.id === league?.id)}>
                    {l.name}
                  </Link>
                ))}
              </Dropdown>
            </div>
          </div>
          {rows.length >= 3 && <Podium lang={lang} top={rows.slice(0, 3).map((p) => ({ p, v: stat.value(p) }))} />}
        </div>
      </section>

      {!rows.length ? (
        <div className="mt-8">
          <Empty icon="chart">{t.empty}</Empty>
        </div>
      ) : (
        <div className="surface -mx-4 overflow-x-auto rounded-none sm:mx-0 sm:mt-6 sm:rounded-xl">
          <table className="data-table text-[14px]">
            <thead>
              <tr>
                <th className="w-12">{t.no}</th>
                <th className="sticky left-0 z-10 min-w-48 !text-left">{t.player}</th>
                <th className="min-w-20 !text-left">{t.team}</th>
                {cols.map(([key, label]) => (
                  <th key={key} className={hl(key)}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.name}>
                  <td className="text-muted">{i + 1}</td>
                  <td className="sticky left-0 z-10 bg-card">
                    <span className="flex items-center gap-3 font-semibold">
                      <Avatar p={p} size={32} />
                      <PlayerLink id={p.id} lang={lang}>{p.name}</PlayerLink>
                    </span>
                  </td>
                  <td className="!text-left">
                    <span className="flex items-center gap-2 text-muted">
                      <Logo src={p.teamImg} size={18} />
                      {p.team}
                    </span>
                  </td>
                  {cols.map(([key, , value]) => (
                    <td key={key} className={hl(key)}>{value(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export async function generateMetadata() {
  return { title: (await getDictionary()).stats.title };
}

export default function StatsPage({ searchParams }: PageProps<"/[lang]/stats">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <StatsView searchParams={searchParams} />
    </Suspense>
  );
}
