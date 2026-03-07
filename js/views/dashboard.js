// js/views/dashboard.js — Athlete dashboard view

import { state, getReadinessLevel, getACWRStatus } from '../state/state.js';
import { computeReadiness, computeFatigueScore } from '../engine/readinessEngine.js';
import { computePIQScore, computePerformanceScore } from '../engine/scoringEngine.js';

export function renderDashboard() {
  const readiness = computeReadiness(state.wellness);
  state.readiness = readiness;

  const recoveryScore = Math.max(0, 100 - computeFatigueScore(state.wellness));
  const performanceScore = computePerformanceScore(state.performanceResults);
  const piqScore = computePIQScore({
    readiness:   readiness.score,
    compliance:  85,
    performance: performanceScore,
    recovery:    recoveryScore,
    nutrition:   70,
  });

  // Update history with today's score
  const todayEntry = state.piqHistory[state.piqHistory.length - 1];
  todayEntry.score = piqScore;

  const rl = getReadinessLevel(readiness.score);
  const { cls: acwrCls, label: acwrLabel } = getACWRStatus(state.loadData.acwr);

  return `
    <div class="page-header">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <span class="phase-badge ${state.athlete.season_phase}">
              ${formatPhase(state.athlete.season_phase)}
            </span>
            <span class="dev-stage">${formatStage(state.athlete.development_stage)}</span>
          </div>
          <h1 class="page-title">Good Morning, Jordan</h1>
          <p class="page-subtitle">Friday, March 6 · ${state.athlete.sport.charAt(0).toUpperCase() + state.athlete.sport.slice(1)} · ${state.athlete.position}</p>
        </div>
      </div>
    </div>

    <!-- Hero: PIQ Ring + Readiness -->
    <div style="display:grid;grid-template-columns:auto 1fr;gap:20px;margin-bottom:24px;align-items:stretch;">
      <!-- PIQ Ring Card -->
      <div class="card card-xl" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:200px;">
        <p class="section-label" style="margin-bottom:16px;">PIQ Score</p>
        <div class="piq-ring-container" style="width:160px;height:160px;">
          <svg class="piq-ring-svg" width="160" height="160" viewBox="0 0 160 160">
            <circle class="piq-ring-track" cx="80" cy="80" r="68" stroke-width="12"/>
            <circle class="piq-ring-fill" cx="80" cy="80" r="68" stroke-width="12"
              stroke-dasharray="${2 * Math.PI * 68}"
              stroke-dashoffset="${2 * Math.PI * 68 * (1 - piqScore / 100)}"
              id="piq-fill-circle"
            />
          </svg>
          <div class="piq-ring-inner">
            <div class="piq-score-number" id="piq-number">0</div>
            <div class="piq-score-label">PIQ Score</div>
          </div>
        </div>
        <div style="margin-top:16px;width:100%;">
          <p class="section-label" style="margin-bottom:6px;text-align:center;">14-Day Arc</p>
          <div class="sparkline-container">
            ${renderSparkline(state.piqHistory, piqScore)}
          </div>
        </div>
      </div>

      <!-- Right column: Readiness + stats -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <!-- Readiness Banner -->
        <div class="readiness-banner ${rl.level}">
          <div class="banner-icon">${rl.emoji}</div>
          <div>
            <div class="banner-title">${rl.label} — Readiness ${readiness.score}</div>
            <div class="banner-why">${readiness.why}</div>
            <div style="margin-top:8px;font-size:12px;color:var(--text-muted);">${readiness.recommendation}</div>
          </div>
        </div>

        <!-- Stats row -->
        <div class="grid-4">
          <div class="card card-sm">
            <div class="stat-cell">
              <div class="stat-value" style="color:${getStatColor(readiness.score)}">${readiness.score}</div>
              <div class="stat-label">Readiness</div>
            </div>
          </div>
          <div class="card card-sm">
            <div class="stat-cell">
              <div class="stat-value" style="color:${getStatColor(recoveryScore)}">${recoveryScore}</div>
              <div class="stat-label">Recovery</div>
            </div>
          </div>
          <div class="card card-sm">
            <div class="acwr-gauge" style="flex-direction:column;align-items:flex-start;gap:4px;">
              <div class="acwr-value ${acwrCls}">${state.loadData.acwr}</div>
              <div class="stat-label">ACWR · ${acwrLabel}</div>
            </div>
          </div>
          <div class="card card-sm">
            <div class="stat-cell">
              <div class="stat-value">${state.wellness.sleep_hours}<span style="font-size:16px;font-weight:400;color:var(--text-muted)">h</span></div>
              <div class="stat-label">Sleep</div>
            </div>
          </div>
        </div>

        <!-- PIQ breakdown -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">PIQ Breakdown</span>
            <span style="font-family:var(--font-display);font-weight:900;font-size:24px;color:var(--accent);">${piqScore}</span>
          </div>
          ${renderPIQBreakdown(readiness.score, 85, performanceScore, recoveryScore, 70)}
        </div>
      </div>
    </div>

    <!-- Wellness Snapshot -->
    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Today's Wellness</span>
          <a href="#wellness" class="btn btn-ghost btn-sm" data-view="wellness">Log Today</a>
        </div>
        ${renderWellnessSnapshot()}
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Performance Tests</span>
          <span style="font-size:12px;color:var(--text-muted);">Last updated Mar 1</span>
        </div>
        ${renderPerformanceSnapshot()}
      </div>
    </div>

    <!-- Session Preview -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Today's Session Preview</span>
        <a href="#train" class="btn btn-primary btn-sm" data-view="train">Start Training →</a>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
        ${state.athlete.season_phase === 'inseason' ? 'In-season maintenance block — volume reduced to preserve game performance.' : 'Training session generated for your sport and phase.'}
      </div>
      <div class="grid-3" style="gap:12px;">
        <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:14px;">
          <div class="stat-value sm" style="color:var(--blue)">4</div>
          <div class="stat-label">Main Lifts</div>
        </div>
        <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:14px;">
          <div class="stat-value sm" style="color:var(--yellow)">3</div>
          <div class="stat-label">Accessories</div>
        </div>
        <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:14px;">
          <div class="stat-value sm" style="color:var(--orange)">~55<span style="font-size:14px;font-weight:400">min</span></div>
          <div class="stat-label">Est. Duration</div>
        </div>
      </div>
    </div>
  `;
}

function renderSparkline(history, todayScore) {
  const points = history.map((d, i) => ({ x: i, y: d.score }));
  const n = points.length;
  const w = 200, h = 60;
  const xScale = w / (n - 1);
  const minY = Math.min(...points.map(p => p.y)) - 5;
  const maxY = Math.max(...points.map(p => p.y)) + 5;
  const yScale = h / (maxY - minY);

  const pathD = points.map((p, i) => {
    const x = i * xScale;
    const y = h - (p.y - minY) * yScale;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const lastX = (n - 1) * xScale;
  const lastY = h - (todayScore - minY) * yScale;

  return `
    <svg class="sparkline-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${pathD} L ${lastX},${h} L 0,${h} Z" fill="url(#sparkGrad)"/>
      <path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${lastX}" cy="${lastY}" r="4" fill="var(--accent)"/>
    </svg>
  `;
}

function renderPIQBreakdown(readiness, compliance, performance, recovery, nutrition) {
  const components = [
    { label: 'Readiness',   value: readiness,   weight: '30%', color: 'accent' },
    { label: 'Compliance',  value: compliance,  weight: '25%', color: 'blue' },
    { label: 'Performance', value: performance, weight: '20%', color: 'yellow' },
    { label: 'Recovery',    value: recovery,    weight: '15%', color: 'orange' },
    { label: 'Nutrition',   value: nutrition,   weight: '10%', color: 'red' },
  ];
  return components.map(c => `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
      <span style="font-size:12px;color:var(--text-muted);width:80px;flex-shrink:0;">${c.label}</span>
      <div style="flex:1;">
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill ${c.color}" style="width:${c.value}%"></div>
        </div>
      </div>
      <span style="font-family:var(--font-display);font-weight:700;font-size:16px;min-width:36px;text-align:right;">${c.value}</span>
      <span style="font-size:10px;color:var(--text-muted);min-width:30px;">${c.weight}</span>
    </div>
  `).join('');
}

function renderWellnessSnapshot() {
  const w = state.wellness;
  const items = [
    { label: 'Sleep', value: `${w.sleep_hours}h`, bar: (w.sleep_hours / 10) * 100, color: 'blue' },
    { label: 'Soreness', value: `${w.soreness}/10`, bar: (w.soreness / 10) * 100, color: w.soreness > 6 ? 'red' : w.soreness > 4 ? 'orange' : 'accent' },
    { label: 'Stress', value: `${w.stress}/10`, bar: (w.stress / 10) * 100, color: w.stress > 6 ? 'red' : w.stress > 4 ? 'orange' : 'accent' },
    { label: 'Energy', value: `${w.energy}/10`, bar: (w.energy / 10) * 100, color: 'yellow' },
    { label: 'Mood', value: `${w.mood}/10`, bar: (w.mood / 10) * 100, color: 'accent' },
  ];
  return items.map(item => `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
      <span style="font-size:12px;color:var(--text-muted);width:60px;flex-shrink:0;">${item.label}</span>
      <div style="flex:1;"><div class="progress-bar-wrap"><div class="progress-bar-fill ${item.color}" style="width:${item.bar}%"></div></div></div>
      <span style="font-family:var(--font-display);font-weight:700;font-size:16px;min-width:36px;text-align:right;">${item.value}</span>
    </div>
  `).join('');
}

function renderPerformanceSnapshot() {
  return state.performanceResults.map(r => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
      <span style="font-size:13px;color:var(--text-secondary);">${r.test}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-family:var(--font-display);font-weight:700;font-size:18px;">${r.value}<span style="font-size:11px;font-weight:400;color:var(--text-muted);"> ${r.unit}</span></span>
        <span class="stat-delta ${r.delta > 0 ? 'up' : 'down'}">${r.delta > 0 ? '+' : ''}${r.delta} ${r.unit}</span>
      </div>
    </div>
  `).join('');
}

function getStatColor(score) {
  if (score >= 80) return 'var(--green)';
  if (score >= 65) return 'var(--yellow)';
  if (score >= 50) return 'var(--orange)';
  return 'var(--red)';
}

function formatPhase(phase) {
  const map = { offseason: 'Off-Season', preseason: 'Pre-Season', inseason: 'In-Season', postseason: 'Post-Season' };
  return map[phase] || phase;
}

function formatStage(stage) {
  const map = { foundation: 'Foundation', development: 'Development', performance: 'Performance', elite: 'Elite', maintenance: 'Maintenance' };
  return map[stage] || stage;
}

export function afterRenderDashboard() {
  // Animate PIQ number count-up
  const el = document.getElementById('piq-number');
  if (!el) return;
  const target = parseInt(el.dataset.target || el.textContent) || state.piqHistory[state.piqHistory.length - 1].score;
  // Read actual target from DOM
  const piqFill = document.getElementById('piq-fill-circle');
  if (!piqFill) return;
  const circumference = 2 * Math.PI * 68;
  const finalOffset = parseFloat(piqFill.style.strokeDashoffset || piqFill.getAttribute('stroke-dashoffset'));
  const finalScore  = Math.round((1 - finalOffset / circumference) * 100);

  el.textContent = '0';
  let current = 0;
  const step = Math.ceil(finalScore / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, finalScore);
    el.textContent = current;
    if (current >= finalScore) clearInterval(timer);
  }, 25);
}
