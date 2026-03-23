/**
 * PerformanceIQ — Player Progress v2
 * ─────────────────────────────────────────────────────────────
 * PHASE 2 UPGRADE: Live trend charts from real history data.
 *
 * Charts rendered as pure inline SVG (no deps):
 *   • 30-day readiness trend line with colour-coded dots
 *   • 28-day training load bars (sRPE per day)
 *   • ACWR zone indicator for the last 14 days
 *   • PIQ trend line when history exists
 *
 * All values come from selectors that read real state history.
 * "Empty state" charts show a prompt to log data rather than
 * seeded values, so the athlete knows what they're building toward.
 */
import { buildSidebar }                   from '../../components/nav.js';
import { getCurrentRole, getCurrentUser } from '../../core/auth.js';
import { getWorkoutLog, getAthleteProfile } from '../../state/state.js';
import { getPIQScore, getStreak, getReadinessScore, getReadinessColor,
         getWorkoutCount, getReadinessTrend, getPIQTrend,
         getACWRSeries, getLoadSeries, getScoreBreakdown } from '../../state/selectors.js';

// ── CHART HELPERS ─────────────────────────────────────────────

/**
 * Inline SVG sparkline for a score series.
 * @param {Array<{score:number}>} series — newest last
 * @param {string} color — stroke color
 * @param {number} w — width  @param {number} h — height
 */
function sparkline(series, color = '#22c955', w = 200, h = 50) {
  if (!series.length) return `<svg width="${w}" height="${h}"></svg>`;
  const vals  = series.map(d => d.score || 0);
  const minV  = Math.min(...vals, 0);
  const maxV  = Math.max(...vals, 100);
  const range = maxV - minV || 1;
  const padX  = 4, padY = 6;
  const toX   = i => padX + (i / Math.max(vals.length - 1, 1)) * (w - padX * 2);
  const toY   = v => (h - padY) - ((v - minV) / range) * (h - padY * 2);
  const pts   = vals.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const last  = vals[vals.length - 1];
  const lastX = toX(vals.length - 1);
  const lastY = toY(last);
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="overflow:visible">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastX}" cy="${lastY}" r="3" fill="${color}"/>
  </svg>`;
}

/**
 * 28-day load bar chart from sRPE series.
 */
function loadBars(series, w = 400, h = 60) {
  if (!series.length) return '';
  const maxLoad = Math.max(...series.map(d => d.load), 1);
  const barW    = (w / series.length) - 2;
  const bars    = series.map((d, i) => {
    const barH = d.load > 0 ? Math.max(3, (d.load / maxLoad) * (h - 16)) : 2;
    const x    = i * (barW + 2);
    const y    = h - 14 - barH;
    const col  = d.load > maxLoad * 0.85 ? '#ef4444' :
                 d.load > maxLoad * 0.65 ? '#f59e0b' : '#22c955';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}"
      height="${barH.toFixed(1)}" rx="2" fill="${col}" opacity="0.85"/>`;
  }).join('');
  // x-axis labels: only show first and last
  const first = series[0]?.date || '';
  const last  = series[series.length - 1]?.date || '';
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block">
    ${bars}
    <text x="0" y="${h}" font-size="9" fill="currentColor" opacity="0.4">${first}</text>
    <text x="${w}" y="${h}" font-size="9" fill="currentColor" opacity="0.4"
      text-anchor="end">${last}</text>
  </svg>`;
}

/**
 * ACWR zone pill for the current value.
 */
function acwrPill(series) {
  const recent = series.filter(d => d.acwr !== null);
  if (!recent.length) return `<span style="font-size:12px;color:var(--text-muted)">No load data yet</span>`;
  const latest = recent[recent.length - 1];
  const colors = {
    'danger':'#ef4444', 'spike':'#f59e0b',
    'sweet-spot':'#22c955', 'undertraining':'#3b82f6', 'detraining':'#94a3b8',
  };
  const labels = {
    'danger':'⚠️ Danger >1.5 — rest required',
    'spike':'📈 Spike 1.3–1.5 — reduce volume',
    'sweet-spot':'✅ Sweet spot 0.8–1.3 — optimal',
    'undertraining':'📉 Undertraining <0.8 — build progressively',
    'detraining':'💤 Detraining — resume training',
  };
  const c = colors[latest.zone] || '#94a3b8';
  const l = labels[latest.zone] || latest.zone;
  return `
  <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
              background:${c}14;border:1px solid ${c}40;border-radius:10px">
    <span style="font-size:18px;font-weight:900;color:${c}">${latest.acwr}</span>
    <div>
      <div style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${l}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:1px">
        ACWR · ${latest.date} · Gabbett BJSM 2016
      </div>
    </div>
  </div>`;
}

// ── VIEW ──────────────────────────────────────────────────────

export function renderSoloProgress() {
  const role       = getCurrentRole() || 'solo';
  const user       = getCurrentUser();
  const log        = getWorkoutLog();
  const piq        = getPIQScore();
  const streak     = getStreak();
  const readiness  = getReadinessScore();
  const rColor     = getReadinessColor(readiness);
  const total      = getWorkoutCount();
  const sb         = getScoreBreakdown();
  const completed  = log.filter(w => w.completed).length;
  const compliance = total ? Math.round((completed / total) * 100) : 0;

  // Trend data
  const readinessTrend = getReadinessTrend(30);
  const piqTrend       = getPIQTrend(30);
  const acwrSeries     = getACWRSeries(14);
  const loadSeries     = getLoadSeries(28);
  const hasLog         = total >= 3;
  const hasTrend       = readinessTrend.length >= 2;

  // Recent sessions list
  const recent = [...log].sort((a, b) => (b.ts||0) - (a.ts||0)).slice(0, 8);

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/progress')}
  <main class="page-main">

    <div class="page-header">
      <h1>Progress</h1>
      <p>${user?.name || 'Athlete'} · Training history and performance trends</p>
    </div>

    <!-- KPI Row -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-lbl">PIQ Score</div>
        <div class="kpi-val g">${piq}</div>
        <div class="kpi-chg">${sb.tier || 'Developing'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Readiness</div>
        <div class="kpi-val" style="color:${rColor}">${readiness}</div>
        <div class="kpi-chg">Today</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Streak</div>
        <div class="kpi-val">🔥 ${streak}d</div>
        <div class="kpi-chg">${streak >= 5 ? 'On fire!' : 'Keep going'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Sessions</div>
        <div class="kpi-val b">${total}</div>
        <div class="kpi-chg">${compliance}% completion</div>
      </div>
    </div>

    <!-- Trend Charts Row -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">

      <!-- Readiness Trend -->
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="panel-title" style="margin:0">30-Day Readiness Trend</div>
          ${hasTrend ? `<span style="font-size:11px;font-weight:700;color:${rColor}">Today: ${readiness}</span>` : ''}
        </div>
        ${hasTrend ? `
        <div style="padding:4px 0">${sparkline(readinessTrend, rColor, 320, 60)}</div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10.5px;color:var(--text-muted)">
          <span>${readinessTrend[0]?.date || ''}</span>
          <span>${readinessTrend[readinessTrend.length-1]?.date || 'Today'}</span>
        </div>
        <div style="margin-top:8px;display:flex;gap:12px;font-size:11px">
          <span style="color:#22c955">● ≥80 Peak</span>
          <span style="color:#f59e0b">● 60–79 Moderate</span>
          <span style="color:#ef4444">● &lt;60 Low</span>
        </div>` : `
        <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12.5px">
          <div style="font-size:24px;margin-bottom:8px">📈</div>
          Log check-ins daily to build your readiness trend
          <br><button class="btn-draft" style="margin-top:10px;font-size:12px;padding:6px 14px" data-route="${role}/readiness">Check in now →</button>
        </div>`}
      </div>

      <!-- PIQ Trend -->
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="panel-title" style="margin:0">30-Day PIQ Trend</div>
          ${piqTrend.length >= 2 ? `<span style="font-size:11px;font-weight:700;color:var(--piq-green)">Today: ${piq}</span>` : ''}
        </div>
        ${piqTrend.length >= 2 ? `
        <div style="padding:4px 0">${sparkline(piqTrend, '#22c955', 320, 60)}</div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10.5px;color:var(--text-muted)">
          <span>${piqTrend[0]?.date || ''}</span>
          <span>${piqTrend[piqTrend.length-1]?.date || 'Today'}</span>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-muted)">
          PIQ captures 5 pillars — check in and log sessions to move it
        </div>` : `
        <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12.5px">
          <div style="font-size:24px;margin-bottom:8px">🏅</div>
          Log sessions and check-ins to build your PIQ trend
          <br><button class="btn-draft" style="margin-top:10px;font-size:12px;padding:6px 14px" data-route="${role}/log">Log a session →</button>
        </div>`}
      </div>

    </div>

    <!-- Load & ACWR -->
    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:16px;margin-bottom:20px">

      <!-- 28-day Load Bars -->
      <div class="panel">
        <div class="panel-title">28-Day Training Load (sRPE)</div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:12px">
          RPE × Duration per session · Powers ACWR engine
        </div>
        ${hasLog ? `
        <div style="overflow:hidden">${loadBars(loadSeries, 480, 64)}</div>
        <div style="margin-top:10px;display:flex;gap:14px;font-size:11px">
          <span style="color:#22c955">● Normal</span>
          <span style="color:#f59e0b">● High</span>
          <span style="color:#ef4444">● Very High</span>
        </div>` : `
        <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12.5px">
          <div style="font-size:24px;margin-bottom:8px">📊</div>
          Log 3+ sessions to see your load chart
        </div>`}
      </div>

      <!-- ACWR -->
      <div class="panel">
        <div class="panel-title">Current ACWR</div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:12px">
          Acute:Chronic Workload Ratio · Needs 3+ sessions
        </div>
        <div style="margin-bottom:14px">${acwrPill(acwrSeries)}</div>
        <div style="font-size:11.5px;color:var(--text-muted);line-height:1.6">
          Sweet spot 0.8–1.3 reduces injury risk.
          Above 1.5 = 2–4× higher injury incidence
          (Gabbett BJSM 2016).
        </div>
      </div>

    </div>

    <!-- Sessions + Milestones -->
    <div class="panels-2">

      <div class="panel">
        <div class="panel-title">Recent Sessions</div>
        ${recent.length === 0 ? `
        <div style="text-align:center;padding:32px;color:var(--text-muted)">
          <div style="font-size:28px;margin-bottom:10px">📋</div>
          <div style="font-weight:600;color:var(--text-primary)">No sessions yet</div>
          <button class="btn-primary" style="margin-top:14px;font-size:13px;padding:10px 20px"
            data-route="${role}/log">Log first session →</button>
        </div>` : recent.map(w => {
          const srpe = w.sRPE || ((w.avgRPE||5) * (w.duration||30));
          const icon = {strength:'🏋️',power:'⚡',speed:'🏃',conditioning:'🔥',
                        game:'🏆',recovery:'💚',general:'💪'}[w.sessionType] || '💪';
          return `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;
                      border-bottom:1px solid var(--border)">
            <span style="font-size:18px;flex-shrink:0">${icon}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--text-primary);
                          white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${w.name || 'Workout Session'}
              </div>
              <div style="font-size:11.5px;color:var(--text-muted)">
                ${new Date(w.ts||0).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                · RPE ${w.avgRPE||'—'} · ${w.duration||'—'} min
                · <span style="color:var(--piq-green);font-weight:600">sRPE ${srpe}</span>
              </div>
            </div>
            <span style="font-size:10.5px;padding:2px 7px;border-radius:7px;flex-shrink:0;
              background:${w.completed?'#22c95518':'var(--surface-2)'};
              color:${w.completed?'#22c955':'var(--text-muted)'};font-weight:600">
              ${w.completed ? 'Done' : 'Partial'}
            </span>
          </div>`;
        }).join('')}
      </div>

      <div class="panel">
        <div class="panel-title">Milestones</div>
        <div style="display:flex;flex-direction:column;gap:9px;margin-top:12px">
          ${[
            [total >= 1,       '🏁', 'First session logged',       `${Math.max(0,1-total)} away`],
            [total >= 5,       '⭐', '5 sessions milestone',        `${Math.max(0,5-total)} to go`],
            [total >= 10,      '🌟', '10 sessions milestone',       `${Math.max(0,10-total)} to go`],
            [total >= 25,      '💪', '25 sessions milestone',       `${Math.max(0,25-total)} to go`],
            [streak >= 3,      '🔥', '3-day streak',                'Keep it going'],
            [streak >= 7,      '🔥', '7-day streak',                `${Math.max(0,7-streak)} days away`],
            [compliance >= 80, '✅', '80% compliance',              'Excellent consistency'],
            [piq >= 80,        '🏅', 'PIQ Score 80+',               `${Math.max(0,80-piq)} pts away`],
          ].map(([done, icon, label, desc]) => `
          <div style="display:flex;align-items:center;gap:10px;padding:9px;border-radius:9px;
               background:${done?'#22c95510':'var(--surface-2)'};
               border:1px solid ${done?'#22c95540':'var(--border)'}">
            <span style="font-size:18px;opacity:${done?1:0.4}">${icon}</span>
            <div style="flex:1">
              <div style="font-size:12.5px;font-weight:${done?700:500};
                          color:${done?'var(--text-primary)':'var(--text-muted)'}">
                ${label}
              </div>
              <div style="font-size:11px;color:var(--text-muted)">
                ${done ? 'Achieved! 🎉' : desc}
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>

    </div>
  </main>
</div>`;
}
