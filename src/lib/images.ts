// Hosts next/image may optimize (also used by next.config.ts). Images from any other host
// (e.g. a new RSS feed) are shown as-is instead of crashing the page.
export const IMAGE_HOSTS = ["cdn.sportmonks.com", "p.imgci.com", "cdn.sanity.io"];

export const optimizable = (src: string) => {
  try {
    return IMAGE_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
};
