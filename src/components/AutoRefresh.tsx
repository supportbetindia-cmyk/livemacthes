"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-renders the server components on this page every N seconds. The live data behind it refreshes every
// 2 minutes (cricket.ts), so polling faster would mostly resend the same page.
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
