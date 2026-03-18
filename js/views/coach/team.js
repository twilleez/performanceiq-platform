import { buildSidebar } from '../../components/nav.js';
import { getRoster }    from '../../state/state.js';
import { SPORT_EMOJI }  from '../../data/exerciseLibrary.js';

export function renderCoachTeam() {
  const roster = getRoster();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/team')}
  <main class="page-main">
    <div class="page-header">
      <h1>My <span>Team</span></h1>
      <p>${roster.length} athletes · Basketball</p>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Roster Overview</div>
        ${roster.map(a=>`
        <div class="athlete-row">
          <div class="athlete-avatar">${a.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
          <div class="athlete-info">
            <div class="athlete-name">${a.name}</div>
            <div class="athlete-meta">${a.position} · ${SPORT_EMOJI[a.sport]} · PIQ ${a.piq}</div>
          </div>
          <div>${a.readiness>=80?`<span class="alert-badge alert-ready">Ready</span>`:a.readiness<60?`<span class="alert-badge alert-caution">⚠ Caution</span>`:`<span class="alert-badge" style="background:var(--g200);color:var(--g600)">${a.readiness}%</span>`}</div>
        </div>`).join('')}
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Quick Actions</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn-primary" style="font-size:13px" data-route="coach/program">📐 Assign Workout</button>
            <button class="btn-draft" style="font-size:13px" data-route="coach/roster">📋 Full Roster</button>
            <button class="btn-draft" style="font-size:13px" data-route="coach/readiness">💚 Readiness Report</button>
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Team Stats</div>
          <div class="kpi-card" style="margin-bottom:10px"><div class="kpi-lbl">Avg PIQ</div><div class="kpi-val g">${Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length)}</div></div>
          <div class="kpi-card"><div class="kpi-lbl">Avg Readiness</div><div class="kpi-val">${Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length)}%</div></div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
