"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

export type Tab = { href: string; label: string; icon: IconName };

// Phone/tablet navigation (below lg), like a native app's tab bar. Desktop uses the top navbar links instead.
export function BottomTabs({ tabs, pathname = "" }: { tabs: Tab[]; pathname?: string }) {
  return tabs.map(({ href, label, icon }) => {
    // Home (/en) must match exactly; other tabs also match their sub-pages.
    const active = pathname === href || (href.split("/").length > 2 && pathname.startsWith(href + "/"));
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-col items-center gap-0.5 py-1.5 text-[11px] ${active ? "font-semibold text-foreground" : "font-medium text-muted"}`}
      >
        <Icon name={icon} className="h-6 w-6" />
        {label}
      </Link>
    );
  });
}

// Highlights the current tab. Must sit inside <Suspense> (pathname is request data); fallback = <BottomTabs> without highlight.
export function BottomNavTabs({ tabs }: { tabs: Tab[] }) {
  return <BottomTabs tabs={tabs} pathname={usePathname()} />;
}
