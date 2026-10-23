import Link from "next/link";
import { getDictionary, getLocale } from "./dictionaries";

// Wrong match/team/article id, or any unknown address (the proxy sends /xyz to /en/xyz). Next adds noindex itself.
export default async function NotFound() {
  const [dict, lang] = await Promise.all([getDictionary(), getLocale()]);
  return (
    <div className="surface p-10 text-center">
      <p className="mb-2 text-5xl font-extrabold tracking-tight">404</p>
      <p className="mb-6 text-muted">{dict.seo.notFound}</p>
      <Link href={`/${lang}`} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
        {dict.seo.goHome}
      </Link>
    </div>
  );
}
