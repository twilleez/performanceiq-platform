/**
 * Coach Readiness View — team readiness monitoring
 */
import { buildSidebar } from '../../components/nav.js';
import { getRoster }    from '../../state/state.js';

export function renderCoachReadiness() {
  const roster = getRoster();
  const sorted = [...roster].sort((a,b) => b.readiness - a.readiness);
  const avgRdy = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);

  const bars = sorted.map(a => {
    const color = a.readiness>=80?'var(--piq-green)':a.readiness<60?'#ef4444':'#f59e0b';
    return `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${a.name}</span>
        <span style="font-size:13px;font-weight:700;color:${color}">${a.readiness}%</span>
      </div>
      <div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${a.readiness}%;background:${color};border-radius:4px;transition:width .4s"></div>
      </div>
    </div>`;
  }).join('');

  const ready    = roster.filter(a=>a.readiness>=80).length;
  const moderate = roster.filter(a=>a.readiness>=60&&a.readiness<80).length;
  const caution  = roster.filter(a=>a.readiness<60).length;

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/readiness')}
  <main class="page-main">
    <div class="page-header">
      <h1>Team Readiness</h1>
      <p>Daily readiness index for all athletes</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Team Average</div><div class="kpi-val" style="color:${avgRdy>=80?'var(--piq-green)':avgRdy<60?'#ef4444':'#f59e0b'}">${avgRdy}%</div><div class="kpi-chg">Readiness index</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Ready</div><div class="kpi-val g">${ready}</div><div class="kpi-chg">≥80%</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Moderate</div><div class="kpi-val" style="color:#f59e0b">${moderate}</div><div class="kpi-chg">60–79%</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Caution</div><div class="kpi-val" style="color:#ef4444">${caution}</div><div class="kpi-chg">&lt;60%</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Individual Readiness Scores</div>
      <div style="margin-top:8px">${bars}</div>
      <div style="margin-top:16px;padding:12px;background:var(--surface-2);border-radius:10px;font-size:12.5px;color:var(--text-muted)">
        <strong style="color:var(--text-primary)">Readiness Index</strong> is calculated from recent RPE trends, workout compliance, and training load. Scores ≥80% indicate the athlete is primed for high-intensity work; scores &lt;60% suggest prioritising recovery.
      </div>
    </div>
  </main>
</div>`;
}
