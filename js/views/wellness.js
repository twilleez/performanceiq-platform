// /js/views/wellness.js
import { STATE, ATHLETES, saveAthletes } from "../state/state.js";
import { toast } from "../services/toast.js";
import { computePIQ } from "../features/piqScore.js";

// NEW: Score Engine v1 (for daily snapshots)
import { computeAthleteScoreV1 } from "../features/scoring.js";

function $(id) { return document.getElementById(id); }

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function ensureScoreSnapshotForToday(athlete) {
  athlete.history = athlete.history || {};
  athlete.history.score = Array.isArray(athlete.history.score) ? athlete.history.score : [];

  const dk = todayKey();
  const exists = athlete.history.score.some(s => s && s.date === dk);
  if (exists) return;

  const breakdown = computeAthleteScoreV1(athlete, { state: STATE });
  athlete.history.score.push({
    date: dk,
    total: breakdown.total,
    subscores: breakdown.subscores,
    injuryPenalty: breakdown.injuryPenalty,
    created_at: new Date().toISOString()
  });
}

function sliderRow(label, id, def) {
  return `
    <div class="form-row">
      <label class="label">${label} <span class="val" id="${id}Val">${def}</span>/10</label>
      <input type="range" min="0" max="10" step="1" value="${def}" id="${id}" aria-label="${label}" />
    </div>
  `;
}

function getFormData(root) {
  const num = (id) => Number(root.querySelector("#" + id)?.value || 0);
  return {
    athleteId: String(root.querySelector("#wellAthlete")?.value || ""),
    sleep: num("wellSleep"),
    soreness: num("wellSoreness"),
    stress: num("wellStress"),
    mood: num("wellMood"),
    readiness: num("wellReady")
  };
}

export function renderWellness() {
  const host = $("wellnessMount");
  const sub = $("wellnessSub");
  if (sub) sub.textContent = "Log daily wellness to drive PIQ and risk insights.";
  if (!host) return;

  host.innerHTML = "";

  if (!ATHLETES.length) {
    host.innerHTML = `<div class="empty-state"><div class="empty-title">No athletes</div><div class="empty-sub">Add athletes first (Onboarding or Import).</div></div>`;
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "form-card";
  wrap.innerHTML = `
    <div class="form-row">
      <label class="label">Athlete</label>
      <select class="select" id="wellAthlete"></select>
    </div>

    ${sliderRow("Sleep", "wellSleep", 8)}
    ${sliderRow("Soreness", "wellSoreness", 3)}
    ${sliderRow("Stress", "wellStress", 3)}
    ${sliderRow("Mood", "wellMood", 7)}
    ${sliderRow("Readiness", "wellReady", 7)}

    <div class="small-muted" id="wellPreview"></div>
  `;
  host.appendChild(wrap);

  const sel = wrap.querySelector("#wellAthlete");
  ATHLETES.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = a.name;
    sel.appendChild(opt);
  });

  // Bind live value labels INSIDE render (guarantees elements exist)
  function bindVal(id) {
    const r = wrap.querySelector("#" + id);
    const v = wrap.querySelector("#" + id + "Val");
    if (!r || !v) return;
    const sync = () => { v.textContent = r.value; };
    r.addEventListener("input", sync);
    sync();
  }
  ["wellSleep", "wellSoreness", "wellStress", "wellMood", "wellReady"].forEach(bindVal);

  function updatePreview() {
    const data = getFormData(wrap);
    const piq = computePIQ(data);
    const el = wrap.querySelector("#wellPreview");
    el.textContent = `PIQ preview: ${piq.score} / 100`;
  }

  wrap.querySelectorAll("input[type=range]").forEach(r => r.addEventListener("input", updatePreview));
  updatePreview();
}

let __wellnessBound = false;

export function bindWellnessEvents() {
  if (__wellnessBound) return;
  __wellnessBound = true;

  document.getElementById("btnSaveWellness")?.addEventListener("click", () => {
    const root = document.getElementById("wellnessMount");
    if (!root) return;

    // The form-card is inside wellnessMount
    const wrap = root.querySelector(".form-card") || root;
    const data = getFormData(wrap);

    if (!data.athleteId) { toast("Select an athlete"); return; }

    const a = ATHLETES.find(x => x.id === data.athleteId);
    if (!a) { toast("Athlete not found"); return; }

    a.history = a.history || {};
    a.history.wellness = Array.isArray(a.history.wellness) ? a.history.wellness : [];
    a.history.wellness.push({
      date: todayKey(),
      sleep: data.sleep,
      soreness: data.soreness,
      stress: data.stress,
      mood: data.mood,
      readiness: data.readiness,
      created_at: new Date().toISOString()
    });

    // Elite: snapshot score once per day for trend analytics
    ensureScoreSnapshotForToday(a);

    saveAthletes();

    const piq = computePIQ(data).score;
    const perf = computeAthleteScoreV1(a, { state: STATE }).total;

    toast(`Wellness saved ✓ PIQ ${piq} • PerformanceIQ ${perf}`);
  });
}
