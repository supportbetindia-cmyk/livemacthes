"use client";

import { useEffect, useRef } from "react";

// Native <details> dropdown that also closes on an outside click or when a link inside is tapped
// (client-side navigation keeps the navbar mounted, so it would otherwise stay open on the next page).
export function Dropdown({
  summary,
  summaryClassName,
  panelClassName,
  label,
  children,
}: {
  summary: React.ReactNode;
  summaryClassName: string;
  panelClassName: string;
  label?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary className={`cursor-pointer list-none ${summaryClassName}`} aria-label={label}>
        {summary}
      </summary>
      <div
        className={panelClassName}
        onClick={(e) => {
          if ((e.target as Element).closest("a") && ref.current) ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
