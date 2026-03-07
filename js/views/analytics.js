// /js/views/analytics.js — Performance analytics and PIQ history

import { STATE, getACWRStatus } from "../state/state.js";
import { computePerformanceScore, normalizePerformance } from "../engine/scoringEngine.js";

export function renderAnalytics() {
  const state = STATE || {};

  const loadData = state.loadData || {};
  const performanceResults = Array.isArray(state.performanceResults) ? state.performanceResults : [];
  const piqHistory = Array.isArray(state.piqHistory) ? state.piqHistory : [];

  const acwr = toNumber(loadData.acwr, 1.0);
  const acute = toNumber(loadData.acute, 0);
  const chronic = toNumber(loadData.chronic, 0);

  const { cls: acwrCls, label: acwrLabel } = safeGetACWRStatus(acwr);
  const perfScore = safeComputePerformanceScore(performanceResults);

  return `
    <div class="page-header">
      <h1 class="page-title">Analytics</h1>
      <p class="page-subtitle">Performance tracking, load management, and PIQ score history</p>
    </div>

    <div class="card card-xl" style="margin-bottom:20px;">
      <div class="card-header">
        <span class="card-title">PIQ Score — 14-Day History</span>
        <div style="display:flex;align-items:center;gap:16px;">
          <span style="font-size:12px;color:var(--text-muted);">
            Trend:
            <span style="color:var(--green);">${renderTrendText(piqHistory)}</span>
          </span>
        </div>
      </div>
      <div style="height:180px;position:relative;margin-top:8px;">
        ${renderPIQChart(piqHistory)}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;">
        <span style="font-size:10px;color:var(--text-muted);">${getHistoryStartLabel(piqHistory)}</span>
        <span style="font-size:10px;color:var(--text-muted);">${getHistoryEndLabel(piqHistory)}</span>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Workload (ACWR)</span>
        </div>

        <div style="display:flex;align-items:center;gap:20px;margin-bottom:16px;flex-wrap:wrap;">
          <div style="text-align:center;min-width:120px;">
            <div class="acwr-value ${escapeHtml(acwrCls)}" style="font-size:48px;">${formatNumber(acwr, 2)}</div>
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-top:4px;">
              ${escapeHtml(acwrLabel)}
            </div>
          </div>
          <div style="flex:1;min-width:220px;">
            ${renderACWRZones(acwr)}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:12px;">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">
              7-Day Load
            </div>
            <div style="font-family:var(--font-display);font-weight:900;font-size:24px;">
              ${formatNumber(acute, 0)}<span style="font-size:12px;font-weight:400;color:var(--text-muted)"> AU</span>
            </div>
          </div>

          <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:12px;">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">
              28-Day Avg
            </div>
            <div style="font-family:var(--font-display);font-weight:900;font-size:24px;">
              ${formatNumber(chronic, 0)}<span style="font-size:12px;font-weight:400;color:var(--text-muted)"> AU</span>
            </div>
          </div>
        </div>

        <div class="alert alert-info" style="margin-top:12px;font-size:12px;">
          ${renderACWRGuidance(acwr)}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Performance Tests</span>
          <span style="font-family:var(--font-display);font-weight:900;font-size:20px;color:var(--accent);">
            ${escapeHtml(String(perfScore))}
          </span>
        </div>

        ${
          performanceResults.length
            ? performanceResults.map((r) => renderTestRow(r)).join("")
            : `
              <div style="font-size:13px;color:var(--text-muted);padding:8px 0 4px;">
                No performance test data available yet.
              </div>
            `
        }

        <div class="alert alert-info" style="margin-top:12px;font-size:12px;">
          Performance score reflects test percentile ranking vs. sport norms. Retest in 2 weeks.
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">PIQ Score Components — Explained</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
        ${renderPIQComponentCards()}
      </div>
    </div>
  `;
}

export function afterRenderAnalytics() {
  // reserved for future chart/event hooks
}

function renderPIQChart(historyInput) {
  const history = Array.isArray(historyInput) ? historyInput.filter((d) => d && isFiniteNumber(d.score)) : [];

  if (history.length === 0) {
    return `
      <div style="height:100%;display:grid;place-items:center;color:var(--text-muted);font-size:13px;">
        No PIQ history available yet.
      </div>
    `;
  }

  if (history.length === 1) {
    const only = history[0];
    return `
      <svg width="100%" height="180" viewBox="0 0 800 160" preserveAspectRatio="none" style="overflow:visible;">
        <circle cx="400" cy="80" r="6" fill="var(--accent)"></circle>
        <text x="400" y="64" fill="var(--accent)" font-size="12" text-anchor="middle" font-weight="700">${escapeHtml(
          String(only.score)
        )}</text>
      </svg>
    `;
  }

  const n = history.length;
  const w = 800;
  const h = 160;
  const pad = { left: 30, right: 10, top: 10, bottom: 10 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const xStep = iw / Math.max(n - 1, 1);
  const minY = 50;
  const maxY = 100;

  const toX = (i) => pad.left + i * xStep;
  const toY = (v) => pad.top + ih - ((clamp(v, minY, maxY) - minY) / (maxY - minY)) * ih;

  const pathParts = history.map((d, i) => {
    const x = toX(i).toFixed(1);
    const y = toY(Number(d.score)).toFixed(1);
    return `${i === 0 ? "M" : "L"} ${x},${y}`;
  });

  const linePath = pathParts.join(" ");
  const fillPath = [
    ...pathParts,
    `L ${toX(n - 1).toFixed(1)},${(pad.top + ih).toFixed(1)}`,
    `L ${pad.left.toFixed(1)},${(pad.top + ih).toFixed(1)}`,
    "Z",
  ].join(" ");

  const gridLines = [60, 70, 80, 90]
    .map((v) => {
      const y = toY(v).toFixed(1);
      return `
        <line x1="${pad.left}" y1="${y}" x2="${w - pad.right}" y2="${y}" stroke="var(--border-subtle)" stroke-width="1"/>
        <text
          x="${(pad.left - 4).toFixed(0)}"
          y="${(parseFloat(y) + 4).toFixed(0)}"
          fill="var(--text-muted)"
          font-size="9"
          text-anchor="end"
          font-family="Barlow Condensed"
        >${v}</text>
      `;
    })
    .join("");

  const last = history[n - 1];
  const lastX = toX(n - 1).toFixed(1);
  const lastY = toY(Number(last.score)).toFixed(1);

  return `
    <svg width="100%" height="180" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="overflow:visible;">
      <defs>
        <linearGradient id="piqGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${fillPath}" fill="url(#piqGrad)"/>
      <path d="${linePath}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${lastX}" cy="${lastY}" r="5" fill="var(--accent)" filter="drop-shadow(0 0 6px rgba(0,229,160,0.6))"/>
      <text
        x="${lastX}"
        y="${(parseFloat(lastY) - 10).toFixed(0)}"
        fill="var(--accent)"
        font-size="11"
        text-anchor="middle"
        font-family="Barlow Condensed"
        font-weight="700"
      >${escapeHtml(String(last.score))}</text>
    </svg>
  `;
}

function renderACWRZones(acwr) {
  const zones = [
    { label: "Undertrained", range: "< 0.8", min: 0, max: 0.8, color: "var(--blue)" },
    { label: "Optimal", range: "0.8–1.3", min: 0.8, max: 1.3, color: "var(--green)" },
    { label: "High Risk", range: "1.3–1.5", min: 1.3, max: 1.5, color: "var(--orange)" },
    { label: "Danger", range: "≥ 1.5", min: 1.5, max: Infinity, color: "var(--red)" },
  ];

  return zones
    .map((z
