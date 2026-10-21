# Publishing your own articles (Sanity)

Your articles open **on your own site** (`/en/news/<slug>`, `/hi/news/<slug>`), appear in the News page, on Home,
in the footer and in the match News tab, mixed with ESPNcricinfo and BBC stories by time.

## 1. Open the Studio (the article editor)

On your computer:

```bash
npm --prefix studio run dev
```

Open http://localhost:3333 and sign in with the Google / GitHub / e-mail account that owns the Sanity project.
(If it says the origin isn't allowed: sanity.io/manage → your project → **API → CORS origins** → add
`http://localhost:3333` with "Allow credentials" ticked.)

### Put the Studio online (write from any computer or phone)

```bash
npm --prefix studio run deploy
```

It asks for a name, e.g. `livematches` → your editor lives at **https://livematches.sanity.studio**. Run the same
command again after changing `studio/schemaTypes/article.ts`.

## 2. Write an article

**News article → +**, then fill in:

| Field | What to put | Required |
|---|---|---|
| Title → English / हिन्दी | Headline. Hindi is optional; Hindi readers see English if it's empty. | English |
| Slug | Click **Generate** — becomes the web address, e.g. `india-win-series` | ✔ |
| Author | Writer's name, shown as "ARJUN · 3 HRS AGO" | |
| Short summary | 1–2 sentences under the headline in lists and in WhatsApp/X previews | |
| Body → English / हिन्दी | The article. Toolbar: Heading, Subheading, Quote, **bold**, *italic*, links, bullet/number lists, and **+ Image** for photos between paragraphs (add a caption and a short description) | English |
| Cover image | Main photo (landscape works best) | |
| Published at | Filled in automatically; change it to back-date | |

Click **Publish**. Drafts are never shown on the site.

## 3. Make new articles show instantly (one-time setup)

Without this, a new article shows within **10 minutes**. With it, straight away.

1. Make a secret (any long random text):
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
2. **Hostinger** → Environment variables → add `SANITY_REVALIDATE_SECRET` = that text → redeploy.
3. **sanity.io/manage** → your project → **API → Webhooks → Create webhook**:
   - URL: `https://<your-domain>/api/revalidate`
   - Dataset: `production`
   - Trigger on: **Create, Update, Delete**
   - Filter: `_type == "article"`
   - HTTP method: **POST**
   - HTTP headers: `Authorization` = `Bearer <the secret>` (the word Bearer, a space, then the secret)
   - Leave "Trigger on drafts" off.
4. Publish a test article: it should show on `/en/news` right away.

Keep the secret private (only in Hostinger and the Sanity webhook). If it leaks, make a new one and update both.

## How it works (for debugging)

| File | Role |
|---|---|
| `studio/schemaTypes/article.ts` | The editor's fields (what you see in the Studio) |
| `src/lib/news.ts` | Reads published articles from Sanity (`getNews`, `getArticle`), cached 10 min, tag `sanity` |
| `src/app/[lang]/news/[slug]/page.tsx` | The article page, plus the "More news" list and share preview |
| `src/components/ArticleBody.tsx` | Shows the body (headings, quotes, lists, links, photos) |
| `src/app/api/revalidate/route.ts` | The webhook: checks the secret, then clears the `sanity` cache |

- Article not showing? Check it's **published** (not a draft) and has a slug; wait 10 min or check the webhook's
  log in sanity.io/manage (a 401 means the secret doesn't match; 404 means `SANITY_REVALIDATE_SECRET` isn't set).
- Photo missing in the body? The image block needs an uploaded photo; captions are optional.
