"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Links = { href: string; label: string }[];

export function LinkList({ links, pathname = "" }: { links: Links; pathname?: string }) {
  return links.map(({ href, label }) => {
    // Home (/en) must match exactly; other sections also match their sub-pages.
    const active = pathname === href || (href.split("/").length > 2 && pathname.startsWith(href + "/"));
    return (
      <Link
        key={href}
        href={href}
        // Active sections use a red underline in both navigation menus.
        // Sits on the dark header, so the colours are white-based.
        className={`whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-[15px] transition-colors hover:bg-white/10 hover:text-white ${
          active ? "border-brand font-bold text-white" : "border-transparent font-medium text-white/75"
        }`}
      >
        {label}
      </Link>
    );
  });
}

// Highlights the current section. Must sit inside <Suspense> (pathname is request data); fallback = <LinkList> without highlight.
export function NavLinks({ links }: { links: Links }) {
  return <LinkList links={links} pathname={usePathname()} />;
}
