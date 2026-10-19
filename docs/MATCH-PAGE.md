# Match page — how it works

URL: `/en/match/<id>?tab=info|summary|scorecard|stats|news` (no `tab` = Match info).

## Where the data comes from

```
Sportmonks  ──1 request──►  provider.ts fetchMatchDetail()   → { match, scorecard, info }
                             (score, scorecard, toss, Playing XI, Player of the Match)
                cricket.ts getMatchDetail()  caches it 2 min, shared by every visitor
```

Switching tabs re-renders the page but reuses the cached data, so it costs no extra API request.
Own requests, each cached for hours and shared by all visitors:
- **Series Stats** tab: 1 request per series.
- **Team Form** (Match info): 2 per team (home + away results of the past year).
- **Head to Head** (Match info): 2 per pair of teams (A at home vs B, B at home vs A).

## Files

| File | What it does |
|---|---|
| `src/app/[lang]/match/[id]/page.tsx` | The page: title, score banner, tab bar, picks which tab to show. Match info + Scorecard are drawn here. |
| `src/components/LiveScore.tsx` | Dark score banner (IND 172-2 · result · WI 171). Updates live from Firebase during a match. |
| `src/components/PlayingXI.tsx` | Playing XI list with the IND / WI switch, plus the "On Bench" list (runs in the browser). |
| `src/components/match/FormAndH2H.tsx` | Match info: Team Form (last 5 results, click to expand) and Head to Head (wins + last 10 meetings). |
| `src/components/match/SummaryTab.tsx` | Summary tab: Player of the Match + top 2 batters/bowlers per innings. |
| `src/components/match/SeriesStatsTab.tsx` | Series Stats tab: most runs, wickets, highest score, best bowling, most sixes. |
| `src/components/match/NewsTab.tsx` | News tab: stories that mention either team. |
| `src/lib/match-tabs.ts` | The **logic** for the tabs and Match info extras (top performers, leaders, news filter, W/L form, head-to-head count). No React, no API. |
| `src/lib/cricket.ts` → `getRecentMatches`, `getHeadToHead` | Cached data for Team Form and Head to Head. |
| `src/lib/match-tabs.test.ts` | Tests for that logic. |
| `src/lib/provider.ts` → `toInfo()` | Turns Sportmonks toss / lineup / man-of-match fields into our `MatchInfo` type. |
| `src/app/[lang]/dictionaries/en.json`, `hi.json` → `"match"` | All text on the page, in English and Hindi. |

## Tests

```bash
npm test
```

Runs `src/lib/*.test.ts` with Node's built-in test runner (nothing to install). Each test feeds
small made-up data into a function from `match-tabs.ts` and checks the answer, e.g.
"68* ranks above 68", "'India' does not match 'West Indies'". If you change the logic, run this first.

## Debugging tips

- Tab shows "will be available…": the match hasn't started (no scorecard) or the API sent no data.
- Playing XI says "announced at the toss": Sportmonks has no lineup for this match yet.
- No "On Bench" row: Sportmonks only listed the XI for that match (bench = squad players marked as substitutes).
- Team Form / Head to Head missing: those sections hide themselves when Sportmonks returns no finished matches.
  H2H only counts formats on your Sportmonks plan (currently T20Is).
- Series Stats shows other countries: Sportmonks puts all T20Is of a year in one season
  ("Twenty20 International 2026"), so the boards cover the whole year, not just this tour.
