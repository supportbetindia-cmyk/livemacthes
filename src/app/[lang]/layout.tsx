import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import { lang } from "next/root-params";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { InlineScript } from "@/components/InlineScript";
import { ThemeSync } from "@/components/ThemeSync";
import { LOCALES } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";
import "../globals.css";

// One Latin font (Inter) for everything. The Hindi font isn't preloaded: its CSS only covers Devanagari
// characters, so the browser downloads it only on pages that actually contain Hindi text.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], preload: false });

export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: { default: `${dict.nav.brand} – Live Cricket Scores & News`, template: `%s | ${dict.nav.brand}` },
    description: "Live cricket scores, fixtures, series, rankings and news.",
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])) },
  };
}

// Runs before first paint so the saved theme never flashes. "system" follows the OS setting.
const themeScript = `(function(){try{var t=localStorage.getItem("theme")||"system";if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}})()`;

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const dict = await getDictionary();
  return (
    <html lang={await lang()}  suppressHydrationWarning className={`${inter.variable} ${devanagari.variable}`}>
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <ThemeSync />
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        {/* Footer columns load live data (news, series, players); stream them in after the page. */}
        <Suspense fallback={<div className="mt-16 h-96 bg-nav" />}>
          <Footer />
        </Suspense>
      </body>
    </html>
  );
}
