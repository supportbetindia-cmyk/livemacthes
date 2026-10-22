# Live worker: fast live scores (about 5 seconds)

```
Sportmonks ◄── every 5 s while a match is live (every 120 s otherwise) ── live worker (VPS)
                                                                              │ only changed scores
                                                                              ▼
                     website + apps ◄── pushed instantly ── Firebase Realtime Database /live
```

- **One** worker serves every visitor: API use depends on time, not on how many people watch.
- Code: `scripts/live-worker.mts` (loop), `src/lib/live-poll.ts` (fast/slow rule, tested in `live-poll.test.ts`).
- The website needs nothing extra: the score banner and match cards already listen to `/live`. While the worker is
  pushing a match, its page reloads the scorecard only every 3 minutes (60 s if the worker is silent).

## Settings

| Variable | Value | Notes |
|---|---|---|
| `SPORTMONKS_API_TOKEN` | your token | same as Hostinger |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | your Firebase RTDB URL | same as Hostinger |
| `FIREBASE_SERVICE_ACCOUNT` | base64 of the service-account JSON | same as Hostinger |
| `LIVE_POLL_SECONDS` | `5` (min 5) | while a match is in play: 720 calls/hour |
| `IDLE_POLL_SECONDS` | `120` (min 60) | nothing live: notices a match start within 2 min |
| `SPORTMONKS_DAILY_LIMIT`, `SPORTMONKS_WORKER_RESERVE` | **same values as on Hostinger** | both share one counter in Firebase |

**Fit the speed to your plan.** The worker can use only `SPORTMONKS_WORKER_RESERVE` calls a day (default 1,000):
- Current plan, default limits: use `LIVE_POLL_SECONDS=30` (120/hour, ≈ 420 per T20). At 5 s the reserve runs out
  after about 80 minutes of play, then scores stop until the counter frees up.
- Sportmonks World plan (2,000 calls/hour): `SPORTMONKS_DAILY_LIMIT=20000`, `SPORTMONKS_WORKER_RESERVE=12000`,
  `LIVE_POLL_SECONDS=5` (≈ 2,500 per T20, ≈ 5,800 per ODI) — on **both** Hostinger and the VPS.

Run **one** worker only. Two workers (e.g. VPS + your PC) double the API use and fight over the same data.

## Set up on a VPS (Ubuntu, e.g. Hostinger KVM 1)

The smallest VPS is plenty (the worker uses ~50 MB RAM). In a terminal on your PC:

```bash
ssh root@YOUR_VPS_IP
```

On the VPS:

```bash
# 1. Node.js 24 + git
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs git

# 2. A normal user to run it (not root)
adduser --disabled-password --gecos "" livescore
su - livescore

# 3. The code (if the GitHub repo is private, add a deploy key first: GitHub repo → Settings → Deploy keys)
git clone https://github.com/supportbetindia-cmyk/livemacthes.git live-score
cd live-score
npm ci --omit=dev

# 4. Settings (paste the values from the table above; keep this file private)
nano .env.local
chmod 600 .env.local

# 5. Try it: wait for "checking every …s", then press Ctrl+C
node --env-file=.env.local scripts/live-worker.mts
exit
```

Run it forever (starts on boot, restarts after a crash) with systemd, still on the VPS as root:

```bash
cat > /etc/systemd/system/live-worker.service <<'EOF'
[Unit]
Description=LiveScore live worker
After=network-online.target
Wants=network-online.target

[Service]
User=livescore
WorkingDirectory=/home/livescore/live-score
ExecStart=/usr/bin/node --env-file=.env.local scripts/live-worker.mts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now live-worker
```

## Daily use

| Task | Command (on the VPS, as root) |
|---|---|
| Watch the log | `journalctl -u live-worker -f` |
| Status | `systemctl status live-worker` |
| Restart | `systemctl restart live-worker` |
| Update after a GitHub push | `su - livescore -c "cd live-score && git pull && npm ci --omit=dev" && systemctl restart live-worker` |

## Check it works

1. During a match the log shows `checking every 5s` and `updated <matchId>` lines.
2. Firebase console → Realtime Database → `live` shows the match with a fresh `updatedAt`.
3. On the website the banner score changes without reloading the page.

## Before launch (1,000+ viewers)

Firebase's free **Spark** plan allows 100 simultaneous connections. Switch to **Blaze** (pay as you go) in the
Firebase console → Usage and billing; at this size it is usually a few dollars a month.

## Troubleshooting

| Log says | Meaning / fix |
|---|---|
| `Cricket data request limit reached or shared budget unavailable` | Worker reserve used up, or Firebase unreachable. Check limits/credentials; the worker retries every `IDLE_POLL_SECONDS`. |
| `SPORTMONKS_API_TOKEN is not set` | `.env.local` missing or empty on the VPS. |
| `FIREBASE_SERVICE_ACCOUNT is not valid` | Paste the base64 again (one line, no quotes). |
| `LIVE_POLL_SECONDS must be …` | Value below the minimum (5) or not a whole number. |
