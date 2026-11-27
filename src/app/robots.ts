import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// AI training crawlers may not crawl the site at all: GPTBot alone was 99% of traffic on 2026-11-27 and drove
// ~10,000 Sportmonks requests an hour. Search engines (Google, Bing, ChatGPT search's OAI-SearchBot) are unaffected.
// Google-Extended / Applebot-Extended are opt-out tokens for AI training, not separate crawlers.
const AI_TRAINING = ["GPTBot", "ClaudeBot", "anthropic-ai", "CCBot", "Bytespider", "meta-externalagent", "Google-Extended", "Applebot-Extended"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ?_rsc= URLs are Next.js's link-prefetch data, not pages: crawling them only costs data-provider requests.
      { userAgent: "*", allow: "/", disallow: ["/api/", "/*?_rsc=", "/*&_rsc="] },
      { userAgent: AI_TRAINING, disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
