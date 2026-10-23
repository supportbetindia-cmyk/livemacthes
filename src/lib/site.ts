// Public address of the site (no trailing slash), for absolute links in the sitemap, robots.txt and share previews.
// Set SITE_URL on Hostinger to the real domain, e.g. https://livescore.example.com
export const SITE_URL = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
