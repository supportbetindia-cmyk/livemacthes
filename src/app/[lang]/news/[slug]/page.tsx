import Image from "next/image";
import Link from "next/link";
import { optimizable } from "@/lib/images";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getArticle, getNews } from "@/lib/news";
import { formatDate } from "@/lib/i18n";
import { NewsCard, Section, Skeleton } from "@/components/ui";
import { ArticleBody } from "@/components/ArticleBody";
import { Icon } from "@/components/Icon";
import { getDictionary, getLocale } from "../../dictionaries";

async function load(params: Promise<{ slug: string }>) {
  const article = await getArticle((await params).slug, await getLocale());
  if (!article) notFound();
  return article;
}

// Title, summary and cover photo also make the preview card when the link is shared (WhatsApp, X, Facebook).
export async function generateMetadata({ params }: PageProps<"/[lang]/news/[slug]">) {
  const a = await load(params);
  const images = a.image ? [{ url: a.image }] : undefined;
  return {
    title: a.title,
    description: a.excerpt,
    openGraph: { type: "article", title: a.title, description: a.excerpt, images, publishedTime: a.publishedAt, authors: a.author ? [a.author] : undefined },
    twitter: { card: a.image ? "summary_large_image" : "summary", title: a.title, description: a.excerpt, images },
  };
}

// More stories below the article, so readers keep reading on this site.
async function MoreNews({ current }: { current: string }) {
  const [dict, lang] = await Promise.all([getDictionary(), getLocale()]);
  const more = (await getNews(lang)).filter((n) => n.link !== current).slice(0, 6);
  if (!more.length) return null;
  return (
    <Section title={dict.news.more} href={`/${lang}/news`} linkLabel={dict.news.back}>
      <div className="grid sm:gap-4 md:grid-cols-2">
        {more.map((n) => <NewsCard key={n.link} item={n} lang={lang} />)}
      </div>
    </Section>
  );
}

async function ArticleView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [dict, lang, a] = await Promise.all([getDictionary(), getLocale(), load(params)]);
  return (
    <>
      <article className="mx-auto mb-12 max-w-[680px] sm:py-4">
        <Link href={`/${lang}/news`} className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline">
          <Icon name="chevronRight" className="h-4 w-4 rotate-180" /> {dict.news.back}
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:mt-5 sm:text-3xl md:text-[40px] md:leading-[1.15]">{a.title}</h1>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted sm:mt-4">
          <span className="font-semibold uppercase tracking-wide text-accent">{a.author || dict.news.ours}</span>
          <span aria-hidden>·</span>
          {formatDate(a.publishedAt, lang, false)}
        </p>
        {a.image && (
          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-xl bg-raised sm:mt-8">
            <Image src={a.image} alt="" fill sizes="(min-width: 720px) 680px, 100vw" loading="eager" fetchPriority="high" unoptimized={!optimizable(a.image)} className="object-cover" />
          </div>
        )}
        {a.body && (
          <div className="mt-6 sm:mt-8">
            <ArticleBody value={a.body} />
          </div>
        )}
      </article>
      <Suspense fallback={null}>
        <MoreNews current={`/${lang}/news/${slug}`} />
      </Suspense>
    </>
  );
}

export default function ArticlePage({ params }: PageProps<"/[lang]/news/[slug]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <ArticleView params={params} />
    </Suspense>
  );
}
