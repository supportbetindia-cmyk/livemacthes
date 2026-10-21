import Image from "next/image";
import Link from "next/link";
import { optimizable } from "@/lib/images";
import type { NewsItem } from "@/lib/news";
import { TimeAgo } from "./TimeAgo";
import { Icon, type IconName } from "./Icon";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-4 sm:mb-6">
      <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-[28px]">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      {children}
    </header>
  );
}

export function Section({ title, href, linkLabel, children }: { title: string; href?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        {href && (
          <Link href={href} className="flex items-center gap-0.5 text-sm font-medium text-link hover:underline">
            {linkLabel} <Icon name="chevronRight" className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export const Empty = ({ children, icon }: { children: React.ReactNode; icon?: IconName }) => (
  <div className="surface flex flex-col items-center gap-3 px-6 py-12 text-center">
    {icon && (
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-raised text-muted">
        <Icon name={icon} className="h-6 w-6" />
      </span>
    )}
    <p className="max-w-md text-sm leading-relaxed text-muted">{children}</p>
  </div>
);

export const Skeleton = () => <div className="h-56 w-full animate-pulse rounded-xl bg-raised" />;

const linkProps = (item: NewsItem) => ({
  href: item.link,
  ...(!item.ours && { target: "_blank", rel: "noopener noreferrer" }),
});

// "ESPNCRICINFO · 2 hours ago"
const Meta = ({ item, lang }: { item: NewsItem; lang: string }) => (
  <p className="flex items-center gap-1.5 text-xs text-muted max-sm:text-[11px] max-sm:uppercase max-sm:tracking-wide">
    {/* Our articles show the writer ("ARJUN · 3 HRS AGO"), feed stories their publisher */}
    <span className={`font-semibold uppercase tracking-wide ${item.ours ? "text-accent" : "text-link"}`}>{item.author || item.source}</span>
    {item.date && (
      <>
        <span aria-hidden>·</span>
        <TimeAgo date={item.date} lang={lang} />
      </>
    )}
  </p>
);

// Big lead story: image left, large headline right (stacks on mobile).
export function NewsFeatured({ item, lang }: { item: NewsItem; lang: string }) {
  return (
    // Phone: photo, headline, then source · time (no summary), like a news app. Larger layout from 640px up.
    <a {...linkProps(item)} className="group mb-2 grid gap-3 border-b border-border pb-4 sm:mb-10 sm:gap-6 sm:border-0 sm:pb-0 md:grid-cols-[1.15fr_1fr]">
      {item.image && (
        // Lead story photo is usually the LCP element: load it eagerly at high priority, sized to its column.
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-raised">
          <Image src={item.image} alt="" fill sizes="(min-width: 768px) 55vw, 100vw" loading="eager" fetchPriority="high" unoptimized={!optimizable(item.image)} className="object-cover" />
        </div>
      )}
      <div className="flex flex-col justify-center gap-2 sm:gap-4">
        <div className="order-last sm:order-none"><Meta item={item} lang={lang} /></div>
        <h2 className="text-lg font-bold leading-snug tracking-tight group-hover:underline sm:text-2xl sm:font-extrabold md:text-4xl">{item.title}</h2>
        {item.excerpt && <p className="hidden leading-relaxed text-muted sm:block">{item.excerpt}</p>}
      </div>
    </a>
  );
}

// News list item: thumbnail, headline, two-line summary, source + time.
export function NewsCard({ item, lang }: { item: NewsItem; lang: string }) {
  return (
    <a {...linkProps(item)} className="surface surface-hover news-row group flex gap-3 py-4 sm:gap-4 sm:p-3">
      {item.image && (
        <div className="relative aspect-[4/3] w-28 shrink-0 self-start overflow-hidden rounded-lg bg-raised sm:w-32">
          <Image src={item.image} alt="" fill sizes="128px" unoptimized={!optimizable(item.image)} className="object-cover" />
        </div>
      )}
      <div className="flex min-w-0 flex-col justify-center gap-1.5 py-1">
        <h3 className="line-clamp-3 text-[15px] font-semibold leading-snug group-hover:underline sm:line-clamp-2">{item.title}</h3>
        {item.excerpt && <p className="hidden text-[13px] leading-relaxed text-muted sm:line-clamp-2">{item.excerpt}</p>}
        <Meta item={item} lang={lang} />
      </div>
    </a>
  );
}

// Row of shortcut chips ("ICC Rankings ›") under the Home match strip.
export function QuickLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <nav className="mb-10 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none]">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="chip text-foreground">
          {l.label} <Icon name="chevronRight" className="h-4 w-4 text-muted" />
        </Link>
      ))}
    </nav>
  );
}
