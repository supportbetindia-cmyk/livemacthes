import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";

// Redirect paths without a locale (e.g. /fixtures) to /<locale>/fixtures.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;

  const saved = request.cookies.get("lang")?.value;
  const browser = request.headers.get("accept-language")?.slice(0, 2);
  const locale = [saved, browser].find((l) => LOCALES.includes(l as never)) ?? DEFAULT_LOCALE;

  request.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
