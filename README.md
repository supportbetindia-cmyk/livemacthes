# LiveScore

Live cricket scores, fixtures, series, teams and news in English and Hindi. Built with Next.js 16.

```bash
cp .env.example .env.local   # fill in what you have; everything is optional
npm install
npm run dev                  # http://localhost:3000
```

Cricket data comes from the [Sportmonks Cricket API](https://www.sportmonks.com/cricket-api/): set `SPORTMONKS_API_TOKEN`. All provider code is in `src/lib/provider.ts`; pages only use its types.

## Real-time scores (Firebase)

Live data is refreshed at most every two minutes to fit the 2,000-request/day plan. With Firebase, browsers receive a new score as soon as the worker publishes it:

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
- Each poll is one API call: `86400 / LIVE_POLL_SECONDS` calls per day (120s ≈ 720/day). Values below 120 seconds are rejected for this plan.

## Sportmonks request protection (Hostinger Node.js)

Every actual Sportmonks fetch first consumes a reservation from a private Firebase Realtime Database transaction. The current implementation reserves batches of up to `SPORTMONKS_BUDGET_BATCH` calls (default 10) to reduce transaction contention. Unused local reservations expire at the end of their reservation hour; they remain charged in the shared counter. The website and live worker share `/_private/sportmonksBudget`; the checked-in database rules deny public reads and writes there. There is no in-memory fallback, so multiple Node.js processes and restarts cannot reset the counter. Provider errors still consume a reservation because the provider may count unsuccessful calls.

- `SPORTMONKS_DAILY_LIMIT=2000` caps combined website and worker calls.
- `SPORTMONKS_WORKER_RESERVE=1000` gives the worker its own allowance; public website traffic can use at most the other 1,000. These are hard partitions, so neither can spend the other's share.
- The counter retains 24 prior hourly buckets plus the current hour. This conservatively counts 24–25 hours, preventing a midnight reset burst. Requests become available gradually as old buckets expire.
- The worker polls every 120 seconds (about 720/day). Server live/detail caches also refresh every 120 seconds; existing browser refreshes reuse those caches.
- Numeric IDs are canonicalized before cache lookup. Unknown teams are rejected before their match requests. Historical match/player links remain supported within the request budget.

Set the same limits and budget database on **both** Hostinger website and worker processes. `SPORTMONKS_BUDGET_DATABASE_URL` can name a separate private RTDB; otherwise the existing `NEXT_PUBLIC_FIREBASE_DATABASE_URL` is used. Configure server-only credentials for both processes: `FIREBASE_SERVICE_ACCOUNT` containing the JSON or its base64 encoding is supported for hosting panels; alternatively use `GOOGLE_APPLICATION_CREDENTIALS` pointing at a protected service-account file, or a supported workload identity. Never put a private key in a `NEXT_PUBLIC_` variable or `public/`. Keep the budget subtree private and do not delete it on deploy. No Firebase rules change is needed with the checked-in deny-by-default rules.

Without the private database/credentials, or when its transaction fails/times out, the app blocks new upstream requests rather than bypassing the limit. Existing cached data can still be used; uncached required data uses the existing error screen, and optional standings/footer data may be omitted. A budget check times out after fifteen seconds, and upstream HTTP requests time out after ten seconds. Scores are not guaranteed to update every two minutes after the allowance is exhausted.

The first rollout does not know calls already made earlier in the provider's day. Start it after the provider allowance resets, or seed the private counter with verified existing usage before enabling traffic. All other scripts/services using the same Sportmonks account must participate in this budget or be accounted for separately. Actual Hostinger credentials, Firebase permissions, and provider quota accounting still need deployment verification.

Run the offline mocked regression checks with `npm run test:quota`; they never call Sportmonks or Firebase.

## Own news articles (Sanity)

Set `NEXT_PUBLIC_SANITY_PROJECT_ID`. The editor (Sanity Studio) is in `studio/`: `npm --prefix studio run dev` (localhost:3333), `npm --prefix studio run deploy` to host it.

## Adding a language

Add `src/app/[lang]/dictionaries/xx.json`, then register it in `dictionaries.ts` and `src/lib/i18n.ts`.
