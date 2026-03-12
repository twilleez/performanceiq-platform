import { STATE } from "./state/state.js";
import { authView } from "./views/auth.js";
import { todayView, sessionView, progressView, profileView } from "./views/athlete.js";
import { teamHomeView, teamScheduleView, teamRosterView, teamActivityView } from "./views/team.js";
import { getExercise, getSwapOptions, swapExercise, completeSet, overallCompletion } from "./features/engines.js";
import { loadState, saveState } from "./services/storage.js";
import { signInLocal } from "./services/authService.js";
const app=document.getElementById("app");
const persisted=loadState();
if(persisted) Object.assign(STATE,persisted);
function renderSheet(){
  if(!STATE.ui.activeSheet) return "";
  if(STATE.ui.activeSheet==="team-home") return teamHomeView(STATE);
  if(STATE.ui.activeSheet==="team-schedule") return teamScheduleView(STATE);
  if(STATE.ui.activeSheet==="team-roster") return teamRosterView(STATE);
  if(STATE.ui.activeSheet==="team-activity") return teamActivityView(STATE);
  if(STATE.ui.activeSheet==="swap") {
    const options=getSwapOptions(STATE.ui.activeExerciseId, STATE.athlete.sport);
    return `<div class="sheet-backdrop" data-action="close-sheet"></div><div class="sheet"><div class="sheet-handle"></div><div class="sheet-body"><div class="brand">Swap Exercise</div><div class="title" style="font-size:28px">Keep the pattern</div><div class="content" style="padding:10px 0 0">${options.length?options.map(x=>`<div class="item"><div style="font-weight:700">${x.title}</div><div class="muted small">${x.quick||x.pattern}</div><button class="ghost" style="margin-top:10px" data-action="apply-swap" data-newid="${x.id}">Use</button></div>`).join(""):`<div class="item">No swap options.</div>`}</div></div></div>`;
  }
  const meta=getExercise(STATE.ui.activeExerciseId);
  const ex=STATE.athlete.session.exercises.find(x=>x.id===STATE.ui.activeExerciseId);
  if(!ex) return "";
  return `<div class="sheet-backdrop" data-action="close-sheet"></div><div class="sheet"><div class="sheet-handle"></div><div class="sheet-body"><div class="brand">Exercise</div><div class="title" style="font-size:28px">${meta.title}</div><div class="subtitle">${meta.quick} • ${meta.pattern}</div><div class="content" style="padding:10px 0 0"><div class="glass card"><div class="card-title">Log Sets</div><div class="set-grid">${ex.sets.map((set,idx)=>`<button class="set ${set.done?"done":""}" data-action="toggle-set" data-exercise="${ex.id}" data-set="${idx}">Set ${idx+1}<div class="small muted" style="margin-top:4px">${set.target}</div></button>`).join("")}</div></div><div class="glass card"><div class="card-title">Actions</div><div class="pill-row"><button class="ghost" data-action="open-swap" data-exercise="${ex.id}">Swap</button><button class="ghost" data-action="close-sheet">Done</button></div></div></div></div></div>`;
}
function render(){
  if(!STATE.session.loggedIn){ app.innerHTML=authView(); bindAuth(); return; }
  const completion=overallCompletion(STATE.athlete.session);
  let body="";
  if(STATE.ui.tab==="today") body=todayView(STATE, completion);
  if(STATE.ui.tab==="train") body=sessionView(STATE, completion);
  if(STATE.ui.tab==="progress") body=progressView(STATE);
  if(STATE.ui.tab==="profile") body=profileView(STATE);
  const now=STATE.ui.tab==="train"?`<div class="now"><div><strong>${STATE.athlete.session.title}</strong><div class="small muted">${completion.done}/${completion.total} sets logged</div></div><button class="ghost" data-action="close-session">Close</button></div>`:"";
  const teamFab=STATE.mode.hasTeam?`<button class="team-fab" data-action="open-team">${STATE.ui.activeSheet?.startsWith("team-")?"Close Team":"Team"}</button>`:"";
  app.innerHTML=`<div class="shell">${body}${now}${teamFab}<div class="nav"><button class="${STATE.ui.tab==="today"?"active":""}" data-tab="today">Today</button><button class="${STATE.ui.tab==="train"?"active":""}" data-tab="train">Train</button><button class="${STATE.ui.tab==="progress"?"active":""}" data-tab="progress">Progress</button><button class="${STATE.ui.tab==="profile"?"active":""}" data-tab="profile">Profile</button></div>${renderSheet()}</div>`;
  bindUI(); saveState(STATE);
}
function bindAuth(){ const btn=document.getElementById("login-btn"); if(!btn) return; btn.onclick=()=>{ const email=document.getElementById("auth-email").value.trim(); const role=document.getElementById("auth-role").value; if(!email) return alert("Enter email."); signInLocal(STATE,email,role); render(); }; }
function bindUI(){
  document.querySelectorAll("[data-tab]").forEach(btn=>btn.onclick=()=>{ STATE.ui.tab=btn.dataset.tab; render(); });
  document.querySelectorAll("[data-action='start-session']").forEach(btn=>btn.onclick=()=>{ STATE.ui.tab="train"; render(); });
  document.querySelectorAll("[data-action='open-exercise']").forEach(btn=>btn.onclick=()=>{ STATE.ui.activeExerciseId=btn.dataset.exercise; STATE.ui.activeSheet="exercise"; render(); });
  document.querySelectorAll("[data-action='toggle-set']").forEach(btn=>btn.onclick=()=>{ completeSet(STATE.athlete.session, btn.dataset.exercise, Number(btn.dataset.set)); render(); });
  document.querySelectorAll("[data-action='open-swap']").forEach(btn=>btn.onclick=()=>{ STATE.ui.activeExerciseId=btn.dataset.exercise; STATE.ui.activeSheet="swap"; render(); });
  document.querySelectorAll("[data-action='apply-swap']").forEach(btn=>btn.onclick=()=>{ swapExercise(STATE.athlete.session, STATE.ui.activeExerciseId, btn.dataset.newid); STATE.ui.activeSheet=null; render(); });
  document.querySelectorAll("[data-action='close-sheet']").forEach(btn=>btn.onclick=()=>{ STATE.ui.activeSheet=null; render(); });
  document.querySelectorAll("[data-action='open-team']").forEach(btn=>btn.onclick=()=>{ STATE.ui.activeSheet=STATE.ui.activeSheet?.startsWith("team-")?null:"team-home"; render(); });
  document.querySelectorAll("[data-teamtab]").forEach(btn=>btn.onclick=()=>{ STATE.ui.activeSheet=`team-${btn.dataset.teamtab}`; render(); });
  document.querySelectorAll("[data-action='close-session']").forEach(btn=>btn.onclick=()=>{ STATE.ui.tab="today"; render(); });
}
render();
