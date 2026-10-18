"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

// "11 minutes ago". Computed in the browser only (server output is cached, so "now" there would be stale).
export function TimeAgo({ date, lang }: { date: string; lang: string }) {
  const text = useSyncExternalStore(
    noop,
    () => {
      const mins = Math.round((Date.parse(date) - Date.now()) / 60000);
      const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
      if (Math.abs(mins) < 60) return rtf.format(mins, "minute");
      if (Math.abs(mins) < 60 * 24) return rtf.format(Math.round(mins / 60), "hour");
      return rtf.format(Math.round(mins / 1440), "day");
    },
    () => null,
  );
  return <time dateTime={date}>{text}</time>;
}
