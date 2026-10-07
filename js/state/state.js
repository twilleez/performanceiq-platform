/**
 * PerformanceIQ State — v9
 */
const STATE_KEY = 'piq_state_v8';
const LEGACY_STATE_KEYS = ['piq_state_v7'];
const DEMO_SCOPE = 'demo';

let _scope = DEMO_SCOPE;

function storageKey(scope = _scope) {
  return scope === DEMO_SCOPE ? STATE_KEY : `${STATE_KEY}:${scope}`;
}
function loadFromStorage(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveToStorage(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}
function newId() {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function demoRoster() {
  return [
    { id:'r1', name:'Jake Williams', position:'PG', sport:'basketball', readiness:82, piq:79, streak:5, weight:165, height:"6 ft 0 in", age:17, level:'advanced', compPhase:'in-season' },
    { id:'r2', name:'Marcus Thompson', position:'SF', sport:'basketball', readiness:74, piq:85, streak:12, weight:185, height:"6 ft 4 in", age:17, level:'elite', compPhase:'in-season' },
    { id:'r3', name:'Jamal Robinson', position:'C', sport:'basketball', readiness:91, piq:71, streak:3, weight:220, height:"6 ft 8 in", age:16, level:'intermediate', compPhase:'in-season' },
    { id:'r4', name:'Devon Nguyen', position:'SG', sport:'basketball', readiness:55, piq:68, streak:0, weight:160, height:"5 ft 11 in", age:15, level:'intermediate', compPhase:'in-season' },
    { id:'r5', name:'Aliyah Reeves', position:'PF', sport:'basketball', readiness:88, piq:92, streak:8, weight:155, height:"6 ft 1 in", age:18, level:'elite', compPhase:'in-season' },
    { id:'r6', name:'Jordan Kim', position:'PG', sport:'basketball', readiness:67, piq:76, streak:4, weight:158, height:"5 ft 10 in", age:16, level:'intermediate', compPhase:'in-season' },
    { id:'r7', name:'Taylor Santos', position:'SF', sport:'basketball', readiness:78, piq:81, streak:6, weight:175, height:"6 ft 3 in", age:17, level:'advanced', compPhase:'in-season' },
    { id:'r8', name:'Casey Monroe', position:'SG', sport:'basketball', readiness:63, piq:73, streak:2, weight:175, height:"6 ft 1 in", age:16, level:'intermediate', compPhase:'in-season' },
  ];
}
function defaultState(scope = _scope) {
  return {
    role:null,
    roster: scope === DEMO_SCOPE ? demoRoster() : [],
    athleteProfile:{
      sport:'basketball', level:'high_school', team:'', goals:[], position:'', gradYear:'',
      age:'', weightLbs:'', heightFt:'', heightIn:'',
      trainingLevel:'intermediate', daysPerWeek:4, sleepHours:7,
      compPhase:'in-season', primaryGoal:'', secondaryGoals:[], injuryHistory:'none',
      mindsetScore:0, hydrationOz:0, pliabilityDone:false, recoveryNotes:'',
    },
    workoutLog:[], assignedWorkouts:[], draftWorkout:null,
    nutrition:{ meals:[], macros:{cal:0,pro:0,cho:0,fat:0}, targetMacros:{cal:0,pro:0,cho:0,fat:0}, mealPlan:null },
    linkedAthlete:null, linkedAthletes:[], cloud:{lastPullAt:0,lastError:''},
    messages_coach:[], messages_player:[], messages_parent:[], messages:[],
    builder:{activeTab:'plan',pickerOpen:false,pickerFilter:'all',loadedTemplateId:null,draft:null},
    assignModal:{open:false,pending:null},
    readinessCheckIn:{date:'',sleepHours:0,sleepQuality:0,energyLevel:0,soreness:0,mood:0,stressLevel:0,hydration:0,notes:''},
    calendarEvents:null, adminTeams:null, adminCoaches:null, adminAthletes:null, org:null,
  };
}

let _state=defaultState(), _listeners=[];

function _dispatch(key) {
  try { document.dispatchEvent(new CustomEvent('piq:stateChanged',{detail:{key}})); } catch (_) {}
}
function _hydrate() {
  const demo=_scope===DEMO_SCOPE;
  let saved=loadFromStorage(storageKey());
  if (!saved && demo) {
    for (const key of LEGACY_STATE_KEYS) { saved=loadFromStorage(key); if (saved) break; }
  }
  const def=defaultState();
  if (!saved) { _state=def; return; }
  _state={
    ...def,...saved,
    roster:Array.isArray(saved.roster)&&(saved.roster.length||!demo)?saved.roster:def.roster,
    workoutLog:Array.isArray(saved.workoutLog)?saved.workoutLog:[],
    assignedWorkouts:Array.isArray(saved.assignedWorkouts)?saved.assignedWorkouts:[],
    athleteProfile:{...def.athleteProfile,...(saved.athleteProfile||{})},
    nutrition:{
      ...def.nutrition,...(saved.nutrition||{}),
      meals:Array.isArray(saved.nutrition?.meals)?saved.nutrition.meals:[],
      macros:{...def.nutrition.macros,...(saved.nutrition?.macros||{})},
      targetMacros:{...def.nutrition.targetMacros,...(saved.nutrition?.targetMacros||{})},
    },
    readinessCheckIn:{...def.readinessCheckIn,...(saved.readinessCheckIn||{})},
  };
  saveState();
}
export function loadState(){_hydrate();}
export function scopeState(scopeId){
  const next=scopeId&&scopeId!==DEMO_SCOPE?String(scopeId):DEMO_SCOPE;
  if(next===_scope)return false;
  _scope=next; _hydrate(); notify(); _dispatch('general'); return true;
}
export function getStateScope(){return _scope;}
export function isDemoScope(){return _scope===DEMO_SCOPE;}
export function saveState(){saveToStorage(storageKey(),_state);}
export function subscribe(fn){_listeners.push(fn);return()=>{_listeners=_listeners.filter(l=>l!==fn);};}
function notify(){_listeners.forEach(fn=>fn(_state));}

let _writeListeners=[];
export function onLocalWrite(fn){_writeListeners.push(fn);return()=>{_writeListeners=_writeListeners.filter(l=>l!==fn);};}
function _emitWrite(kind,record){for(const fn of _writeListeners){try{fn(kind,record);}catch(err){console.warn('[PIQ] local-write listener failed:',err);}}}

export function getState(){return _state;}
export function getRoster(){return _state.roster;}
export function getWorkoutLog(){return _state.workoutLog;}
export function getAssignedWorkouts(){return _state.assignedWorkouts||[];}
export function getNutrition(){return _state.nutrition;}
export function getAthleteProfile(){return _state.athleteProfile;}
export function getDraftWorkout(){return _state.draftWorkout;}
export function getBuilder(){return _state.builder;}
export function getReadinessCheckIn(){return _state.readinessCheckIn;}

export function getMessages(role){
  const key=role==='coach'?'messages_coach':role==='parent'?'messages_parent':'messages_player';
  return _state[key]||[];
}
export function setMessages(role,threads){
  const key=role==='coach'?'messages_coach':role==='parent'?'messages_parent':'messages_player';
  _state[key]=Array.isArray(threads)?threads:[]; saveState(); _dispatch('messages');
}
export function getUnreadCount(role='coach'){
  return getMessages(role).reduce((count,item)=>count+((item?.unread===true||item?.read===false)?1:0),0);
}
export function setState(patch,{silent=false}={}){Object.assign(_state,patch);if(!silent){notify();_dispatch('general');}saveState();}
export function patchBuilder(patch,{silent=false}={}){Object.assign(_state.builder,patch);if(!silent){notify();_dispatch('builder');}saveState();}
export function patchProfile(patch){Object.assign(_state.athleteProfile,patch);_recomputeNutritionTargets();notify();_dispatch('profile');saveState();}
export function patchReadinessCheckIn(patch){
  Object.assign(_state.readinessCheckIn,patch); notify(); saveState(); _dispatch('readiness'); _emitWrite('checkin-today',_state.readinessCheckIn);
}
function _recomputeNutritionTargets(){
  const p=_state.athleteProfile;
  const weightLbs=parseFloat(p.weightLbs)||160, weightKg=weightLbs*0.4536;
  const phase=p.compPhase||'in-season', level=p.trainingLevel||'intermediate', days=parseInt(p.daysPerWeek)||4;
  const proMult=level==='elite'?2.2:level==='advanced'?2.0:level==='intermediate'?1.8:1.6;
  const proG=Math.round(weightKg*proMult);
  const choBase=phase==='in-season'?7:phase==='pre-season'?6:5;
  const choAdjust=days>=5?1:days>=3?0:-1;
  const choG=Math.round(weightKg*(choBase+choAdjust));
  const fatG=Math.round(weightKg*1.0);
  const cal=Math.round((proG*4)+(choG*4)+(fatG*9));
  _state.nutrition.targetMacros={cal,pro:proG,cho:choG,fat:fatG};
}
export function addWorkoutLog(entry){
  const record={...entry,id:entry?.id||newId(),ts:Number(entry?.ts)||Date.now()};
  _state.workoutLog.push(record); notify(); _dispatch('workoutLog'); saveState(); _emitWrite('session',record); return record;
}
export function addCheckIn(checkIn={},meta={}){
  const base=_state.readinessCheckIn||{};
  const record={type:'checkin',...base,...checkIn,...meta,date:checkIn.date||base.date||new Date().toDateString(),ts:Number(checkIn.ts)||Date.now()};
  _state.workoutLog.push(record); notify(); _dispatch('readiness'); saveState(); _emitWrite('checkin',record); return record;
}
export function markLogSynced(localId,remoteId){
  const rec=_state.workoutLog.find(w=>w&&w.id===localId);
  if(!rec||!remoteId)return false;
  rec.remoteId=remoteId; saveState(); return true;
}
export function applyCloudSnapshot(snapshot={},{silent=false}={}){
  if(Array.isArray(snapshot.workoutLog))_state.workoutLog=snapshot.workoutLog;
  if(Array.isArray(snapshot.roster))_state.roster=snapshot.roster;
  if('linkedAthlete'in snapshot)_state.linkedAthlete=snapshot.linkedAthlete||null;
  if(Array.isArray(snapshot.linkedAthletes))_state.linkedAthletes=snapshot.linkedAthletes;
  if(snapshot.athleteProfile)Object.assign(_state.athleteProfile,snapshot.athleteProfile);
  if(snapshot.readinessCheckIn)_state.readinessCheckIn={...defaultState().readinessCheckIn,...snapshot.readinessCheckIn};
  if(snapshot.cloud)_state.cloud={...(_state.cloud||{}),...snapshot.cloud};
  saveState(); if(!silent){notify();_dispatch('cloud');}
}
const MESSAGE_KEYS=['messages_player','messages_coach','messages_parent','messages'];
function _findThread(threadId){
  for(const key of MESSAGE_KEYS){const thread=(_state[key]||[]).find(t=>t&&String(t.id)===String(threadId));if(thread)return thread;}
  return null;
}
export function addMessage(threadId,from,body){
  const text=String(body??'').trim(),thread=_findThread(threadId);
  if(!thread||!text)return null;
  if(!Array.isArray(thread.messages))thread.messages=[];
  const message={id:newId(),from:from||'You',body:text,ts:Date.now()};
  thread.messages.push(message);thread.lastTs=message.ts;saveState();notify();_dispatch('messages');return message;
}
export function markThreadRead(threadId){
  const thread=_findThread(threadId);if(!thread)return false;
  thread.unread=0;thread.read=true;saveState();_dispatch('messages');return true;
}
export function completeAssignment(id,completion={}){
  const assignment=getAssignedWorkouts().find(w=>String(w.id)===String(id));if(!assignment)return false;
  Object.assign(assignment,completion,{completed:true,completedAt:Date.now()});notify();_dispatch('assignedWorkouts');saveState();return true;
}
export function addMeal(item){
  _state.nutrition.meals.push({...item,ts:Date.now()});
  _state.nutrition.macros.cal+=item.cal||0;_state.nutrition.macros.pro+=item.pro||0;_state.nutrition.macros.cho+=item.cho||0;_state.nutrition.macros.fat+=item.fat||0;
  notify();_dispatch('nutrition');saveState();
}
export function removeMeal(idx){
  const m=_state.nutrition.meals[idx];if(!m)return;
  _state.nutrition.macros.cal-=m.cal||0;_state.nutrition.macros.pro-=m.pro||0;_state.nutrition.macros.cho-=m.cho||0;_state.nutrition.macros.fat-=m.fat||0;
  _state.nutrition.meals.splice(idx,1);notify();_dispatch('nutrition');saveState();
}
export function resetState(){_state=defaultState();notify();saveState();_dispatch('general');}
