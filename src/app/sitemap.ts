import type { MetadataRoute } from "next";
import { getMatches, getSeriesList, getTeams } from "@/lib/cricket";
import { getNews } from "@/lib/news";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

// /sitemap.xml: every page in every language, each listing its other-language twins.
// Built from the same cached lists the pages use, so it costs no extra API requests.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [matches, series, teams, news] = await Promise.all([getMatches(), getSeriesList(), getTeams(), getNews(DEFAULT_LOCALE)]);
  const paths = [
    "", "/fixtures", "/series", "/teams", "/stats", "/rankings", "/news",
    ...series.map((s) => `/series/${s.id}`),
    ...matches.map((m) => `/match/${m.id}`),
    ...teams.map((t) => `/teams/${t.id}`),
    // Own articles only ("/en/news/slug"); feed stories link to other sites.
    ...news.filter((n) => n.link.startsWith(`/${DEFAULT_LOCALE}/`)).map((n) => n.link.slice(DEFAULT_LOCALE.length + 1)),
  ];
  const languages = (path: string) => Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${path}`]));
  return paths.flatMap((path) => LOCALES.map((l) => ({ url: `${SITE_URL}/${l}${path}`, alternates: { languages: languages(path) } })));
}
