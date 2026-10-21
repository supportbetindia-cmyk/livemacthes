// News = external RSS feeds + our own articles from Sanity, merged newest-first.
import { cacheLife } from "next/cache";
import Parser from "rss-parser";

export type NewsItem = {
  title: string;
  link: string; // external URL, or /<lang>/news/<slug> for our articles
  date: string;
  excerpt?: string;
  image?: string;
  source: string;
  ours?: boolean;
};
export type Article = { title: string; body: string; publishedAt: string; image?: string };

// News changes every few minutes at most; the preset "minutes" profile would refetch every minute.
const tenMinutes = { stale: 300, revalidate: 600, expire: 3600 };

const FEEDS = [
  { source: "ESPNcricinfo", url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml" },
  { source: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/cricket/rss.xml" },
];

// Returns the URL only if it's an absolute http(s) link.
function webUrl(u?: string) {
  try {
    return u && /^https?:$/.test(new URL(u).protocol) ? u : undefined;
  } catch {
    return undefined;
  }
}

// Photo tags differ per feed: ESPNcricinfo uses media:content / coverImages, BBC media:thumbnail.
type Media = { $?: { url?: string } };
const parser = new Parser<object, { media?: Media; thumb?: Media; cover?: string }>({
  customFields: { item: [["media:content", "media"], ["media:thumbnail", "thumb"], ["coverImages", "cover"]] },
});

// BBC thumbnails are 240px wide (blurry as the lead story); the same image exists at 976px. next/image then
// resizes it down for small cards, so thumbnails stay light.
const largerImage = (u?: string) => u?.replace(/^http:\/\//, "https://").replace(/(ichef\.bbci\.co\.uk\/ace\/standard\/)\d+\//, "$1976/");

// Same feed for every language: cached on its own, so it is downloaded once, not once per language.
async function getRss(): Promise<NewsItem[]> {
  "use cache";
  cacheLife(tenMinutes);
  const feeds = await Promise.all(
    FEEDS.map(async ({ source, url }) => {
      try {
        // 5s limit: a slow or hanging publisher is skipped instead of holding up the other feeds.
        const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 LiveScore" }, signal: AbortSignal.timeout(5000) });
        const feed = await parser.parseString(await res.text());
        return feed.items.flatMap((i) => {
          // Feed content is untrusted: only real web links may become an href (no javascript:, data: ...).
          const link = webUrl(i.link);
          if (!link) return [];
          return [
            {
              title: i.title ?? "",
              link,
              date: i.isoDate ?? i.pubDate ?? "",
              excerpt: i.contentSnippet?.slice(0, 200),
              // Feeds use http:// image links; upgrade so they load on an https site and next/image can resize them.
              image: webUrl(largerImage(i.enclosure?.url ?? i.media?.$?.url ?? i.thumb?.$?.url ?? i.cover)),
              source,
            },
          ];
        });
      } catch {
        return []; // one broken feed shouldn't break the page
      }
    }),
  );
  return feeds.flat();
}

// --- Sanity (optional): set NEXT_PUBLIC_SANITY_PROJECT_ID to enable. Schema + editor: /studio ---
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

async function sanity<T>(query: string, params: Record<string, string>): Promise<T | null> {
  if (!projectId) return null;
  const qs = new URLSearchParams({ query });
  for (const [k, v] of Object.entries(params)) qs.set(`$${k}`, JSON.stringify(v));
  const res = await fetch(`https://${projectId}.apicdn.sanity.io/v2025-01-01/data/query/${dataset}?${qs}`);
  if (!res.ok) return null;
  return (await res.json()).result as T;
}

// Fields are per-language objects ({ en, hi, ... }); fall back to English when a translation is missing.
const t = (field: string) => `coalesce(${field}[$lang], ${field}.en)`;

async function getOurArticles(lang: string): Promise<NewsItem[]> {
  const rows = await sanity<{ title: string; slug: string; publishedAt: string; excerpt?: string; image?: string }[]>(
    `*[_type == "article" && defined(slug.current)] | order(publishedAt desc)[0...30]{
      "title": ${t("title")}, "slug": slug.current, publishedAt,
      "excerpt": ${t("excerpt")}, "image": image.asset->url }`,
    { lang },
  );
  return (rows ?? []).map((r) => ({
    title: r.title,
    link: `/${lang}/news/${r.slug}`,
    date: r.publishedAt,
    excerpt: r.excerpt,
    image: r.image,
    source: "LiveScore",
    ours: true,
  }));
}

export async function getNews(lang: string): Promise<NewsItem[]> {
  "use cache";
  cacheLife(tenMinutes);
  const [ours, rss] = await Promise.all([getOurArticles(lang), getRss()]);
  return [...ours, ...rss].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export async function getArticle(slug: string, lang: string) {
  "use cache";
  cacheLife("minutes");
  return sanity<Article>(
    `*[_type == "article" && slug.current == $slug][0]{
      "title": ${t("title")}, "body": ${t("body")}, publishedAt, "image": image.asset->url }`,
    { slug, lang },
  );
}
