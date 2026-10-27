// News = external RSS feeds + our own articles from Sanity, merged newest-first.
import { cacheLife, cacheTag } from "next/cache";
import type { PortableTextBlock } from "@portabletext/react";
import Parser from "rss-parser";

export type NewsItem = {
  title: string;
  link: string; // external URL, or /<lang>/news/<slug> for our articles
  date: string;
  excerpt?: string;
  image?: string;
  source: string;
  author?: string; // our articles only
  ours?: boolean;
};
// body: Sanity rich text (paragraphs, headings, lists, links, photos); photos carry their resolved `url`.
export type Article = { title: string; body?: PortableTextBlock[]; publishedAt: string; image?: string; author?: string; excerpt?: string; metaTitle?: string; metaDescription?: string };

// Cache tag on everything read from Sanity: publishing in the Studio calls /api/revalidate (webhook), which
// expires it so new or edited articles show at once instead of after the 10-minute refresh.
export const SANITY_TAG = "sanity";

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

// One feed, cached on its own and shared by every language. A failure throws, so it is never cached: the last
// good copy keeps being served while the publisher is down.
async function getFeed(source: string, url: string): Promise<NewsItem[]> {
  "use cache";
  cacheLife(tenMinutes);
  // 5s limit: a slow or hanging publisher is skipped instead of holding up the other feeds.
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 LiveScore" }, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`${source} feed: HTTP ${res.status}`);
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
}

// One broken feed shouldn't break the page.
async function getRss(): Promise<NewsItem[]> {
  const feeds = await Promise.all(FEEDS.map(({ source, url }) => getFeed(source, url).catch(() => [])));
  return feeds.flat();
}

// --- Sanity (optional): set NEXT_PUBLIC_SANITY_PROJECT_ID to enable. Schema + editor: /studio ---
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

async function sanity<T>(query: string, params: Record<string, string>): Promise<T | null> {
  if (!projectId) return null;
  const qs = new URLSearchParams({ query });
  for (const [k, v] of Object.entries(params)) qs.set(`$${k}`, JSON.stringify(v));
  // api (not apicdn): right after a publish the webhook asks for fresh data, and Sanity's CDN could still hold the old
  // answer for a moment. Our own cache keeps this to a few requests an hour. Without a token only published articles are visible.
  const res = await fetch(`https://${projectId}.api.sanity.io/v2025-01-01/data/query/${dataset}?${qs}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Sanity: HTTP ${res.status}`); // thrown, not null: an outage must not be cached as "no article"
  // Parse ourselves: an empty/non-JSON body would make res.json() throw an unhandled SyntaxError. Thrown (not null)
  // so a blip isn't cached as "no articles"; getNews catches it and still shows the RSS feed.
  const body = await res.text();
  try {
    return (JSON.parse(body) as { result: T }).result;
  } catch {
    throw new Error("Sanity: empty or non-JSON response");
  }
}

// Fields are per-language objects ({ en, hi, ... }); fall back to English when a translation is missing.
const t = (field: string) => `coalesce(${field}[$lang], ${field}.en)`;

async function getOurArticles(lang: string): Promise<NewsItem[]> {
  "use cache";
  cacheLife(tenMinutes);
  cacheTag(SANITY_TAG);
  const rows = await sanity<{ title: string; slug: string; publishedAt: string; excerpt?: string; image?: string; author?: string }[]>(
    `*[_type == "article" && defined(slug.current)] | order(publishedAt desc)[0...30]{
      "title": ${t("title")}, "slug": slug.current, publishedAt, author,
      "excerpt": ${t("excerpt")}, "image": image.asset->url }`,
    { lang },
  );
  return (rows ?? []).map((r) => ({
    title: r.title,
    link: `/${lang}/news/${r.slug}`,
    date: r.publishedAt,
    excerpt: r.excerpt,
    image: r.image,
    source: process.env.SITE_NAME?.trim() || "LiveScore",
    author: r.author,
    ours: true,
  }));
}

// Not cached itself: it only merges cached parts, so a failing part is skipped this time instead of cached as empty.
export async function getNews(lang: string): Promise<NewsItem[]> {
  const [ours, rss] = await Promise.all([getOurArticles(lang).catch(() => []), getRss()]);
  return [...ours, ...rss].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export async function getArticle(slug: string, lang: string) {
  "use cache";
  cacheLife(tenMinutes);
  cacheTag(SANITY_TAG);
  return sanity<Article>(
    `*[_type == "article" && slug.current == $slug][0]{
      "title": ${t("title")}, "excerpt": ${t("excerpt")}, publishedAt, author, "image": image.asset->url,
      "metaTitle": coalesce(seo[$lang].title, seo.en.title), "metaDescription": coalesce(seo[$lang].description, seo.en.description),
      "body": ${t("body")}[]{ ..., _type == "image" => { "url": asset->url } } }`,
    { slug, lang },
  );
}
