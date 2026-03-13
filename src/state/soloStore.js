// ─── Solo / Offline Store ──────────────────────────────────────────────────
// Provides the same API surface as the Supabase services but persists to
// localStorage. This lets athletes use PerformanceIQ without an account.

const KEY = {
  profile:       "piq_profile",
  workouts:      "piq_workouts",
  readiness:     "piq_readiness",
  prs:           "piq_prs",
};

function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Profile ──────────────────────────────────────────────────────────────
export function soloGetProfile() {
  return load(KEY.profile, null);
}

export function soloSaveProfile(profile) {
  save(KEY.profile, { ...profile, id: "solo", role: profile.role ?? "athlete" });
  return soloGetProfile();
}

// ─── Readiness ────────────────────────────────────────────────────────────
export function soloGetTodaysReadiness() {
  const all = load(KEY.readiness, []);
  return all.find(r => r.log_date === todayStr()) ?? null;
}

export function soloSaveReadiness(values) {
  const all = load(KEY.readiness, []);
  const today = todayStr();
  const idx = all.findIndex(r => r.log_date === today);
  const entry = {
    id:           today,
    athlete_id:   "solo",
    log_date:     today,
    score:        values.score       ?? 75,
    hrv:          values.hrv         ?? "",
    sleep_hrs:    values.sleep       ?? 7.0,
    soreness:     values.soreness    ?? "Low",
    hydration:    values.hydration   ?? "On target",
    body_battery: values.bodyBattery ?? 70,
    notes:        values.notes       ?? "",
  };
  if (idx >= 0) all[idx] = entry; else all.push(entry);
  save(KEY.readiness, all);
  return entry;
}

export function soloGetReadinessTrend(days = 14) {
  const all = load(KEY.readiness, []);
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  return all
    .filter(r => r.log_date >= since)
    .sort((a, b) => a.log_date.localeCompare(b.log_date));
}

// ─── Workouts ─────────────────────────────────────────────────────────────
export function soloGetTodaysWorkout() {
  const all = load(KEY.workouts, []);
  const today = todayStr();
  // newest first for today
  return all
    .filter(w => w.scheduled_date === today)
    .sort((a, b) => b.created_at?.localeCompare(a.created_at ?? "") ?? 0)[0] ?? null;
}

export function soloCreateWorkout(payload) {
  const all = load(KEY.workouts, []);
  const workout = {
    id:             `solo_${Date.now()}`,
    athlete_id:     "solo",
    scheduled_date: todayStr(),
    created_at:     new Date().toISOString(),
    completed_at:   null,
    ...payload,
  };
  all.push(workout);
  save(KEY.workouts, all);
  return workout;
}

export function soloSaveWorkoutProgress(workoutId, exercises) {
  const all = load(KEY.workouts, []);
  const idx = all.findIndex(w => w.id === workoutId);
  if (idx >= 0) { all[idx].exercises = exercises; save(KEY.workouts, all); }
}

export function soloCompleteWorkout(workoutId, exercises) {
  const all = load(KEY.workouts, []);
  const idx = all.findIndex(w => w.id === workoutId);
  if (idx >= 0) {
    all[idx].exercises    = exercises;
    all[idx].completed_at = new Date().toISOString();
    save(KEY.workouts, all);
  }
}

export function soloGetRecentWorkouts(days = 30) {
  const all = load(KEY.workouts, []);
  const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  return all
    .filter(w => w.scheduled_date >= since)
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
}

// ─── Personal Records ─────────────────────────────────────────────────────
export function soloGetPRs() {
  return load(KEY.prs, []).sort((a, b) => b.set_at?.localeCompare(a.set_at ?? "") ?? 0);
}

export function soloMaybeSetPR({ exerciseId, value, unit, label }) {
  const all = load(KEY.prs, []);
  const current = all.filter(p => p.exercise_id === exerciseId)
                     .sort((a, b) => b.value - a.value)[0];
  if (current && value <= current.value) return null;
  const entry = {
    id:          `pr_${Date.now()}`,
    athlete_id:  "solo",
    exercise_id: exerciseId,
    value, unit, label,
    set_at:      todayStr(),
  };
  all.push(entry);
  save(KEY.prs, all);
  return entry;
}

// ─── Clear all solo data (for reset) ─────────────────────────────────────
export function soloClearAll() {
  Object.values(KEY).forEach(k => localStorage.removeItem(k));
}
