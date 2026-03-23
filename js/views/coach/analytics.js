/**
 * PerformanceIQ — Coach Analytics v3
 * ─────────────────────────────────────────────────────────────
 * PHASE 2 UPGRADE: ACWR chart now reads from real workout log data
 * via getACWRSeries() and getLoadSeries() selectors.
 *
 * Falls back to seeded demo curve when log is empty (new users).
 * No-check-in flags and PIQ distribution preserved from v2.
 */
import { buildSidebar }                from '../../components/nav.js';
import { getRoster, getWorkoutLog }    from '../../state/state.js';
import { getACWRSeries, getLoadSeries } from '../../state/selectors.js';

// ── ACWR LINE CHART ───────────────────────────────────────────

function acwrChart(series) {
  // If no real data, show seeded demo curve with "demo" label
  const hasData = series.some(d => d.acwr !== null);

  const raw = hasData
    ? series.slice(-14).map(d => ({ v: d.acwr, zone: d.zone, date: d.date }))
    : [
        {v:1.05,zone:'sweet-spot'},{v:1.12,zone:'sweet-spot'},
        {v:0.98,zone:'sweet-spot'},{v:1.18,zone:'sweet-spot'},
        {v:1.25,zone:'sweet-spot'},{v:1.08,zone:'sweet-spot'},
        {v:1.32,zone:'spike'},     {v:1.45,zone:'spike'},
        {v:1.22,zone:'sweet-spot'},{v:1.10,zone:'sweet-spot'},
        {v:0.95,zone:'sweet-spot'},{v:1.02,zone:'sweet-spot'},
        {v:1.15,zone:'sweet-spot'},{v:1.08,zone:'sweet-spot'},
      ].map((d, i) => ({ ...d, date: `Day ${i+1}` }));

  const W = 580, H = 160;
  const padL = 36, padR = 16, padT = 12, padB = 28;
  const cW   = W - padL - padR;
  const cH   = H - padT - padB;
  const yMin = 0.4, yMax = 1.8;
  const toY  = v => padT + cH - ((v - yMin) / (yMax - yMin)) * cH;
  const toX  = i => padL + (i / Math.max(raw.length - 1, 1)) * cW;
  const zoneY = v => Math.max(padT, Math.min(padT + cH, toY(v)));

  const pts = raw.map((d, i) => `${toX(i).toFixed(1)},${toY(d.v).toFixed(1)}`).join(' ');
  const todayVal  = raw[raw.length - 1]?.v || 1.0;
  const lineColor = todayVal > 1.5 ? '#ef4444' : todayVal > 1.3 ? '#f59e0b' : '#22c955';

  return `
<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible"
  aria-label="ACWR ${hasData ? '14-day' : 'demo'} trend">
  <!-- Zone bands -->
  <rect x="${padL}" y="${padT}" width="${cW}" height="${zoneY(1.5)-padT}" fill="#ef444420"/>
  <rect x="${padL}" y="${zoneY(1.5)}" width="${cW}" height="${zoneY(1.3)-zoneY(1.5)}" fill="#f59e0b18"/>
  <rect x="${padL}" y="${zoneY(1.3)}" width="${cW}" height="${zoneY(0.8)-zoneY(1.3)}" fill="#22c95518"/>
  <rect x="${padL}" y="${zoneY(0.8)}" width="${cW}" height="${padT+cH-zoneY(0.8)}" fill="#3b82f618"/>
  <!-- Zone labels -->
  <text x="${W-padR-2}" y="${padT+8}" text-anchor="end" font-size="9" fill="#ef4444" opacity="0.8">Danger &gt;1.5</text>
  <text x="${W-padR-2}" y="${zoneY(1.5)+10}" text-anchor="end" font-size="9" fill="#f59e0b" opacity="0.8">Spike 1.3–1.5</text>
  <text x="${W-padR-2}" y="${(zoneY(1.3)+zoneY(0.8))/2+4}" text-anchor="end" font-size="9" fill="#22c955" opacity="0.8">Sweet spot</text>
  <text x="${W-padR-2}" y="${padT+cH-4}" text-anchor="end" font-size="9" fill="#3b82f6" opacity="0.8">Under-training</text>
  <!-- Dividers -->
  <line x1="${padL}" y1="${zoneY(1.5)}" x2="${W-padR}" y2="${zoneY(1.5)}" stroke="#ef444440" stroke-width="0.5" stroke-dasharray="3 3"/>
  <line x1="${padL}" y1="${zoneY(1.3)}" x2="${W-padR}" y2="${zoneY(1.3)}" stroke="#f59e0b40" stroke-width="0.5" stroke-dasharray="3 3"/>
  <line x1="${padL}" y1="${zoneY(0.8)}" x2="${W-padR}" y2="${zoneY(0.8)}" stroke="#22c95540" stroke-width="0.5" stroke-dasharray="3 3"/>
  <!-- Y-axis labels -->
  ${[1.6,1.4,1.2,1.0,0.8,0.6].map(v => `
    <line x1="${padL}" y1="${toY(v)}" x2="${W-padR}" y2="${toY(v)}"
      stroke="rgba(128,128,128,.1)" stroke-width="0.5"/>
    <text x="${padL-4}" y="${toY(v)+4}" text-anchor="end" font-size="9" fill="currentColor" opacity="0.5">${v.toFixed(1)}</text>
  `).join('')}
  <!-- ACWR line -->
  <polyline points="${pts}" fill="none" stroke="${lineColor}" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Dots -->
  ${raw.map((d, i) => {
    const c = d.v > 1.5 ? '#ef4444' : d.v > 1.3 ? '#f59e0b' : d.v >= 0.8 ? '#22c955' : '#3b82f6';
    const r = i === raw.length - 1 ? 4 : 2.5;
    return `<circle cx="${toX(i).toFixed(1)}" cy="${toY(d.v).toFixed(1)}" r="${r}"
      fill="${c}" stroke="transparent" stroke-width="1.5"/>`;
  }).join('')}
  <!-- Today callout -->
  <text x="${toX(raw.length-1).toFixed(1)}" y="${toY(todayVal)-10}"
    text-anchor="middle" font-size="10" font-weight="600" fill="${lineColor}">
    ${todayVal.toFixed(2)}${!hasData?' (demo)':''}
  </text>
  <!-- X-axis labels: first and last -->
  <text x="${padL}" y="${H-2}" font-size="9" fill="currentColor" opacity="0.4">${raw[0]?.date||''}</text>
  <text x="${W-padR}" y="${H-2}" font-size="9" text-anchor="end" fill="currentColor" opacity="0.4">${raw[raw.length-1]?.date||'Today'}</text>
</svg>`;
}

// ── DISTRIBUTION BAR ──────────────────────────────────────────
function distBar(label, count, total, color) {
  return `
  <div style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <span style="font-size:12.5px;color:var(--text-primary)">${label}</span>
      <span style="font-size:12.5px;font-weight:600;color:${color}">${count} athletes</span>
    </div>
    <div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden">
      <div style="height:100%;width:${total?Math.round((count/total)*100):0}%;
                  background:${color};border-radius:4px"></div>
    </div>
  </div>`;
}

// ── MAIN RENDER ───────────────────────────────────────────────
export function renderCoachAnalytics() {
  const roster     = getRoster();
  const log        = getWorkoutLog();
  const acwrSeries = getACWRSeries(14);
  const loadSeries = getLoadSeries(14);
  const hasRealACWR = acwrSeries.some(d => d.acwr !== null);

  const avgPIQ    = Math.round(roster.reduce((s,a) => s+a.piq,      0) / roster.length);
  const avgRdy    = Math.round(roster.reduce((s,a) => s+a.readiness,0) / roster.length);
  const avgStreak = Math.round(roster.reduce((s,a) => s+a.streak,   0) / roster.length);
  const total     = roster.length;
  const elite     = roster.filter(a => a.piq >= 90).length;
  const advanced  = roster.filter(a => a.piq >= 80 && a.piq < 90).length;
  const developing= roster.filter(a => a.piq >= 70 && a.piq < 80).length;
  const building  = roster.filter(a => a.piq < 70).length;
  const noData    = roster.filter(a => a.streak === 0);

  const topPerformers = [...roster].sort((a, b) => b.piq - a.piq).slice(0, 5).map(a => `
  <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
    <div style="font-size:18px">🏅</div>
    <div style="flex:1">
      <div style="font-weight:600;font-size:13px;color:var(--text-primary)">${a.name}</div>
      <div style="font-size:11.5px;color:var(--text-muted)">${a.position||'—'} · 🔥${a.streak}d streak</div>
    </div>
    <div style="text-align:right">
      <div style="font-weight:700;font-size:15px;color:var(--piq-green)">${a.piq}</div>
      <div style="font-size:11px;color:var(--text-muted)">PIQ</div>
    </div>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/analytics')}
  <main class="page-main">

    <div class="page-header">
      <h1>Team <span>Analytics</span></h1>
      <p>Performance intelligence across your roster</p>
    </div>

    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Avg PIQ Score</div><div class="kpi-val g">${avgPIQ}</div><div class="kpi-chg">Team average</div></div>
      <div class="kpi-card">
        <div class="kpi-lbl">Avg Readiness</div>
        <div class="kpi-val" style="color:${avgRdy>=80?'var(--piq-green)':avgRdy<60?'#ef4444':'#f59e0b'}">${avgRdy}%</div>
        <div class="kpi-chg">Today</div>
      </div>
      <div class="kpi-card"><div class="kpi-lbl">Avg Streak</div><div class="kpi-val">🔥 ${avgStreak}d</div><div class="kpi-chg">Consecutive days</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Elite Athletes</div><div class="kpi-val b">${elite}</div><div class="kpi-chg">PIQ ≥90</div></div>
      <div class="kpi-card" style="${noData.length?'border-color:rgba(239,68,68,.4)':''}">
        <div class="kpi-lbl">No Recent Data</div>
        <div class="kpi-val" style="color:${noData.length?'#ef4444':'#22c955'}">${noData.length}</div>
        <div class="kpi-chg">Need follow-up</div>
      </div>
    </div>

    <!-- ACWR Chart -->
    <div class="panel" style="margin-bottom:20px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;gap:16px">
        <div>
          <div class="panel-title" style="margin:0">Acute:Chronic Workload Ratio (ACWR)</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px">
            ${hasRealACWR
              ? `14-day trend from real session data · ${log.length} sessions logged`
              : `Demo curve — athletes need 3+ logged sessions to generate real ACWR`}
            · Sweet spot 0.8–1.3 (Gabbett BJSM 2016) · Above 1.5 = 2–4× injury risk
          </div>
        </div>
        ${!hasRealACWR ? `
        <div style="font-size:11px;padding:4px 10px;border-radius:8px;background:#f59e0b14;
                    color:#f59e0b;font-weight:600;white-space:nowrap;flex-shrink:0">
          Demo data
        </div>` : `
        <div style="font-size:11px;padding:4px 10px;border-radius:8px;background:#22c95514;
                    color:#22c955;font-weight:600;white-space:nowrap;flex-shrink:0">
          Live data
        </div>`}
      </div>
      <div style="overflow-x:auto">${acwrChart(acwrSeries)}</div>
    </div>

    <div class="panels-2">

      <!-- PIQ Distribution -->
      <div class="panel">
        <div class="panel-title">PIQ Score Distribution</div>
        <div style="margin-top:12px">
          ${distBar('Elite (90+)',       elite,      total, '#22c955')}
          ${distBar('Advanced (80–89)',  advanced,   total, '#3b82f6')}
          ${distBar('Developing (70–79)',developing, total, '#f59e0b')}
          ${distBar('Building (&lt;70)', building,   total, '#ef4444')}
        </div>
      </div>

      <!-- Top Performers -->
      <div class="panel">
        <div class="panel-title">Top Performers</div>
        ${topPerformers}
      </div>

    </div>

    <!-- No-data follow-up -->
    ${noData.length > 0 ? `
    <div class="panel" style="margin-top:20px;border-color:rgba(239,68,68,.3)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="font-size:16px">📋</span>
        <div class="panel-title" style="margin:0;color:#ef4444">Follow Up — No Data This Week</div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
        Streak = 0. These athletes aren't logging — reach out to confirm they're active.
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
        ${noData.map(a => `
        <div style="padding:10px 12px;border:1px solid rgba(239,68,68,.25);
                    border-radius:10px;background:rgba(239,68,68,.05)">
          <div style="font-weight:600;font-size:13px;color:var(--text-primary)">${a.name}</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">
            ${a.position||'—'} · Readiness ${a.readiness}%
          </div>
        </div>`).join('')}
      </div>
    </div>` : ''}

  </main>
</div>`;
}
