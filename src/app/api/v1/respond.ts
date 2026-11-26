import { unstable_rethrow } from "next/navigation";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";

// Thin JSON wrapper for the /api/v1 app API. Success -> JSON. A notFound()/redirect control-flow
// error is rethrown so Next returns the right status. Budget exhaustion, a provider outage or any
// other error -> 503, so the mobile app shows "try again" instead of a hard 500 (same graceful
// degradation as the website). All getters already carry the shared cache + request budget, so the
// app costs no extra Sportmonks requests.
//
// CORS-open: this is a public, read-only API serving the same data the public website already shows.
// Native apps ignore CORS; this lets browser clients (the Expo web build, a future web dashboard) call
// it too. Tighten to an origin allowlist here if you ever want to restrict browser access.
const CORS = { "Access-Control-Allow-Origin": "*" };

export async function json<T>(produce: () => Promise<T>): Promise<Response> {
  try {
    return Response.json(await produce(), { headers: CORS });
  } catch (e) {
    unstable_rethrow(e);
    return Response.json({ error: "Cricket data is temporarily unavailable. Try again shortly." }, { status: 503, headers: CORS });
  }
}

// ?lang= query, validated against supported locales; falls back to the default.
export function langOf(request: Request): string {
  const lang = new URL(request.url).searchParams.get("lang");
  return (LOCALES as readonly string[]).includes(lang ?? "") ? lang! : DEFAULT_LOCALE;
}
