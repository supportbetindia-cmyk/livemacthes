"use client";

import { useLayoutEffect } from "react";

// Theme preference lives in localStorage ("light" | "dark" | "system").
export type Theme = "light" | "dark" | "system";

export const savedTheme = () => (localStorage.getItem("theme") as Theme) || "system";

export function applyTheme(t: Theme = savedTheme()) {
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

// The layout's inline script sets the theme on a full page load. Switching language (/en -> /hi) rebuilds the
// root layout without a reload, and React clears the attributes of the old <html>, so the theme is lost.
// This re-applies it each time the layout mounts, before paint (no flash).
export function ThemeSync() {
  useLayoutEffect(() => applyTheme(), []);
  return null;
}
