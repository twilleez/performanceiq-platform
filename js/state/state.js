/**
 * PerformanceIQ State v7
 * ─────────────────────────────────────────────────────────────
 * PHASE 3 UPGRADES:
 *
 *   messages[]       — persisted thread + message store
 *     Each thread: { id, participants[], subject, unread, messages[] }
 *     Each message: { id, from, body, ts, read }
 *     addMessage(threadId, from, body)  — appends to thread, marks unread
 *     getThread(id)                    — returns single thread
 *     markThreadRead(id)               — clears unread flag
 *
 *   assignedWorkouts[] — coach-assigned sessions per athlete
 *     { id, ts, athleteId, coachId, title, sessionType, exercises[],
 *       dueDate, notes, completed, completedTs }
 *     assignWorkout(payload)   — creates assignment
 *     completeAssignment(id)   — athlete marks done (updates compliance)
 *     getAssignmentsFor(athleteId) — returns athlete's queue
 *
 * Migration: v6 → v7 adds empty arrays if absent.
 */
import { loadFromStorage, saveToStorage } from '../services/storage.js';

const STATE_KEY  = 'piq_state_v7';
const LEGACY_KEYS = ['piq_state_v6', 'piq_state_v5', 'piq_state_v4'];
const MAX_HISTORY = 90;

// ── SEED DATA ─────────────────────────────────────────────────
function _seedMessages() {
  return [
    {
      id: 'thread-team',
      subject: 'Team Channel',
      icon: '👥',
      participants: ['coach', 'all'],
      unread: 2,
      messages: [
        { id: 'm1', from: 'Coach Alex', body: 'Practice tomorrow at 4:00 PM sharp. Bring your gear.', ts: Date.now() - 7200000, read: true },
        { id: 'm2', from: 'Coach Alex', body: 'Full intensity today — readiness scores look great across the board.', ts: Date.now() - 3600000, read: false },
        { id: 'm3', from: 'Coach Alex', body: 'Remember: log your sRPE right after sessions. It powers the ACWR engine.', ts: Date.now() - 600000, read: false },
      ],
    },
    {
      id: 'thread-coach-player',
      subject: 'Coach Alex Morgan',
      icon: '🎽',
      participants: ['coach', 'player'],
      unread: 1,
      messages: [
        { id: 'm4', from: 'You', body: 'Coach, my left hamstring has been tight after yesterday\'s session.', ts: Date.now() - 5400000, read: true },
        { id: 'm5', from: 'Coach Alex', body: 'Good heads up. Drop intensity to RPE 6 today and add extra pliability work. Log it as Recovery.', ts: Date.now() - 3000000, read: false },
      ],
    },
    {
      id: 'thread-parent',
      subject: 'Team Parents',
      icon: '👨‍👩‍👦',
      participants: ['parent', 'coach'],
      unread: 0,
      messages: [
        { id: 'm6', from: 'Parent Group', body: 'Can someone share the Saturday game schedule? We need to arrange carpools.', ts: Date.now() - 86400000, read: true },
        { id: 'm7', from: 'Coach Alex', body: 'Game Saturday at 2 PM, away at Jefferson High. Bus leaves at 12:30.', ts: Date.now() - 82800000, read: true },
      ],
    },
  ];
}

function _seedAssignedWorkouts() {
  return [];   // starts empty — coach creates these via program builder
}

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
    workoutLog:       [],
    draftWorkout:     null,
    nutrition: {
      meals:[], macros:{ cal:0, pro:0, cho:0, fat:0 },
      targetMacros:{ cal:0, pro:0, cho:0, fat:0 }, mealPlan:null,
    },
    linkedAthlete:    null,
    builder: {
      activeTab:'plan', pickerOpen:false, pickerFilter:'all',
      loadedTemplateId:null, draft:null,
    },
    assignModal: { open:false, pending:null },
    readinessCheckIn: {
      date:'', quickScore:6,
      sleepQuality:0, energyLevel:0, soreness:0,
      mood:0, stressLevel:0, fatigueLevel:0,
      sleepHours:0, hydration:0, notes:'',
    },
    checkInHistory:    [],
    piqHistory:        [],
    // ── Phase 3 ────────────────────────────────────────────────
    messages:          _seedMessages(),
    assignedWorkouts:  _seedAssignedWorkouts(),
  };
}

let _state    = defaultState();
let _listeners = [];

// ── LOAD / SAVE ───────────────────────────────────────────────
export function loadState() {
  let saved = loadFromStorage(STATE_KEY);
  if (!saved) {
    for (const k of LEGACY_KEYS) {
      saved = loadFromStorage(k);
      if (saved) break;
    }
  }
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
      readinessCheckIn: { ...def.readinessCheckIn, ...(saved.readinessCheckIn || {}), fatigueLevel: saved.readinessCheckIn?.fatigueLevel ?? 0 },
      checkInHistory:   saved.checkInHistory   || [],
      piqHistory:       saved.piqHistory       || [],
      // Phase 3: migrate — seed if absent
      messages:         saved.messages?.length     ? saved.messages         : def.messages,
      assignedWorkouts: saved.assignedWorkouts      ? saved.assignedWorkouts : def.assignedWorkouts,
    };
    if (!_state.roster?.length) _state.roster = def.roster;
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
export function getMessages()         { return _state.messages; }
export function getAssignedWorkouts() { return _state.assignedWorkouts; }

export function getRosterAthlete(id) {
  return _state.roster.find(a => a.id === id) || _state.roster[0] || null;
}

export function getThread(threadId) {
  return _state.messages.find(t => t.id === threadId) || null;
}

export function getAssignmentsFor(athleteId) {
  return _state.assignedWorkouts.filter(w => w.athleteId === athleteId);
}

export function getUnreadCount() {
  return _state.messages.reduce((s, t) => s + (t.unread || 0), 0);
}

// ── WRITES ────────────────────────────────────────────────────

/**
 * addMessage — append a message to a thread.
 * Creates thread if it doesn't exist.
 * Marks thread as having 1 unread for the recipient.
 */
export function addMessage(threadId, from, body) {
  const msg = { id: 'm' + Date.now(), from, body, ts: Date.now(), read: false };
  _state.messages = _state.messages.map(t => {
    if (t.id !== threadId) return t;
    return {
      ...t,
      messages: [...t.messages, msg],
      unread: from === 'You' ? t.unread : (t.unread || 0) + 1,
    };
  });
  saveState();
  notify();
  return msg;
}

/**
 * markThreadRead — clears unread count for a thread.
 */
export function markThreadRead(threadId) {
  _state.messages = _state.messages.map(t =>
    t.id === threadId ? { ...t, unread: 0, messages: t.messages.map(m => ({ ...m, read: true })) } : t
  );
  saveState();
  notify();
}

/**
 * assignWorkout — coach assigns a workout to one or more athletes.
 * Each athleteId gets its own assignment record.
 */
export function assignWorkout(payload) {
  const { athleteIds = [], title, sessionType, exercises, dueDate, notes, coachName } = payload;
  const newAssignments = athleteIds.map(athleteId => ({
    id:           'assign-' + Date.now() + '-' + athleteId,
    ts:           Date.now(),
    athleteId,
    coachName:    coachName || 'Coach',
    title:        title || 'Assigned Session',
    sessionType:  sessionType || 'general',
    exercises:    exercises || [],
    dueDate:      dueDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    notes:        notes || '',
    completed:    false,
    completedTs:  null,
  }));
  _state.assignedWorkouts = [..._state.assignedWorkouts, ...newAssignments];
  saveState();
  notify();
  return newAssignments;
}

/**
 * completeAssignment — athlete marks an assigned workout done.
 * This also fires addWorkoutLog so sRPE feeds the ACWR engine.
 */
export function completeAssignment(assignmentId, { avgRPE = 6, duration = 45, notes = '' } = {}) {
  _state.assignedWorkouts = _state.assignedWorkouts.map(w => {
    if (w.id !== assignmentId) return w;
    return { ...w, completed: true, completedTs: Date.now() };
  });
  // Log as a workout entry so it feeds the ACWR engine
  const assignment = _state.assignedWorkouts.find(w => w.id === assignmentId);
  if (assignment) {
    const entry = {
      id:          Date.now(),
      ts:          Date.now(),
      name:        assignment.title,
      sessionType: assignment.sessionType,
      duration,
      avgRPE,
      sRPE:        avgRPE * duration,
      completed:   true,
      notes,
    };
    _state.workoutLog = [..._state.workoutLog, entry];
  }
  saveState();
  notify();
}

export function addCheckIn(fields, { piqSnapshot = null } = {}) {
  const today = new Date().toDateString();
  const ts    = Date.now();
  _state.readinessCheckIn = { ..._state.readinessCheckIn, ...fields, date: today };
  const histEntry = { ...fields, date: today, ts };
  _state.checkInHistory = [
    ..._state.checkInHistory.filter(h => h.date !== today),
    histEntry,
  ].slice(-MAX_HISTORY);
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

export function patchReadinessCheckIn(fields) {
  _state.readinessCheckIn = { ..._state.readinessCheckIn, ...fields };
  saveState();
  notify();
}

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
