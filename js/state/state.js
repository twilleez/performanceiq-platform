/**
 * PerformanceIQ State v6
 * ─────────────────────────────────────────────────────────────
 * PHASE 2 UPGRADES:
 *
 *   checkInHistory[]  — every submitted check-in is appended here
 *     (max 90 entries, trimmed on save). Powers 30-day wellness
 *     trend charts and long-term readiness analysis.
 *
 *   piqHistory[]      — daily PIQ + readiness snapshots appended
 *     on each check-in save (max 90). Powers progress trend charts.
 *     Snapshot: { ts, date, piq, readiness, streak, acwr? }
 *
 *   addCheckIn()      — new write function that:
 *     1. Patches readinessCheckIn (current day's values)
 *     2. Appends to checkInHistory
 *     3. Records a piqHistory snapshot
 *
 *   addWorkoutLog()   — unchanged from v5, sRPE still auto-computed.
 *
 * Migration: v5 → v6 adds empty history arrays to existing saves.
 * All other state shape unchanged.
 */
import { loadFromStorage, saveToStorage } from '../services/storage.js';

const STATE_KEY  = 'piq_state_v6';
const LEGACY_V5  = 'piq_state_v5';
const LEGACY_V4  = 'piq_state_v4';

const MAX_HISTORY = 90; // days retained

function defaultState() {
  return {
    roster: [
      { id:1,  name:'Marcus T.',  position:'PG', sport:'basketball', readiness:88, piq:84, streak:6,  weight:185, height:"6'2\"",  age:17, level:'advanced',     compPhase:'in-season' },
      { id:2,  name:'Devon W.',   position:'SG', sport:'basketball', readiness:72, piq:79, streak:3,  weight:175, height:"6'1\"",  age:16, level:'intermediate', compPhase:'in-season' },
      { id:3,  name:'Jamal R.',   position:'SF', sport:'basketball', readiness:91, piq:90, streak:9,  weight:195, height:"6'5\"",  age:18, level:'elite',        compPhase:'in-season' },
      { id:4,  name:'Chris M.',   position:'PF', sport:'basketball', readiness:55, piq:71, streak:1,  weight:210, height:"6'6\"",  age:16, level:'intermediate', compPhase:'in-season' },
      { id:5,  name:'Tae S.',     position:'C',  sport:'basketball', readiness:83, piq:82, streak:5,  weight:225, height:"6'9\"",  age:17, level:'advanced',     compPhase:'in-season' },
      { id:6,  name:'Rondell B.', position:'PG', sport:'basketball', readiness:68, piq:76, streak:2,  weight:165, height:"5'11\"", age:15, level:'beginner',     compPhase:'in-season' },
      { id:7,  name:'Aliyah N.',  position:'SF', sport:'basketball', readiness:94, piq:92, streak:11, weight:155, height:"5'10\"", age:18, level:'elite',        compPhase:'in-season' },
      { id:8,  name:'Darius E.',  position:'SG', sport:'basketball', readiness:47, piq:65, streak:0,  weight:170, height:"6'0\"",  age:15, level:'beginner',     compPhase:'in-season' },
    ],
    athleteProfile: {
      sport:'basketball', level:'high_school', team:'', goals:[],
      position:'', gradYear:'', age:'', weightLbs:'', heightFt:'', heightIn:'',
      trainingLevel:'intermediate', daysPerWeek:4, sleepHours:7,
      compPhase:'in-season', primaryGoal:'', secondaryGoals:[],
      injuryHistory:'none', mindsetScore:0, hydrationOz:0,
      pliabilityDone:false, recoveryNotes:'',
    },
    workoutLog:   [],
    draftWorkout: null,
    nutrition: {
      meals:[], macros:{ cal:0, pro:0, cho:0, fat:0 },
      targetMacros:{ cal:0, pro:0, cho:0, fat:0 }, mealPlan:null,
    },
    linkedAthlete: null,
    messages:      [],
    builder: {
      activeTab:'plan', pickerOpen:false, pickerFilter:'all',
      loadedTemplateId:null, draft:null,
    },
    assignModal: { open:false, pending:null },

    // ── Current check-in (today's snapshot) ──────────────────
    readinessCheckIn: {
      date:'', quickScore:6,
      sleepQuality:0, energyLevel:0, soreness:0,
      mood:0, stressLevel:0, fatigueLevel:0,
      sleepHours:0, hydration:0, notes:'',
    },

    // ── Phase 2: history arrays ───────────────────────────────
    checkInHistory: [],  // [{ date, ts, sleepQuality, energyLevel, soreness, mood, stressLevel, fatigueLevel, readinessScore }]
    piqHistory:     [],  // [{ ts, date, piq, readiness, streak }]
  };
}

let _state    = defaultState();
let _listeners = [];

// ── LOAD / SAVE ───────────────────────────────────────────────

export function loadState() {
  const saved = loadFromStorage(STATE_KEY)
    || loadFromStorage(LEGACY_V5)
    || loadFromStorage(LEGACY_V4);

  if (saved) {
    const def = defaultState();
    _state = {
      ...def,
      ...saved,
      athleteProfile:   { ...def.athleteProfile,   ...(saved.athleteProfile   || {}) },
      nutrition:        {
        ...def.nutrition, ...(saved.nutrition || {}),
        macros:       { ...def.nutrition.macros,       ...(saved.nutrition?.macros       || {}) },
        targetMacros: { ...def.nutrition.targetMacros, ...(saved.nutrition?.targetMacros || {}) },
      },
      readinessCheckIn: {
        ...def.readinessCheckIn,
        ...(saved.readinessCheckIn || {}),
        fatigueLevel: saved.readinessCheckIn?.fatigueLevel ?? 0,
      },
      // Phase 2: migrate — add empty arrays if absent in old saves
      checkInHistory: saved.checkInHistory || [],
      piqHistory:     saved.piqHistory     || [],
    };
    if (!_state.roster?.length) _state.roster = def.roster;
    // Back-fill sRPE on any old log entries
    _state.workoutLog = (_state.workoutLog || []).map(e => ({
      ...e,
      sRPE: e.sRPE ?? ((e.avgRPE || 5) * (e.duration || 30)),
    }));
  }
}

export function saveState()   { saveToStorage(STATE_KEY, _state); }
export function subscribe(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}
function notify() { _listeners.forEach(fn => fn(_state)); }

// ── READS ─────────────────────────────────────────────────────
export function getState()            { return _state; }
export function getRoster()           { return _state.roster; }
export function getWorkoutLog()       { return _state.workoutLog; }
export function getNutrition()        { return _state.nutrition; }
export function getAthleteProfile()   { return _state.athleteProfile; }
export function getReadinessCheckIn() { return _state.readinessCheckIn; }
export function getDraftWorkout()     { return _state.draftWorkout; }
export function getBuilder()          { return _state.builder; }
export function getCheckInHistory()   { return _state.checkInHistory; }
export function getPIQHistory()       { return _state.piqHistory; }

export function getRosterAthlete(id) {
  return _state.roster.find(a => a.id === id) || _state.roster[0] || null;
}

// ── WRITES ────────────────────────────────────────────────────

/**
 * addCheckIn — Phase 2 upgrade to patchReadinessCheckIn.
 * Patches today's check-in AND appends to history arrays.
 * Called by readiness views instead of patchReadinessCheckIn directly.
 *
 * Also writes a piqHistory snapshot so progress views can chart
 * PIQ + readiness trends without re-computing the full engine
 * retroactively.
 */
export function addCheckIn(fields, { piqSnapshot = null } = {}) {
  const today = new Date().toDateString();
  const ts    = Date.now();

  // 1. Patch current check-in
  _state.readinessCheckIn = { ..._state.readinessCheckIn, ...fields, date: today };

  // 2. Append to check-in history (upsert by date — only one per day)
  const histEntry = { ...fields, date: today, ts };
  _state.checkInHistory = [
    ..._state.checkInHistory.filter(h => h.date !== today),
    histEntry,
  ].slice(-MAX_HISTORY);

  // 3. Append PIQ snapshot if provided
  if (piqSnapshot) {
    const snap = { ...piqSnapshot, date: today, ts };
    _state.piqHistory = [
      ..._state.piqHistory.filter(h => h.date !== today),
      snap,
    ].slice(-MAX_HISTORY);
  }

  saveState();
  notify();
}

/** Legacy compatibility — still works, just doesn't write history */
export function patchReadinessCheckIn(fields) {
  _state.readinessCheckIn = { ..._state.readinessCheckIn, ...fields };
  saveState();
  notify();
}

/**
 * addWorkoutLog — auto-computes sRPE = RPE × duration.
 * Optionally snapshots today's PIQ alongside the session.
 */
export function addWorkoutLog(entry) {
  const full = {
    id:          Date.now(),
    ts:          Date.now(),
    name:        entry.name        || 'Workout Session',
    sessionType: entry.sessionType || 'general',
    duration:    entry.duration    || 30,
    avgRPE:      entry.avgRPE      || 5,
    sRPE:        (entry.avgRPE || 5) * (entry.duration || 30),
    completed:   entry.completed   ?? true,
    notes:       entry.notes       || '',
    ...entry,
  };
  _state.workoutLog = [..._state.workoutLog, full];
  saveState();
  notify();
}

export function patchProfile(fields) {
  _state.athleteProfile = { ..._state.athleteProfile, ...fields };
  saveState();
  notify();
}

export function patchBuilder(fields) {
  _state.builder = { ..._state.builder, ...fields };
  saveState();
  notify();
}

export function patchNutrition(fields) {
  _state.nutrition = { ..._state.nutrition, ...fields };
  saveState();
  notify();
}

export function addMeal(meal) {
  const meals = [...(_state.nutrition?.meals || []), { id: Date.now(), ...meal }];
  _state.nutrition = { ..._state.nutrition, meals };
  saveState();
  notify();
}

export function removeMeal(id) {
  const meals = (_state.nutrition?.meals || []).filter(m => m.id !== id);
  _state.nutrition = { ..._state.nutrition, meals };
  saveState();
  notify();
}

export function setState(patch, { silent = false } = {}) {
  Object.assign(_state, patch);
  if (!silent) notify();
  saveState();
}

export function resetState() {
  _state = defaultState();
  saveState();
  notify();
}
