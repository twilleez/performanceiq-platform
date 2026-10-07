/**
 * PerformanceIQ — Cloud mapping v1
 * ─────────────────────────────────────────────────────────────
 * Pure translation between the app's local records (state.workoutLog) and
 * the Supabase rows they are stored in. No network, no DOM, no state access,
 * so every rule here is unit-tested (tests/cloudMap.test.mjs).
 *
 * Tables used (columns as they exist in the live project):
 *   public.workouts        one row per training session
 *     id, athlete_id, assigned_by, scheduled_date, title, sport, day_type,
 *     notes, exercises, status, completed_at, duration_min, rpe_actual
 *   public.readiness_logs  one row per athlete per day
 *     id, athlete_id, log_date, score, sleep_hrs, sleep_quality, energy,
 *     stress, mood, soreness ('Low' | 'Medium' | 'High'), notes
 *
 * Honest limits of the schema
 *   • rpe_actual is a whole number, so a logged RPE of 6.5 is stored as 7.
 *   • soreness is stored as Low / Medium / High, so the 1–5 value is only
 *     exact on the device that recorded it.
 *   • sleep_hrs cannot be empty in the database; when the athlete did not
 *     enter it the column keeps its database default.
 */
import { computeACWR }                         from './loadModel.js';
import { currentStreak, trainingDaysInWindow } from './consistency.js';

export const CLOUD_WINDOW_DAYS = 120;

// ── Dates ─────────────────────────────────────────────────────

/** Local calendar date as 'YYYY-MM-DD' (never the UTC date). */
export function localDateKey(ts = Date.now()) {
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Local noon of a 'YYYY-MM-DD' key, as a timestamp. NaN when malformed. */
export function dateKeyToLocalNoon(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(key ?? ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0).getTime() : NaN;
}

/** First date key of the cloud window ending today. */
export function windowStartKey(now = Date.now(), days = CLOUD_WINDOW_DAYS) {
  const d = new Date(now);
  return localDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - days, 12).getTime());
}

// ── Small validators ──────────────────────────────────────────

function intInRange(v, min, max) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuid(v) { return typeof v === 'string' && UUID_RE.test(v); }

// ── Sessions → public.workouts ────────────────────────────────

export function isPushableSession(entry) {
  if (!entry || entry.type === 'checkin') return false;
  if (entry.completed === false) return false;
  if (entry.remoteId || entry.source === 'cloud') return false;
  if (Array.isArray(entry.assignedTo)) return false;
  return Number.isFinite(Number(entry.ts));
}

export function entryToWorkoutRow(entry, { userId, fallbackSport } = {}) {
  if (!userId || !isPushableSession(entry)) return null;
  const ts  = Number(entry.ts);
  const row = {
    athlete_id:     userId,
    title:          String(entry.name || entry.title || 'Training session').slice(0, 200),
    sport:          String(entry.sport || fallbackSport || 'general').toLowerCase(),
    day_type:       String(entry.sessionType || entry.dayType || 'training').toLowerCase().slice(0, 40),
    scheduled_date: localDateKey(ts),
    exercises:      Array.isArray(entry.exercises) ? entry.exercises : [],
    notes:          String(entry.notes || ''),
    status:         'completed',
    completed_at:   new Date(ts).toISOString(),
    duration_min:   intInRange(entry.duration, 1, 600),
    rpe_actual:     intInRange(entry.avgRPE ?? entry.rpe, 1, 10),
  };
  if (isUuid(entry.id)) row.id = entry.id;
  return row;
}

export function workoutRowToEntry(row) {
  if (!row || !(row.status === 'completed' || row.completed_at)) return null;
  const done = Date.parse(row.completed_at);
  const ts   = Number.isFinite(done) ? done : dateKeyToLocalNoon(row.scheduled_date);
  if (!Number.isFinite(ts)) return null;
  const entry = {
    id:          row.id,
    remoteId:    row.id,
    source:      'cloud',
    name:        row.title || 'Training session',
    title:       row.title || 'Training session',
    sport:       row.sport || null,
    sessionType: row.day_type || null,
    notes:       row.notes || '',
    completed:   true,
    ts,
  };
  if (row.assigned_by) entry.assignedBy = row.assigned_by;
  const dur = intInRange(row.duration_min, 1, 600);
  const rpe = intInRange(row.rpe_actual, 1, 10);
  if (dur !== null) entry.duration = dur;
  if (rpe !== null) entry.avgRPE   = rpe;
  return entry;
}

// ── Check-ins → public.readiness_logs ─────────────────────────

const SORENESS_TO_TEXT = v => (v <= 2 ? 'Low' : v === 3 ? 'Medium' : 'High');
const SORENESS_FROM_TEXT = { low: 2, medium: 3, high: 4 };

export function hasWellness(checkin) {
  return intInRange(checkin?.sleepQuality, 1, 5) !== null;
}

export function checkinToReadinessRow(checkin, { userId, score, now = Date.now() } = {}) {
  if (!userId || !hasWellness(checkin)) return null;
  const ts  = Number.isFinite(Number(checkin.ts)) ? Number(checkin.ts) : now;
  const row = {
    athlete_id:    userId,
    log_date:      localDateKey(ts),
    sleep_quality: intInRange(checkin.sleepQuality, 1, 5),
    energy:        intInRange(checkin.energyLevel, 1, 5),
    stress:        intInRange(checkin.stressLevel, 1, 5),
    mood:          intInRange(checkin.mood, 1, 5),
    notes:         String(checkin.notes || ''),
  };
  const sore = intInRange(checkin.soreness, 1, 5);
  if (sore !== null) row.soreness = SORENESS_TO_TEXT(sore);
  const hrs = Number(checkin.sleepHours);
  if (Number.isFinite(hrs) && hrs > 0 && hrs <= 24) row.sleep_hrs = hrs;
  const s = intInRange(score, 0, 100);
  if (s !== null) row.score = s;
  return row;
}

export function readinessRowToCheckin(row) {
  const ts = dateKeyToLocalNoon(row?.log_date);
  if (!Number.isFinite(ts)) return null;
  const entry = {
    type:         'checkin',
    remoteId:     row.id,
    source:       'cloud',
    date:         new Date(ts).toDateString(),
    ts,
    sleepQuality: intInRange(row.sleep_quality, 1, 5) ?? 0,
    energyLevel:  intInRange(row.energy, 1, 5) ?? 0,
    stressLevel:  intInRange(row.stress, 1, 5) ?? 0,
    mood:         intInRange(row.mood, 1, 5) ?? 0,
    soreness:     SORENESS_FROM_TEXT[String(row.soreness || '').toLowerCase()] ?? 0,
    notes:        row.notes || '',
  };
  const hrs = Number(row.sleep_hrs);
  if (Number.isFinite(hrs) && hrs > 0) entry.sleepHours = hrs;
  const score = intInRange(row.score, 0, 100);
  if (score !== null) entry.cloudScore = score;
  return entry;
}

// ── Merge cloud rows into a local log ─────────────────────────

export function mergeCloudIntoLog(localLog, { workoutRows = [], readinessRows = [], windowStart = -Infinity } = {}) {
  const local = Array.isArray(localLog) ? localLog : [];
  const cloudSessions = new Map();
  for (const row of workoutRows) {
    const e = workoutRowToEntry(row);
    if (e) cloudSessions.set(e.remoteId, e);
  }
  const cloudCheckins = new Map();
  for (const row of readinessRows) {
    const e = readinessRowToCheckin(row);
    if (e) cloudCheckins.set(localDateKey(e.ts), e);
  }

  const out = [];
  const seenSessions = new Set();
  const daysWithLocalCheckin = new Set();

  for (const rec of local) {
    if (!rec) continue;
    if (rec.type === 'checkin') {
      if (rec.source === 'cloud') continue;
      if (hasWellness(rec)) {
        const key   = localDateKey(rec.ts);
        const cloud = cloudCheckins.get(key);
        daysWithLocalCheckin.add(key);
        out.push(cloud && !rec.remoteId ? { ...rec, remoteId: cloud.remoteId } : rec);
      } else {
        out.push(rec);
      }
      continue;
    }

    const rid = rec.remoteId || (cloudSessions.has(rec.id) ? rec.id : null);
    if (rid && cloudSessions.has(rid)) {
      const { source, ...fresh } = cloudSessions.get(rid);
      out.push({ ...rec, ...fresh, source: rec.source === 'cloud' ? 'cloud' : rec.source });
      seenSessions.add(rid);
    } else if (rec.remoteId && Number(rec.ts) >= windowStart) {
      // deleted remotely
    } else {
      out.push(rec);
    }
  }

  for (const [rid, e] of cloudSessions) if (!seenSessions.has(rid)) out.push(e);
  for (const [key, e] of cloudCheckins) if (!daysWithLocalCheckin.has(key)) out.push(e);

  return out.sort((a, b) => (Number(a.ts) || 0) - (Number(b.ts) || 0));
}

// ── Roster entry for coach / parent screens ───────────────────

function heightText(ft, inch) {
  const f = intInRange(ft, 1, 8);
  if (f === null) return null;
  const i = intInRange(inch, 0, 11) ?? 0;
  return `${f}'${i}"`;
}

export function buildRosterEntry(profile, { workoutRows = [], readinessRows = [], now = Date.now() } = {}) {
  if (!profile?.id) return null;
  const log = mergeCloudIntoLog([], { workoutRows, readinessRows });
  const daysPerWeek = intInRange(profile.days_per_week, 1, 7) ?? 4;
  const todayKey = localDateKey(now);

  const scored = readinessRows
    .filter(r => r && intInRange(r.score, 0, 100) !== null && intInRange(r.sleep_quality, 1, 5) !== null)
    .sort((a, b) => String(a.log_date).localeCompare(String(b.log_date)));
  const today  = scored.find(r => r.log_date === todayKey) || null;
  const latest = scored.length ? scored[scored.length - 1] : null;

  const sessions  = log.filter(e => e.type !== 'checkin');
  const lastTs    = sessions.length ? sessions[sessions.length - 1].ts : null;
  const load      = computeACWR(log, { now });
  const piq       = intInRange(profile.piq_score, 1, 100);

  return {
    id:           profile.id,
    isReal:       true,
    name:         profile.name || 'Athlete',
    sport:        profile.sport || null,
    position:     profile.position || profile.sport_position || '',
    age:          intInRange(profile.age, 5, 100),
    level:        profile.training_level || '',
    compPhase:    profile.comp_phase || '',
    weight:       Number(profile.weight_lbs) > 0 ? Number(profile.weight_lbs) : null,
    height:       heightText(profile.height_ft, profile.height_in),
    daysPerWeek,
    readiness:        today ? today.score : null,
    lastReadiness:    latest ? latest.score : null,
    lastCheckInDate:  latest ? latest.log_date : null,
    readinessHistory: scored.slice(-7).map(r => ({ date: r.log_date, score: r.score })),
    piq,
    streak:       currentStreak(log, { now, daysPerWeek }),
    sessions7:    trainingDaysInWindow(log, { now, days: 7 }),
    sessions28:   trainingDaysInWindow(log, { now, days: 28 }),
    lastSessionTs: lastTs,
    acwr:         load.acwr,
    loadZone:     load.zone,
    loadLabel:    load.label,
    loadReason:   load.reason,
  };
}
