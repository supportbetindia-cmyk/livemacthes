// Caps how many times per clock hour something may happen in this server process.
// Used for Sportmonks lookups of ids the site doesn't list itself (made-up or very old match/player ids): each one
// costs an API request, so without a cap anyone could use up the day's request budget by trying ids.
// ponytail: per process, resets on restart; per-visitor limits belong at the CDN (Cloudflare rate limiting).
export function hourlyLimit(max: number) {
  let hour = -1;
  let used = 0;
  return (now = Date.now()) => {
    const h = Math.floor(now / 3600000);
    if (h !== hour) [hour, used] = [h, 0];
    if (used >= max) return false;
    used++;
    return true;
  };
}
