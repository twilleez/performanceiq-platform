/**
 * Coach Analytics View — team performance analytics
 */
import { buildSidebar } from '../../components/nav.js';
import { getRoster }    from '../../state/state.js';

export function renderCoachAnalytics() {
  const roster = getRoster();
  const avgPIQ = Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length);
  const avgRdy = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);
  const avgStreak = Math.round(roster.reduce((s,a)=>s+a.streak,0)/roster.length);

  // PIQ distribution buckets
  const elite    = roster.filter(a=>a.piq>=90).length;
  const advanced = roster.filter(a=>a.piq>=80&&a.piq<90).length;
  const developing = roster.filter(a=>a.piq>=70&&a.piq<80).length;
  const building = roster.filter(a=>a.piq<70).length;
  const total = roster.length;

  const distBar = (label, count, color) => `
  <div style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <span style="font-size:12.5px;color:var(--text-primary)">${label}</span>
      <span style="font-size:12.5px;font-weight:600;color:${color}">${count} athletes</span>
    </div>
    <div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden">
      <div style="height:100%;width:${total?Math.round(count/total*100):0}%;background:${color};border-radius:4px"></div>
    </div>
  </div>`;

  const topPerformers = [...roster].sort((a,b)=>b.piq-a.piq).slice(0,5).map(a=>`
  <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
    <div style="font-size:18px">🏅</div>
    <div style="flex:1">
      <div style="font-weight:600;font-size:13px">${a.name}</div>
      <div style="font-size:11.5px;color:var(--text-muted)">${a.position||'—'} · Streak 🔥${a.streak}d</div>
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
      <h1>Team Analytics</h1>
      <p>Performance intelligence across your roster</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Avg PIQ Score</div><div class="kpi-val g">${avgPIQ}</div><div class="kpi-chg">Team average</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg Readiness</div><div class="kpi-val" style="color:${avgRdy>=80?'var(--piq-green)':avgRdy<60?'#ef4444':'#f59e0b'}">${avgRdy}%</div><div class="kpi-chg">Today</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg Streak</div><div class="kpi-val">🔥 ${avgStreak}d</div><div class="kpi-chg">Consecutive days</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Elite Athletes</div><div class="kpi-val b">${elite}</div><div class="kpi-chg">PIQ ≥90</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">PIQ Score Distribution</div>
        <div style="margin-top:12px">
          ${distBar('Elite (90+)', elite, '#22c955')}
          ${distBar('Advanced (80–89)', advanced, '#3b82f6')}
          ${distBar('Developing (70–79)', developing, '#f59e0b')}
          ${distBar('Building (&lt;70)', building, '#ef4444')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Top Performers</div>
        ${topPerformers}
      </div>
    </div>
  </main>
</div>`;
}
