// Fall of wickets, partnerships and "this over" labels. Run: npm test
// Data: Warriors' chase vs Dolphins (CSA T20, Sportmonks fixture 71475): 117/4 in 15 overs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ballLabel, toCommentary, wicketsAndPartnerships } from "./provider.ts";

const bat = (sort: number, fullname: string, fow_score = 0, fow_balls = 0) =>
  ({ sort, batsman: { fullname }, fow_score, fow_balls }) as Parameters<typeof wicketsAndPartnerships>[0][number];

const rows = [
  bat(1, "Hermann", 65, 7.3),
  bat(2, "Makhanya", 52, 5.4),
  bat(3, "De Villiers", 69, 8.5),
  bat(4, "Stubbs", 93, 11.4),
  bat(5, "King"), // not out
  bat(6, "Kruger"), // not out
];

test("fall of wickets in the order they fell", () => {
  const { fow } = wicketsAndPartnerships(rows, { score: 117, overs: 15 });
  assert.deepEqual(fow.map((w) => `${w.score}-${w.wicket} ${w.name} ${w.over}`), [
    "52-1 Makhanya 5.4", "65-2 Hermann 7.3", "69-3 De Villiers 8.5", "93-4 Stubbs 11.4",
  ]);
});

test("partnerships: pairs, runs and balls add up to the total, last one unbroken", () => {
  const { partnerships } = wicketsAndPartnerships(rows, { score: 117, overs: 15 });
  assert.deepEqual(partnerships, [
    { runs: 52, balls: 34, names: ["Hermann", "Makhanya"] },
    { runs: 13, balls: 11, names: ["Hermann", "De Villiers"] },
    { runs: 4, balls: 8, names: ["De Villiers", "Stubbs"] },
    { runs: 24, balls: 17, names: ["Stubbs", "King"] },
    { runs: 24, balls: 20, names: ["King", "Kruger"] },
  ]);
  assert.equal(partnerships.reduce((s, p) => s + p.runs, 0), 117);
});

test("all out: no unbroken partnership at the end", () => {
  const { partnerships } = wicketsAndPartnerships([bat(1, "A", 10, 2.1), bat(2, "B", 10, 2.1)], { score: 10, overs: 2.1 });
  assert.equal(partnerships.length, 2);
});

test("commentary: names resolved, extras counted, wicket flagged, over numbered", () => {
  const ball = (id: number, ball: number, score: object, batsman_id = 100) =>
    ({ id, ball, scoreboard: "S1", batsman_id, bowler_id: 200, score: { runs: 0, bye: 0, leg_bye: 0, noball: 0, is_wicket: false, ball: true, ...score } });
  const f = {
    localteam: { id: 1, name: "India" }, visitorteam: { id: 2, name: "Australia" },
    runs: [{ team_id: 1, inning: 1, score: 5, wickets: 1, overs: 0.3 }],
    batting: [{ batsman: { id: 100, fullname: "Kohli" } }],
    bowling: [{ bowler: { id: 200, fullname: "Starc" } }],
    balls: [ball(1, 0.1, { runs: 4 }), ball(2, 0.2, { leg_bye: 1 }), ball(3, 0.3, { is_wicket: true })],
  } as Parameters<typeof toCommentary>[0];

  const c = toCommentary(f);
  assert.equal(c.length, 3);
  assert.deepEqual(c[0], { inning: "India Inning 1", over: 1, label: "4", runs: 4, wicket: false, batsman: "Kohli", bowler: "Starc" });
  assert.equal(c[1].label, "1lb");
  assert.equal(c[1].runs, 1); // leg bye counts toward runs off the ball
  assert.equal(c[2].wicket, true);
  assert.equal(c[2].label, "W");
});

test("ball labels", () => {
  const s = (o: Partial<Parameters<typeof ballLabel>[0]>) => ballLabel({ runs: 0, bye: 0, leg_bye: 0, noball: 0, is_wicket: false, ball: true, ...o });
  assert.deepEqual(
    [s({}), s({ runs: 4 }), s({ is_wicket: true }), s({ runs: 1, ball: false }), s({ runs: 5, ball: false }), s({ noball: 1, runs: 1 }), s({ noball: 1, runs: 5 }), s({ leg_bye: 1 }), s({ bye: 2 })],
    ["0", "4", "W", "wd", "5wd", "nb", "nb+4", "1lb", "2b"],
  );
});
