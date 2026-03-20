/**
 * PerformanceIQ State v4
 * Root store — provided by your uploaded source files.
 * This stub satisfies imports while the real file is in place.
 */
import { loadFromStorage, saveToStorage } from '../services/storage.js';

const STATE_KEY = 'piq_state_v4';

function defaultState() {
  return {
    roster: [
      {id:1,name:'Marcus T.',position:'PG',sport:'basketball',readiness:88,piq:84,streak:6,weight:185,height:"6'2\"",age:17,level:'advanced',compPhase:'in-season'},
      {id:2,name:'Devon W.',position:'SG',sport:'basketball',readiness:72,piq:79,streak:3,weight:175,height:"6'1\"",age:16,level:'intermediate',compPhase:'in-season'},
      {id:3,name:'Jamal R.',position:'SF',sport:'basketball',readiness:91,piq:90,streak:9,weight:195,height:"6'5\"",age:18,level:'elite',compPhase:'in-season'},
      {id:4,name:'Chris M.',position:'PF',sport:'basketball',readiness:55,piq:71,streak:1,weight:210,height:"6'6\"",age:16,level:'intermediate',compPhase:'in-season'},
      {id:5,name:'Tae S.',position:'C',sport:'basketball',readiness:83,piq:82,streak:5,weight:225,height:"6'9\"",age:17,level:'advanced',compPhase:'in-season'},
    ],
    athleteProfile: {
      sport:'basketball',level:'high_school',team:'',goals:[],position:'',gradYear:'',
      age:'',weightLbs:'',heightFt:'',heightIn:'',
      trainingLevel:'intermediate',daysPerWeek:4,sleepHours:7,
      compPhase:'in-season',primaryGoal:'',secondaryGoals:[],injuryHistory:'none',
      mindsetScore:0,hydrationOz:0,pliabilityDone:false,recoveryNotes:'',
    },
    workoutLog: [],
    draftWorkout: null,
    nutrition: { meals:[], macros:{cal:0,pro:0,cho:0,fat:0}, targetMacros:{cal:0,pro:0,cho:0,fat:0}, mealPlan:null },
    linkedAthlete: null,
    messages: [],
    builder: { activeTab:'plan', pickerOpen:false, pickerFilter:'all', loadedTemplateId:null, draft:null },
    assignModal: { open:false, pending:null },
    readinessCheckIn: { date:'',sleepHours:0,sleepQuality:0,energyLevel:0,soreness:0,mood:0,stressLevel:0,hydration:0,notes:'' },
  };
}

let _state = defaultState();
let _listeners = [];

export function loadState() {
  const saved = loadFromStorage(STATE_KEY);
  if (saved) {
    const def = defaultState();
    _state = { ...def, ...saved,
      athleteProfile: { ...def.athleteProfile, ...(saved.athleteProfile||{}) },
      nutrition: { ...def.nutrition, ...(saved.nutrition||{}) },
      readinessCheckIn: { ...def.readinessCheckIn, ...(saved.readinessCheckIn||{}) },
    };
    if (!_state.roster?.length) _state.roster = def.roster;
  }
}
export function saveState() { saveToStorage(STATE_KEY, _state); }
export function subscribe(fn) { _listeners.push(fn); return () => { _listeners = _listeners.filter(l=>l!==fn); }; }
function notify() { _listeners.forEach(fn => fn(_state)); }
export function getState()          { return _state; }
export function getRoster()         { return _state.roster; }
export function getWorkoutLog()     { return _state.workoutLog; }
export function getNutrition()      { return _state.nutrition; }
export function getAthleteProfile() { return _state.athleteProfile; }
export function getReadinessCheckIn(){ return _state.readinessCheckIn; }

export function addWorkoutLog(entry) {
  _state.workoutLog = [..._state.workoutLog, { id: Date.now(), ...entry }];
  saveState(); notify();
}
export function patchProfile(fields) {
  _state.athleteProfile = { ..._state.athleteProfile, ...fields };
  saveState(); notify();
}
export function patchReadinessCheckIn(fields) {
  _state.readinessCheckIn = { ..._state.readinessCheckIn, ...fields };
  saveState(); notify();
}
export function patchBuilder(fields) {
  _state.builder = { ..._state.builder, ...fields };
  saveState(); notify();
}
export function patchNutrition(fields) {
  _state.nutrition = { ..._state.nutrition, ...fields };
  saveState(); notify();
}
