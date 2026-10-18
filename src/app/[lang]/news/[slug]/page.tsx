import Image from "next/image";
import Link from "next/link";
import { optimizable } from "@/lib/images";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getArticle } from "@/lib/news";
import { formatDate } from "@/lib/i18n";
import { Skeleton } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { getDictionary, getLocale } from "../../dictionaries";

async function load(params: Promise<{ slug: string }>) {
  const article = await getArticle((await params).slug, await getLocale());
  if (!article) notFound();
  return article;
}

export async function generateMetadata({ params }: PageProps<"/[lang]/news/[slug]">) {
  return { title: (await load(params)).title };
}

async function ArticleView({ params }: { params: Promise<{ slug: string }> }) {
  const [dict, lang, a] = await Promise.all([getDictionary(), getLocale(), load(params)]);
  return (
    <article className="mx-auto max-w-[680px] py-4">
      <Link href={`/${lang}/news`} className="inline-flex items-center gap-1 text-sm font-medium text-link hover:underline">
        <Icon name="chevronRight" className="h-4 w-4 rotate-180" /> {dict.news.back}
      </Link>
      <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight md:text-[40px] md:leading-[1.15]">{a.title}</h1>
      <p className="mt-4 flex items-center gap-2 text-sm text-muted">
        <span className="font-semibold uppercase tracking-wide text-accent">{dict.news.ours}</span>
        <span aria-hidden>·</span>
        {formatDate(a.publishedAt, lang, false)}
      </p>
      {a.image && (
        <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-xl bg-raised">
          <Image src={a.image} alt="" fill sizes="(min-width: 720px) 680px, 100vw" loading="eager" fetchPriority="high" unoptimized={!optimizable(a.image)} className="object-cover" />
        </div>
      )}
      <div className="mt-8 space-y-5 text-[17px] leading-[1.75]">
        {a.body?.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </article>
  );
}

export default function ArticlePage({ params }: PageProps<"/[lang]/news/[slug]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <ArticleView params={params} />
    </Suspense>
  );
}
