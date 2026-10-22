// How long the live worker (scripts/live-worker.mts) waits before its next Sportmonks check.
// Fast while a match is in play (the score changes every ball); slow otherwise, only to notice a match starting.
// A failed check (`null`) also waits the slow interval, so an outage or an exhausted budget isn't hammered every few seconds.
// No Next.js imports: runs in the worker under plain Node.
import type { Match } from "./provider.ts";

export function pollDelaySeconds(matches: Match[] | null, liveSeconds: number, idleSeconds: number) {
  return matches?.some((m) => m.matchStarted && !m.matchEnded) ? liveSeconds : idleSeconds;
}
