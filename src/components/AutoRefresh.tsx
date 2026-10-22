"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useLiveScores } from "./useLiveScores";

// Reloads a live match page's server data (scorecard, summary) while the tab is visible.
// - Live worker pushing this match through Firebase: the score banner is already live, so reload only every
//   3 minutes for the tables. With 1,000 viewers that's ~6 page loads a second on the server instead of ~17.
// - No recent push (worker down, Firebase not set up, long break): every 60 s, matching the 2-minute live data cache.
const MINUTE = 60_000;

export function AutoRefresh({ matchId }: { matchId: string }) {
  const router = useRouter();
  const pushedAt = useLiveScores(true)[matchId]?.updatedAt;
  const lastPush = useRef(pushedAt);
  useEffect(() => {
    lastPush.current = pushedAt;
  }, [pushedAt]);

  useEffect(() => {
    let minutes = 0;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      minutes++;
      const workerPushing = Date.now() - (lastPush.current ?? 0) < 5 * MINUTE;
      if (!workerPushing || minutes % 3 === 0) router.refresh();
    }, MINUTE);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
