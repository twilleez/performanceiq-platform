/**
 * PerformanceIQ State v4
 * Root STATE shape + reactive store (no framework dependencies).
 * Expanded athlete profile for accurate PIQ scoring.
 */
import { loadFromStorage, saveToStorage } from '../services/storage.js';
const STATE_KEY = 'piq_state_v4';
// ── DEFAULT STATE ─────────────────────────────────────────────
function defaultState() {
  return {
    roster: [
      { id: 1,  name: 'Marcus T.',  position: 'PG', sport: 'basketball', readiness: 88, piq: 84, streak: 6,  weight: 185, height: "6'2\"", age: 17, level: 'advanced',     compPhase: 'in-season' },
      { id: 2,  name: 'Devon W.',   position: 'SG', sport: 'basketball', readiness: 72, piq: 79, streak: 3,  weight: 175, height: "6'1\"", age: 16, level: 'intermediate', compPhase: 'in-season' },
      { id: 3,  name: 'Jamal R.',   position: 'SF', sport: 'basketball', readiness: 91, piq: 90, streak: 9,  weight: 195, height: "6'5\"", age: 18, level: 'elite',        compPhase: 'in-season' },
      { id: 4,  name: 'Chris M.',   position: 'PF', sport: 'basketball', readiness: 55, piq: 71, streak: 1,  weight: 210, height: "6'6\"", age: 16, level: 'intermediate', compPhase: 'in-season' },
      { id: 5,  name: 'Tae S.',     position: 'C',  sport: 'basketball', readiness: 83, piq: 82, streak: 5,  weight: 225, height: "6'9\"", age: 17, level: 'advanced',     compPhase: 'in-season' },
      { id: 6,  name: 'Rondell B.', position: 'PG', sport: 'basketball', readiness: 68, piq: 76, streak: 2,  weight: 165, height: "5'11\"", age: 15, level: 'beginner',    compPhase: 'in-season' },
      { id: 7,  name: 'Aliyah N.',  position: 'SF', sport: 'basketball', readiness: 94, piq: 92, streak: 11, weight: 155, height: "5'10\"", age: 18, level: 'elite',       compPhase: 'in-season' },
      { id: 8,  name: 'Darius E.',  position: 'SG', sport: 'basketball', readiness: 47, piq: 65, streak: 0,  weight: 170, height: "6'0\"", age: 15, level: 'beginner',     compPhase: 'in-season' },
      { id: 9,  name: 'Kenji L.',   position: 'C',  sport: 'basketball', readiness: 87, piq: 86, streak: 7,  weight: 230, height: "6'8\"", age: 17, level: 'advanced',     compPhase: 'in-season' },
      { id: 10, name: 'Tre P.',     position: 'PF', sport: 'basketball', readiness: 79, piq: 80, streak: 4,  weight: 200, height: "6'4\"", age: 16, level: 'intermediate', compPhase: 'in-season' },
      { id: 11, name: 'Simone H.',  position: 'PG', sport: 'basketball', readiness: 92, piq: 89, streak: 8,  weight: 145, height: "5'8\"", age: 18, level: 'elite',        compPhase: 'in-season' },
      { id: 12, name: 'Zach O.',    position: 'SG', sport: 'basketball', readiness: 63, piq: 73, streak: 2,  weight: 175, height: "6'1\"", age: 16, level: 'intermediate', compPhase: 'in-season' },
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
      meals: [], macros: { cal: 0, pro: 0, cho: 0, fat: 0 },
      targetMacros: { cal: 0, pro: 0, cho: 0, fat: 0 }, mealPlan: null,
    },
    linkedAthlete: null,
    messages: [],
    builder: { activeTab: 'plan', pickerOpen: false, pickerFilter: 'all', loadedTemplateId: null, draft: null },
    assignModal: { open: false, pending: null },
    readinessCheckIn: {
      date: '', sleepHours: 0, sleepQuality: 0, energyLevel: 0,
      soreness: 0, mood: 0, stressLevel: 0, hydration: 0, notes: '',
    },
  };
}
let _state = defaultState();
let _listeners = [];
export function loadState() {
  const saved = loadFromStorage(STATE_KEY);
  if (saved) {
    const def = defaultState();
    _state = {
      ...def, ...saved,
      athleteProfile: { ...def.athleteProfile, ...(saved.athleteProfile || {}) },
      nutrition: {
        ...def.nutrition, ...(saved.nutrition || {}),
        macros: { ...def.nutrition.macros, ...(saved.nutrition?.macros || {}) },
        targetMacros: { ...def.nutrition.targetMacros, ...(saved.nutrition?.targetMacros || {}) },
      },
      readinessCheckIn: { ...def.readinessCheckIn, ...(saved.readinessCheckIn || {}) },
    };
    if (!_state.roster || _state.roster.length < 1) _state.roster = def.roster;
  }
}
export function saveState() { saveToStorage(STATE_KEY, _state); }
export function subscribe(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}
function notify() { _listeners.forEach(fn => fn(_state)); }
export function getState()   { return _state; }
export function getRoster()  { return _state.roster; }
export function getWorkoutLog() { return _state.workoutLog; }
export function getNutrition()  { return _state.nutrition; }
export function getAthleteProfile() { return _state.athleteProfile; }
export function getDraftWorkout()   { return _state.draftWorkout; }
export function getBuilder()        { return _state.builder; }
export function getReadinessCheckIn() { return _state.readinessCheckIn; }
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
// Nutrition targets: ISSN position stand + Kelsey Poulter fueling principles
function _recomputeNutritionTargets() {
  const p = _state.athleteProfile;
  const weightLbs = parseFloat(p.weightLbs) || 160;
  const weightKg  = weightLbs * 0.4536;
  const phase = p.compPhase || 'in-season';
  const level = p.trainingLevel || 'intermediate';
  const days  = parseInt(p.daysPerWeek) || 4;
  const proMultiplier = level === 'elite' ? 2.2 : level === 'advanced' ? 2.0 : level === 'intermediate' ? 1.8 : 1.6;
  const proG = Math.round(weightKg * proMultiplier);
  const choBase = phase === 'in-season' ? 7 : phase === 'pre-season' ? 6 : 5;
  const choAdjust = days >= 5 ? 1 : days >= 3 ? 0 : -1;
  const choG = Math.round(weightKg * (choBase + choAdjust));
  const fatG = Math.round(weightKg * 1.0);
  const cal  = Math.round((proG * 4) + (choG * 4) + (fatG * 9));
  _state.nutrition.targetMacros = { cal, pro: proG, cho: choG, fat: fatG };
}
export function addWorkoutLog(entry) {
  _state.workoutLog.push({ ...entry, ts: Date.now() });
  notify();
  saveState();
}
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
export function resetState() {
  _state = defaultState();
  notify();
  saveState();
}
