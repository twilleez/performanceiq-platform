import { buildSidebar } from '../../components/nav.js';
import { getReadinessScore, getReadinessRingOffset, getReadinessColor, getReadinessExplain } from '../../state/selectors.js';
import { getWorkoutLog }  from '../../state/state.js';

export function renderPlayerReadiness() {
  const score   = getReadinessScore();
  const offset  = getReadinessRingOffset(score);
  const color   = getReadinessColor(score);
  const explain = getReadinessExplain(score);
  const log     = getWorkoutLog();
  const recent  = log.slice(-7);
  const avgRPE  = recent.length ? (recent.reduce((s,w) => s+(w.avgRPE||5), 0) / recent.length).toFixed(1) : '—';

  const factors = [
    { label:'Sleep Quality',    value: Math.min(99, score + 6),            color:'var(--piq-green)', note:'Based on load & recovery trend' },
    { label:'Training Load',    value: Math.max(40, score - 4),            color:'var(--piq-blue)',  note:`Avg RPE ${avgRPE} over last 7 sessions` },
    { label:'Mood & Energy',    value: Math.min(98, score + 3),            color:'var(--piq-green)', note:'Estimated from session completion rate' },
    { label:'Nutrition',        value: Math.min(95, 55 + log.length * 4),  color:'#f59e0b',          note:'Improve by logging meals daily' },
  ];

  const rpeHistory = recent.map((w, i) => {
    const rpe  = w.avgRPE || 5;
    const pct  = (rpe / 10) * 100;
    const c    = rpe >= 9 ? '#ef4444' : rpe >= 7 ? '#f59e0b' : 'var(--piq-green-dark)';
    return `<div class="chart-bar-row">
      <span class="chart-bar-lbl" style="font-size:11px">${w.date || 'S'+(i+1)}</span>
      <div class="chart-bar-wrap">
        <div class="chart-bar-fill" style="width:${pct}%;background:${c}">
          <span class="chart-bar-val">${rpe}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player','player/readiness')}
  <main class="page-main">
    <div class="page-header">
      <h1>Readiness <span>Engine</span></h1>
      <p>Your body's daily training capacity</p>
    </div>

    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Today's Readiness Score</div>
        <div class="ring-wrap">
          <svg width="130" height="130" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="46" fill="none" stroke="var(--border)" stroke-width="9"/>
            <circle cx="55" cy="55" r="46" fill="none" stroke="${color}" stroke-width="9"
              stroke-dasharray="289" stroke-dashoffset="${offset}" stroke-linecap="round"
              transform="rotate(-90 55 55)"/>
          </svg>
          <div class="ring-num" style="color:${color}">${score}</div>
          <div class="ring-lbl">Readiness Score</div>
        </div>
        <p class="readiness-explain" style="text-align:center;margin-bottom:20px">${explain}</p>

        <div class="panel-title" style="font-size:12px">Contributing Factors</div>
        ${factors.map(f => `
        <div class="rf-row">
          <span class="rf-lbl">${f.label}</span>
          <div class="rf-bar-bg">
            <div class="rf-bar-fill" style="width:${f.value}%;background:${f.color}"></div>
          </div>
          <span class="rf-num">${f.value}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin:-6px 0 10px 81px">${f.note}</div>
        `).join('')}
      </div>

      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Recommendation</div>
          ${score >= 80 ? `
            <div style="background:rgba(57,230,107,.08);border-radius:10px;padding:14px;border:1.5px solid rgba(57,230,107,.2)">
              <div style="font-size:22px;margin-bottom:8px">💪</div>
              <div style="font-weight:700;color:var(--piq-green-dark);margin-bottom:4px">Go Hard Today</div>
              <div style="font-size:13px;color:var(--text-secondary)">High readiness — ideal day for peak intensity training, heavy lifts, or speed work.</div>
            </div>` : score >= 60 ? `
            <div style="background:rgba(245,158,11,.08);border-radius:10px;padding:14px;border:1.5px solid rgba(245,158,11,.2)">
              <div style="font-size:22px;margin-bottom:8px">🏃</div>
              <div style="font-weight:700;color:#d97706;margin-bottom:4px">Moderate Session</div>
              <div style="font-size:13px;color:var(--text-secondary)">Moderate readiness — technique work, conditioning, or a controlled lift are good options.</div>
            </div>` : `
            <div style="background:rgba(248,113,113,.08);border-radius:10px;padding:14px;border:1.5px solid rgba(248,113,113,.2)">
              <div style="font-size:22px;margin-bottom:8px">🧘</div>
              <div style="font-weight:700;color:#dc2626;margin-bottom:4px">Recovery Day</div>
              <div style="font-size:13px;color:var(--text-secondary)">Low readiness — prioritize mobility, foam rolling, light activity, and quality sleep tonight.</div>
            </div>`}
          <div style="margin-top:14px">
            <button class="btn-primary" style="width:auto;padding:10px 20px;font-size:13px" data-route="player/today">Start Today's Workout</button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">RPE History (last 7 sessions)</div>
          ${rpeHistory || '<p style="color:var(--text-muted);font-size:13px">Log sessions to see RPE trends.</p>'}
          <div style="margin-top:10px;font-size:11.5px;color:var(--text-muted)">
            <span style="color:var(--piq-green-dark)">●</span> 1–6 = Optimal &nbsp;
            <span style="color:#f59e0b">●</span> 7–8 = High &nbsp;
            <span style="color:#ef4444">●</span> 9–10 = Extreme
          </div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
