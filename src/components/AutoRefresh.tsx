"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-renders the server components on this page every N seconds (data comes from the 15s server cache).
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
