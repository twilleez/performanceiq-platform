/**
 * PerformanceIQ — loadModel tests
 * Run from the repo root: node --test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sessionLoad, computeACWR, explainACWR,
  acwrSeries, loadSeries,
} from '../js/services/loadModel.js';

const NOW = new Date(2026, 9, 5, 12, 0, 0).getTime();
const at = (ago, hour = 12) => new Date(2026, 9, 5 - ago, hour, 0, 0).getTime();
const session = (ago, rpe = 5, duration = 60, extra = {}) =>
  ({ ts: at(ago), avgRPE: rpe, duration, completed: true, ...extra });
const daily = (days, rpe = 5, duration = 60) =>
  Array.from({ length: days }, (_, i) => session(i, rpe, duration));
const weekly = (fromAgo, toAgo, weekdays, rpe = 5, duration = 60) => {
  const out = [];
  for (let ago = fromAgo; ago >= toAgo; ago--) {
    if (weekdays.includes(new Date(at(ago)).getDay())) out.push(session(ago, rpe, duration));
  }
  return out;
};
const MWF = [1, 3, 5];

test('sessionLoad = RPE × minutes', () => {
  assert.equal(sessionLoad({ avgRPE: 6, duration: 60 }), 360);
  assert.equal(sessionLoad({ rpe: 7, duration: 45 }), 315);
});

test('sessionLoad never invents a value for missing or invalid input', () => {
  assert.equal(sessionLoad({ duration: 60 }), null);
  assert.equal(sessionLoad({ avgRPE: 6 }), null);
  assert.equal(sessionLoad({ avgRPE: 0, duration: 60 }), null);
  assert.equal(sessionLoad({ avgRPE: 11, duration: 60 }), null);
  assert.equal(sessionLoad({ avgRPE: 6, duration: -5 }), null);
  assert.equal(sessionLoad({ avgRPE: 6, duration: 9999 }), null);
  assert.equal(sessionLoad(null), null);
});

test('a jump in training frequency is detected (3 → 7 sessions/week, same session load)', () => {
  const log = [...weekly(41, 7, MWF), ...daily(7)];
  const r = computeACWR(log, { now: NOW });
  assert.equal(r.status, 'ok');
  assert.equal(r.acute, 2100);
  assert.equal(r.chronic, 1200);
  assert.equal(r.acwr, 1.75);
  assert.equal(r.zone, 'danger');
  assert.equal(r.flag, 'well-above');
  assert.equal(r.uncoupled.prior, 900);
  assert.equal(r.uncoupled.ratio, 2.33);
});

test('perfectly constant daily load reads 1.00', () => {
  const r = computeACWR(daily(28), { now: NOW });
  assert.equal(r.status, 'ok');
  assert.equal(r.acwr, 1);
  assert.equal(r.zone, 'sweet-spot');
});

for (const [name, weekdays] of [
  ['Mon/Wed/Fri', MWF], ['Saturday only', [6]], ['weekend only', [0, 6]], ['Mon–Fri', [1, 2, 3, 4, 5]],
]) {
  test(`steady ${name} schedule reads 1.00 on every day, morning and evening`, () => {
    for (let shift = 0; shift < 7; shift++) {
      for (const hour of [6, 22]) {
        const now = new Date(2026, 9, 5 + shift, hour).getTime();
        const log = weekly(70, -shift, weekdays).filter(e => e.ts <= now);
        const r = computeACWR(log, { now });
        assert.equal(r.status, 'ok');
        assert.equal(r.acwr, 1, `day +${shift} at ${hour}:00 read ${r.acwr}`);
      }
    }
  });
}

test('before today has a session, figures are reported as of yesterday', () => {
  const morning = new Date(2026, 9, 5, 6).getTime();
  const log = weekly(70, 0, MWF).filter(e => e.ts <= morning);
  assert.equal(computeACWR(log, { now: morning }).asOf, 'yesterday');
  assert.equal(computeACWR(weekly(70, 0, MWF), { now: NOW }).asOf, 'today');
});

test('empty or missing log → no-data, acwr null', () => {
  for (const log of [[], null, undefined]) {
    const r = computeACWR(log, { now: NOW });
    assert.equal(r.status, 'no-data');
    assert.equal(r.acwr, null);
    assert.equal(r.zone, 'no-data');
  }
});

test('under 28 days of history → insufficient-history, acwr null', () => {
  const r = computeACWR(daily(10), { now: NOW });
  assert.equal(r.status, 'insufficient-history');
  assert.equal(r.acwr, null);
  assert.equal(r.historyDays, 10);
  assert.match(r.reason, /28 days/);
});

test('exactly 28 days of history is enough', () => {
  assert.equal(computeACWR(daily(28), { now: NOW }).status, 'ok');
  assert.equal(computeACWR(daily(27), { now: NOW }).status, 'insufficient-history');
});

test('sessions missing RPE/duration are not scored and block the ratio when too common', () => {
  const log = daily(35).map((e, i) => (i % 2 ? { ...e, avgRPE: undefined } : e));
  const r = computeACWR(log, { now: NOW });
  assert.equal(r.status, 'incomplete-data');
  assert.equal(r.acwr, null);
  assert.equal(r.unscoredSessions28, 14);
  assert.equal(r.acute, null);
  assert.equal(r.uncoupled.ratio, null);
});

test('a few unscored sessions are tolerated and add zero load', () => {
  const log = daily(35);
  log[3] = { ...log[3], duration: undefined };
  const r = computeACWR(log, { now: NOW });
  assert.equal(r.status, 'ok');
  assert.equal(r.unscoredSessions28, 1);
  assert.equal(r.acute, 6 * 300);
});

test('long layoff → sparse-log rather than a ratio built on almost nothing', () => {
  const log = weekly(70, 30, MWF);
  const r = computeACWR(log, { now: NOW });
  assert.equal(r.status, 'sparse-log');
  assert.equal(r.acwr, null);
});

test('two sessions on one day are summed into that day', () => {
  const log = [session(0, 5, 60), session(0, 6, 30)];
  const today = loadSeries(log, { now: NOW, days: 1 })[0];
  assert.equal(today.load, 480);
  assert.equal(today.hasData, true);
});

test('sessions marked completed:false carry no load', () => {
  const base = daily(28);
  const skipped = [...base, session(0, 9, 120, { completed: false })];
  assert.deepEqual(computeACWR(skipped, { now: NOW }), computeACWR(base, { now: NOW }));
});

test('days are local calendar days, not rolling 24-hour windows', () => {
  const justAfterMidnight = new Date(2026, 9, 5, 0, 10).getTime();
  const lateLastNight = new Date(2026, 9, 4, 23, 50).getTime();
  const s = loadSeries([{ ts: lateLastNight, avgRPE: 5, duration: 60 }], { now: justAfterMidnight, days: 2 });
  assert.equal(s[0].load, 300);
  assert.equal(s[1].load, 0);
});

test("'YYYY-MM-DD' date strings are read as local dates", () => {
  const s = loadSeries([{ date: '2026-10-05', avgRPE: 5, duration: 60 }], { now: NOW, days: 2 });
  assert.equal(s[1].load, 300);
  assert.equal(s[0].load, 0);
});

test('future-dated and undated entries are ignored', () => {
  const log = [...daily(28), session(-3, 10, 300), { avgRPE: 9, duration: 90 }];
  assert.deepEqual(computeACWR(log, { now: NOW }), computeACWR(daily(28), { now: NOW }));
});

test('the input log is not mutated', () => {
  const log = daily(30);
  const copy = structuredClone(log);
  computeACWR(log, { now: NOW });
  acwrSeries(log, { now: NOW });
  loadSeries(log, { now: NOW });
  assert.deepEqual(log, copy);
});

test('acwrSeries: [] when nothing is logged, else exactly days entries', () => {
  assert.deepEqual(acwrSeries([], { now: NOW }), []);
  const s = acwrSeries(daily(60), { now: NOW, days: 14 });
  assert.equal(s.length, 14);
  for (const d of s) {
    assert.deepEqual(Object.keys(d).sort(), ['acwr', 'date', 'load', 'status', 'zone']);
    assert.equal(d.acwr, 1);
    assert.equal(d.zone, 'sweet-spot');
  }
});

test('acwrSeries: days before the 28-day gate have acwr null, never 1.0', () => {
  const s = acwrSeries(daily(30), { now: NOW, days: 14 });
  assert.equal(s.filter(d => d.acwr === null).length, 11);
  assert.equal(s.filter(d => d.acwr !== null).length, 3);
  assert.equal(s.at(-1).acwr, 1);
});

test('acwrSeries: the last entry always matches computeACWR', () => {
  const log = [...weekly(41, 7, MWF), ...daily(7)];
  assert.equal(acwrSeries(log, { now: NOW, days: 7 }).at(-1).acwr, computeACWR(log, { now: NOW }).acwr);
  const morning = new Date(2026, 9, 6, 6).getTime();
  assert.equal(acwrSeries(log, { now: morning, days: 7 }).at(-1).acwr, computeACWR(log, { now: morning }).acwr);
});

test('loadSeries: always days entries with hasData flags', () => {
  const s = loadSeries(weekly(13, 0, MWF), { now: NOW, days: 14 });
  assert.equal(s.length, 14);
  assert.equal(s.filter(d => d.hasData).length, 6);
  assert.equal(s.reduce((sum, d) => sum + d.load, 0), 6 * 300);
  assert.equal(loadSeries([], { now: NOW, days: 28 }).length, 28);
});

test('explainACWR shows the calculation, or the reason there is none', () => {
  const ok = explainACWR(computeACWR([...weekly(41, 7, MWF), ...daily(7)], { now: NOW }));
  assert.match(ok, /2100 AU ÷ 4-week average 1200 AU\/week = 1\.75/);
  assert.match(ok, /2\.33×/);

  const none = explainACWR(computeACWR(daily(5), { now: NOW }));
  assert.match(none, /28 days/);
  assert.doesNotMatch(none, /÷/);
});
