/**
 * PerformanceIQ — Load Model v1
 * ─────────────────────────────────────────────────────────────
 * SINGLE source of truth for training load and ACWR.
 * Pure functions. No DOM, no imports, no state access.
 * Every view, selector and engine must read load from here.
 *
 * Session load = RPE (CR-10) × duration in minutes (AU).
 * Daily load includes zero-load rest days.
 * Acute = last 7 days total.
 * Chronic = average weekly load over last 28 days (28-day total ÷ 4).
 *
 * ACWR bands are review flags only, not diagnoses or injury probabilities.
 */

export const LOAD_CONFIG = Object.freeze({
  ACUTE_DAYS:              7,
  CHRONIC_DAYS:            28,
  MIN_HISTORY_DAYS:        28,
  MIN_SCORED_SESSIONS_28D: 4,
  MAX_UNSCORED_FRACTION:   0.25,
  LOOKBACK_DAYS:           112,
  MAX_SESSION_MINUTES:     600,
  BAND_WELL_ABOVE:         1.50,
  BAND_ABOVE:              1.30,
  BAND_IN_RANGE_MIN:       0.80,
  BAND_BELOW_MIN:          0.60,
});

const DAY_MS = 86_400_000;
const EPS = 1e-9;

export const ZONE_COPY = Object.freeze({
  'danger':        { flag: 'well-above', label: 'Load is well above the recent baseline — coach review recommended' },
  'spike':         { flag: 'above',      label: 'Load is above the recent baseline — monitor' },
  'sweet-spot':    { flag: 'in-range',   label: 'Load is consistent with the recent baseline' },
  'undertraining': { flag: 'below',      label: 'Load is below the recent baseline' },
  'detraining':    { flag: 'well-below', label: 'Load is well below the recent baseline' },
  'no-data':       { flag: 'no-data',    label: 'Not enough data yet' },
});

const STATUS_COPY = Object.freeze({
  'ok':                   '',
  'no-data':              'No sessions logged yet.',
  'insufficient-history': `Needs ${LOAD_CONFIG.MIN_HISTORY_DAYS} days of history before a load ratio is shown.`,
  'sparse-log':           `Needs at least ${LOAD_CONFIG.MIN_SCORED_SESSIONS_28D} sessions with RPE and duration in the last 28 days.`,
  'incomplete-data':      'Too many recent sessions are missing RPE or duration to calculate load reliably.',
  'no-chronic-load':      'No recent training load to compare against.',
});

export function sessionLoad(entry) {
  if (!entry) return null;
  const rpe = Number(entry.avgRPE ?? entry.rpe);
  const min = Number(entry.duration);
  if (!Number.isFinite(rpe) || rpe <= 0 || rpe > 10) return null;
  if (!Number.isFinite(min) || min <= 0 || min > LOAD_CONFIG.MAX_SESSION_MINUTES) return null;
  return rpe * min;
}

function entryTime(entry) {
  if (Number.isFinite(entry?.ts)) return entry.ts;
  const d = entry?.date;
  if (d == null) return NaN;
  if (typeof d === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  }
  return new Date(d).getTime();
}

function localMidnight(t) {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function daysAgo(t, now) {
  return Math.round((localMidnight(now) - localMidnight(t)) / DAY_MS);
}

function dayLabel(t) {
  return new Date(t).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}

const round2 = v => Math.round(v * 100) / 100;

function buildDaily(log, now) {
  const rows = [];
  for (const e of (Array.isArray(log) ? log : [])) {
    if (!e || e.completed === false) continue;
    const t = entryTime(e);
    if (!Number.isFinite(t)) continue;
    const ago = daysAgo(t, now);
    if (ago < 0 || ago >= LOAD_CONFIG.LOOKBACK_DAYS) continue;
    rows.push({ ago, load: sessionLoad(e) });
  }
  if (!rows.length) return { n: 0, load: [], sessions: [], unscored: [] };

  const n = Math.max(...rows.map(r => r.ago)) + 1;
  const load = new Array(n).fill(0);
  const sessions = new Array(n).fill(0);
  const unscored = new Array(n).fill(0);

  for (const r of rows) {
    const i = n - 1 - r.ago;
    sessions[i] += 1;
    if (r.load === null) unscored[i] += 1;
    else load[i] += r.load;
  }
  return { n, load, sessions, unscored };
}

function zoneFor(acwr) {
  if (acwr === null) return 'no-data';
  const C = LOAD_CONFIG;
  if (acwr > C.BAND_WELL_ABOVE) return 'danger';
  if (acwr > C.BAND_ABOVE) return 'spike';
  if (acwr >= C.BAND_IN_RANGE_MIN) return 'sweet-spot';
  if (acwr >= C.BAND_BELOW_MIN) return 'undertraining';
  return 'detraining';
}

function run(log, now) {
  const C = LOAD_CONFIG;
  const { n, load, sessions, unscored } = buildDaily(log, now);
  if (!n) return [];

  const pL = [0], pS = [0], pU = [0];
  for (let i = 0; i < n; i++) {
    pL.push(pL[i] + load[i]);
    pS.push(pS[i] + sessions[i]);
    pU.push(pU[i] + unscored[i]);
  }
  const win = (p, i, len) => p[i + 1] - p[Math.max(0, i + 1 - len)];
  const today0 = localMidnight(now);
  const out = [];

  for (let i = 0; i < n; i++) {
    const sess28 = win(pS, i, C.CHRONIC_DAYS);
    const uns28 = win(pU, i, C.CHRONIC_DAYS);
    const scored28 = sess28 - uns28;
    const acute = win(pL, i, C.ACUTE_DAYS);
    const total28 = win(pL, i, C.CHRONIC_DAYS);
    const chronic = total28 / (C.CHRONIC_DAYS / C.ACUTE_DAYS);
    const prior = (total28 - acute) / (C.CHRONIC_DAYS / C.ACUTE_DAYS - 1);

    let status = 'ok';
    if (i + 1 < C.MIN_HISTORY_DAYS) status = 'insufficient-history';
    else if (sess28 > 0 && uns28 / sess28 > C.MAX_UNSCORED_FRACTION) status = 'incomplete-data';
    else if (scored28 < C.MIN_SCORED_SESSIONS_28D) status = 'sparse-log';
    else if (chronic <= EPS) status = 'no-chronic-load';

    const ok = status === 'ok';
    const acwr = ok ? round2(acute / chronic) : null;

    out.push({
      t: today0 - (n - 1 - i) * DAY_MS,
      load: load[i],
      sessions: sessions[i],
      unscored: unscored[i],
      acute: ok ? acute : null,
      chronic: ok ? chronic : null,
      prior: ok ? prior : null,
      acwr,
      zone: zoneFor(acwr),
      status,
      asOf: 'today',
      historyDays: i + 1,
      scoredSessions28: scored28,
      unscoredSessions28: uns28,
    });
  }

  if (n >= 2 && sessions[n - 1] === 0) {
    const y = out[n - 2], t = out[n - 1];
    out[n - 1] = { ...y, t: t.t, load: 0, sessions: 0, unscored: 0, asOf: 'yesterday' };
  }
  return out;
}

export function computeACWR(log, opts = {}) {
  const now = opts.now ?? Date.now();
  const days = run(log, now);

  if (!days.length) {
    return {
      status: 'no-data', reason: STATUS_COPY['no-data'],
      acwr: null, zone: 'no-data', ...ZONE_COPY['no-data'],
      acute: null, chronic: null,
      uncoupled: { prior: null, ratio: null },
      asOf: 'today',
      historyDays: 0, scoredSessions28: 0, unscoredSessions28: 0,
      method: 'rolling-7-28',
    };
  }

  const d = days[days.length - 1];
  const ok = d.status === 'ok';

  return {
    status: d.status, reason: STATUS_COPY[d.status],
    acwr: d.acwr, zone: d.zone, ...ZONE_COPY[d.zone],
    acute: ok ? Math.round(d.acute) : null,
    chronic: ok ? Math.round(d.chronic) : null,
    uncoupled: {
      prior: ok ? Math.round(d.prior) : null,
      ratio: ok && d.prior > EPS ? round2(d.acute / d.prior) : null,
    },
    asOf: d.asOf,
    historyDays: d.historyDays,
    scoredSessions28: d.scoredSessions28,
    unscoredSessions28: d.unscoredSessions28,
    method: 'rolling-7-28',
  };
}

export function explainACWR(r) {
  if (!r || r.status !== 'ok') return r?.reason || STATUS_COPY['no-data'];
  const when = r.asOf === 'yesterday' ? ' (through yesterday)' : '';
  const unc = r.uncoupled.ratio !== null
    ? ` Compared with the three weeks before it (${r.uncoupled.prior} AU/week), that is ${r.uncoupled.ratio}×.`
    : '';
  return `Last 7 days${when}: ${r.acute} AU ÷ 4-week average ${r.chronic} AU/week = ${r.acwr}. ${r.label}.${unc}`;
}

export function acwrSeries(log, opts = {}) {
  const now = opts.now ?? Date.now();
  const days = Math.max(1, Math.floor(opts.days ?? 28));
  const all = run(log, now);
  if (!all.length) return [];

  const today0 = localMidnight(now);
  const out = [];
  for (let k = days - 1; k >= 0; k--) {
    const d = all[all.length - 1 - k];
    out.push(d
      ? { date: dayLabel(d.t), acwr: d.acwr, zone: d.zone, load: Math.round(d.load), status: d.status }
      : { date: dayLabel(today0 - k * DAY_MS), acwr: null, zone: 'no-data', load: 0, status: 'insufficient-history' });
  }
  return out;
}

export function loadSeries(log, opts = {}) {
  const now = opts.now ?? Date.now();
  const days = Math.max(1, Math.floor(opts.days ?? 28));
  const all = run(log, now);
  const today0 = localMidnight(now);
  const out = [];
  for (let k = days - 1; k >= 0; k--) {
    const d = all[all.length - 1 - k];
    out.push({
      date: dayLabel(d ? d.t : today0 - k * DAY_MS),
      load: d ? Math.round(d.load) : 0,
      hasData: d ? d.sessions > 0 : false,
      unscored: d ? d.unscored : 0,
    });
  }
  return out;
}
