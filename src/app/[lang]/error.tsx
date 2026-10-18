"use client";

import { useParams } from "next/navigation";

// Client component, so it can't use the server dictionaries; keep these few strings here.
const text = {
  en: { error: "Couldn't load cricket data right now. Please try again in a moment.", retry: "Try again" },
  hi: { error: "अभी क्रिकेट डेटा लोड नहीं हो सका। कृपया थोड़ी देर बाद फिर कोशिश करें।", retry: "फिर कोशिश करें" },
};

export default function Error({ reset }: { error: Error; reset: () => void }) {
  const { lang } = useParams<{ lang: string }>();
  const t = text[lang as keyof typeof text] ?? text.en;
  return (
    <div className="surface p-10 text-center">
      <p className="mb-4">{t.error}</p>
      <button onClick={reset} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
        {t.retry}
      </button>
    </div>
  );
}
