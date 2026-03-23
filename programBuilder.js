import { buildSidebar } from '../../components/nav.js';
import { getRoster, getState } from '../../state/state.js';
import { getReadinessColor } from '../../state/selectors.js';
export function renderParentProgress() {
  const roster = getRoster();
  const state = getState();
  const a = roster.find(x=>x.id===state.linkedAthlete) || roster[0] || {};
  const rColor = getReadinessColor(a.readiness||72);
  return `
<div class="view-with-sidebar">
  ${buildSidebar('parent','parent/progress')}
  <main class="page-main">
    <div class="page-header"><h1>Progress</h1><p>${a.name||'Your Athlete'} · Performance trends</p></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val g">${a.piq||72}</div><div class="kpi-chg">Current</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Readiness</div><div class="kpi-val" style="color:${rColor}">${a.readiness||72}%</div><div class="kpi-chg">Today</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${a.streak||0}d</div><div class="kpi-chg">Days in a row</div></div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">What Is the PIQ Score?</div>
        <div style="margin-top:12px;font-size:13px;color:var(--text-muted);line-height:1.7">
          <p style="margin:0 0 10px">The PIQ Score is a 0–100 composite measuring your athlete's training intelligence across 5 areas: consistency, readiness, compliance, load management, and profile completeness.</p>
          <p style="margin:0 0 10px"><strong style="color:var(--text-primary)">70–79:</strong> Strong development phase. This is where most high school athletes live.</p>
          <p style="margin:0 0 10px"><strong style="color:var(--text-primary)">80–89:</strong> Advanced. Consistent habits and smart training.</p>
          <p style="margin:0"><strong style="color:var(--text-primary)">90+:</strong> Elite. Reserved for athletes with exceptional consistency and data.</p>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Pillar Breakdown</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
          ${[['Consistency','Sessions logged regularly','#22c955',70],['Readiness','Daily wellness check-ins','#3b82f6',a.readiness||72],['Compliance','Workouts completed','#f59e0b',75],['Load Balance','Not over or undertraining','#a78bfa',65]].map(([label,desc,color,val])=>`
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:3px">
              <span style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${label}</span>
              <span style="font-size:12.5px;font-weight:700;color:${color}">${val}</span>
            </div>
            <div style="height:5px;background:var(--surface-2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${val}%;background:${color};border-radius:3px"></div></div>
            <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${desc}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </main>
</div>`;
}