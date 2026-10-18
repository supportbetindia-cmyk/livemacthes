"use client";

import { useSyncExternalStore } from "react";
import { formatDay } from "@/lib/i18n";

const noop = () => () => {};
const istDay = (d: Date) => Date.parse(d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })); // midnight of the IST date

// "Today" / "Tomorrow" / "Yesterday", else "18 Oct". Server renders the plain date (it's cached, so "now" there is stale).
export function RelativeDay({ gmt, lang }: { gmt: string; lang: string }) {
  const date = formatDay(gmt, lang);
  const text = useSyncExternalStore(
    noop,
    () => {
      const days = Math.round((istDay(new Date(gmt.endsWith("Z") ? gmt : gmt + "Z")) - istDay(new Date())) / 86400000);
      if (Math.abs(days) > 1) return date;
      const s = new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(days, "day");
      return s[0].toUpperCase() + s.slice(1);
    },
    () => date,
  );
  return <span suppressHydrationWarning>{text}</span>;
}
