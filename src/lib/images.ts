
export const IMAGE_HOSTS = ["cdn.sportmonks.com", "p.imgci.com", "cdn.sanity.io", "ichef.bbci.co.uk"];

const optimizerOff = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION === "1";

export const optimizable = (src: string) => {
  if (optimizerOff) return false;
  try {
    return IMAGE_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
};
