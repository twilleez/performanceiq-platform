// /js/views/analytics.js
import { STATE, ATHLETES } from "../state/state.js";
import { computePIQ } from "../features/piqScore.js";
import { computeACWR } from "../features/acwr.js";
import { toast } from "../services/toast.js";

// NEW: Score Engine v1
import { computeAthleteScoreV1, explainScore } from "../features/scoring.js";

function $(id) { return document.getElementById(id); }

function latestWellness(a) {
  const w = a?.history?.wellness;
  if (!Array.isArray(w) || !w.length) return null;
  return w[w.length - 1];
}

export function renderAnalytics() {
  const sub = $("analyticsSub");
  if (sub) sub.textContent = ATHLETES.length ? "Team analytics snapshot" : "Add athletes to see analytics";

  const body = $("analyticsBody");
  if (!body) return;

  body.innerHTML = "";

  // Comparison picker
  const picker = document.createElement("div");
  picker.className = "compare-bar";
  picker.innerHTML = `
    <div class="compare-title">Compare athletes (2–3)</div>
    <div class="compare-controls"></div>
    <div class="compare-note">PerformanceIQ breakdown is shown per athlete (includes PIQ wellness).</div>
  `;
  const controls = picker.querySelector(".compare-controls");

  const selects = [];
  for (let i = 0; i < 3; i++) {
    const sel = document.createElement("select");
    sel.className = "select";
    sel.setAttribute("aria-label", `Comparison athlete ${i + 1}`);
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = i < 2 ? "Select athlete" : "Optional";
    sel.appendChild(empty);

    ATHLETES.forEach(a => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.name;
      sel.appendChild(opt);
    });

    selects.push(sel);
    controls.appendChild(sel);
  }

  body.appendChild(picker);

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
        <th>Breakdown</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  tableWrap.appendChild(table);
  body.appendChild(tableWrap);

  function renderSelected() {
    const ids = selects.map(s => s.value).filter(Boolean);
    const unique = Array.from(new Set(ids)).slice(0, 3);

    const chosen = unique.length
      ? ATHLETES.filter(a => unique.includes(a.id))
      : ATHLETES.slice(0, 10);

    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";

    chosen.forEach(a => {
      const w = latestWellness(a) || {};
      const piq = computePIQ({
        sleep: w.sleep, soreness: w.soreness, stress: w.stress, mood: w.mood, readiness: w.readiness
      });

      const acwr = computeACWR(a?.history?.sessions || []);

      const perf = computeAthleteScoreV1(a, { state: STATE });
      const bullets = explainScore(perf);

      const piqBreakdownText = (piq.breakdown || [])
        .map(b => `${b.key}: ${b.value}/10 (w ${Math.round(b.weight * 100)}%)`)
        .join(" · ");

      const perfSub = perf.subscores || {};
      const perfSubsText = [
        `Training ${perfSub.trainingConsistency ?? "—"}`,
        `Wellness(PIQ) ${perfSub.wellnessPIQ ?? "—"}`,
        `Load ${perfSub.loadBalance ?? "—"}`,
        `Nutrition ${perfSub.nutritionAdherence ?? "—"}`,
        `Injury -${perf.injuryPenalty ?? 0}`
      ].join(" · ");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${a.name}</td>
        <td><span class="pill tiny">${perf.total ?? "—"}</span></td>
        <td><span class="pill tiny">${piq.score ?? "—"}</span></td>
        <td>${acwr == null ? "—" : acwr.toFixed(2)}</td>
        <td><button class="link-btn" type="button" aria-label="Show PerformanceIQ breakdown for ${a.name}">View</button></td>
      `;

      tr.querySelector("button")?.addEventListener("click", () => {
        // Show a compact Elite explanation: total + subs + key “why” bullets + PIQ detail
        const msg = [
          `${a.name} PerformanceIQ: ${perf.total}/100`,
          perfSubsText,
          bullets.slice(0, 4).join(" "),
          `PIQ detail: ${piqBreakdownText || "—"}`
        ].filter(Boolean).join(" — ");

        toast(msg, { timeout: 6500 });
      });

      tbody.appendChild(tr);
    });
  }

  selects.forEach(s => s.addEventListener("change", renderSelected));
  renderSelected();
}
