"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Match } from "@/lib/cricket";
import { MatchCard, matchTitle, type CardLabels } from "./MatchCard";
import { useLiveScores, withLive } from "./useLiveScores";
import { Icon } from "./Icon";

type Labels = { top: string; live: string; schedule: string; card: CardLabels };

// Home strip: tabs (Top / Live / one per series) over a horizontally scrolling row of match cards.
export function MatchCarousel({ matches: initial, top, lang, labels }: { matches: Match[]; top: Match[]; lang: string; labels: Labels }) {
  const [tab, setTab] = useState("top");
  const liveScores = useLiveScores(initial.some((m) => m.matchStarted && !m.matchEnded));
  const matches = initial.map((m) => withLive(m, liveScores));
  const row = useRef<HTMLDivElement>(null);

  const live = matches.filter((m) => m.matchStarted && !m.matchEnded);
  const series = Map.groupBy(matches, (m) => m.series_id);
  const tabs = [
    // "Top" shows a short curated list; series tabs show all their matches.
    { key: "top", label: labels.top, list: top.map((m) => withLive(m, liveScores)) },
    { key: "live", label: `${labels.live} (${live.length})`, list: live },
    ...[...series].map(([id, ms]) => ({ key: id, label: `${ms[0].seriesName ?? matchTitle(ms[0])} (${ms.length})`, list: ms })),
  ];
  const list = tabs.find((t) => t.key === tab)?.list ?? matches;

  const scroll = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.9, behavior: "smooth" });
  const arrow = "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-[0_4px_14px_rgb(0_0_0/0.12)] transition hover:scale-105 md:flex";

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        {/* Pill tabs, like cricinfo's "Matches (3)" chips */}
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                row.current?.scrollTo({ left: 0 });
              }}
              aria-pressed={tab === t.key}
              className="chip"
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link href={`/${lang}/fixtures`} className="hidden shrink-0 items-center gap-0.5 text-sm font-medium text-link hover:underline sm:flex">
          {labels.schedule} <Icon name="chevronRight" className="h-4 w-4" />
        </Link>
      </div>

      <div className="relative">
        <button type="button" aria-label="Previous" onClick={() => scroll(-1)} className={`${arrow} -left-4`}><Icon name="chevronRight" className="h-4 w-4 rotate-180" /></button>
        <div ref={row} className="flex snap-x gap-3 overflow-x-auto scroll-smooth px-0.5 pb-3 pt-0.5 [scrollbar-width:none]">
          {list.map((m) => (
            <div key={m.id} className="flex w-[82%] shrink-0 snap-start sm:w-[19.5rem]">
              <MatchCard match={m} lang={lang} t={labels.card} />
            </div>
          ))}
        </div>
        <button type="button" aria-label="Next" onClick={() => scroll(1)} className={`${arrow} -right-4`}><Icon name="chevronRight" className="h-4 w-4" /></button>
      </div>
    </section>
  );
}
