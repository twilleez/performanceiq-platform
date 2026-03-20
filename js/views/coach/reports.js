/**
 * Coach Reports View — performance reports
 */
import { buildSidebar } from '../../components/nav.js';
import { getRoster }    from '../../state/state.js';

export function renderCoachReports() {
  const roster = getRoster();
  const avgPIQ = Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length);
  const avgRdy = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);
  const topStreak = Math.max(...roster.map(a=>a.streak));

  const reportTypes = [
    { icon:'📊', title:'Weekly Summary', desc:'Team performance overview for the past 7 days', badge:'Ready' },
    { icon:'📈', title:'PIQ Trend Report', desc:'Score progression over the last 4 weeks', badge:'Ready' },
    { icon:'💚', title:'Readiness Report', desc:'Athlete readiness patterns and alerts', badge:'Ready' },
    { icon:'📋', title:'Compliance Report', desc:'Workout completion rates by athlete', badge:'Ready' },
    { icon:'🏥', title:'Wellness Report', desc:'RPE, sleep, and recovery data summary', badge:'Coming Soon' },
    { icon:'🎯', title:'Goal Progress Report', desc:'Individual athlete goal tracking', badge:'Coming Soon' },
  ];

  const cards = reportTypes.map(r => `
  <div style="padding:16px;border:1px solid var(--border);border-radius:12px;display:flex;align-items:flex-start;gap:12px">
    <div style="font-size:24px;flex-shrink:0">${r.icon}</div>
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${r.title}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${r.badge==='Ready'?'#22c95522':'var(--surface-2)'};color:${r.badge==='Ready'?'#22c955':'var(--text-muted)'};font-weight:600">${r.badge}</span>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${r.desc}</div>
      <button class="btn-draft" style="font-size:12px;padding:6px 14px" ${r.badge!=='Ready'?'disabled style="opacity:.5;cursor:not-allowed"':''}>Generate Report</button>
    </div>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/reports')}
  <main class="page-main">
    <div class="page-header">
      <h1>Reports</h1>
      <p>Generate and export team performance reports</p>
    </div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Team Avg PIQ</div><div class="kpi-val g">${avgPIQ}</div><div class="kpi-chg">This week</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg Readiness</div><div class="kpi-val" style="color:${avgRdy>=80?'var(--piq-green)':avgRdy<60?'#ef4444':'#f59e0b'}">${avgRdy}%</div><div class="kpi-chg">Today</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Top Streak</div><div class="kpi-val">🔥 ${topStreak}d</div><div class="kpi-chg">Best on team</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Roster Size</div><div class="kpi-val b">${roster.length}</div><div class="kpi-chg">Active athletes</div></div>
    </div>
    <div class="panel">
      <div class="panel-title">Available Reports</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-top:12px">
        ${cards}
      </div>
    </div>
  </main>
</div>`;
}
