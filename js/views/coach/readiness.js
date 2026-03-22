import { buildSidebar } from '../../components/nav.js';
import { getRoster } from '../../state/state.js';
export function renderCoachReadiness() {
  const roster = getRoster();
  const avgRdy = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);
  const rColor = avgRdy>=80?'#22c955':avgRdy<60?'#ef4444':'#f59e0b';
  const sorted = [...roster].sort((a,b)=>b.readiness-a.readiness);
  const pillar = (label, pct, color) => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px">
        <span style="font-size:12px;color:var(--text-muted)">${label}</span>
        <span style="font-size:12px;font-weight:600;color:${color}">${pct}%</span>
      </div>
      <div style="height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:3px"></div>
      </div>
    </div>`;
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/readiness')}
  <main class="page-main">
    <div class="page-header"><h1>Team <span>Readiness</span></h1><p>Athlete readiness scores · Daily check-in data</p></div>
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Team Average</div><div class="kpi-val" style="color:${rColor}">${avgRdy}%</div><div class="kpi-chg">Today</div></div>
      <div class="kpi-card"><div class="kpi-lbl">High Ready</div><div class="kpi-val g">${roster.filter(a=>a.readiness>=80).length}</div><div class="kpi-chg">≥80%</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Moderate</div><div class="kpi-val" style="color:#f59e0b">${roster.filter(a=>a.readiness>=60&&a.readiness<80).length}</div><div class="kpi-chg">60–79%</div></div>
      <div class="kpi-card"><div class="kpi-lbl">At Risk</div><div class="kpi-val" style="color:#ef4444">${roster.filter(a=>a.readiness<60).length}</div><div class="kpi-chg">&lt;60%</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:20px">
      <div class="panel">
        <div class="panel-title">Individual Readiness</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px">
          ${sorted.map(a => {
            const c = a.readiness>=80?'#22c955':a.readiness<60?'#ef4444':'#f59e0b';
            return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="font-weight:600;font-size:13px;color:var(--text-primary);flex:1">${a.name}</span>
              <span style="font-size:11.5px;color:var(--text-muted)">${a.position||'—'}</span>
              <div style="width:120px;height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${a.readiness}%;background:${c};border-radius:3px"></div>
              </div>
              <span style="font-weight:700;font-size:14px;color:${c};min-width:36px;text-align:right">${a.readiness}%</span>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Team Readiness Pillars</div>
          <div style="margin-top:12px">
            ${pillar('Sleep Quality', Math.round(avgRdy * 0.98), '#3b82f6')}
            ${pillar('Energy Level',  Math.round(avgRdy * 0.95), '#22c955')}
            ${pillar('Soreness (inv)',Math.round(avgRdy * 0.88), '#f59e0b')}
            ${pillar('Mood',          Math.round(avgRdy * 0.92), '#a78bfa')}
            ${pillar('Stress (inv)',  Math.round(avgRdy * 0.85), '#fb923c')}
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Based on team check-in data · Halson 2014 weights</div>
        </div>
        <div class="panel" style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border-color:#22c95530">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.06em;margin-bottom:8px">SCIENCE NOTE</div>
          <div style="font-size:12.5px;color:#c8d8e8;line-height:1.6">Athletes with readiness &lt;60% should do active recovery only. Training hard on a low-readiness day increases injury risk by 2–4× (Gabbett 2016).</div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}