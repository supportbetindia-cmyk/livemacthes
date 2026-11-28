"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Match } from "@/lib/provider";
import { isNotBehind } from "@/lib/score-progress";

type LivePatch = Pick<Match, "score" | "status" | "matchStarted" | "matchEnded" | "now"> & { updatedAt?: number }; // updatedAt: ms, set by the API

// Live scores stream from the central API (Server-Sent Events, GET /v1/live/stream): the whole live state on
// connect, then only the matches that change. Native EventSource: no SDK download, and it reconnects by itself.
const STREAM = `${(process.env.NEXT_PUBLIC_API_URL || "https://api.livematch.co").replace(/\/$/, "")}/v1/live/stream`;

// One shared connection per tab, however many components on the page show live scores.
const EMPTY: Record<string, LivePatch> = {};
let state = EMPTY;
let source: EventSource | null = null;
let users = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function connect() {
  source = new EventSource(STREAM);
  source.addEventListener("snapshot", (e) => {
    state = JSON.parse((e as MessageEvent).data);
    emit();
  });
  source.addEventListener("patch", (e) => {
    const next = { ...state };
    for (const [id, value] of Object.entries(JSON.parse((e as MessageEvent).data) as Record<string, LivePatch | null>)) {
      if (value) next[id] = value;
      else delete next[id];
    }
    state = next;
    emit();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

// `enabled` = the page shows at least one live match. Otherwise nothing connects (no open connection, no
// re-renders); live match pages then use the 60s server refresh.
export function useLiveScores(enabled: boolean): Record<string, LivePatch> {
  const live = useSyncExternalStore(subscribe, () => state, () => EMPTY);

  useEffect(() => {
    if (!enabled) return;
    if (users++ === 0) connect();
    return () => {
      if (--users === 0) {
        source?.close();
        source = null;
        state = EMPTY;
      }
    };
  }, [enabled]);

  return enabled ? live : EMPTY;
}

// The real-time score wins over the server-rendered one, unless it is older: if live polling is stuck (API limit,
// outage) the stream keeps its last score, and showing it would make the score jump backwards.
export function withLive(m: Match, live: Record<string, LivePatch>): Match {
  const p = live[m.id];
  return p && isNotBehind(p, m) ? { ...m, ...p, score: p.score ?? m.score, now: p.now ?? m.now } : m;
}
