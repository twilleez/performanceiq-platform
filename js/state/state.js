/**
 * PerformanceIQ State  (remediated)
 *
 * Changes from prior version:
 *   1. addMeal() now stamps each meal with a unique `id` field
 *      (separate from `ts` which may collide on rapid additions).
 *   2. removeMeal() now accepts a meal `id` string and uses findIndex()
 *      to locate the item — not an array index. This prevents stale-index
 *      bugs where removing item N shifts all subsequent items, causing the
 *      next deletion to hit the wrong meal and corrupt running macro totals.
 *   3. All other state behaviour is unchanged.
 *
 * IMPORTANT for view authors:
 *   When rendering a meal list and wiring a delete button, pass `meal.id`
 *   (not the loop index `i`) to removeMeal():
 *
 *     meals.map(m => `<button onclick="removeMeal('${m.id}')">✕</button>`)
 *
 *   meal.id is set by addMeal() and persisted to localStorage.
 */

import { loadFromStorage, saveToStorage } from '../services/storage.js';

const STATE_KEY = 'piq_state_v2';

// ── DEFAULT STATE ──────────────────────────────────────────────────────────────
function defaultState() {
  return {
    theme: 'dark',
    roster: [
      { id: 'a1', name: 'Jake Williams',  position: 'PG', sport: 'basketball', readiness: 82, piq: 84, streak: 6,  weight: 185, height: "6'2\"", age: 17, level: 'advanced',      compPhase: 'in-season' },
      { id: 'a2', name: 'Marcus Thompson',position: 'SF', sport: 'basketball', readiness: 71, piq: 78, streak: 4,  weight: 195, height: "6'5\"", age: 17, level: 'advanced',      compPhase: 'in-season' },
      { id: 'a3', name: 'Devon Nichols',  position: 'PF', sport: 'basketball', readiness: 55, piq: 68, streak: 1,  weight: 210, height: "6'7\"", age: 16, level: 'intermediate',   compPhase: 'in-season' },
      { id: 'a4', name: 'Aliyah Reeves',  position: 'SG', sport: 'basketball', readiness: 63, piq: 73, streak: 2,  weight: 175, height: "6'1\"", age: 16, level: 'intermediate',   compPhase: 'in-season' },
    ],
    athleteProfile: {
      sport: 'basketball', level: 'high_school', team: '', goals: [], position: '', gradYear: '',
      age: '', weightLbs: '', heightFt: '', heightIn: '',
      trainingLevel: 'intermediate', daysPerWeek: 4, sleepHours: 7,
      compPhase: 'in-season', primaryGoal: '', secondaryGoals: [], injuryHistory: 'none',
      mindsetScore: 0, hydrationOz: 0, pliabilityDone: false, recoveryNotes: '',
    },
    workoutLog: [],
    draftWorkout: null,
    nutrition: {
      meals: [],
      macros: { cal: 0, pro: 0, cho: 0, fat: 0 },
      targetMacros: { cal: 0, pro: 0, cho: 0, fat: 0 },
      mealPlan: null,
    },
    linkedAthlete: null,
    messages: [],
    builder: {
      activeTab: 'plan', pickerOpen: false, pickerFilter: 'all',
      loadedTemplateId: null, draft: null,
    },
    assignModal: { open: false, pending: null },
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
      athleteProfile: { ...def.athleteProfile, ...(saved.athleteProfile || {}) },
      nutrition: {
        ...def.nutrition, ...(saved.nutrition || {}),
        macros:       { ...def.nutrition.macros,       ...(saved.nutrition?.macros       || {}) },
        targetMacros: { ...def.nutrition.targetMacros, ...(saved.nutrition?.targetMacros || {}) },
      },
      readinessCheckIn: { ...def.readinessCheckIn, ...(saved.readinessCheckIn || {}) },
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
// Based on: ISSN Position Stand 2017 + Thomas, Erdman & Burke 2016 (AND/DC/ACSM)
function _recomputeNutritionTargets() {
  const p          = _state.athleteProfile;
  const weightLbs  = parseFloat(p.weightLbs) || 160;
  const weightKg   = weightLbs * 0.4536;
  const phase      = p.compPhase      || 'in-season';
  const level      = p.trainingLevel  || 'intermediate';
  const days       = parseInt(p.daysPerWeek) || 4;

  // Protein: 1.6–2.2 g/kg depending on training level (ISSN 2017)
  const proMultiplier = level === 'elite' ? 2.2 : level === 'advanced' ? 2.0 : level === 'intermediate' ? 1.8 : 1.6;
  const proG = Math.round(weightKg * proMultiplier);

  // Carbohydrate: periodised by phase + volume (Thomas et al. 2016)
  const choBase    = phase === 'in-season' ? 7 : phase === 'pre-season' ? 6 : 5;
  const choAdjust  = days >= 5 ? 1 : days >= 3 ? 0 : -1;
  const choG       = Math.round(weightKg * (choBase + choAdjust));

  // Fat: ~1.0 g/kg — supports hormonal function and fat-soluble vitamins
  const fatG = Math.round(weightKg * 1.0);

  const cal = Math.round((proG * 4) + (choG * 4) + (fatG * 9));
  _state.nutrition.targetMacros = { cal, pro: proG, cho: choG, fat: fatG };
}

// ── WORKOUT LOG ────────────────────────────────────────────────────────────────
export function addWorkoutLog(entry) {
  _state.workoutLog.push({ ...entry, ts: Date.now() });
  notify();
  saveState();
}

// ── NUTRITION — MEALS ──────────────────────────────────────────────────────────

/**
 * Add a meal to the log.
 * Each meal receives a stable `id` (string) used for deletion.
 * The `ts` field is also set for display/sorting purposes.
 */
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

/**
 * Remove a meal by its stable `id` string — NOT by array index.
 *
 * Using array index was a bug: removing item at index N shifts all subsequent
 * items down, so the next deletion would hit a different meal and subtract
 * the wrong macro values from the running totals, corrupting them permanently
 * until a full state reset.
 *
 * @param {string} id  — the meal.id string set by addMeal()
 */
export function removeMeal(id) {
  const idx = _state.nutrition.meals.findIndex(m => m.id === id);
  if (idx === -1) return; // already gone — no-op

  const m = _state.nutrition.meals[idx];
  _state.nutrition.macros.cal -= m.cal || 0;
  _state.nutrition.macros.pro -= m.pro || 0;
  _state.nutrition.macros.cho -= m.cho || 0;
  _state.nutrition.macros.fat -= m.fat || 0;

  // Clamp to zero — floating-point drift can push values slightly negative
  _state.nutrition.macros.cal = Math.max(0, _state.nutrition.macros.cal);
  _state.nutrition.macros.pro = Math.max(0, _state.nutrition.macros.pro);
  _state.nutrition.macros.cho = Math.max(0, _state.nutrition.macros.cho);
  _state.nutrition.macros.fat = Math.max(0, _state.nutrition.macros.fat);

  _state.nutrition.meals.splice(idx, 1);
  notify();
  saveState();
}

export function resetState() {
  _state = defaultState();
  notify();
  saveState();
}
