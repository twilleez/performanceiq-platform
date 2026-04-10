/**
 * PerformanceIQ State — v7 (Error-4 fix)
 *
 * FIX [Error-4]: PIQ Score not updating after check-in saved.
 *
 * ROOT CAUSE: patchReadinessCheckIn() called notify() which fired internal
 * _listeners[], but the rendered views are NOT subscribed to those listeners —
 * they render once at mount and never re-compute.
 *
 * FIX: After patchReadinessCheckIn(), dispatch a DOM CustomEvent
 * 'piq:stateChanged' with a 'key' detail. Views that display live scores
 * listen for this event and update their DOM directly — no full re-render
 * needed, no navigation required.
 *
 * Also carries forward all P1-5 and P1-6 fixes from the QA pass.
 */

const STATE_KEY = 'piq_state_v7';

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveToStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function defaultState() {
  return {
    role: null,
    roster: [
      { id:'r1', name:'Jake Williams',   position:'PG', sport:'basketball', readiness:82, piq:79, streak:5,  weight:165, height:"6'0\"",  age:17, level:'advanced',    compPhase:'in-season' },
      { id:'r2', name:'Marcus Thompson', position:'SF', sport:'basketball', readiness:74, piq:85, streak:12, weight:185, height:"6'4\"",  age:17, level:'elite',       compPhase:'in-season' },
      { id:'r3', name:'Jamal Robinson',  position:'C',  sport:'basketball', readiness:91, piq:71, streak:3,  weight:220, height:"6'8\"",  age:16, level:'intermediate', compPhase:'in-season' },
      { id:'r4', name:'Devon Nguyen',    position:'SG', sport:'basketball', readiness:55, piq:68, streak:0,  weight:160, height:"5'11\"", age:15, level:'intermediate', compPhase:'in-season' },
      { id:'r5', name:'Aliyah Reeves',   position:'PF', sport:'basketball', readiness:88, piq:92, streak:8,  weight:155, height:"6'1\"",  age:18, level:'elite',       compPhase:'in-season' },
      { id:'r6', name:'Jordan Kim',      position:'PG', sport:'basketball', readiness:67, piq:76, streak:4,  weight:158, height:"5'10\"", age:16, level:'intermediate', compPhase:'in-season' },
      { id:'r7', name:'Taylor Santos',   position:'SF', sport:'basketball', readiness:78, piq:81, streak:6,  weight:175, height:"6'3\"",  age:17, level:'advanced',    compPhase:'in-season' },
      { id:'r8', name:'Casey Monroe',    position:'SG', sport:'basketball', readiness:63, piq:73, streak:2,  weight:175, height:"6'1\"",  age:16, level:'intermediate', compPhase:'in-season' },
    ],
    athleteProfile: {
      sport:'basketball', level:'high_school', team:'', goals:[], position:'', gradYear:'',
      age:'', weightLbs:'', heightFt:'', heightIn:'',
      trainingLevel:'intermediate', daysPerWeek:4, sleepHours:7,
      compPhase:'in-season', primaryGoal:'', secondaryGoals:[], injuryHistory:'none',
      mindsetScore:0, hydrationOz:0, pliabilityDone:false, recoveryNotes:'',
    },
    workoutLog:   [],
    draftWorkout: null,
    nutrition: {
      meals:[], macros:{ cal:0, pro:0, cho:0, fat:0 },
      targetMacros:{ cal:0, pro:0, cho:0, fat:0 }, mealPlan:null,
    },
    linkedAthlete: null,

    // [P1-6] Role-namespaced messages
    messages_coach:  [],
    messages_player: [],
    messages_parent: [],
    messages:        [], // legacy key

    builder:{ activeTab:'plan', pickerOpen:false, pickerFilter:'all', loadedTemplateId:null, draft:null },
    assignModal:{ open:false, pending:null },
    readinessCheckIn:{
      date:'', sleepHours:0, sleepQuality:0, energyLevel:0,
      soreness:0, mood:0, stressLevel:0, hydration:0, notes:'',
    },

    // [P1-5] New top-level keys — must be in defaultState so loadState merges them
    calendarEvents: null,
    adminTeams:     null,
    adminCoaches:   null,
    adminAthletes:  null,
    org:            null,
  };
}

let _state     = defaultState();
let _listeners = [];

// [Error-4 FIX] Dispatch DOM event so views can react to state changes
function _dispatch(key) {
  try {
    document.dispatchEvent(new CustomEvent('piq:stateChanged', { detail: { key } }));
  } catch (_) {}
}

export function loadState() {
  const saved = loadFromStorage(STATE_KEY);
  if (saved) {
    const def = defaultState();
    // [P1-5] Spread default first so all new keys are always present
    _state = {
      ...def,
      ...saved,
      athleteProfile:   { ...def.athleteProfile,   ...(saved.athleteProfile   || {}) },
      nutrition: {
        ...def.nutrition, ...(saved.nutrition || {}),
        macros:       { ...def.nutrition.macros,       ...(saved.nutrition?.macros       || {}) },
        targetMacros: { ...def.nutrition.targetMacros, ...(saved.nutrition?.targetMacros || {}) },
      },
      readinessCheckIn: { ...def.readinessCheckIn,  ...(saved.readinessCheckIn || {}) },
    };
    if (!_state.roster || _state.roster.length < 1) _state.roster = def.roster;
  }
}

export function saveState()  { saveToStorage(STATE_KEY, _state); }
export function subscribe(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}
function notify() { _listeners.forEach(fn => fn(_state)); }

export function getState()           { return _state; }
export function getRoster()          { return _state.roster; }
export function getWorkoutLog()      { return _state.workoutLog; }
export function getNutrition()       { return _state.nutrition; }
export function getAthleteProfile()  { return _state.athleteProfile; }
export function getDraftWorkout()    { return _state.draftWorkout; }
export function getBuilder()         { return _state.builder; }
export function getReadinessCheckIn(){ return _state.readinessCheckIn; }

// [P1-6] Role-scoped message helpers
export function getMessages(role) {
  const key = role === 'coach' ? 'messages_coach' : role === 'parent' ? 'messages_parent' : 'messages_player';
  return _state[key] || [];
}
export function setMessages(role, threads) {
  const key = role === 'coach' ? 'messages_coach' : role === 'parent' ? 'messages_parent' : 'messages_player';
  _state[key] = threads;
  saveState();
}

export function setState(patch, { silent = false } = {}) {
  Object.assign(_state, patch);
  if (!silent) { notify(); _dispatch('general'); }
  saveState();
}

export function patchBuilder(patch, { silent = false } = {}) {
  Object.assign(_state.builder, patch);
  if (!silent) { notify(); _dispatch('builder'); }
  saveState();
}

export function patchProfile(patch) {
  Object.assign(_state.athleteProfile, patch);
  _recomputeNutritionTargets();
  notify();
  _dispatch('profile');
  saveState();
}

/**
 * [Error-4 FIX] patchReadinessCheckIn
 * Now dispatches 'piq:stateChanged' with key='readiness' after saving.
 * Any view showing readiness or PIQ score listens for this event and
 * updates its displayed values without a full page re-render.
 */
export function patchReadinessCheckIn(patch) {
  Object.assign(_state.readinessCheckIn, patch);
  notify();
  saveState();
  // Dispatch AFTER save — views update their live score displays
  _dispatch('readiness');
}

// Nutrition targets recalculation (ISSN 2017)
function _recomputeNutritionTargets() {
  const p          = _state.athleteProfile;
  const weightLbs  = parseFloat(p.weightLbs) || 160;
  const weightKg   = weightLbs * 0.4536;
  const phase      = p.compPhase || 'in-season';
  const level      = p.trainingLevel || 'intermediate';
  const days       = parseInt(p.daysPerWeek) || 4;
  const proMult    = level==='elite'?2.2:level==='advanced'?2.0:level==='intermediate'?1.8:1.6;
  const proG       = Math.round(weightKg * proMult);
  const choBase    = phase==='in-season'?7:phase==='pre-season'?6:5;
  const choAdjust  = days>=5?1:days>=3?0:-1;
  const choG       = Math.round(weightKg * (choBase + choAdjust));
  const fatG       = Math.round(weightKg * 1.0);
  const cal        = Math.round((proG*4) + (choG*4) + (fatG*9));
  _state.nutrition.targetMacros = { cal, pro:proG, cho:choG, fat:fatG };
}

export function addWorkoutLog(entry) {
  _state.workoutLog.push({ ...entry, ts: Date.now() });
  notify();
  _dispatch('workoutLog');
  saveState();
}

export function addMeal(item) {
  _state.nutrition.meals.push({ ...item, ts: Date.now() });
  _state.nutrition.macros.cal += item.cal || 0;
  _state.nutrition.macros.pro += item.pro || 0;
  _state.nutrition.macros.cho += item.cho || 0;
  _state.nutrition.macros.fat += item.fat || 0;
  notify();
  _dispatch('nutrition');
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
  _dispatch('nutrition');
  saveState();
}

export function resetState() {
  _state = defaultState();
  notify();
  saveState();
}
