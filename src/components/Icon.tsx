// Small outline icon set (24px grid, stroke = currentColor). Inline SVG: no icon library needed.
const paths = {
  sun: "M12 4V2M12 22v-2M4.93 4.93 3.51 3.51M20.49 20.49l-1.42-1.42M4 12H2M22 12h-2M4.93 19.07l-1.42 1.42M20.49 3.51l-1.42 1.42M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  moon: "M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z",
  monitor: "M3 4h18v12H3zM8 20h8M12 16v4",
  chevronDown: "m6 9 6 6 6-6",
  chevronRight: "m9 6 6 6-6 6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  language: "M4 5h9M8.5 3v2M6 5c0 4 2.5 7 6 8.5M11 5c0 3-2.5 6.5-6.5 8.5M13 21l4-9 4 9M14.5 18h5",
  menu: "M4 6h16M4 12h16M4 18h16",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  mapPin: "M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12ZM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4",
  home: "M4 10.5 12 4l8 6.5V20h-5v-6h-6v6H4z",
  news: "M5 4h11v16H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1ZM16 9h3a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2h-2M7.5 8h5M7.5 12h5M7.5 16h3",
  dots: "M4 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0ZM11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0ZM18 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0Z",
  ball: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 4.2c1.8 2.2 2.8 4.9 2.8 7.8s-1 5.6-2.8 7.8M15.5 4.2c-1.8 2.2-2.8 4.9-2.8 7.8s1 5.6 2.8 7.8",
};

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 fill-none stroke-current ${className}`} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
