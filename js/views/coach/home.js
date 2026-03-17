/**
 * Coach Home Dashboard
 */
import { buildSidebar }   from '../../components/nav.js';
import { getRoster }      from '../../state/state.js';
import { getCurrentUser } from '../../core/auth.js';

const SPORT_EMOJI = {basketball:'🏀',football:'🏈',soccer:'⚽',baseball:'⚾',volleyball:'🏐',track:'🏃'};

export function renderCoachHome() {
  const user   = getCurrentUser();
  const roster = getRoster();
  const fname  = user?.name?.split(' ')[0] || 'Coach';
  const date   = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

  const ready   = roster.filter(a => a.readiness >= 80).length;
  const caution = roster.filter(a => a.readiness < 60).length;
  const avgPIQ  = Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length);
  const avgRdy  = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);

  const rosterRows = roster.slice(0,8).map(a => `
  <div class="coach-team-card">
    <div style="font-size:22px">${SPORT_EMOJI[a.sport]||'🏅'}</div>
    <div>
      <div style="font-size:13.5px;font-weight:600;color:var(--text-primary)">${a.name}</div>
      <div style="font-size:11.5px;color:var(--text-muted)">${a.position||''} · PIQ ${a.piq} · 🔥${a.streak}d</div>
    </div>
    <div class="athlete-status">
      ${a.readiness>=80
        ? `<span class="alert-badge alert-ready">✓ Ready ${a.readiness}%</span>`
        : a.readiness<60
        ? `<span class="alert-badge alert-caution">⚠ Caution ${a.readiness}%</span>`
        : `<span class="alert-badge" style="background:var(--g200);color:var(--g600)">${a.readiness}%</span>`}
    </div>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/home')}
  <main class="page-main">
    <div class="page-header">
      <h1>Welcome back, <span>${fname}</span> 👋</h1>
      <p>${date} · Coach Dashboard</p>
    </div>

    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Roster Size</div><div class="kpi-val b">${roster.length}</div><div class="kpi-chg">Active athletes</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Ready Today</div><div class="kpi-val g">${ready}</div><div class="kpi-chg">≥80% readiness</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Caution</div><div class="kpi-val" style="color:#d97706">${caution}</div><div class="kpi-chg">&lt;60% readiness</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Team Avg PIQ</div><div class="kpi-val">${avgPIQ}</div><div class="kpi-chg">Avg readiness ${avgRdy}%</div></div>
    </div>

    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Athlete Readiness — Today</div>
        ${rosterRows}
        ${roster.length>8?`<div style="font-size:12px;color:var(--text-muted);margin-top:8px">+ ${roster.length-8} more <a data-route="coach/roster" style="color:var(--piq-green-dark);cursor:pointer">View all →</a></div>`:''}
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Quick Actions</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn-primary" style="font-size:13px" data-route="coach/program">📐 Build Workout</button>
            <button class="btn-draft" style="font-size:13px" data-route="coach/readiness">💚 Check Readiness</button>
            <button class="btn-draft" style="font-size:13px" data-route="coach/analytics">📈 View Analytics</button>
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Today's Schedule</div>
          <div class="sched-row"><span class="sched-time">9:00 AM</span><div class="sched-dot"></div><div><div class="sched-title">Morning Weights</div><div class="sched-desc">Full team · Strength & Conditioning</div></div></div>
          <div class="sched-row"><span class="sched-time">11:30 AM</span><div class="sched-dot blue"></div><div><div class="sched-title">Film Session</div><div class="sched-desc">Game prep · Opponent scouting</div></div></div>
          <div class="sched-row"><span class="sched-time">2:00 PM</span><div class="sched-dot"></div><div><div class="sched-title">Practice</div><div class="sched-desc">Skill work + 5v5 scrimmage</div></div></div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
