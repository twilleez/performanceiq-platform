// /js/views/dashboard.js
import { STATE, ATHLETES } from "../state/state.js";
import { computePIQ } from "../features/piqScore.js";
import { computeACWR } from "../features/acwr.js";
import { computeRisk } from "../features/riskDetection.js";
import { renderHeatmapHTML } from "../features/heatmap.js";

function $(id) { return document.getElementById(id); }

function latestWellness(a) {
  const w = a?.history?.wellness;
  if (!Array.isArray(w) || !w.length) return null;
  return w[w.length - 1];
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function flagFrom(piq, acwr) {
  // ACWR ranges: <1.3 safe, 1.3–1.6 watch, >1.6 risk (simple heuristic)
  // PIQ bands: >=70 good, 55–69 watch, <55 risk (simple heuristic)
  const p = safeNum(piq);
  const a = safeNum(acwr);

  const acwrFlag =
    a == null ? "unknown" :
    a <= 1.3 ? "ready" :
    a <= 1.6 ? "watch" : "risk";

  const piqFlag =
    p == null ? "unknown" :
    p >= 70 ? "ready" :
    p >= 55 ? "watch" : "risk";

  // Combine: worst wins
  const order = { unknown: 0, ready: 1, watch: 2, risk: 3 };
  const combined = order[acwrFlag] > order[piqFlag] ? acwrFlag : piqFlag;

  return combined;
}

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

export function renderDashboard() {
  // Header
  const title = $("dashTitle");
  const sub = $("dashSub");
  if (title) title.textContent = STATE.teamName || "PerformanceIQ";
  if (sub) sub.textContent = `${(STATE.sport || "sport").charAt(0).toUpperCase() + (STATE.sport || "sport").slice(1)} · ${STATE.season || "Season"}`;

  // Per-athlete metrics
  const rows = ATHLETES.map(a => {
    const w = latestWellness(a);
    const piq = computePIQ({
      sleep: w?.sleep, soreness: w?.soreness, stress: w?.stress, mood: w?.mood, readiness: w?.readiness
    }).score;

    const acwr = computeACWR(a?.history?.sessions || []);
    const risk = computeRisk(a);
    const flag = risk.colorClass === "risk" ? "risk" : (risk.colorClass === "watch" ? "watch" : (risk.colorClass === "nodata" ? "unknown" : "ready"));

    return { athlete: a, piq, acwr: safeNum(acwr), flag, risk };
  });

  // Stats
  const piqVals = rows.map(r => r.piq).filter(v => Number.isFinite(v));
  const avg = piqVals.length ? Math.round(piqVals.reduce((s, x) => s + x, 0) / piqVals.length) : null;

  const readyCount = rows.filter(r => r.flag === "ready").length;
  const watchCount = rows.filter(r => r.flag === "watch").length;
  const riskCount = rows.filter(r => r.flag === "risk").length;

  const statAvg = $("statAvg");
  const statAvgSub = $("statAvgSub");
  const statReady = $("statReady");
  const statReadySub = $("statReadySub");
  const statRisk = $("statRisk");
  const statRiskSub = $("statRiskSub");
  const statRoster = $("statRoster");

  if (statAvg) statAvg.textContent = avg == null ? "—" : String(avg);
  if (statAvgSub) statAvgSub.textContent = ATHLETES.length ? "Team avg PIQ" : "No athletes yet";

  if (statReady) statReady.textContent = ATHLETES.length ? String(readyCount) : "—";
  if (statReadySub) statReadySub.textContent = ATHLETES.length ? `of ${ATHLETES.length} athletes cleared` : "Add athletes to begin";

  if (statRisk) statRisk.textContent = ATHLETES.length ? String(riskCount) : "—";
  if (statRiskSub) statRiskSub.textContent = ATHLETES.length ? "High risk / reduce load" : "—";

  if (statRoster) statRoster.textContent = String(ATHLETES.length);

  // Team heatmap
  const heat = $("teamHeatmap");
  if (heat) heat.innerHTML = renderHeatmapHTML(ATHLETES);

  // Readiness table
  const tbody = $("readinessTable");
  if (tbody) {
    tbody.innerHTML = "";
    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="4" style="padding:16px 20px;color:rgba(255,255,255,.55);">Add athletes to populate the readiness board.</td>`;
      tbody.appendChild(tr);
    } else {
      rows
        .slice()
        .sort((a, b) => (b.piq || 0) - (a.piq || 0))
        .slice(0, 8)
        .forEach(r => {
          const initials = (r.athlete.name || "A").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
          const fill = Math.max(0, Math.min(100, Math.round(r.piq)));
          const flagLabel = r.flag === "ready" ? "● Ready" : r.flag === "watch" ? "▲ Watch" : r.flag === "risk" ? "⛔ Risk" : "—";
          const flagClass = r.flag === "ready" ? "flag-ready" : r.flag === "watch" ? "flag-watch" : r.flag === "risk" ? "flag-risk" : "";
          const acwrTxt = r.acwr == null ? "—" : r.acwr.toFixed(1);

          const tr = document.createElement("tr");
          tr.setAttribute("data-action", "open-athlete");
          tr.setAttribute("data-athlete-id", r.athlete.id);
          tr.style.cursor = "pointer";
          tr.innerHTML = `
            <td>
              <div class="athlete-name">
                <div class="athlete-avatar" style="background:linear-gradient(135deg,var(--accent), rgba(37,99,235,.55))">${initials}</div>
                ${r.athlete.name || "Athlete"}
              </div>
            </td>
            <td>
              <div class="piq-bar-wrap">
                <div class="piq-bar"><div class="piq-fill" style="width:${fill}%;background:var(--accent)"></div></div>
                <div class="piq-num">${r.piq ?? "—"}</div>
              </div>
            </td>
            <td><span class="acwr-val">${acwrTxt}</span></td>
            <td><span class="flag-dot ${flagClass}">${flagLabel}</span></td>
          `;
          tbody.appendChild(tr);
        });
    }
  }

  // Roster readiness ring + legend
  const rosterRing = $("rosterRing");
  const rosterMini = $("rosterMini");
  if (rosterRing) {
    const readyPct = pct(readyCount, ATHLETES.length);
    const CIRC = 163; // ~ 2πr with r=26 (matches design)
    const offset = Math.round(CIRC * (1 - readyPct / 100));
    rosterRing.innerHTML = `
      <div class="ring-chart">
        <svg class="ring-svg" width="80" height="80" viewBox="0 0 80 80">
          <circle class="ring-bg" cx="40" cy="40" r="26"></circle>
          <circle class="ring-fill-good" cx="40" cy="40" r="26" style="stroke-dasharray:${CIRC};stroke-dashoffset:${offset};"></circle>
        </svg>
        <div class="ring-center">
          <div class="ring-pct">${readyPct}%</div>
          <div class="ring-pct-label">ready</div>
        </div>
      </div>
    `;
  }

  if (rosterMini) {
    rosterMini.innerHTML = "";
    const mk = (color, label, count) => `
      <div class="legend-row">
        <div class="legend-dot" style="background:${color}"></div>
        <div class="legend-label">${label}</div>
        <div class="legend-count" style="color:${color}">${count}</div>
      </div>`;
    rosterMini.innerHTML = [
      mk("var(--accent)", "Ready", readyCount),
      mk("#f5a623", "Monitor", watchCount),
      mk("#ff4d4d", "At Risk", riskCount),
    ].join("");
  }

  // View all link
  const viewAll = $("viewAllAthletes");
  if (viewAll) {
    viewAll.setAttribute("href", "#/athletes");
    viewAll.setAttribute("role", "link");
  }
}
