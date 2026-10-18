// Hosts next/image may optimize (also used by next.config.ts). Images from any other host
// (e.g. a new RSS feed) are shown as-is instead of crashing the page.
export const IMAGE_HOSTS = ["cdn.sportmonks.com", "p.imgci.com", "cdn.sanity.io"];

// The optimizer fetches images from the server and refuses hosts that resolve to private/reserved IPs
// (SSRF protection). On IPv6-only/NAT64 networks (common on Indian mobile ISPs) public hosts like
// p.imgci.com resolve to 64:ff9b::… addresses, so the optimizer blocks them. Instead of weakening that
// check (images.dangerouslyAllowLocalIP), let the browser load originals directly:
//  - always in local development
//  - in production only if NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION=1 (for a host on such a network)
const optimizerOff = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION === "1";

export const optimizable = (src: string) => {
  if (optimizerOff) return false;
  try {
    return IMAGE_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
};
