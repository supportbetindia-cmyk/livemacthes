# LiveScore

Live cricket scores, fixtures, series, teams and news in English and Hindi. Built with Next.js 16.

```bash
cp .env.example .env.local   # fill in what you have; everything is optional
npm install
npm run dev                  # http://localhost:3000
```

Cricket data comes from the [Sportmonks Cricket API](https://www.sportmonks.com/cricket-api/): set `SPORTMONKS_API_TOKEN`. All provider code is in `src/lib/provider.ts`; pages only use its types.

## Real-time scores (Firebase)

Without Firebase, live pages refresh every 15 seconds. With it, scores update within about 1 second:

```
cricket API ──poll──▶ live-worker ──changed scores only──▶ Firebase RTDB /live/{matchId} ──push──▶ browsers
```

1. Create a project at https://console.firebase.google.com and add a **Realtime Database**.
2. In the database **Rules** tab, paste the contents of `database.rules.json` (public read of `/live`, no public writes).
3. Copy the database URL (`https://<project>-default-rtdb.<region>.firebasedatabase.app`) into `NEXT_PUBLIC_FIREBASE_DATABASE_URL`.
4. Go to Project settings → Service accounts → **Generate new private key**. Save the file as `firebase-service-account.json` in the project root (it's gitignored) and set `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json`.
5. Run the worker next to the site: `npm run live-worker`

Notes:
- The worker is a long-running process, so it can't run on Vercel. Run it on a small VPS, Railway, Render or Fly.io, or on your PC while testing.
- Each poll is one API call: `86400 / LIVE_POLL_SECONDS` calls per day (10s ≈ 8,640/day). Check your Sportmonks plan's rate limit.

## Own news articles (Sanity)

Set `NEXT_PUBLIC_SANITY_PROJECT_ID`. The editor (Sanity Studio) is in `studio/`: `npm --prefix studio run dev` (localhost:3333), `npm --prefix studio run deploy` to host it.

## Adding a language

Add `src/app/[lang]/dictionaries/xx.json`, then register it in `dictionaries.ts` and `src/lib/i18n.ts`.
