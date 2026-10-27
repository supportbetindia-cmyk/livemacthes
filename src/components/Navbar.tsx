import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { LinkList, NavLinks } from "./NavLinks";
import { MoreMenu } from "./MoreMenu";
import { Icon } from "./Icon";
import { BottomNavTabs, BottomTabs, type Tab } from "./BottomNav";

const logo = process.env.LOGO_URL || "/live-matches-cricket-logo.png";
const logoDark = process.env.LOGO_DARK_URL || "/live-matches-cricket-logo-dark.png";
const external = (src: string) => /^https?:\/\//.test(src); // an off-site logo URL skips next/image optimization

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

  const search = (
    <form action={`/${lang}/search`} role="search" className="relative min-w-0 flex-1 lg:max-w-44">
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-80" />
      <input
        type="search"
        name="q"
        placeholder={t.searchShort}
        aria-label={t.search}
        className="w-full rounded-full border border-border bg-raised py-2 pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted focus:border-link"
      />
    </form>
  );

  const moreLabels = { more: t.more, theme: t.theme, light: t.light, dark: t.dark, system: t.system, language: t.language };
  const at = (path: string) => `/${lang}${path}`;
  // Phone bottom bar: the most used sections as tabs, the rest under More.
  const tabs: Tab[] = [
    { href: at(""), label: t.home, icon: "home" },
    { href: at("/fixtures"), label: t.fixtures, icon: "calendar" },
    { href: at("/series"), label: t.series, icon: "trophy" },
    { href: at("/news"), label: t.news, icon: "news" },
  ];
  const moreLinks = [
    { href: at("/teams"), label: t.teams, icon: "ball" as const },
    { href: at("/stats"), label: t.stats, icon: "chart" as const },
    { href: at("/rankings"), label: t.rankings, icon: "trophy" as const },
  ];

  return (
    <>
    <header className="sticky top-0 z-20 border-b border-border bg-card text-foreground shadow-card">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href={`/${lang}`} className="shrink-0 rounded-md px-1">
          {/* LOGO_URL / LOGO_DARK_URL (optional) override the logo per site; default to the bundled one. */}
          <Image
            src={logo}
            alt={t.brand}
            width={2172}
            height={724}
            sizes="(min-width: 1280px) 192px, (min-width: 640px) 144px, 112px"
            loading="eager"
            unoptimized={external(logo)}
            className="h-auto w-28 dark:hidden sm:w-36 xl:w-48"
          />
          <Image
            src={logoDark}
            alt={t.brand}
            width={2171}
            height={724}
            sizes="(min-width: 1280px) 192px, (min-width: 640px) 144px, 112px"
            loading="eager"
            unoptimized={external(logoDark)}
            className="hidden h-auto w-28 dark:block sm:w-36 xl:w-48"
          />
        </Link>

        {/* Desktop */}
        <div className="ml-auto hidden items-center gap-1 lg:flex">
          <Suspense fallback={<LinkList links={links} />}>
            <NavLinks links={links} />
          </Suspense>
        </div>
        <div className="ml-auto hidden min-w-0 items-center justify-end gap-2 lg:ml-0 lg:flex">
          {/* MoreMenu reads search params, which needs a Suspense boundary under Cache Components */}
          <Suspense fallback={<span className="px-2.5 py-1.5 text-[15px] font-medium">{t.more} ▾</span>}>
            <MoreMenu lang={lang} labels={moreLabels} />
          </Suspense>
          <div className="flex min-w-0">{search}</div>
        </div>

        {/* Phone/tablet: navigation lives in the bottom tab bar; the top bar keeps only search */}
        <Link
          href={`/${lang}/search`}
          className="ml-auto flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-medium lg:hidden"
        >
          <Icon name="search" className="h-4 w-4" /> {t.searchShort}
        </Link>
      </nav>
    </header>

    <nav
      aria-label={t.menu}
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] text-foreground shadow-[0_-2px_12px_rgb(0_0_0/0.06)] lg:hidden"
    >
      <Suspense fallback={<BottomTabs tabs={tabs} />}>
        <BottomNavTabs tabs={tabs} />
      </Suspense>
      <Suspense fallback={<span className="flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium text-muted"><Icon name="dots" className="h-6 w-6" />{t.more}</span>}>
        <MoreMenu lang={lang} labels={moreLabels} variant="sheet" links={moreLinks} />
      </Suspense>
    </nav>
    </>
  );
}
