// /js/views/dashboard.js
import { STATE, ATHLETES } from "../state/state.js";
import { computePIQ } from "../features/piqScore.js";
import { computeACWR } from "../features/acwr.js";

function $(id) { return document.getElementById(id); }

function latestWellness(a) {
  const w = a?.history?.wellness;
  if (!Array.isArray(w) || !w.length) return null;
  return w[w.length - 1];
}

function riskFromACWR(acwr) {
  if (acwr == null) return { label: "—", sub: "No load history" };
  if (acwr < 0.8) return { label: "Low", sub: "Underload risk" };
  if (acwr <= 1.3) return { label: "OK", sub: "In range" };
  if (acwr <= 1.6) return { label: "Elevated", sub: "Monitor closely" };
  return { label: "High", sub: "Reduce load" };
}

export function renderDashboard() {
  // Header
  const title = $("dashTitle");
  const sub = $("dashSub");
  if (title) title.textContent = STATE.teamName || "PerformanceIQ";
  if (sub) sub.textContent = `${STATE.sport?.charAt(0).toUpperCase() + STATE.sport?.slice(1)} · ${STATE.season}`;

  // Stats aggregate
  const scores = ATHLETES.map(a => {
    const w = latestWellness(a);
    return computePIQ({ sleep: w?.sleep, soreness: w?.soreness, stress: w?.stress, mood: w?.mood, readiness: w?.readiness }).score;
  });

  const avg = scores.length ? Math.round(scores.reduce((s,x)=>s+x,0)/scores.length) : 0;

  const acwrs = ATHLETES.map(a => computeACWR(a?.history?.sessions || [])).filter(v => typeof v === "number" && isFinite(v));
  const acwrAvg = acwrs.length ? (acwrs.reduce((s,x)=>s+x,0)/acwrs.length) : null;
  const risk = riskFromACWR(acwrAvg);

  const statAvg = $("statAvg");
  const statAvgSub = $("statAvgSub");
  const statReady = $("statReady");
  const statReadySub = $("statReadySub");
  const statRisk = $("statRisk");
  const statRiskSub = $("statRiskSub");

  if (statAvg) statAvg.textContent = String(avg || "—");
  if (statAvgSub) statAvgSub.textContent = scores.length ? "Team avg PIQ" : "No athletes yet";
  if (statReady) statReady.textContent = scores.length ? String(avg) : "—";
  if (statReadySub) statReadySub.textContent = "Readiness proxy";
  if (statRisk) statRisk.textContent = risk.label;
  if (statRiskSub) statRiskSub.textContent = risk.sub;

  // Roster mini
  const rosterMini = $("rosterMini");
  if (rosterMini) {
    rosterMini.innerHTML = "";
    if (!ATHLETES.length) {
      rosterMini.innerHTML = `<div class="empty-mini">Add athletes to see your roster here.</div>`;
    } else {
      ATHLETES.slice(0, 5).forEach(a => {
        const row = document.createElement("div");
        row.className = "roster-row";
        row.textContent = a.name;
        rosterMini.appendChild(row);
      });
    }
  }

  // View all link
  const viewAll = $("viewAllAthletes");
  if (viewAll) {
    viewAll.setAttribute("href", "#athletes");
    viewAll.setAttribute("role", "link");
  }
}
