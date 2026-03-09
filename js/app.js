import { loadState, saveState, resetState } from './services/storage.js';
import { generateWeek, findSwaps } from './features/sessionGenerator.js';
import { calculateReadiness } from './features/readinessEngine.js';
import { summarizeLogs } from './features/analyticsEngine.js';

let state = loadState();
const app = document.getElementById('app');
let timerHandle = null;
let timerSeconds = 0;

function fmtTime(total){
  const m = String(Math.floor(total/60)).padStart(2,'0');
  const s = String(total%60).padStart(2,'0');
  return `${m}:${s}`;
}
function persist(){ saveState(state); }
function ensureWeek(){
  if(!state.generatedWeek?.length){
    state.generatedWeek = generateWeek({ ...state.profile, week: state.week }, state.readiness.score);
    persist();
  }
}
function header(title, sub=''){ return `<div class="header"><div><div class="kicker">PerformanceIQ Elite · Phase 1 + 2</div><h1>${title}</h1><p>${sub}</p></div><div class="row"><button class="ghost small" data-nav="dashboard">Dashboard</button><button class="ghost small" data-nav="train">Train</button><button class="ghost small" data-nav="analytics">Analytics</button><button class="ghost small" data-nav="profile">Profile</button><button class="ghost small" data-nav="settings">Settings</button></div></div>`; }

function renderShell(content){
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="brand">PerformanceIQ</div><div class="subbrand">Athlete Training Platform</div><div class="nav"><button class="primary" data-nav="dashboard">Dashboard</button><button data-nav="train">Training</button><button data-nav="analytics">Analytics</button><button data-nav="profile">Athlete Profile</button><button data-nav="settings">Settings</button><button class="warn" id="resetApp">Reset App</button></div><footer>Offline-first local build</footer></aside><main class="main">${content}</main></div>`;
  bindGlobal();
}

function renderOnboarding(){
  renderShell(`${header('Athlete Setup','Set the athlete profile once. The training engine will build around it.')}
    <div class="panel"><form id="onboardingForm" class="grid cards-2">
      <label>Name<input name="name" value="${state.profile.name}"></label>
      <label>Sport<select name="sport"><option ${state.profile.sport==='basketball'?'selected':''}>basketball</option><option>football</option><option>soccer</option></select></label>
      <label>Position<input name="position" value="${state.profile.position}"></label>
      <label>Experience<select name="experience"><option ${state.profile.experience==='beginner'?'selected':''}>beginner</option><option ${state.profile.experience==='intermediate'?'selected':''}>intermediate</option><option ${state.profile.experience==='advanced'?'selected':''}>advanced</option></select></label>
      <label>Training Days<select name="training_days"><option ${state.profile.training_days===4?'selected':''}>4</option><option ${state.profile.training_days===5?'selected':''}>5</option></select></label>
      <label>Goal<select name="goal"><option ${state.profile.goal==='strength_speed'?'selected':''}>strength_speed</option><option>muscle_gain</option><option>speed_power</option></select></label>
      <label>Equipment (comma separated)<input name="equipment" value="${state.profile.equipment.join(', ')}"></label>
      <label>Meal Plan Enabled<select name="meal_plan_enabled"><option value="false" ${!state.profile.meal_plan_enabled?'selected':''}>false</option><option value="true" ${state.profile.meal_plan_enabled?'selected':''}>true</option></select></label>
      <div class="row"><button class="primary" type="submit">Save Athlete Profile</button></div>
    </form></div>`);
  document.getElementById('onboardingForm').onsubmit = (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    state.profile = {
      ...state.profile,
      name: fd.get('name'),
      sport: fd.get('sport'),
      position: fd.get('position'),
      experience: fd.get('experience'),
      training_days: Number(fd.get('training_days')),
      goal: fd.get('goal'),
      equipment: String(fd.get('equipment')).split(',').map(s=>s.trim()).filter(Boolean),
      meal_plan_enabled: fd.get('meal_plan_enabled') === 'true',
    };
    state.onboardingComplete = true;
    state.generatedWeek = generateWeek({ ...state.profile, week: state.week }, state.readiness.score);
    persist();
    navigate('dashboard');
  };
}

function renderDashboard(){
  ensureWeek();
  const summary = summarizeLogs(state);
  const next = state.generatedWeek[0];
  renderShell(`${header(`Welcome, ${state.profile.name}`,'Daily athlete dashboard with smart training, readiness, and analytics.')}
    <div class="grid cards-4">
      <div class="panel stat"><div class="label">PIQ Score</div><div class="value">${summary.piq}</div><div class="sub">Composite performance score</div></div>
      <div class="panel stat"><div class="label">Readiness</div><div class="value">${state.readiness.score}</div><div class="sub">${state.readiness.lastUpdated ? 'Updated' : 'No check-in yet'} ${state.readiness.lastUpdated || ''}</div></div>
      <div class="panel stat"><div class="label">Weekly Load</div><div class="value">${summary.load}</div><div class="sub">Fatigue points from logged work</div></div>
      <div class="panel stat"><div class="label">Compliance</div><div class="value">${summary.compliance}%</div><div class="sub">Completed vs logged sessions</div></div>
    </div>
    <div class="space"></div>
    <div class="grid cards-2">
      <div class="panel"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Next Session</h3><button class="primary small" id="startNext">Start Training</button></div>
        <div class="space"></div>
        <div class="session-block"><strong>${next.title}</strong><div class="muted">Week ${next.week} · ${next.phase} · Fatigue ${next.fatigue}</div></div>
      </div>
      <div class="panel"><h3 style="margin-top:0">Readiness Check-In</h3>
        <form id="readinessForm" class="grid cards-2">
          <label>Sleep Hours<input type="number" min="1" max="12" name="sleep" value="${state.readiness.sleep}"></label>
          <label>Soreness (1-8)<input type="number" min="1" max="8" name="soreness" value="${state.readiness.soreness}"></label>
          <label>Fatigue (1-8)<input type="number" min="1" max="8" name="fatigue" value="${state.readiness.fatigue}"></label>
          <label>Stress (1-8)<input type="number" min="1" max="8" name="stress" value="${state.readiness.stress}"></label>
          <div class="row"><button class="primary" type="submit">Update Readiness</button></div>
        </form>
      </div>
    </div>
    <div class="space"></div>
    <div class="panel"><h3 style="margin-top:0">This Week</h3><div class="list">${state.generatedWeek.map((s, i)=>`<div class="session-block"><div class="row" style="justify-content:space-between"><div><strong>Day ${i+1}: ${s.title}</strong><div class="muted">${s.phase} · Readiness ${s.readinessLabel} · Fatigue ${s.fatigue}</div></div><button class="small" data-open-session="${i}">Open</button></div></div>`).join('')}</div></div>`);

  document.getElementById('readinessForm').onsubmit = (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const readiness = {
      sleep: Number(fd.get('sleep')), soreness: Number(fd.get('soreness')), fatigue: Number(fd.get('fatigue')), stress: Number(fd.get('stress'))
    };
    readiness.score = calculateReadiness(readiness);
    readiness.lastUpdated = new Date().toLocaleDateString();
    state.readiness = readiness;
    state.logs.readiness.push({ ...readiness, date: new Date().toISOString() });
    state.generatedWeek = generateWeek({ ...state.profile, week: state.week }, readiness.score);
    persist();
    renderDashboard();
  };
  document.getElementById('startNext').onclick = ()=> openSession(0);
}

function renderTrain(){
  ensureWeek();
  renderShell(`${header('Training Week','Generated sessions follow progression, periodization, fatigue control, and readiness gating.')}
    <div class="panel"><div class="list">${state.generatedWeek.map((s, i)=>`<div class="session-block"><div class="row" style="justify-content:space-between"><div><strong>Day ${i+1}: ${s.title}</strong><div class="muted">Phase ${s.phase} · Fatigue ${s.fatigue} · Readiness ${s.readinessLabel}</div></div><div class="row"><span class="badge">Week ${s.week}</span><button class="small primary" data-open-session="${i}">Start</button></div></div></div>`).join('')}</div></div>`);
}

function exerciseRows(list, sessionIndex, block){
  return (list || []).map((ex, idx)=>`<div class="exercise"><div><strong>${ex.title}</strong><div class="muted">${ex.programmed_sets || ex.default_sets} x ${ex.programmed_reps || ex.default_reps} · rest ${ex.default_rest}s</div></div><button class="small ghost" data-swap="${sessionIndex}|${block}|${idx}">Swap</button></div>`).join('') || '<div class="muted">None</div>';
}

function openSession(index){
  const s = state.generatedWeek[index];
  renderShell(`${header(s.title,`Week ${s.week} · ${s.phase} · Fatigue ${s.fatigue}`)}
    <div class="grid cards-2">
      <div class="panel"><h3 style="margin-top:0">Session Blocks</h3>
        ${['warmup','activation','power','primary','secondary','accessory','core','conditioning','cooldown'].map(block=>`<div class="session-block"><div class="row" style="justify-content:space-between"><strong>${block.replace(/\b\w/g,m=>m.toUpperCase())}</strong><span class="badge">${(s[block]||[]).length} items</span></div>${exerciseRows(s[block], index, block)}</div>`).join('')}
      </div>
      <div class="panel">
        <h3 style="margin-top:0">Rest Timer</h3>
        <div class="timer" id="timerDisplay">${fmtTime(state.settings.restSeconds)}</div>
        <div class="row"><button class="primary" id="timerStart">Start</button><button class="ghost" id="timerReset">Reset</button></div>
        <div class="space"></div>
        <h3>Complete Session</h3>
        <div class="row"><button class="primary" id="completeSession">Log Complete</button><button class="ghost" data-nav="train">Back to Week</button></div>
      </div>
    </div>`);
  bindTimer();
  document.getElementById('completeSession').onclick = ()=>{
    state.logs.workouts.push({ date:new Date().toISOString(), dayType:s.dayType, fatigue:s.fatigue, completed:true });
    state.activeSession = null;
    persist();
    navigate('analytics');
  };
}

function renderAnalytics(){
  const summary = summarizeLogs(state);
  renderShell(`${header('Analytics','Performance trends from session logs and readiness input.')}
    <div class="grid cards-4">
      <div class="panel stat"><div class="label">Strength</div><div class="value">${summary.strength}</div></div>
      <div class="panel stat"><div class="label">Speed</div><div class="value">${summary.speed}</div></div>
      <div class="panel stat"><div class="label">Conditioning</div><div class="value">${summary.conditioning}</div></div>
      <div class="panel stat"><div class="label">Recovery</div><div class="value">${summary.recovery}</div></div>
    </div>
    <div class="space"></div>
    <div class="grid cards-2">
      <div class="panel"><h3 style="margin-top:0">PIQ Breakdown</h3>
        <div class="list">
          ${[['Strength',summary.strength],['Speed',summary.speed],['Conditioning',summary.conditioning],['Compliance',summary.compliance],['Recovery',summary.recovery]].map(([label,val])=>`<div><div class="row" style="justify-content:space-between"><span>${label}</span><span>${val}</span></div><div class="progress"><span style="width:${val}%"></span></div></div>`).join('')}
        </div>
      </div>
      <div class="panel"><h3 style="margin-top:0">Workout Log</h3>
        ${state.logs.workouts.length ? `<table class="table"><thead><tr><th>Date</th><th>Type</th><th>Fatigue</th><th>Status</th></tr></thead><tbody>${state.logs.workouts.map(w=>`<tr><td>${new Date(w.date).toLocaleDateString()}</td><td>${w.dayType}</td><td>${w.fatigue}</td><td>${w.completed?'Completed':'Planned'}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No completed sessions yet.</div>'}
      </div>
    </div>`);
}

function renderProfile(){
  renderShell(`${header('Athlete Profile','Update the stored athlete profile and rebuild the week instantly.')}
    <div class="panel"><form id="profileForm" class="grid cards-2">
      <label>Name<input name="name" value="${state.profile.name}"></label>
      <label>Position<input name="position" value="${state.profile.position}"></label>
      <label>Experience<select name="experience"><option ${state.profile.experience==='beginner'?'selected':''}>beginner</option><option ${state.profile.experience==='intermediate'?'selected':''}>intermediate</option><option ${state.profile.experience==='advanced'?'selected':''}>advanced</option></select></label>
      <label>Training Days<select name="training_days"><option ${state.profile.training_days===4?'selected':''}>4</option><option ${state.profile.training_days===5?'selected':''}>5</option></select></label>
      <label>Equipment<input name="equipment" value="${state.profile.equipment.join(', ')}"></label>
      <label>Current Week<input type="number" min="1" max="12" name="week" value="${state.week}"></label>
      <div class="row"><button class="primary" type="submit">Save Changes</button></div>
    </form></div>`);
  document.getElementById('profileForm').onsubmit = (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    state.profile.name = fd.get('name');
    state.profile.position = fd.get('position');
    state.profile.experience = fd.get('experience');
    state.profile.training_days = Number(fd.get('training_days'));
    state.profile.equipment = String(fd.get('equipment')).split(',').map(s=>s.trim()).filter(Boolean);
    state.week = Number(fd.get('week'));
    state.generatedWeek = generateWeek({ ...state.profile, week: state.week }, state.readiness.score);
    persist();
    navigate('dashboard');
  };
}

function renderSettings(){
  renderShell(`${header('Settings','App-level controls for rest timer and feature gating.')}
    <div class="panel"><form id="settingsForm" class="grid cards-2">
      <label>Default Rest Seconds<input type="number" min="15" max="300" name="rest" value="${state.settings.restSeconds}"></label>
      <label>Meal Plan Enabled<select name="meal"><option value="false" ${!state.profile.meal_plan_enabled?'selected':''}>false</option><option value="true" ${state.profile.meal_plan_enabled?'selected':''}>true</option></select></label>
      <div class="row"><button class="primary" type="submit">Save Settings</button></div>
    </form>
    <div class="space"></div>
    <div class="badge">Meal plans are ${state.profile.meal_plan_enabled ? 'enabled' : 'hidden'} by gating rule.</div></div>`);
  document.getElementById('settingsForm').onsubmit = (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    state.settings.restSeconds = Number(fd.get('rest'));
    state.profile.meal_plan_enabled = fd.get('meal') === 'true';
    persist();
    renderSettings();
  };
}

function openSwap(sessionIndex, block, exIndex){
  const session = state.generatedWeek[sessionIndex];
  const exercise = session[block][exIndex];
  const swaps = findSwaps(exercise, state.profile);
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `<div class="panel modal"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Swap ${exercise.title}</h3><button class="ghost small" id="closeModal">Close</button></div><div class="space"></div><div class="list">${swaps.length ? swaps.map((s,i)=>`<div class="session-block"><div class="row" style="justify-content:space-between"><div><strong>${s.title}</strong><div class="muted">${s.movement_pattern} · ${s.training_intent}</div></div><button class="primary small" data-choose-swap="${i}">Use</button></div></div>`).join('') : '<div class="empty">No compatible swaps available for the athlete equipment/profile.</div>'}</div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('#closeModal').onclick = ()=> modal.remove();
  modal.querySelectorAll('[data-choose-swap]').forEach(btn => btn.onclick = ()=>{
    const chosen = swaps[Number(btn.dataset.chooseSwap)];
    state.generatedWeek[sessionIndex][block][exIndex] = { ...chosen, programmed_sets: exercise.programmed_sets, programmed_reps: exercise.programmed_reps };
    persist();
    modal.remove();
    openSession(sessionIndex);
  });
}

function bindTimer(){
  const display = document.getElementById('timerDisplay');
  timerSeconds = state.settings.restSeconds;
  display.textContent = fmtTime(timerSeconds);
  document.getElementById('timerStart').onclick = ()=>{
    clearInterval(timerHandle);
    timerHandle = setInterval(()=>{
      timerSeconds -= 1;
      display.textContent = fmtTime(Math.max(0, timerSeconds));
      if(timerSeconds <= 0){ clearInterval(timerHandle); }
    }, 1000);
  };
  document.getElementById('timerReset').onclick = ()=>{
    clearInterval(timerHandle);
    timerSeconds = state.settings.restSeconds;
    display.textContent = fmtTime(timerSeconds);
  };
}

function bindGlobal(){
  document.querySelectorAll('[data-nav]').forEach(btn => btn.onclick = ()=> navigate(btn.dataset.nav));
  document.querySelectorAll('[data-open-session]').forEach(btn => btn.onclick = ()=> openSession(Number(btn.dataset.openSession)));
  document.querySelectorAll('[data-swap]').forEach(btn => btn.onclick = ()=>{
    const [sessionIndex, block, exIndex] = btn.dataset.swap.split('|');
    openSwap(Number(sessionIndex), block, Number(exIndex));
  });
  const resetBtn = document.getElementById('resetApp');
  if(resetBtn){ resetBtn.onclick = ()=>{ state = resetState(); renderOnboarding(); }; }
}

function navigate(view){
  if(!state.onboardingComplete && view !== 'profile') return renderOnboarding();
  if(view === 'dashboard') return renderDashboard();
  if(view === 'train') return renderTrain();
  if(view === 'analytics') return renderAnalytics();
  if(view === 'profile') return renderProfile();
  if(view === 'settings') return renderSettings();
  return renderDashboard();
}

if(!state.onboardingComplete) renderOnboarding();
else navigate('dashboard');
