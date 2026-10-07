/**
 * PerformanceIQ — Cloud sync v1
 * ─────────────────────────────────────────────────────────────
 * Keeps a signed-in account's training data in Supabase so it survives a
 * cleared browser, follows the athlete to another device, and can be seen
 * by the coach or parent they have shared it with.
 */
import { supabase }                                   from '../core/supabase.js';
import { getSession, getCurrentUser, getCurrentRole } from '../core/auth.js';
import { getState, scopeState, loadState, onLocalWrite,
         markLogSynced, applyCloudSnapshot }          from '../state/state.js';
import { getReadinessScore, getPIQScore, getStreak }  from '../state/selectors.js';
import { navigate, getCurrentRoute, onRouteChange }   from '../router.js';
import { showToast }                                  from '../core/notifications.js';
import {
  CLOUD_WINDOW_DAYS, localDateKey, dateKeyToLocalNoon, windowStartKey,
  isPushableSession, entryToWorkoutRow, hasWellness, checkinToReadinessRow,
  readinessRowToCheckin, mergeCloudIntoLog, buildRosterEntry, isUuid,
} from './cloudMap.js';

const OUTBOX_KEY     = 'piq_outbox_v1';
const MAX_ATTEMPTS   = 6;
const PULL_THROTTLE  = 30_000;
const ATHLETE_ROLES  = new Set(['player', 'solo']);

const WORKOUT_COLS   = 'id,athlete_id,assigned_by,title,sport,day_type,scheduled_date,status,completed_at,duration_min,rpe_actual,notes';
const READINESS_COLS = 'id,athlete_id,log_date,score,sleep_quality,energy,stress,mood,soreness,sleep_hrs,notes';
const PROFILE_COLS   = 'id,name,sport,position,sport_position,age,training_level,comp_phase,weight_lbs,height_ft,height_in,days_per_week,piq_score';

let _pulling      = null;
let _lastPullAt   = 0;
let _flushing     = false;
let _toastedFail  = false;
let _initialised  = false;

export function sessionScopeId() {
  const s = getSession();
  return s && !s.isDemo && s.user?.id ? s.user.id : 'demo';
}

export function isCloudAccount() { return sessionScopeId() !== 'demo'; }

function uid() { return isCloudAccount() ? getCurrentUser().id : null; }
function canWriteOwnData() { return isCloudAccount() && ATHLETE_ROLES.has(getCurrentRole()); }
function todayString() { return new Date().toDateString(); }

function isNetworkError(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return /failed to fetch|networkerror|load failed|network request failed/i.test(String(error?.message || ''));
}

function noteError(message) {
  applyCloudSnapshot({ cloud: { lastError: String(message || ''), lastErrorAt: Date.now() } }, { silent: true });
}

function outboxKey() { return `${OUTBOX_KEY}:${uid()}`; }

function readOutbox() {
  try { return JSON.parse(localStorage.getItem(outboxKey()) || '[]') || []; } catch { return []; }
}

function writeOutbox(items) {
  try { localStorage.setItem(outboxKey(), JSON.stringify(items)); } catch {}
}

export function pendingUploads() { return isCloudAccount() ? readOutbox().length : 0; }

function enqueue(item) {
  const items = readOutbox().filter(existing => {
    if (item.kind === 'readiness') return !(existing.kind === 'readiness' && existing.row.log_date === item.row.log_date);
    return !(existing.kind === 'workout' && existing.localId && existing.localId === item.localId);
  });
  items.push({ ...item, attempts: 0, queuedAt: Date.now() });
  writeOutbox(items);
}

async function sendWorkout(item) {
  const { data, error } = await supabase.from('workouts').insert(item.row).select('id').single();
  if (!error) return { ok: true, remoteId: data?.id || item.row.id };
  if (error.code === '23505' && item.row.id) return { ok: true, remoteId: item.row.id };
  return { ok: false, error };
}

async function sendReadiness(item) {
  const { row } = item;
  const found = await supabase.from('readiness_logs').select('id')
    .eq('athlete_id', row.athlete_id).eq('log_date', row.log_date).limit(1);
  if (found.error) return { ok: false, error: found.error };
  const existingId = found.data?.[0]?.id;
  const res = existingId
    ? await supabase.from('readiness_logs').update(row).eq('id', existingId)
    : await supabase.from('readiness_logs').insert(row);
  return res.error ? { ok: false, error: res.error } : { ok: true };
}

export async function flushOutbox() {
  if (_flushing || !canWriteOwnData()) return;
  _flushing = true;
  const scopeAtStart = uid();
  try {
    let items = readOutbox();
    const remaining = [];
    for (const item of items) {
      if (uid() !== scopeAtStart) return;
      let result;
      try {
        result = item.kind === 'workout' ? await sendWorkout(item) : await sendReadiness(item);
      } catch (err) {
        result = { ok: false, error: err };
      }
      if (result.ok) {
        if (item.kind === 'workout' && item.localId) markLogSynced(item.localId, result.remoteId);
        continue;
      }
      const network = isNetworkError(result.error);
      const attempts = (item.attempts || 0) + (network ? 0 : 1);
      if (attempts < MAX_ATTEMPTS) remaining.push({ ...item, attempts });
      noteError(result.error?.message || 'Upload failed');
      console.warn('[PIQ sync] upload failed:', result.error?.message || result.error);
      if (!_toastedFail) {
        _toastedFail = true;
        showToast('Saved on this device. Cloud backup will retry automatically.', 'warn');
      }
      if (network) { remaining.push(...items.slice(items.indexOf(item) + 1)); break; }
    }
    if (uid() === scopeAtStart) writeOutbox(remaining);
    if (!remaining.length) { _toastedFail = false; noteError(''); }
  } finally {
    _flushing = false;
  }
}

function queueSession(record) {
  const profile = getState().athleteProfile || {};
  const row = entryToWorkoutRow(record, { userId: uid(), fallbackSport: profile.sport || getCurrentUser()?.sport });
  if (!row) return false;
  enqueue({ kind: 'workout', row, localId: record.id });
  return true;
}

function queueCheckIn(checkin) {
  if (!hasWellness(checkin)) return false;
  if (checkin.date && checkin.date !== todayString()) return false;
  const row = checkinToReadinessRow({ ...checkin, ts: Date.now() }, { userId: uid(), score: getReadinessScore() });
  if (!row) return false;
  enqueue({ kind: 'readiness', row });
  return true;
}

function handleLocalWrite(kind, record) {
  if (!canWriteOwnData()) return;
  const queued = kind === 'session' ? (isPushableSession(record) && queueSession(record)) : queueCheckIn(record);
  if (!queued) return;
  flushOutbox()
    .then(pushProfileMetrics)
    .then(() => (kind === 'session' ? null : pullAll({ force: true })))
    .catch(() => {});
}

async function pushProfileMetrics() {
  if (!canWriteOwnData()) return;
  const metrics = { piq_score: Math.round(getPIQScore()), streak_days: getStreak() };
  if (!Number.isFinite(metrics.piq_score) || metrics.piq_score < 1 || metrics.piq_score > 100) return;
  const last = getState().cloud?.lastMetrics;
  if (last && last.piq_score === metrics.piq_score && last.streak_days === metrics.streak_days) return;
  const { error } = await supabase.from('profiles').update(metrics).eq('id', uid());
  if (error) { console.warn('[PIQ sync] profile metrics not saved:', error.message); return; }
  applyCloudSnapshot({ cloud: { lastMetrics: metrics } }, { silent: true });
}

async function fetchAthleteRows(athleteIds, fromKey) {
  const ids = [...new Set(athleteIds)].filter(Boolean);
  if (!ids.length) return { workoutRows: [], readinessRows: [] };
  const [w, r] = await Promise.all([
    supabase.from('workouts').select(WORKOUT_COLS).in('athlete_id', ids)
      .gte('scheduled_date', fromKey).order('scheduled_date', { ascending: true }).limit(5000),
    supabase.from('readiness_logs').select(READINESS_COLS).in('athlete_id', ids)
      .gte('log_date', fromKey).order('log_date', { ascending: true }).limit(5000),
  ]);
  if (w.error) throw w.error;
  if (r.error) throw r.error;
  return { workoutRows: w.data || [], readinessRows: r.data || [] };
}

function todaysCheckInFrom(readinessRows) {
  const row = readinessRows.find(r => r.log_date === localDateKey());
  const entry = row ? readinessRowToCheckin(row) : null;
  if (!entry || !hasWellness(entry)) return null;
  return {
    date: todayString(), sleepQuality: entry.sleepQuality, energyLevel: entry.energyLevel,
    soreness: entry.soreness, mood: entry.mood, stressLevel: entry.stressLevel,
    sleepHours: entry.sleepHours || 0, notes: entry.notes || '',
  };
}

async function pullMine() {
  const me = uid();
  const now = Date.now();
  const { workoutRows, readinessRows } = await fetchAthleteRows([me], windowStartKey(now));
  if (uid() !== me) return false;

  const state  = getState();
  const before = JSON.stringify(state.workoutLog);
  const merged = mergeCloudIntoLog(state.workoutLog, {
    workoutRows, readinessRows,
    windowStart: dateKeyToLocalNoon(windowStartKey(now)),
  });
  const snapshot = { cloud: { lastPullAt: now } };
  let changed = false;
  if (JSON.stringify(merged) !== before) { snapshot.workoutLog = merged; changed = true; }

  const local = state.readinessCheckIn || {};
  if (!(local.date === todayString() && hasWellness(local))) {
    const cloudToday = todaysCheckInFrom(readinessRows);
    if (cloudToday) { snapshot.readinessCheckIn = cloudToday; changed = true; }
  }
  applyCloudSnapshot(snapshot, { silent: !changed });

  const queuedIds = new Set(readOutbox().map(i => i.localId).filter(Boolean));
  let queued = 0;
  for (const rec of getState().workoutLog) {
    if (isPushableSession(rec) && isUuid(rec.id) && !queuedIds.has(rec.id) && queueSession(rec)) queued++;
  }
  if (queued || readOutbox().length) await flushOutbox();
  await pushProfileMetrics();
  return changed;
}

async function linkedAthleteIdsForCoach(me) {
  const [links, teams] = await Promise.all([
    supabase.from('coach_athlete_links').select('athlete_id,is_active').eq('coach_id', me),
    supabase.from('teams').select('id').eq('coach_id', me),
  ]);
  if (links.error) throw links.error;
  if (teams.error) throw teams.error;
  const ids = (links.data || []).filter(l => l.is_active !== false).map(l => l.athlete_id);
  const teamIds = (teams.data || []).map(t => t.id);
  if (teamIds.length) {
    const members = await supabase.from('team_members').select('athlete_id').in('team_id', teamIds);
    if (members.error) throw members.error;
    ids.push(...(members.data || []).map(m => m.athlete_id));
  }
  return [...new Set(ids)].filter(id => id && id !== me);
}

async function buildEntries(athleteIds, now) {
  if (!athleteIds.length) return [];
  const profiles = await supabase.from('profiles').select(PROFILE_COLS).in('id', athleteIds);
  if (profiles.error) throw profiles.error;
  const { workoutRows, readinessRows } = await fetchAthleteRows(athleteIds, windowStartKey(now, 60));
  return (profiles.data || [])
    .map(p => buildRosterEntry(p, {
      workoutRows:   workoutRows.filter(w => w.athlete_id === p.id),
      readinessRows: readinessRows.filter(r => r.athlete_id === p.id),
      now,
    }))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function pullRoster() {
  const me = uid();
  const now = Date.now();
  const ids = await linkedAthleteIdsForCoach(me);
  const roster = await buildEntries(ids, now);
  if (uid() !== me) return false;
  const changed = JSON.stringify(roster) !== JSON.stringify(getState().roster);
  applyCloudSnapshot({ roster, cloud: { lastPullAt: now } }, { silent: !changed });
  return changed;
}

async function linkedAthleteIdsForParent(me) {
  const [own, family, direct] = await Promise.all([
    supabase.from('profiles').select('linked_athlete_id').eq('id', me).maybeSingle(),
    supabase.from('family_links').select('athlete_id,confirmed').eq('parent_id', me),
    supabase.from('parent_athlete_links').select('athlete_id').eq('parent_id', me),
  ]);
  if (own.error) throw own.error;
  if (family.error) throw family.error;
  if (direct.error) throw direct.error;
  const ids = [];
  if (own.data?.linked_athlete_id) ids.push(own.data.linked_athlete_id);
  ids.push(...(family.data || []).filter(l => l.confirmed).map(l => l.athlete_id));
  ids.push(...(direct.data || []).map(l => l.athlete_id));
  return [...new Set(ids)].filter(id => id && id !== me);
}

async function pullLinkedAthlete() {
  const me = uid();
  const now = Date.now();
  const ids = await linkedAthleteIdsForParent(me);
  const snapshot = { cloud: { lastPullAt: now } };

  if (!ids.length) {
    Object.assign(snapshot, { roster: [], linkedAthletes: [], linkedAthlete: null, workoutLog: [] });
  } else {
    const profiles = await supabase.from('profiles').select(PROFILE_COLS).in('id', ids);
    if (profiles.error) throw profiles.error;
    const { workoutRows, readinessRows } = await fetchAthleteRows(ids, windowStartKey(now));
    const entries = (profiles.data || []).map(p => buildRosterEntry(p, {
      workoutRows:   workoutRows.filter(w => w.athlete_id === p.id),
      readinessRows: readinessRows.filter(r => r.athlete_id === p.id),
      now,
    })).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));

    const currentId = getState().linkedAthlete?.id;
    const active    = entries.find(e => e.id === currentId) || entries[0] || null;
    const profile   = (profiles.data || []).find(p => p.id === active?.id);
    snapshot.roster         = entries;
    snapshot.linkedAthletes = entries;
    snapshot.linkedAthlete  = active;
    snapshot.workoutLog = active ? mergeCloudIntoLog([], {
      workoutRows:   workoutRows.filter(w => w.athlete_id === active.id),
      readinessRows: readinessRows.filter(r => r.athlete_id === active.id),
    }) : [];
    if (profile) {
      snapshot.athleteProfile = {
        sport: profile.sport || '', position: profile.position || profile.sport_position || '',
        trainingLevel: profile.training_level || 'intermediate', compPhase: profile.comp_phase || 'in-season',
        daysPerWeek: profile.days_per_week || 4,
      };
    }
    const today = active ? todaysCheckInFrom(readinessRows.filter(r => r.athlete_id === active.id)) : null;
    snapshot.readinessCheckIn = today || { date: '' };
  }

  if (uid() !== me) return false;
  const s = getState();
  const changed = JSON.stringify([snapshot.roster, snapshot.workoutLog, snapshot.linkedAthlete?.id])
               !== JSON.stringify([s.roster, s.workoutLog, s.linkedAthlete?.id]);
  applyCloudSnapshot(snapshot, { silent: !changed });
  return changed;
}

const NO_RERENDER = /\/(log|today|builder|program|session|messages|settings|nutrition|billing|goals|library|calendar)$|^(player|solo)\/readiness$|^settings\/|onboarding|pick-role|sign|welcome/;

function rerenderIfSafe() {
  const route = getCurrentRoute();
  if (!route || NO_RERENDER.test(route)) return;
  navigate(route);
}

export function pullAll({ force = false } = {}) {
  if (!isCloudAccount()) return Promise.resolve(false);
  if (_pulling) return _pulling;
  if (!force && Date.now() - _lastPullAt < PULL_THROTTLE) return Promise.resolve(false);

  const role = getCurrentRole();
  const job  = role === 'coach'  ? pullRoster
             : role === 'parent' ? pullLinkedAthlete
             : ATHLETE_ROLES.has(role) ? pullMine
             : null;
  if (!job) return Promise.resolve(false);

  _lastPullAt = Date.now();
  _pulling = job()
    .then(changed => { noteErrorIfNoneQueued(); if (changed) rerenderIfSafe(); return changed; })
    .catch(err => {
      console.warn('[PIQ sync] refresh failed:', err?.message || err);
      noteError(err?.message || 'Could not reach the server');
      return false;
    })
    .finally(() => { _pulling = null; });
  return _pulling;
}

function noteErrorIfNoneQueued() {
  if (!readOutbox().length && getState().cloud?.lastError) noteError('');
}

export function applySessionScope() {
  const changed = scopeState(sessionScopeId());
  if (!changed && !_initialised) loadState();
  _initialised = true;
  if (changed) { _lastPullAt = 0; _toastedFail = false; }
  if (isCloudAccount()) {
    flushOutbox().catch(() => {});
    pullAll({ force: changed }).catch(() => {});
  }
  return changed;
}

if (typeof document !== 'undefined') {
  onLocalWrite(handleLocalWrite);

  document.addEventListener('piq:sessionChanged', () => {
    if (_initialised) applySessionScope();
  });

  document.addEventListener('piq:cloudChanged', () => { pullAll({ force: true }).catch(() => {}); });

  window.addEventListener('online', () => {
    flushOutbox().catch(() => {});
    pullAll({ force: true }).catch(() => {});
  });

  onRouteChange(() => { if (_initialised && isCloudAccount()) pullAll().catch(() => {}); });
}
