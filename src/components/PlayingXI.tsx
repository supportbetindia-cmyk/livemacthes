"use client";

import { useState } from "react";
import Link from "next/link";
import type { MatchInfo } from "@/lib/provider";
import { Logo } from "./Logo";

// Playing XI with a team switch (CREX style). Both lineups come with the page; switching is client-only.
export function PlayingXI({ lineups, short, lang }: { lineups: MatchInfo["lineups"]; short: string[]; lang: string }) {
  const [team, setTeam] = useState(0);
  const tag = (p: MatchInfo["lineups"][number]["players"][number]) => [p.captain && "C", p.keeper && "WK"].filter(Boolean).join(", ");
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {lineups.map((l, i) => (
          <button
            key={l.team}
            type="button"
            aria-pressed={team === i}
            onClick={() => setTeam(i)}
            className="rounded-md border border-border py-2 text-sm font-semibold text-muted aria-pressed:border-link/40 aria-pressed:bg-link/10 aria-pressed:text-link"
          >
            {short[i] || l.team}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-4">
        {lineups[team].players.map((p) => (
          <li key={p.id}>
            <Link href={`/${lang}/player/${p.id}`} className="group flex items-center gap-2.5">
              <Logo src={p.img} size={40} />
              <span className="min-w-0">
                <span className={`block truncate text-sm font-medium group-hover:underline ${tag(p) ? "text-amber-600 dark:text-amber-400" : ""}`}>
                  {p.name}{tag(p) && ` (${tag(p)})`}
                </span>
                {p.role && <span className="block truncate text-xs text-muted">{p.role}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
