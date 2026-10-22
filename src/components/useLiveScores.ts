"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/provider";
import { isNotBehind } from "@/lib/score-progress";

type LivePatch = Pick<Match, "score" | "status" | "matchStarted" | "matchEnded"> & { updatedAt?: number }; // updatedAt: ms, set by the worker

const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

// Subscribes to /live in Firebase Realtime DB (written by scripts/live-worker.mts).
// `enabled` = the page shows at least one live match. Otherwise (or without Firebase configured) nothing loads:
// no ~50 KB SDK download, no open connection, no re-renders. Live match pages then use the 60s server refresh.
export function useLiveScores(enabled: boolean): Record<string, LivePatch> {
  const [live, setLive] = useState<Record<string, LivePatch>>({});

  useEffect(() => {
    if (!databaseURL || !enabled) return;
    let unsubscribe = () => {};
    let cancelled = false;
    // Loaded lazily so the Firebase SDK isn't in the initial page bundle.
    Promise.all([import("firebase/app"), import("firebase/database")]).then(([{ getApps, initializeApp }, { getDatabase, onValue, ref }]) => {
      if (cancelled) return;
      const app = getApps()[0] ?? initializeApp({ databaseURL });
      unsubscribe = onValue(ref(getDatabase(app), "live"), (snap) => setLive(snap.val() ?? {}));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enabled]);

  return live;
}

// The real-time score wins over the server-rendered one, unless it is older: if the worker is stuck (API limit,
// crash) Firebase keeps its last score, and showing it would make the score jump backwards.
export function withLive(m: Match, live: Record<string, LivePatch>): Match {
  const p = live[m.id];
  return p && isNotBehind(p, m) ? { ...m, ...p, score: p.score ?? m.score } : m;
}
