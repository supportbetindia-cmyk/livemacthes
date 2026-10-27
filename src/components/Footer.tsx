import Image from "next/image";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { getLeagues, getSeasonStats, getSeriesList, getTeams } from "@/lib/cricket";
import { getNews } from "@/lib/news";
import { LANGUAGES } from "@/lib/i18n";

// The year for the copyright line. Cached (refreshed daily) because the layout is prerendered
// and Next.js doesn't allow reading the clock directly during prerendering.
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

// Footer "Teams" column, in this order (matched by name against the provider's team list).
const FEATURED_TEAMS = [
  "India", "Pakistan", "Bangladesh", "Australia", "England", "West Indies", "South Africa", "New Zealand",
  "Chennai Super Kings", "Royal Challengers Bengaluru",
];

const logoDark = process.env.LOGO_DARK_URL || "/live-matches-cricket-logo-dark.png"; // per-site override, same as Navbar

type FooterLink = { label: string; href: string; external?: boolean };

// All footer data is best-effort: if the API or a feed fails, that column is just empty.
const safe = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);

export async function Footer() {
  const [dict, lang, year, news, series, teams, leagues] = await Promise.all([
    getDictionary(),
    getLocale(),
    currentYear(),
    getLocale().then((l) => safe(getNews(l))),
    safe(getSeriesList()),
    safe(getTeams()),
    safe(getLeagues()),
  ]);
  // Players column: top run-scorers of the IPL, or of T20Is if the plan doesn't include the IPL
  // (same cached season stats as Stats Corner).
  const league = leagues.find((l) => l.code === "IPL") ?? leagues.find((l) => l.code === "T20I") ?? leagues[0];
  const players = league ? await getSeasonStats(league.seasonId).then((s) => s.players, () => []) : [];

  const t = dict.footer;
  const n = dict.nav;
  const href = (path: string) => `/${lang}${path}`;

  const columns: { title: string; links: FooterLink[] }[] = [
    { title: t.hotPicks, links: news.slice(0, 8).map((x) => ({ label: x.title, href: x.link, external: !x.ours })) },
    { title: t.tournaments, links: series.slice(-9).reverse().map((s) => ({ label: s.name, href: href(`/series/${s.id}`) })) },
    {
      title: t.teams,
      links: FEATURED_TEAMS.flatMap((name) => {
        const team = teams.find((x) => x.name === name);
        return team ? [{ label: team.name, href: href(`/teams/${team.id}`) }] : [];
      }),
    },
    {
      title: t.players,
      links: [...players].sort((a, b) => b.runs - a.runs).filter((p) => p.id).slice(0, 10).map((p) => ({ label: p.name, href: href(`/player/${p.id}`) })),
    },
    {
      title: t.otherLinks,
      links: [
        { label: n.fixtures, href: href("/fixtures") },
        { label: n.rankings, href: href("/rankings") },
        { label: n.stats, href: href("/stats") },
        { label: n.news, href: href("/news") },
        { label: n.searchShort, href: href("/search") },
      ],
    },
  ].filter((c) => c.links.length);

  return (
    <footer className="mt-16 bg-nav text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-10 px-4 pb-10 pt-14 md:grid-cols-3 lg:grid-cols-[1.35fr_1.35fr_1fr_1fr_0.9fr]">
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="min-w-0">
            <h2 className="mb-5 text-[13px] font-bold uppercase tracking-[0.08em]">{col.title}</h2>
            <ul className="flex flex-col gap-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    {...(l.external && { target: "_blank", rel: "noopener noreferrer" })}
                    className="line-clamp-2 text-[15px] leading-snug text-white/80 transition hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col gap-6 border-t border-white/15 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-5">
            <Link href={href("")} className="shrink-0 rounded-lg px-3 py-1">
              <Image
                src={logoDark}
                alt={dict.nav.brand}
                width={2171}
                height={724}
                sizes="192px"
                unoptimized={/^https?:\/\//.test(logoDark)}
                className="h-auto w-48"
              />
            </Link>
            <span className="hidden max-w-xs text-sm text-white/60 md:block">{t.tagline}</span>
          </div>
          <div className="flex gap-2">
            {LANGUAGES.map((l) => (
              <Link
                key={l.code}
                href={`/${l.code}`}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${l.code === lang ? "border-white/60 text-white" : "border-white/20 text-white/60 hover:border-white/40 hover:text-white"}`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 pb-8 text-[13px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {dict.nav.brand}. {t.rights}</p>
          <p>{t.data}</p>
        </div>
      </div>
    </footer>
  );
}
