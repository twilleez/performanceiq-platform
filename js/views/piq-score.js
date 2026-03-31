// js/views/piq-score.js — PerformanceIQ

import { getLatestPIQScore, getPIQScoreHistory, refreshPIQScore } from '../services/readinessService.js'
import { navigate } from '../core/router.js'

export async function render(container) {
  container.innerHTML = _skeleton()
  const [score, history] = await Promise.all([getLatestPIQScore(), getPIQScoreHistory(30)])

  container.innerHTML = `
    <div class="view-page-header">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <h1 class="view-page-title">PIQ <em class="hl">Score</em></h1>
          <p class="view-page-subtitle">Your composite performance intelligence score</p>
        </div>
        <button id="refresh-btn" style="padding:8px 16px;background:transparent;border:1.5px solid var(--accent-green);color:var(--accent-green);border-radius:8px;font-family:'Oswald',sans-serif;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:0.06em">
          REFRESH
        </button>
      </div>
    </div>

    ${score ? `
      <!-- Score hero -->
      <div style="background:var(--nav-bg);border-radius:16px;padding:32px;text-align:center;margin-bottom:22px;background-image:radial-gradient(ellipse at 50% -20%,rgba(36,192,84,0.15) 0%,transparent 60%)">
        <div style="font-family:'Oswald',sans-serif;font-size:96px;font-weight:700;color:var(--accent-green);line-height:1">${Math.round(score.piq_score)}</div>
        <div style="color:rgba(255,255,255,0.5);font-size:14px;margin-top:6px">as of ${score.score_date}</div>
        ${score.injury_risk && score.injury_risk !== 'unknown' ? `
          <div style="display:inline-block;margin-top:12px;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
            background:${score.injury_risk==='low'?'rgba(36,192,84,0.15)':score.injury_risk==='moderate'?'rgba(245,158,11,0.15)':'rgba(239,68,68,0.15)'};
            color:${score.injury_risk==='low'?'#24C054':score.injury_risk==='moderate'?'#F59E0B':'#EF4444'}">
            ${score.injury_risk} injury risk
          </div>` : ''}
      </div>

      <!-- Pillars -->
      <div class="kpi-strip" style="margin-bottom:22px">
        ${_pillar('Consistency', score.consistency, '35%', '#24C054')}
        ${_pillar('Readiness',   score.readiness,   '30%', '#3B82F6')}
        ${_pillar('Compliance',  score.compliance,  '25%', '#F59E0B')}
        ${_pillar('Load Mgmt',   score.load_mgmt,   '10%', '#EF4444')}
      </div>

      <!-- What it means -->
      <div class="panel" style="margin-bottom:22px">
        <div class="panel-head"><span class="panel-title">How It's Calculated</span></div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">
          ${_pillarRow('Consistency (35%)', 'Sessions completed vs planned over 28 days', score.consistency, '#24C054')}
          ${_pillarRow('Readiness (30%)',   'Average readiness score over last 7 days',   score.readiness,   '#3B82F6')}
          ${_pillarRow('Compliance (25%)',  'Workouts done on their scheduled day',        score.compliance,  '#F59E0B')}
          ${_pillarRow('Load Mgmt (10%)',   'Acute:Chronic workload ratio (ACWR: ${score.acwr ?? "N/A"})', score.load_mgmt, '#EF4444')}
        </div>
      </div>

      <!-- History sparkline -->
      ${history.length > 1 ? `
        <div class="panel">
          <div class="panel-head"><span class="panel-title">30-Day Trend</span></div>
          <div style="padding:16px 20px">
            ${_sparkline(history)}
          </div>
        </div>` : ''}
    ` : `
      <div class="piq-empty">
        <div class="piq-empty__icon">⭐</div>
        <div class="piq-empty__title">No PIQ score yet</div>
        <div class="piq-empty__body">Complete a workout and log your readiness to generate your first score.</div>
        <div style="display:flex;gap:10px;margin-top:4px">
          <button onclick="navigate('/readiness')" class="btn-outline" style="width:auto;padding:10px 20px">Log Readiness</button>
          <button onclick="navigate('/today')"     class="btn-outline" style="width:auto;padding:10px 20px">Today's Training</button>
        </div>
      </div>`}
  `

  container.querySelector('#refresh-btn')?.addEventListener('click', async (e) => {
    e.target.textContent = 'Refreshing…'
    e.target.disabled    = true
    try { await refreshPIQScore(); await render(container) } catch { e.target.textContent = 'REFRESH'; e.target.disabled = false }
  })

  container.querySelectorAll('[onclick]').forEach(el => {
    const path = el.getAttribute('onclick')?.match(/'([^']+)'/)?.[1]
    if (path) { el.addEventListener('click', () => navigate(path)); el.removeAttribute('onclick') }
  })
}

function _pillar(label, value, weight, color) {
  const v = Math.round(value ?? 0)
  return `
    <div class="kpi-card">
      <div class="kpi-lbl">${label}</div>
      <div class="kpi-val" style="color:${color}">${v}</div>
      <div class="kpi-sub ks-muted">weight: ${weight}</div>
    </div>`
}

function _pillarRow(label, desc, value, color) {
  const v = Math.round(value ?? 0)
  return `
    <div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${label}</span>
        <span style="font-size:13px;font-weight:700;color:${color}">${v}%</span>
      </div>
      <div class="prog-track" style="margin-bottom:4px"><div class="prog-fill" style="width:${v}%;background:${color}"></div></div>
      <div style="font-size:11px;color:var(--text-muted)">${desc}</div>
    </div>`
}

function _sparkline(history) {
  const scores = history.map(h => h.piq_score)
  const min    = Math.min(...scores) - 5
  const max    = Math.max(...scores) + 5
  const W = 580, H = 80, pad = 20

  const pts = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (W - pad*2)
    const y = H - pad - ((s - min) / (max - min)) * (H - pad*2)
    return `${x},${y}`
  }).join(' ')

  const last  = history[history.length - 1]
  const first = history[0]

  return `
    <div style="position:relative">
      <svg width="100%" viewBox="0 0 ${W} ${H}" style="overflow:visible">
        <polyline points="${pts}" fill="none" stroke="var(--accent-green)" stroke-width="2" stroke-linejoin="round"/>
      </svg>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:4px">
        <span>${first?.score_date}</span>
        <span>${last?.score_date}</span>
      </div>
    </div>`
}

function _skeleton() {
  return `<div>
    <div class="piq-skeleton" style="height:32px;width:180px;border-radius:8px;margin-bottom:8px"></div>
    <div class="piq-skeleton" style="height:180px;border-radius:16px;margin-bottom:22px"></div>
    <div class="kpi-strip">${Array(4).fill('<div class="piq-skeleton" style="height:96px;border-radius:12px"></div>').join('')}</div>
  </div>`
}
