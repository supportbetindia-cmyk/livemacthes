import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { LinkList, NavLinks } from "./NavLinks";
import { MoreMenu } from "./MoreMenu";
import { Icon } from "./Icon";
import { Dropdown } from "./Dropdown";

export async function Navbar() {
  const [dict, lang] = await Promise.all([getDictionary(), getLocale()]);
  const t = dict.nav;
  const links = [
    { href: "", label: t.home },
    { href: "/series", label: t.series },
    { href: "/teams", label: t.teams },
    { href: "/fixtures", label: t.fixtures },
    { href: "/stats", label: t.stats },
    { href: "/rankings", label: t.rankings },
    { href: "/news", label: t.news },
  ].map((l) => ({ ...l, href: `/${lang}${l.href}` }));

  const search = (onNavy: boolean) => (
    <form action={`/${lang}/search`} role="search" className="relative min-w-0 flex-1 lg:max-w-44">
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-80" />
      <input
        type="search"
        name="q"
        placeholder={t.searchShort}
        aria-label={t.search}
        className={`w-full rounded-full border py-2 pl-10 pr-4 text-sm outline-none ${
          onNavy
            ? "border-border bg-raised text-foreground placeholder:text-muted focus:border-link"
            : "border-border bg-background text-foreground focus:border-accent"
        }`}
      />
    </form>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card text-foreground shadow-card">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href={`/${lang}`} className="shrink-0 rounded-md bg-white px-1">
          <Image
            src="/live-matches-cricket-logo.png"
            alt="Live Matches"
            width={2172}
            height={724}
            sizes="(min-width: 1280px) 192px, (min-width: 640px) 144px, 112px"
            loading="eager"
            className="h-auto w-28 sm:w-36 xl:w-48"
          />
        </Link>

        {/* Desktop */}
        <div className="ml-auto hidden items-center gap-1 lg:flex">
          <Suspense fallback={<LinkList links={links} />}>
            <NavLinks links={links} />
          </Suspense>
        </div>
        <div className="ml-auto flex min-w-0 items-center justify-end gap-2 lg:ml-0">
          {/* MoreMenu reads search params, which needs a Suspense boundary under Cache Components */}
          <Suspense fallback={<span className="px-2.5 py-1.5 text-[15px] font-medium">{t.more} ▾</span>}>
            <MoreMenu
              lang={lang}
              labels={{ more: t.more, theme: t.theme, light: t.light, dark: t.dark, system: t.system, language: t.language }}
            />
          </Suspense>
          <div className="hidden min-w-0 lg:flex">{search(true)}</div>

          {/* Mobile menu; closes after a link is tapped */}
          <div className="lg:hidden">
            <Dropdown
              label={t.menu}
              summary={<Icon name="menu" className="h-5 w-5" />}
              summaryClassName="flex h-9 w-9 items-center justify-center rounded-lg border border-border"
              panelClassName="absolute right-0 z-30 mt-3 flex w-64 flex-col gap-0.5 rounded-xl border border-border bg-card p-2 text-foreground shadow-[0_8px_30px_rgb(0_0_0/0.12)]"
            >
              {search(false)}
              <Suspense fallback={<LinkList links={links} />}>
                <NavLinks links={links} />
              </Suspense>
            </Dropdown>
          </div>
        </div>
      </nav>
    </header>
  );
}
