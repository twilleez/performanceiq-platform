/**
 * PerformanceIQ State
 * Root STATE shape + reactive store (no framework dependencies).
 */

import { loadFromStorage, saveToStorage } from '../services/storage.js';

const STATE_KEY = 'piq_state_v3';

// ── DEFAULT STATE ─────────────────────────────────────────────
function defaultState() {
  return {
    // Roster — used by coach dashboard
    roster: [
      { id: 1,  name: 'Marcus T.',  position: 'PG', sport: 'basketball', readiness: 88, piq: 84, streak: 6 },
      { id: 2,  name: 'Devon W.',   position: 'SG', sport: 'basketball', readiness: 72, piq: 79, streak: 3 },
      { id: 3,  name: 'Jamal R.',   position: 'SF', sport: 'basketball', readiness: 91, piq: 90, streak: 9 },
      { id: 4,  name: 'Chris M.',   position: 'PF', sport: 'basketball', readiness: 55, piq: 71, streak: 1 },
      { id: 5,  name: 'Tae S.',     position: 'C',  sport: 'basketball', readiness: 83, piq: 82, streak: 5 },
      { id: 6,  name: 'Rondell B.', position: 'PG', sport: 'basketball', readiness: 68, piq: 76, streak: 2 },
      { id: 7,  name: 'Aliyah N.',  position: 'SF', sport: 'basketball', readiness: 94, piq: 92, streak: 11 },
      { id: 8,  name: 'Darius E.',  position: 'SG', sport: 'basketball', readiness: 47, piq: 65, streak: 0 },
      { id: 9,  name: 'Kenji L.',   position: 'C',  sport: 'basketball', readiness: 87, piq: 86, streak: 7 },
      { id: 10, name: 'Tre P.',     position: 'PF', sport: 'basketball', readiness: 79, piq: 80, streak: 4 },
      { id: 11, name: 'Simone H.',  position: 'PG', sport: 'basketball', readiness: 92, piq: 89, streak: 8 },
      { id: 12, name: 'Zach O.',    position: 'SG', sport: 'basketball', readiness: 63, piq: 73, streak: 2 },
    ],

    // Athlete profile (player / solo)
    athleteProfile: {
      sport: 'basketball',
      level: 'high_school',
      team:  '',
      goals: [],
      position: '',
      gradYear: '',
    },

    // Workout log — array of session objects
    workoutLog: [],

    // Current draft workout (builder)
    draftWorkout: null,

    // Nutrition
    nutrition: {
      meals:  [],
      macros: { cal: 0, pro: 0, cho: 0, fat: 0 },
    },

    // Linked athlete (parent role)
    linkedAthlete: null,

    // Messages
    messages: [],

    // Builder state
    builder: {
      activeTab:        'plan',
      pickerOpen:       false,
      pickerFilter:     'all',
      loadedTemplateId: null,
      draft:            null,
    },

    // Assign modal
    assignModal: {
      open:    false,
      pending: null,
    },
  };
}

// ── STORE ─────────────────────────────────────────────────────
let _state    = defaultState();
let _listeners = [];

// ── LOAD / SAVE ───────────────────────────────────────────────
export function loadState() {
  const saved = loadFromStorage(STATE_KEY);
  if (saved) {
    // Merge — new fields in defaultState() win for missing keys
    _state = Object.assign(defaultState(), saved);
    // Ensure roster is always full
    if (!_state.roster || _state.roster.length < 1) {
      _state.roster = defaultState().roster;
    }
  }
}

export function saveState() {
  saveToStorage(STATE_KEY, _state);
}

// ── SUBSCRIBE ─────────────────────────────────────────────────
export function subscribe(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

function notify() {
  _listeners.forEach(fn => fn(_state));
}

// ── GET / SET ─────────────────────────────────────────────────
export function getState()   { return _state; }
export function getRoster()  { return _state.roster; }
export function getWorkoutLog() { return _state.workoutLog; }
export function getNutrition()  { return _state.nutrition; }
export function getAthleteProfile() { return _state.athleteProfile; }
export function getDraftWorkout()   { return _state.draftWorkout; }
export function getBuilder()        { return _state.builder; }

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
  notify();
  saveState();
}

// ── WORKOUT LOG ───────────────────────────────────────────────
export function addWorkoutLog(entry) {
  _state.workoutLog.push({ ...entry, ts: Date.now() });
  notify();
  saveState();
}

// ── NUTRITION ─────────────────────────────────────────────────
export function addMeal(item) {
  _state.nutrition.meals.push({ ...item, ts: Date.now() });
  _state.nutrition.macros.cal += item.cal || 0;
  _state.nutrition.macros.pro += item.pro || 0;
  _state.nutrition.macros.cho += item.cho || 0;
  _state.nutrition.macros.fat += item.fat || 0;
  notify();
  saveState();
}

export function removeMeal(idx) {
  const m = _state.nutrition.meals[idx];
  if (!m) return;
  _state.nutrition.macros.cal -= m.cal || 0;
  _state.nutrition.macros.pro -= m.pro || 0;
  _state.nutrition.macros.cho -= m.cho || 0;
  _state.nutrition.macros.fat -= m.fat || 0;
  _state.nutrition.meals.splice(idx, 1);
  notify();
  saveState();
}

// ── RESET ─────────────────────────────────────────────────────
export function resetState() {
  _state = defaultState();
  notify();
  saveState();
}
