"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { LANGUAGES } from "@/lib/i18n";
import { Icon } from "./Icon";
import { Dropdown } from "./Dropdown";
import { applyTheme, savedTheme, type Theme } from "./ThemeSync";

type Labels = Record<"more" | "theme" | "light" | "dark" | "system" | "language", string>;

// Re-render the menu when the theme changes (to highlight the selected option).
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => (listeners.add(cb), () => listeners.delete(cb));

function setTheme(t: Theme) {
  localStorage.setItem("theme", t);
  applyTheme(t);
  listeners.forEach((cb) => cb());
}

export function MoreMenu({ lang, labels }: { lang: string; labels: Labels }) {
  const theme = useSyncExternalStore(subscribe, savedTheme, () => "system");
  const pathname = usePathname();
  const query = useSearchParams().toString();

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-raised";
  const selected = "font-semibold text-accent";

  return (
    <Dropdown
      summary={<>{labels.more} <Icon name="chevronDown" className="h-4 w-4" /></>}
      summaryClassName="flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-[15px] font-medium opacity-90 hover:opacity-100"
      panelClassName="absolute right-0 z-30 mt-3 w-52 rounded-xl border border-border bg-card p-2 text-foreground shadow-[0_8px_30px_rgb(0_0_0/0.12)]"
    >
        <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{labels.theme}</p>
        {(["light", "dark", "system"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTheme(t)} className={`${item} ${theme === t ? selected : ""}`}>
            <Icon name={t === "light" ? "sun" : t === "dark" ? "moon" : "monitor"} className="h-4 w-4" /> {labels[t]}
          </button>
        ))}

        <hr className="my-2 border-border" />

        <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{labels.language}</p>
        {LANGUAGES.map(({ code, label }) => (
          <Link
            key={code}
            // Same page, different language: swap the first path segment.
            href={pathname.replace(/^\/[^/]+/, `/${code}`) + (query ? `?${query}` : "")}
            onClick={() => (document.cookie = `lang=${code}; path=/; max-age=31536000`)}
            className={`${item} ${lang === code ? selected : ""}`}
          >
            <Icon name="language" className="h-4 w-4" /> {label}
          </Link>
        ))}
    </Dropdown>
  );
}
