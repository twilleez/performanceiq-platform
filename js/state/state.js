/**
 * PerformanceIQ State  (remediated — full export set)
 *
 * Exports added in this pass:
 *   getAssignedWorkouts()  — returns the assignedWorkouts array from state,
 *                            or an empty array if none exist yet.
 *                            Imported by solo/todayWorkout.js and solo/score.js.
 *                            Solo athletes have no coach-assigned workouts by
 *                            default; this returns [] safely so views render
 *                            their fallback "no assignments" UI instead of crashing.
 *
 * Previously added (all retained):
 *   completeAssignment(id, meta) — marks a workout log entry as completed
 *   addCheckIn(checkIn)          — records a wellness check-in
 *   addMeal(item)                — id-stamped meal entry
 *   removeMeal(id)               — id-based deletion (not index-based)
 */

import { loadFromStorage, saveToStorage } from '../services/storage.js';

const STATE_KEY = 'piq_state_v2';

// ── DEFAULT STATE ──────────────────────────────────────────────────────────────
function defaultState() {
  return {
    theme: 'dark',
    roster: [
      { id: 'a1', name: 'Jake Williams',   position: 'PG', sport: 'basketball', readiness: 82, piq: 84, streak: 6,  weight: 185, height: "6'2\"", age: 17, level: 'advanced',     compPhase: 'in-season' },
      { id: 'a2', name: 'Marcus Thompson', position: 'SF', sport: 'basketball', readiness: 71, piq: 78, streak: 4,  weight: 195, height: "6'5\"", age: 17, level: 'advanced',     compPhase: 'in-season' },
      { id: 'a3', name: 'Devon Nichols',   position: 'PF', sport: 'basketball', readiness: 55, piq: 68, streak: 1,  weight: 210, height: "6'7\"", age: 16, level: 'intermediate', compPhase: 'in-season' },
      { id: 'a4', name: 'Aliyah Reeves',   position: 'SG', sport: 'basketball', readiness: 63, piq: 73, streak: 2,  weight: 175, height: "6'1\"", age: 16, level: 'intermediate', compPhase: 'in-season' },
    ],
    athleteProfile: {
      sport: 'basketball', level: 'high_school', team: '', goals: [], position: '', gradYear: '',
      age: '', weightLbs: '', heightFt: '', heightIn: '',
      trainingLevel: 'intermediate', daysPerWeek: 4, sleepHours: 7,
      compPhase: 'in-season', primaryGoal: '', secondaryGoals: [], injuryHistory: 'none',
      mindsetScore: 0, hydrationOz: 0, pliabilityDone: false, recoveryNotes: '',
    },
    workoutLog:       [],
    assignedWorkouts: [],   // workouts pushed by a coach (empty for solo athletes)
    draftWorkout:     null,
    nutrition: {
      meals:        [],
      macros:       { cal: 0, pro: 0, cho: 0, fat: 0 },
      targetMacros: { cal: 0, pro: 0, cho: 0, fat: 0 },
      mealPlan:     null,
    },
    linkedAthlete: null,
    messages:      [],
    builder: {
      activeTab: 'plan', pickerOpen: false, pickerFilter: 'all',
      loadedTemplateId: null, draft: null,
    },
    assignModal:      { open: false, pending: null },
    readinessCheckIn: {
      date: '', sleepHours: 0, sleepQuality: 0, energyLevel: 0,
      soreness: 0, mood: 0, stressLevel: 0, hydration: 0, notes: '',
    },
  };
}

let _state     = defaultState();
let _listeners = [];

// ── PERSISTENCE ────────────────────────────────────────────────────────────────
export function loadState() {
  const saved = loadFromStorage(STATE_KEY);
  if (saved) {
    const def  = defaultState();
    _state = {
      ...def, ...saved,
      athleteProfile:   { ...def.athleteProfile,   ...(saved.athleteProfile   || {}) },
      nutrition: {
        ...def.nutrition, ...(saved.nutrition || {}),
        macros:       { ...def.nutrition.macros,       ...(saved.nutrition?.macros       || {}) },
        targetMacros: { ...def.nutrition.targetMacros, ...(saved.nutrition?.targetMacros || {}) },
      },
      readinessCheckIn: { ...def.readinessCheckIn, ...(saved.readinessCheckIn || {}) },
      // Ensure assignedWorkouts always exists even in persisted state from before this field existed
      assignedWorkouts: saved.assignedWorkouts || [],
    };
    if (!_state.roster || _state.roster.length < 1) _state.roster = def.roster;
  }
}

export function saveState() { saveToStorage(STATE_KEY, _state); }

// ── SUBSCRIPTIONS ──────────────────────────────────────────────────────────────
export function subscribe(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

function notify() { _listeners.forEach(fn => fn(_state)); }

// ── GETTERS ────────────────────────────────────────────────────────────────────
export function getState()            { return _state; }
export function getRoster()           { return _state.roster; }
export function getWorkoutLog()       { return _state.workoutLog; }
export function getNutrition()        { return _state.nutrition; }
export function getAthleteProfile()   { return _state.athleteProfile; }
export function getDraftWorkout()     { return _state.draftWorkout; }
export function getBuilder()          { return _state.builder; }
export function getReadinessCheckIn() { return _state.readinessCheckIn; }

/**
 * getAssignedWorkouts — returns workouts assigned by a coach.
 *
 * Imported by solo/todayWorkout.js and solo/score.js. Solo athletes
 * have no coach, so this returns [] by default. When a solo athlete
 * joins a team in the future, assigned workouts will appear here.
 *
 * Each entry shape (set by coach tools, not yet implemented for solo):
 *   { id, title, exercises, assignedAt, dueDate, completed, rpeTarget }
 *
 * @returns {Array}
 */
export function getAssignedWorkouts() {
  return _state.assignedWorkouts || [];
}

// ── SETTERS ────────────────────────────────────────────────────────────────────
export function setState(patch, { silent = false } = {}) {
  Object.assign(_state, patch);
  if (!silent) notify();
  saveState();
}

export function patchBuilder(patch, { silent = false } = {}) {
  Object.assign(_state.builder, patch);
  if (!silent) notify();
  saveState();
}

export function patchProfile(patch) {
  Object.assign(_state.athleteProfile, patch);
  _recomputeNutritionTargets();
  notify();
  saveState();
}

export function patchReadinessCheckIn(patch) {
  Object.assign(_state.readinessCheckIn, patch);
  notify();
  saveState();
}

// ── NUTRITION TARGETS ──────────────────────────────────────────────────────────
function _recomputeNutritionTargets() {
  const p         = _state.athleteProfile;
  const weightLbs = parseFloat(p.weightLbs) || 160;
  const weightKg  = weightLbs * 0.4536;
  const phase     = p.compPhase     || 'in-season';
  const level     = p.trainingLevel || 'intermediate';
  const days      = parseInt(p.daysPerWeek) || 4;

  const proMultiplier = level === 'elite' ? 2.2 : level === 'advanced' ? 2.0 : level === 'intermediate' ? 1.8 : 1.6;
  const proG      = Math.round(weightKg * proMultiplier);
  const choBase   = phase === 'in-season' ? 7 : phase === 'pre-season' ? 6 : 5;
  const choAdjust = days >= 5 ? 1 : days >= 3 ? 0 : -1;
  const choG      = Math.round(weightKg * (choBase + choAdjust));
  const fatG      = Math.round(weightKg * 1.0);
  const cal       = Math.round((proG * 4) + (choG * 4) + (fatG * 9));

  _state.nutrition.targetMacros = { cal, pro: proG, cho: choG, fat: fatG };
}

// ── WORKOUT LOG ────────────────────────────────────────────────────────────────
export function addWorkoutLog(entry) {
  _state.workoutLog.push({ ...entry, ts: Date.now() });
  notify();
  saveState();
}

// ── COMPLETE ASSIGNMENT ────────────────────────────────────────────────────────
/**
 * completeAssignment — marks a workout log entry as completed.
 * Falls back to appending a new completed entry if no match found.
 */
export function completeAssignment(id = null, meta = {}) {
  const today = new Date().toDateString();
  let idx = -1;

  if (id) {
    idx = _state.workoutLog.findIndex(w => w.id === id);
  }

  if (idx === -1) {
    idx = _state.workoutLog.findLastIndex(w =>
      w.type !== 'checkin' &&
      w.completed !== true &&
      new Date(w.ts).toDateString() === today
    );
  }

  if (idx !== -1) {
    _state.workoutLog[idx] = {
      ..._state.workoutLog[idx],
      ...meta,
      completed:   true,
      completedAt: Date.now(),
    };
  } else {
    _state.workoutLog.push({
      id:          'w_' + Date.now(),
      type:        'workout',
      completed:   true,
      completedAt: Date.now(),
      ts:          Date.now(),
      avgRPE:      meta.avgRPE || 6,
      duration:    meta.duration || 45,
      ...meta,
    });
  }

  notify();
  saveState();
}

// ── CHECK-IN ───────────────────────────────────────────────────────────────────
export function addCheckIn(checkIn) {
  const today = new Date().toDateString();

  Object.assign(_state.readinessCheckIn, { ...checkIn, date: today });

  if (checkIn.mindsetScore !== undefined) {
    _state.athleteProfile.mindsetScore = checkIn.mindsetScore;
  }
  if (checkIn.hydration !== undefined) {
    _state.athleteProfile.hydrationOz = checkIn.hydration;
  }

  _state.workoutLog = _state.workoutLog.filter(w =>
    !(w.type === 'checkin' && new Date(w.ts).toDateString() === today)
  );
  _state.workoutLog.push({
    type:      'checkin',
    completed: true,
    ts:        Date.now(),
    avgRPE:    checkIn.energyLevel || 5,
    duration:  15,
    ...checkIn,
  });

  notify();
  saveState();
}

// ── NUTRITION — MEALS ──────────────────────────────────────────────────────────
export function addMeal(item) {
  const meal = {
    ...item,
    id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    ts: Date.now(),
  };
  _state.nutrition.meals.push(meal);
  _state.nutrition.macros.cal += meal.cal || 0;
  _state.nutrition.macros.pro += meal.pro || 0;
  _state.nutrition.macros.cho += meal.cho || 0;
  _state.nutrition.macros.fat += meal.fat || 0;
  notify();
  saveState();
}

export function removeMeal(id) {
  const idx = _state.nutrition.meals.findIndex(m => m.id === id);
  if (idx === -1) return;
  const m = _state.nutrition.meals[idx];
  _state.nutrition.macros.cal = Math.max(0, _state.nutrition.macros.cal - (m.cal || 0));
  _state.nutrition.macros.pro = Math.max(0, _state.nutrition.macros.pro - (m.pro || 0));
  _state.nutrition.macros.cho = Math.max(0, _state.nutrition.macros.cho - (m.cho || 0));
  _state.nutrition.macros.fat = Math.max(0, _state.nutrition.macros.fat - (m.fat || 0));
  _state.nutrition.meals.splice(idx, 1);
  notify();
  saveState();
}

export function resetState() {
  _state = defaultState();
  notify();
  saveState();
}
