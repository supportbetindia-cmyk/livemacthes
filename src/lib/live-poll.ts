
import type { Match } from "./provider.ts";

export function pollDelaySeconds(matches: Match[] | null, liveSeconds: number, idleSeconds: number) {
  return matches?.some((m) => m.matchStarted && !m.matchEnded) ? liveSeconds : idleSeconds;
}
