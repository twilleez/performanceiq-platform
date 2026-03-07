// js/views/analytics.js — Performance analytics and PIQ history

import { state, getACWRStatus } from '../state/state.js';
import { computePerformanceScore, normalizePerformance } from '../engine/scoringEngine.js';

export function renderAnalytics() {
  const { cls: acwrCls, label: acwrLabel } = getACWRStatus(state.loadData.acwr);
  const perfScore = computePerformanceScore(state.performanceResults);

  return `
    <div class="page-header">
      <h1 class="page-title">Analytics</h1>
      <p class="page-subtitle">Performance tracking, load management, and PIQ score history</p>
    </div>

    <!-- PIQ Score History -->
    <div class="card card-xl" style="margin-bottom:20px;">
      <div class="card-header">
        <span class="card-title">PIQ Score — 14-Day History</span>
        <div style="display:flex;align-items:center;gap:16px;">
          <span style="font-size:12px;color:var(--text-muted);">Trend: <span style="color:var(--green);">↑ +5 this week</span></span>
        </div>
      </div>
      <div style="height:180px;position:relative;margin-top:8px;">
        ${renderPIQChart()}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;">
        <span style="font-size:10px;color:var(--text-muted);">Feb 21</span>
        <span style="font-size:10px;color:var(--text-muted);">Today</span>
      </div>
    </div>

    <!-- Load Management -->
    <div class="grid-2" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Workload (ACWR)</span>
        </div>
        <div style="display:flex;align-items:center;gap:20px;margin-bottom:16px;">
          <div style="text-align:center;">
            <div class="acwr-value ${acwrCls}" style="font-size:48px;">${state.loadData.acwr}</div>
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-top:4px;">${acwrLabel}</div>
          </div>
          <div style="flex:1;">
            ${renderACWRZones(state.loadData.acwr)}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:12px;">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">7-Day Load</div>
            <div style="font-family:var(--font-display);font-weight:900;font-size:24px;">${state.loadData.acute}<span style="font-size:12px;font-weight:400;color:var(--text-muted)"> AU</span></div>
          </div>
          <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:12px;">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">28-Day Avg</div>
            <div style="font-family:var(--font-display);font-weight:900;font-size:24px;">${state.loadData.chronic}<span style="font-size:12px;font-weight:400;color:var(--text-muted)"> AU</span></div>
          </div>
        </div>
        <div class="alert alert-info" style="margin-top:12px;font-size:12px;">
          ACWR in the optimal zone (0.8–1.3). Keep this ratio here to maximize adaptation while minimizing injury risk.
        </div>
      </div>

      <!-- Performance Test Summary -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Performance Tests</span>
          <span style="font-family:var(--font-display);font-weight:900;font-size:20px;color:var(--accent);">${perfScore}</span>
        </div>
        ${state.performanceResults.map(r => renderTestRow(r)).join('')}
        <div class="alert alert-info" style="margin-top:12px;font-size:12px;">
          Performance score reflects test percentile ranking vs. sport norms. Retest in 2 weeks.
        </div>
      </div>
    </div>

    <!-- PIQ Component Breakdown Over Time -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">PIQ Score Components — Explained</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;">
        ${renderPIQComponentCards()}
      </div>
    </div>
  `;
}

function renderPIQChart() {
  const history = state.piqHistory;
  const n = history.length;
  const w = 800, h = 160;
  const pad = { left: 30, right: 10, top: 10, bottom: 10 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;
  const xStep = iw / (n - 1);
  const minY = 50, maxY = 100;

  const toX = i => pad.left + i * xStep;
  const toY = v => pad.top + ih - ((v - minY) / (maxY - minY)) * ih;

  const pathParts = history.map((d, i) => {
    const x = toX(i).toFixed(1);
    const y = toY(d.score).toFixed(1);
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  });

  const fillPath = [...pathParts, `L ${toX(n-1).toFixed(1)},${(pad.top + ih).toFixed(1)}`, `L ${pad.left.toFixed(1)},${(pad.top + ih).toFixed(1)}`, 'Z'].join(' ');
  const linePath = pathParts.join(' ');

  // Grid lines at 60, 70, 80, 90
  const gridLines = [60, 70, 80, 90].map(v => {
    const y = toY(v).toFixed(1);
    return `<line x1="${pad.left}" y1="${y}" x2="${w - pad.right}" y2="${y}" stroke="var(--border-subtle)" stroke-width="1"/>
            <text x="${(pad.left - 4).toFixed(0)}" y="${(parseFloat(y) + 4).toFixed(0)}" fill="var(--text-muted)" font-size="9" text-anchor="end" font-family="Barlow Condensed">${v}</text>`;
  }).join('');

  // Dot for today
  const lastX = toX(n-1).toFixed(1);
  const lastY = toY(history[n-1].score).toFixed(1);

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
      <text x="${lastX}" y="${(parseFloat(lastY) - 10).toFixed(0)}" fill="var(--accent)" font-size="11" text-anchor="middle" font-family="Barlow Condensed" font-weight="700">${history[n-1].score}</text>
    </svg>
  `;
}

function renderACWRZones(acwr) {
  const zones = [
    { label: 'Undertrained', range: '< 0.8', min: 0, max: 0.8, color: 'var(--blue)' },
    { label: 'Optimal', range: '0.8–1.3', min: 0.8, max: 1.3, color: 'var(--green)' },
    { label: 'High Risk', range: '1.3–1.5', min: 1.3, max: 1.5, color: 'var(--orange)' },
    { label: 'Danger', range: '> 1.5', min: 1.5, max: 2.0, color: 'var(--red)' },
  ];

  return zones.map(z => {
    const active = acwr >= z.min && acwr < z.max;
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:4px 0;${active ? 'opacity:1' : 'opacity:0.4'}">
        <div style="width:8px;height:8px;border-radius:50%;background:${z.color};${active ? `box-shadow:0 0 6px ${z.color}` : ''}"></div>
        <span style="font-size:12px;${active ? 'color:var(--text-primary);font-weight:600' : 'color:var(--text-muted)'};">${z.label}</span>
        <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">${z.range}</span>
      </div>
    `;
  }).join('');
}

function renderTestRow(r) {
  const pct = normalizePerformance(r.test, r.value);
  return `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;font-weight:500;">${r.test}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-family:var(--font-display);font-weight:700;font-size:16px;">${r.value} <span style="font-size:11px;font-weight:400;color:var(--text-muted);">${r.unit}</span></span>
          <span class="stat-delta ${r.delta > 0 ? 'up' : 'down'}" style="font-size:11px;">${r.delta > 0 ? '+' : ''}${r.delta}</span>
        </div>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill accent" style="width:${pct}%"></div></div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${pct}th percentile</div>
    </div>
  `;
}

function renderPIQComponentCards() {
  const components = [
    { label: 'Readiness', weight: '30%', icon: '⚡', desc: 'Wellness inputs: sleep, soreness, stress, energy, mood.' },
    { label: 'Compliance', weight: '25%', icon: '✅', desc: 'Session completion rate over the last 7 days.' },
    { label: 'Performance', weight: '20%', icon: '🏆', desc: 'Normalized performance test results vs. sport norms.' },
    { label: 'Recovery', weight: '15%', icon: '💚', desc: 'Recovery score based on fatigue reduction trends.' },
    { label: 'Nutrition', weight: '10%', icon: '🥗', desc: 'Target calorie and protein adherence score.' },
  ];
  return components.map(c => `
    <div style="background:var(--bg-elevated);border-radius:var(--radius);padding:14px;text-align:center;">
      <div style="font-size:24px;margin-bottom:8px;">${c.icon}</div>
      <div style="font-family:var(--font-display);font-weight:700;font-size:14px;margin-bottom:2px;">${c.label}</div>
      <div style="font-family:var(--font-display);font-weight:900;font-size:20px;color:var(--accent);margin-bottom:8px;">${c.weight}</div>
      <div style="font-size:11px;color:var(--text-muted);line-height:1.4;">${c.desc}</div>
    </div>
  `).join('');
}

export function afterRenderAnalytics() {}
