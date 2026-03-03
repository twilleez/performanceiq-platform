// /js/views/athletes.js
import { ATHLETES, saveAthletes } from "../state/state.js";
import { toast } from "../services/toast.js";
import { computePIQ } from "../features/piqScore.js";
import { computeACWR } from "../features/acwr.js";
import { computeRisk } from "../features/riskDetection.js";

function $(id) { return document.getElementById(id); }

function latestWellness(a) {
  const w = a?.history?.wellness;
  if (!Array.isArray(w) || !w.length) return null;
  return w[w.length - 1];
}

function latestSessions(a) {
  const s = a?.history?.sessions;
  return Array.isArray(s) ? s : [];
}

function riskChipForAthlete(a) {
  const r = computeRisk(a);
  const cls = (r.colorClass === "risk") ? "chip danger" : (r.colorClass === "watch" ? "chip warn" : (r.colorClass === "nodata" ? "chip" : "chip ok"));
  return { label: r.label, cls };
}

export function renderAthletesView(filterText = "") {
  const grid = $("athleteCardGrid");
  const countSub = $("athleteCountSub");
  const detail = $("athleteDetail");
  const back = $("backToList");

  if (!grid) return;

  // ensure list visible
  if (detail) detail.style.display = "none";
  grid.style.display = "";

  const q = String(filterText || "").trim().toLowerCase();
  const list = ATHLETES.filter(a => !q || String(a.name).toLowerCase().includes(q));

  if (countSub) countSub.textContent = `${list.length} athlete${list.length === 1 ? "" : "s"}`;

  grid.innerHTML = "";

  // Empty state
  if (!ATHLETES.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-title">No athletes yet</div>
      <div class="empty-sub">Use onboarding or add athletes by importing a backup.</div>
      <div class="empty-actions">
        <button class="btn" id="emptyImportBtn" type="button">Import roster</button>
      </div>
    `;
    grid.appendChild(empty);
    const b = empty.querySelector("#emptyImportBtn");
    b?.addEventListener("click", () => document.getElementById("importFileInput")?.click());
    return;
  }

  // Cards
  list.forEach((a) => {
    const w = latestWellness(a);
    const piq = computePIQ({
      sleep: w?.sleep, soreness: w?.soreness, stress: w?.stress, mood: w?.mood, readiness: w?.readiness
    });
    // keep ACWR computed for detail panels; chip uses combined risk
    computeACWR(latestSessions(a));
    const r = riskChipForAthlete(a);

    const card = document.createElement("button");
    card.type = "button";
    card.className = "athlete-card";
    card.setAttribute("aria-label", `Open athlete ${a.name}`);
    card.setAttribute("data-athlete-card-id", a.id);

    card.innerHTML = `
      <div class="athlete-top">
        <div class="athlete-name">${a.name}</div>
        <div class="${r.cls}" aria-label="Risk ${r.label}">${r.label}</div>
      </div>
      <div class="athlete-meta">${a.position || "—"} · ${a.year || "—"}</div>
      <div class="athlete-score">
        <div class="score-num">${piq.score}</div>
        <div class="score-sub">PIQ score</div>
      </div>
    `;

    card.addEventListener("click", () => openAthleteDetail(a.id));
    grid.appendChild(card);
  });

  back?.addEventListener("click", () => {
    if (detail) detail.style.display = "none";
    grid.style.display = "";
  });
}

export function openAthleteDetail(athleteId) {
  const a = ATHLETES.find(x => x.id === athleteId);
  if (!a) return;

  const grid = $("athleteCardGrid");
  const detail = $("athleteDetail");
  if (!grid || !detail) return;

  grid.style.display = "none";
  detail.style.display = "";

  const hero = $("detailHero");
  const tier = $("detailTier");
  const note = $("detailScoreNote");
  const load = $("detailLoad");
  const wellness = $("detailWellness");
  const workout = $("detailWorkout");

  const w = latestWellness(a);
  const piq = computePIQ({
    sleep: w?.sleep, soreness: w?.soreness, stress: w?.stress, mood: w?.mood, readiness: w?.readiness
  });
  const acwr = computeACWR(latestSessions(a));
  const r = riskLabel(acwr);

  if (hero) hero.textContent = a.name;
  if (tier) tier.textContent = `Risk: ${r.label}`;
  if (note) note.textContent = `PIQ = ${piq.score} (tap Analytics for breakdown)`;
  if (load) load.textContent = acwr == null ? "ACWR: —" : `ACWR: ${acwr.toFixed(2)}`;

  if (wellness) {
    wellness.innerHTML = w
      ? `<div>Sleep: ${w.sleep}/10 · Soreness: ${w.soreness}/10 · Stress: ${w.stress}/10 · Mood: ${w.mood}/10 · Ready: ${w.readiness}/10</div>`
      : `<div>No wellness log yet.</div>`;
  }

  if (workout) {
    const sessions = latestSessions(a);
    if (!sessions.length) workout.textContent = "No sessions logged yet.";
    else workout.textContent = `Last session: ${sessions[sessions.length - 1].type || "Session"} (load ${sessions[sessions.length - 1].load || 0})`;
  }
}

export function bindAthletesViewEvents() {
  // Placeholder for future: add athlete UI, delete athlete, etc.
}
