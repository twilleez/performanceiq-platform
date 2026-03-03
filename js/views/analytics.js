// /js/views/analytics.js
// FIX BUG-7: compare-controls was single-column; now 3-col grid.
// IMP-2: Added empty state when no athletes exist.
// IMP-3: Color-coded PerformanceIQ and PIQ scores.
// IMP: Color-coded ACWR with risk badges.
// IMP: Added "export hint" for no-data states.

import { STATE, ATHLETES } from "../state/state.js";
import { computePIQ } from "../features/piqScore.js";
import { computeACWR } from "../features/acwr.js";
import { toast } from "../services/toast.js";
import { computeAthleteScoreV1, explainScore } from "../features/scoring.js";

function $(id) { return document.getElementById(id); }

function latestWellness(a) {
  const w = a?.history?.wellness;
  if (!Array.isArray(w) || !w.length) return null;
  return w[w.length - 1];
}

function scoreColorClass(score) {
  if (score >= 70) return "ok-text";
  if (score >= 50) return "warn-text";
  return "danger-text";
}

function acwrBadgeHTML(acwr) {
  if (acwr == null) return `<span class="muted">—</span>`;
  const v = Number(acwr);
  const txt = v.toFixed(2);
  if (v > 1.5) return `<span class="danger-text" style="font-weight:700">${txt} ⚠</span>`;
  if (v > 1.3) return `<span class="warn-text" style="font-weight:700">${txt} ↑</span>`;
  if (v < 0.5) return `<span class="warn-text">${txt} ↓</span>`;
  return `<span class="ok-text">${txt}</span>`;
}

export function renderAnalytics() {
  const sub = $("analyticsSub");
  if (sub) sub.textContent = ATHLETES.length ? "Team analytics snapshot" : "Add athletes to see analytics";

  const body = $("analyticsBody");
  if (!body) return;

  body.innerHTML = "";

  // IMP-2: Empty state when no athletes
  if (!ATHLETES.length) {
    body.innerHTML = `
      <div class="empty-state" style="text-align:center;padding:48px 24px">
        <div style="font-size:40px;margin-bottom:16px">📊</div>
        <div class="empty-title">No athlete data yet</div>
        <div class="empty-sub" style="max-width:360px;margin:8px auto 20px">
          Add athletes via onboarding or import a backup to see performance analytics, ACWR trends, and PerformanceIQ scores.
        </div>
        <button class="btn" type="button" onclick="document.getElementById('importFileInput')?.click()">📥 Import Roster</button>
      </div>
    `;
    return;
  }

  // FIX BUG-7: 3-col grid for athlete comparison selects
  const picker = document.createElement("div");
  picker.className = "compare-bar";
  picker.innerHTML = `
    <div class="compare-title">Compare athletes (2–3)</div>
    <div class="compare-controls" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px"></div>
    <div class="compare-note">Showing PerformanceIQ breakdown. Leave selects empty to show all athletes.</div>
  `;
  const controls = picker.querySelector(".compare-controls");

  const selects = [];
  for (let i = 0; i < 3; i++) {
    const sel = document.createElement("select");
    sel.className = "select";
    sel.setAttribute("aria-label", `Comparison athlete ${i + 1}`);

    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = i < 2 ? "Select athlete…" : "Optional 3rd…";
    sel.appendChild(empty);

    ATHLETES.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.name;
      sel.appendChild(opt);
    });

    selects.push(sel);
    controls.appendChild(sel);
  }

  body.appendChild(picker);

  // Table
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Athlete</th>
        <th>PerformanceIQ</th>
        <th>PIQ (wellness)</th>
        <th>ACWR</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  tableWrap.appendChild(table);
  body.appendChild(tableWrap);

  // Score breakdown panel
  const breakdownPanel = document.createElement("div");
  breakdownPanel.id = "analyticsBreakdown";
  breakdownPanel.style.marginTop = "16px";
  body.appendChild(breakdownPanel);

  function renderBreakdown(a, perf) {
    const subs = perf.subscores || {};
    const subItems = [
      { label: "Training Consistency", val: subs.trainingConsistency ?? 0, weight: "30%" },
      { label: "Wellness (PIQ)", val: subs.wellnessPIQ ?? 0, weight: "25%" },
      { label: "Load Balance", val: subs.loadBalance ?? 0, weight: "20%" },
      { label: "Nutrition Adherence", val: subs.nutritionAdherence ?? 0, weight: "15%" },
    ];
    const barItems = subItems.map((item) => {
      const cls = item.val >= 70 ? "var(--ok)" : item.val >= 50 ? "var(--warn)" : "var(--danger)";
      return `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <span>${item.label}</span>
            <span style="font-weight:700;color:${cls}">${item.val}</span>
          </div>
          <div class="piq-bar" style="height:8px">
            <div class="piq-fill" style="width:${item.val}%;background:${cls}"></div>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Weight: ${item.weight}</div>
        </div>
      `;
    }).join("");

    breakdownPanel.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">${a.name} — Score Breakdown</div>
          <div class="pill ${scoreColorClass(perf.total).replace("-text", "").trim()}">${perf.total}/100</div>
        </div>
        <div class="panel-body" style="padding:14px 20px">
          ${barItems}
          ${perf.injuryPenalty ? `<div class="piq-alert danger" style="margin-top:8px"><span class="piq-alert-icon">⚠</span><span>Injury penalty: -${perf.injuryPenalty} points</span></div>` : ""}
        </div>
      </div>
    `;
  }

  function renderSelected() {
    const ids = selects.map((s) => s.value).filter(Boolean);
    const unique = Array.from(new Set(ids)).slice(0, 3);

    const chosen = unique.length
      ? ATHLETES.filter((a) => unique.includes(a.id))
      : ATHLETES.slice(0, 10);

    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";

    chosen.forEach((a) => {
      const w = latestWellness(a) || {};
      const piq = computePIQ({
        sleep: w.sleep, soreness: w.soreness, stress: w.stress, mood: w.mood, readiness: w.readiness,
      });
      const acwr = computeACWR(a?.history?.sessions || []);
      const perf = computeAthleteScoreV1(a, { state: STATE });

      // IMP-3: Color-coded scores
      const perfCls = scoreColorClass(perf.total);
      const piqCls = scoreColorClass(piq.score);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:600">${a.name}</td>
        <td>
          <span class="pill tiny ${perfCls}" style="font-weight:800;font-size:15px">${perf.total ?? "—"}</span>
        </td>
        <td>
          <span class="pill tiny ${piqCls}" style="font-weight:700">${piq.score ?? "—"}</span>
        </td>
        <td>${acwrBadgeHTML(acwr)}</td>
        <td>
          <button class="btn ghost btn-sm" type="button" 
            aria-label="Show PerformanceIQ breakdown for ${a.name}">
            Breakdown
          </button>
        </td>
      `;

      tr.querySelector("button")?.addEventListener("click", () => {
        renderBreakdown(a, perf);
        breakdownPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });

      tbody.appendChild(tr);
    });

    // Auto-show breakdown for first athlete when single athlete selected
    if (chosen.length === 1) {
      const perf = computeAthleteScoreV1(chosen[0], { state: STATE });
      renderBreakdown(chosen[0], perf);
    } else {
      breakdownPanel.innerHTML = `<div class="compare-note" style="padding:10px 0">Select a single athlete or click Breakdown to see score detail.</div>`;
    }
  }

  selects.forEach((s) => s.addEventListener("change", renderSelected));
  renderSelected();
}
