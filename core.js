/* ============================================================
   PerformanceIQ — Core.js (Midnight Edition)
   Clean, Stable, Role-Enabled Version
   ============================================================ */

"use strict";

/* ─────────────────────────────────────────────
   Utilities
───────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

/* ─────────────────────────────────────────────
   State
───────────────────────────────────────────── */
const STORAGE_KEY = "piq_state_v3";

const DEFAULT_STATE = {
  role: "coach",
  sport: "basketball",
  season: "Pre-Season",
  teamName: "Westview Varsity Basketball",
  theme: "dark",
  athletes: [
    { id:1, name:"Jordan Lee", piq:88, acwr:1.1 },
    { id:2, name:"Marcus Hill", piq:72, acwr:1.4 },
    { id:3, name:"Ethan Cole", piq:61, acwr:1.6 },
    { id:4, name:"Ty Brooks", piq:94, acwr:0.9 }
  ]
};

let STATE = loadState();

/* ─────────────────────────────────────────────
   Persistence
───────────────────────────────────────────── */
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {...DEFAULT_STATE};
  }catch{
    return {...DEFAULT_STATE};
  }
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
}

/* ─────────────────────────────────────────────
   Theme (Midnight Blue — no green tech look)
───────────────────────────────────────────── */
const MIDNIGHT = "#0b1f3a";
const MIDNIGHT_ACCENT = "#102a4f";

function applyMidnightPalette(){
  document.documentElement.style.setProperty("--green", MIDNIGHT);
  document.documentElement.style.setProperty("--accent", MIDNIGHT_ACCENT);
  document.documentElement.style.setProperty("--accent-glow","rgba(16,42,79,.35)");
}

function applyTheme(theme){
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  STATE.theme = t;
  saveState();
  applyMidnightPalette();
}

function toggleTheme(){
  applyTheme(STATE.theme === "dark" ? "light" : "dark");
}

/* ─────────────────────────────────────────────
   Navigation
───────────────────────────────────────────── */
function switchView(view){
  $$(".view").forEach(v=>v.classList.remove("active"));
  $$(".nav-btn").forEach(b=>b.classList.remove("active"));

  const target = $("view-" + view);
  if(target) target.classList.add("active");

  document.querySelector(`[data-view="${view}"]`)?.classList.add("active");
}

/* ─────────────────────────────────────────────
   Role System (Fully Working)
───────────────────────────────────────────── */
function applyRole(role){
  STATE.role = role;
  saveState();

  const labelMap = {
    coach:"Head Coach",
    athlete:"Athlete",
    admin:"Admin",
    parent:"Parent"
  };

  $("userName").textContent = labelMap[role] || "User";
  $("userRole").textContent =
    `${labelMap[role] || "User"} · ${cap(STATE.sport)}`;

  showToast(`Role switched to ${cap(role)}`);
}

function injectRoleSelector(){
  if($("settingRole")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "form-group";
  wrapper.innerHTML = `
    <div class="form-label">Role</div>
    <select class="form-select" id="settingRole">
      <option value="coach">Coach</option>
      <option value="athlete">Athlete</option>
      <option value="admin">Admin</option>
      <option value="parent">Parent</option>
    </select>
  `;

  $("view-settings").querySelector(".card-body")?.prepend(wrapper);

  $("settingRole").value = STATE.role;
  $("settingRole").addEventListener("change",(e)=>applyRole(e.target.value));
}

/* ─────────────────────────────────────────────
   Dashboard Rendering
───────────────────────────────────────────── */
function renderDashboard(){
  const avg =
    Math.round(
      STATE.athletes.reduce((a,b)=>a+b.piq,0)/STATE.athletes.length
    );

  $("statAvg").textContent = avg;
  $("statReady").textContent =
    STATE.athletes.filter(a=>a.acwr<1.3).length;

  $("statMonitor").textContent =
    STATE.athletes.filter(a=>a.acwr>=1.3 && a.acwr<=1.5).length;

  $("statRisk").textContent =
    STATE.athletes.filter(a=>a.acwr>1.5).length;

  renderHeatmap();
}

function renderHeatmap(){
  const body = $("heatmapBody");
  if(!body) return;
  body.innerHTML="";

  STATE.athletes.forEach(a=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${a.name}</td>
      <td>${a.piq}</td>
      <td>${a.piq>80?"Elite":a.piq>65?"Ready":"Developing"}</td>
      <td>${a.acwr}</td>
      <td>${a.acwr>1.5?"⛔":"—"}</td>
      <td>${a.piq>80?"↑":"→"}</td>
    `;
    body.appendChild(tr);
  });
}

/* ─────────────────────────────────────────────
   Athletes Page
───────────────────────────────────────────── */
function renderAthletes(){
  const grid = $("athleteCardGrid");
  if(!grid) return;

  grid.innerHTML="";
  STATE.athletes.forEach(a=>{
    const div=document.createElement("div");
    div.className="card card-body";
    div.innerHTML=`
      <div style="font-weight:600">${a.name}</div>
      <div>PIQ: ${a.piq}</div>
      <div>ACWR: ${a.acwr}</div>
    `;
    grid.appendChild(div);
  });

  $("athleteCountSub").textContent =
    `${STATE.athletes.length} athletes on roster`;
}

/* ─────────────────────────────────────────────
   Toast
───────────────────────────────────────────── */
function showToast(msg){
  const t=document.createElement("div");
  t.className="toast";
  t.textContent=msg;
  $("toastContainer").appendChild(t);
  setTimeout(()=>t.remove(),3000);
}

/* ─────────────────────────────────────────────
   Init
───────────────────────────────────────────── */
function init(){
  applyTheme(STATE.theme);
  applyRole(STATE.role);
  injectRoleSelector();

  renderDashboard();
  renderAthletes();

  // Nav buttons
  $$(".nav-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      switchView(btn.dataset.view);
    });
  });

  $("btnTheme")?.addEventListener("click",toggleTheme);
}

document.addEventListener("DOMContentLoaded",init);
