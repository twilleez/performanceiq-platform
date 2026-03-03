// /js/views/athletes.js
import { STATE, ATHLETES } from "../state/state.js";
import { toast } from "../services/toast.js";

import { computeACWR } from "../features/acwr.js";
import { computeRisk } from "../features/riskDetection.js";

// NEW: Score Engine v1
import { computeAthleteScoreV1, explainScore } from "../features/scoring.js";

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
  const cls =
    (r.colorClass === "risk") ? "chip danger" :
    (r.colorClass === "watch") ? "chip warn" :
    (r.colorClass === "nodata") ? "chip" :
    "chip ok";

  return { label: r.label, cls, raw: r };
}

let __backBound = false;

export function renderAthletesView(filterText = "") {
  const grid = $("athleteCardGrid");
  const countSub = $("athleteCountSub");
  const detail = $("athleteDetail");
  const back = $("backToList");

  if (!grid) return;

  // ensure list visible
  if (detail) detail.style.display = "none";
  grid.style.display = "";

  // Bind back button once (prevents listener stacking)
  if (back && !__backBound) {
    __backBound = true;
    back.addEventListener("click", () => {
      if (detail) detail.style.display = "none";
      grid.style.display = "";
    });
  }

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
    // Keep your ACWR computed (used in riskDetection in many designs)
    computeACWR(latestSessions(a));

    const risk = riskChipForAthlete(a);

    // Score Engine v1
    const scoreBreakdown = computeAthleteScoreV1(a, { state: STATE });
    const score = scoreBreakdown.total;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "athlete-card";
    card.setAttribute("aria-label", `Open athlete ${a.name}`);
    card.setAttribute("data-athlete-card-id", a.id);

    card.innerHTML = `
      <div class="athlete-top">
        <div class="athlete-name">${a.name}</div>
        <div class="${risk.cls}" aria-label="Risk ${risk.label}">${risk.label}</div>
      </div>
      <div class="athlete-meta">${a.position || "—"} · ${a.year || "—"}</div>
      <div class="athlete-score">
        <div class="score-num">${score}</div>
        <div class="score-sub">PerformanceIQ</div>
      </div>
    `;

    card.addEventListener("click", () => openAthleteDetail(a.id));
    grid.appendChild(card);
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
  const sessions = latestSessions(a);

  const acwr = computeACWR(sessions);

  // FIX: no riskLabel() — use your risk engine consistently
  const risk = computeRisk(a);

  // Score Engine v1 breakdown + “why”
  const breakdown = computeAthleteScoreV1(a, { state: STATE });
  const why = explainScore(breakdown);

  if (hero) hero.textContent = a.name;
  if (tier) tier.textContent = `Risk: ${risk.label}`;
  if (note) note.textContent = `PerformanceIQ = ${breakdown.total}/100 • ${why[0] || ""}`;
  if (load) load.textContent = acwr == null ? "ACWR: —" : `ACWR: ${acwr.toFixed(2)}`;

  if (wellness) {
    wellness.innerHTML = w
      ? `<div>Sleep: ${w.sleep}/10 · Soreness: ${w.soreness}/10 · Stress: ${w.stress}/10 · Mood: ${w.mood}/10 · Ready: ${w.readiness}/10</div>`
      : `<div>No wellness log yet.</div>`;
  }

  if (workout) {
    if (!sessions.length) workout.textContent = "No sessions logged yet.";
    else {
      const last = sessions[sessions.length - 1];
      workout.textContent = `Last session: ${last.type || "Session"} (load ${last.load || 0})`;
    }
  }
}

export function bindAthletesViewEvents() {
  // Guard pattern if you add listeners later:
  // if (window.__PIQ_BOUND_ATHLETES__) return;
  // window.__PIQ_BOUND_ATHLETES__ = true;
}
