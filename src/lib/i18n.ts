// Shared by server + client code (proxy, language switcher, date formatting).
export const LOCALES = ["en", "hi"] as const;
export const DEFAULT_LOCALE = "en";
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
];

// ponytail: dates shown in IST for everyone; switch to a client-side LocalDate if you get many non-India visitors.
const fmt = (gmt: string, locale: string, o: Intl.DateTimeFormatOptions) =>
  new Date(gmt.endsWith("Z") ? gmt : gmt + "Z").toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", ...o });

export function formatDate(gmt: string, locale: string, withTime = true) {
  return fmt(gmt, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime && { hour: "numeric", minute: "2-digit" }),
  });
}

// "18 Oct" + "01:30 pm" for match cards.
export const formatDay = (gmt: string, locale: string) => fmt(gmt, locale, { day: "numeric", month: "short" });
export const formatTime = (gmt: string, locale: string) => fmt(gmt, locale, { hour: "2-digit", minute: "2-digit" });
