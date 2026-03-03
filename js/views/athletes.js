// /js/views/athletes.js
// FIX BUG-6: Back button re-added on every render → memory leak + multi-fire.
//            Fixed with module-level _backBound guard.
// IMPROVEMENT IMP-4: Added ACWR display on athlete cards with color coding.
// IMPROVEMENT: Improved empty state + no-results messaging.
// IMPROVEMENT: Color-coded PIQ and risk in detail view.

import { ATHLETES } from "../state/state.js";
import { toast } from "../services/toast.js";
import { computePIQ } from "../features/piqScore.js";
import { computeACWR } from "../features/acwr.js";
import { computeRisk } from "../features/riskDetection.js";

function $(id) { return document.getElementById(id); }

// FIX BUG-6: module-level flag prevents re-binding back button
let _backBound = false;

function latestWellness(a) {
  const w = a?.history?.wellness;
  if (!Array.isArray(w) || !w.length) return null;
  return w[w.length - 1];
}

function latestSessions(a) {
  const s = a?.history?.sessions;
  return Array.isArray(s) ? s : [];
}

function acwrBadge(acwr) {
  if (acwr == null) return { text: "—", cls: "" };
  const v = Number(acwr);
  if (v > 1.5) return { text: acwr.toFixed(2), cls: "danger" };
  if (v > 1.3) return { text: acwr.toFixed(2), cls: "warn" };
  if (v < 0.5) return { text: acwr.toFixed(2), cls: "warn" };
  return { text: acwr.toFixed(2), cls: "ok" };
}

function piqColorClass(score) {
  if (score >= 70) return "ok-text";
  if (score >= 50) return "warn-text";
  return "danger-text";
}

function riskChipForAthlete(a) {
  const r = computeRisk(a);
  const cls =
    r.colorClass === "risk" ? "chip danger" :
    r.colorClass === "watch" ? "chip warn" :
    r.colorClass === "nodata" ? "chip" : "chip ok";
  return { label: r.label, cls, risk: r };
}

export function renderAthletesView(filterText = "") {
  const grid = $("athleteCardGrid");
  const countSub = $("athleteCountSub");
  const detail = $("athleteDetail");

  if (!grid) return;

  detail && (detail.style.display = "none");
  grid.style.display = "";

  const q = String(filterText || "").trim().toLowerCase();
  const list = ATHLETES.filter(a => !q || String(a.name).toLowerCase().includes(q));

  if (countSub) countSub.textContent = `${list.length} athlete${list.length === 1 ? "" : "s"}`;
  grid.innerHTML = "";

  // Empty roster state
  if (!ATHLETES.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-title">No athletes yet</div>
      <div class="empty-sub">Add athletes via onboarding or import a JSON backup to get started.</div>
      <div class="empty-actions" style="display:flex;gap:8px;margin-top:12px">
        <button class="btn" id="emptyImportBtn" type="button">📥 Import roster</button>
        <button class="btn ghost" id="emptyOnboardBtn" type="button">✨ Run setup</button>
      </div>
    `;
    grid.appendChild(empty);
    empty.querySelector("#emptyImportBtn")
      ?.addEventListener("click", () => document.getElementById("importFileInput")?.click());
    empty.querySelector("#emptyOnboardBtn")
      ?.addEventListener("click", () => {
        try { window.dispatchEvent(new Event("piq:showOnboarding")); } catch {}
      });
    return;
  }

  // No-results state after filter
  if (!list.length && q) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-title">No results for "${q}"</div>
      <div class="empty-sub">Try a different name or clear the search.</div>
    `;
    grid.appendChild(empty);
    return;
  }

  // Render athlete cards
  list.forEach((a) => {
    const w = latestWellness(a);
    const piq = computePIQ({
      sleep: w?.sleep, soreness: w?.soreness, stress: w?.stress, mood: w?.mood, readiness: w?.readiness,
    });
    const r = riskChipForAthlete(a);
    const acwr = computeACWR(latestSessions(a));
    const ab = acwrBadge(acwr);
    const piqCls = piqColorClass(piq.score);

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
      <div class="athlete-score" style="display:flex;align-items:baseline;gap:10px;margin-top:10px">
        <div>
          <div class="score-num ${piqCls}">${piq.score}</div>
          <div class="score-sub">PIQ score</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div class="score-num ${ab.cls}-text" style="font-size:18px">${ab.text}</div>
          <div class="score-sub">ACWR</div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => openAthleteDetail(a.id));
    grid.appendChild(card);
  });

  // FIX BUG-6: Only bind back button once using module-level flag
  if (!_backBound) {
    _backBound = true;
    const back = $("backToList");
    back?.addEventListener("click", () => {
      if (detail) detail.style.display = "none";
      grid.style.display = "";
    });
  }
}

export function openAthleteDetail(athleteId) {
  const a = ATHLETES.find((x) => x.id === athleteId);
  if (!a) return;

  const grid = $("athleteCardGrid");
  const detail = $("athleteDetail");
  if (!grid || !detail) return;

  grid.style.display = "none";
  detail.style.display = "";

  const hero = $("detailHero");
  const tier = $("detailTier");
  const note = $("detailScoreNote");
  const loadEl = $("detailLoad");
  const wellnessEl = $("detailWellness");
  const workoutEl = $("detailWorkout");
  const insightEl = $("detailInsight");

  const w = latestWellness(a);
  const piq = computePIQ({
    sleep: w?.sleep, soreness: w?.soreness, stress: w?.stress, mood: w?.mood, readiness: w?.readiness,
  });

  const sessions = latestSessions(a);
  const acwr = computeACWR(sessions);
  const risk = computeRisk(a);
  const ab = acwrBadge(acwr);

  if (hero) hero.textContent = a.name;

  if (tier) {
    const riskColorMap = { risk: "danger-text", watch: "warn-text", ready: "ok-text", nodata: "muted" };
    tier.className = riskColorMap[risk.colorClass] || "";
    tier.textContent = `Risk: ${risk.label}`;
  }

  if (note) {
    const piqCls = piqColorClass(piq.score);
    note.innerHTML = `PIQ: <span class="${piqCls}" style="font-weight:800">${piq.score}</span> / 100 · See Analytics for full breakdown`;
  }

  if (loadEl) {
    const acwrCls = ab.cls ? `${ab.cls}-text` : "";
    loadEl.innerHTML = acwr == null
      ? "ACWR: <span class='muted'>No session data</span>"
      : `ACWR: <span class="${acwrCls}" style="font-weight:800">${acwr.toFixed(2)}</span>${acwr > 1.5 ? " ⚠ High load" : acwr > 1.3 ? " ↑ Elevated" : ""}`;
  }

  if (wellnessEl) {
    wellnessEl.innerHTML = w
      ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
          <div>😴 Sleep: <strong>${w.sleep}/10</strong></div>
          <div>💪 Soreness: <strong>${w.soreness}/10</strong></div>
          <div>🧠 Stress: <strong>${w.stress}/10</strong></div>
          <div>😊 Mood: <strong>${w.mood}/10</strong></div>
          <div>⚡ Readiness: <strong>${w.readiness}/10</strong></div>
        </div>`
      : `<div class="muted" style="margin-top:4px">No wellness log yet. Use the Wellness view to log today's check-in.</div>`;
  }

  if (workoutEl) {
    if (!sessions.length) {
      workoutEl.innerHTML = `<span class="muted">No sessions logged yet.</span>`;
    } else {
      const last = sessions[sessions.length - 1];
      workoutEl.textContent = `Last session: ${last.type || "Session"} on ${last.date || "—"} (load ${last.load ?? 0})`;
    }
  }

  if (insightEl) {
    const msg =
      risk.colorClass === "risk" ? "⛔ Reduce training load and prioritize recovery. Consider rest day." :
      risk.colorClass === "watch" ? "⚠ Monitor soreness/stress closely. Keep volume controlled." :
      risk.colorClass === "ready" ? "✅ Cleared to train at full intensity. Keep progressing." :
      "📊 Log wellness + sessions to unlock personalized insights.";
    insightEl.innerHTML = `<span>${msg}</span>`;
  }
}

export function bindAthletesViewEvents() {
  const filter = document.getElementById("athleteFilterInput");
  filter?.addEventListener("input", (e) => renderAthletesView(e.target.value || ""));
}
