/**
 * Solo Readiness View
 */
import { buildSidebar }   from '../../components/nav.js';
import { getReadinessScore, getReadinessRingOffset, getReadinessColor, getReadinessExplain } from '../../state/selectors.js';

export function renderSoloReadiness() {
  const readiness = getReadinessScore();
  const offset    = getReadinessRingOffset(readiness);
  const color     = getReadinessColor(readiness);
  const explain   = getReadinessExplain(readiness);

  const factors = [
    { label: 'Training Load', value: readiness>=80?'Optimal':readiness>=60?'Moderate':'High', icon: '⚖️', ok: readiness>=60 },
    { label: 'RPE Trend',     value: readiness>=80?'Stable':readiness>=60?'Moderate':'Elevated', icon: '📈', ok: readiness>=60 },
    { label: 'Compliance',    value: readiness>=80?'High':readiness>=60?'Moderate':'Low', icon: '✅', ok: readiness>=60 },
    { label: 'Recovery',      value: readiness>=80?'Good':readiness>=60?'Adequate':'Poor', icon: '💤', ok: readiness>=80 },
  ];

  const factorRows = factors.map(f => `
  <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
    <div style="font-size:20px">${f.icon}</div>
    <div style="flex:1"><div style="font-size:13.5px;font-weight:600;color:var(--text-primary)">${f.label}</div></div>
    <span style="font-size:12px;padding:3px 10px;border-radius:10px;background:${f.ok?'#22c95522':'#ef444422'};color:${f.ok?'#22c955':'#ef4444'};font-weight:600">${f.value}</span>
  </div>`).join('');

  const recommendations = readiness>=80
    ? ['You are primed for high-intensity work today.','Prioritise speed and power work in your session.','Maintain your current load and recovery routine.']
    : readiness>=60
    ? ['Moderate readiness — train at controlled intensity.','Avoid max-effort sprints or heavy 1RM attempts.','Focus on technical quality over volume.']
    : ['Low readiness — prioritise recovery today.','Consider a mobility or light movement session only.','Ensure 8+ hours of sleep tonight and adequate hydration.'];

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/readiness')}
  <main class="page-main">
    <div class="page-header">
      <h1>Readiness Index</h1>
      <p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
    </div>
    <div class="panels-2">
      <div>
        <div class="panel" style="text-align:center;margin-bottom:16px">
          <div class="panel-title" style="text-align:left">Today's Score</div>
          <div style="display:flex;justify-content:center;margin:20px 0">
            <svg viewBox="0 0 100 100" width="140" height="140">
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--surface-2)" stroke-width="8"/>
              <circle cx="50" cy="50" r="46" fill="none" stroke="${color}" stroke-width="8"
                stroke-dasharray="289" stroke-dashoffset="${offset}" stroke-linecap="round"
                transform="rotate(-90 50 50)"/>
              <text x="50" y="46" text-anchor="middle" font-size="22" font-weight="700" fill="${color}">${readiness}</text>
              <text x="50" y="60" text-anchor="middle" font-size="10" fill="var(--text-muted)">/ 100</text>
            </svg>
          </div>
          <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:6px">${readiness>=80?'High Readiness':readiness>=60?'Moderate Readiness':'Low Readiness'}</div>
          <div style="font-size:12.5px;color:var(--text-muted);padding:0 16px">${explain}</div>
        </div>
        <div class="panel">
          <div class="panel-title">Contributing Factors</div>
          ${factorRows}
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Recommendations</div>
        <div style="margin-top:12px">
          ${recommendations.map(r=>`
          <div style="display:flex;align-items:flex-start;gap:10px;padding:12px;background:var(--surface-2);border-radius:10px;margin-bottom:8px">
            <span style="color:${color};font-size:16px;flex-shrink:0">${readiness>=80?'✓':readiness>=60?'→':'⚠'}</span>
            <span style="font-size:13px;color:var(--text-primary);line-height:1.5">${r}</span>
          </div>`).join('')}
        </div>
        <div style="margin-top:12px;padding:12px;background:var(--surface-2);border-radius:10px;font-size:12px;color:var(--text-muted)">
          <strong style="color:var(--text-primary)">How is this calculated?</strong><br>
          The Readiness Index is derived from your recent RPE averages (last 5 sessions), workout completion rate, and training load balance.
        </div>
      </div>
    </div>
  </main>
</div>`;
}
