import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { DEFAULT_LOCALE } from "@/lib/i18n";

// Add a language: create dictionaries/xx.json, add it here and in LANGUAGES.
const dictionaries = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  hi: () => import("./dictionaries/hi.json").then((m) => m.default),
};

export type Locale = keyof typeof dictionaries;
export type Dict = Awaited<ReturnType<(typeof dictionaries)["en"]>>;

export const hasLocale = (l: string): l is Locale => l in dictionaries;

export async function getLocale(): Promise<Locale> {
  const l = await lang();
  if (!hasLocale(l)) notFound();
  return l;
}

export async function getDictionary(): Promise<Dict> {
  return dictionaries[await getLocale()]();
}

// Canonical + hreflang links for a page ("" = home, "/news"): tells Google which URL is the page and pairs its
// English and Hindi versions. Every page sets its own, otherwise it would inherit the home page's.
export async function alternates(path = "") {
  const languages = Object.fromEntries(Object.keys(dictionaries).map((l) => [l, `/${l}${path}`]));
  return { canonical: `/${await getLocale()}${path}`, languages: { ...languages, "x-default": `/${DEFAULT_LOCALE}${path}` } };
}
