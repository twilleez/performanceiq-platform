import { buildSidebar } from '../../components/nav.js';
import { getRoster, getWorkoutLog } from '../../state/state.js';

export function renderCoachAnalytics() {
  const roster = getRoster();
  const log    = getWorkoutLog();
  const avgPIQ = Math.round(roster.reduce((s,a)=>s+a.piq,0)/roster.length);
  const avgRdy = Math.round(roster.reduce((s,a)=>s+a.readiness,0)/roster.length);
  const topPIQ = [...roster].sort((a,b)=>b.piq-a.piq).slice(0,5);
  const mostImproved = [...roster].sort((a,b)=>b.streak-a.streak).slice(0,5);

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/analytics')}
  <main class="page-main">
    <div class="page-header">
      <h1>Team <span>Analytics</span></h1>
      <p>Performance intelligence across your entire roster</p>
    </div>

    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Team Avg PIQ</div><div class="kpi-val g">${avgPIQ}</div><div class="kpi-chg">↑ Performance Intelligence</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Avg Readiness</div><div class="kpi-val">${avgRdy}%</div><div class="kpi-chg">${avgRdy>=80?'↑ High':'→ Moderate'}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Sessions Logged</div><div class="kpi-val b">${log.length}</div><div class="kpi-chg">Platform total</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Active Streaks</div><div class="kpi-val">${roster.filter(a=>a.streak>0).length}</div><div class="kpi-chg">${roster.length} athletes</div></div>
    </div>

    <div class="panels-2">
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">PIQ Score Leaderboard</div>
          ${topPIQ.map((a,i) => `
          <div class="athlete-row">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;color:${i===0?'#f59e0b':i===1?'var(--g400)':i===2?'#cd7f32':'var(--text-muted)'};width:20px;flex-shrink:0">#${i+1}</div>
            <div class="athlete-avatar">${a.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
            <div class="athlete-info">
              <div class="athlete-name">${a.name}</div>
              <div class="athlete-meta">${a.position} · Streak 🔥${a.streak}d</div>
            </div>
            <div>
              <div style="display:flex;gap:6px;align-items:center">
                <div class="prog-bg" style="width:80px"><div class="prog-fill" style="width:${a.piq}%"></div></div>
                <span class="athlete-piq">${a.piq}</span>
              </div>
            </div>
          </div>`).join('')}
        </div>

        <div class="panel">
          <div class="panel-title">Consistency Leaders</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Ranked by active streak</div>
          ${mostImproved.map((a,i) => `
          <div class="athlete-row">
            <div class="athlete-avatar">${a.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
            <div class="athlete-info">
              <div class="athlete-name">${a.name}</div>
              <div class="athlete-meta">${a.position}</div>
            </div>
            <span style="font-size:18px">🔥 ${a.streak}d</span>
          </div>`).join('')}
        </div>
      </div>

      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Readiness Trend (Last 7 Days)</div>
          ${[88,82,79,85,91,87,avgRdy].map((v,i) => `
          <div class="chart-bar-row">
            <span class="chart-bar-lbl" style="font-size:11px">${['Mon','Tue','Wed','Thu','Fri','Sat','Today'][i]}</span>
            <div class="chart-bar-wrap">
              <div class="chart-bar-fill ${v>=80?'green':''}" style="width:${v}%${v<80?';background:linear-gradient(90deg,#f59e0b,#fbbf24)':''}">
                <span class="chart-bar-val">${v}</span>
              </div>
            </div>
          </div>`).join('')}
        </div>

        <div class="panel">
          <div class="panel-title">Athletes Needing Attention</div>
          ${roster.filter(a=>a.readiness<65||a.streak===0).slice(0,4).map(a=>`
          <div class="athlete-row">
            <div class="athlete-avatar" style="background:linear-gradient(135deg,#ef4444,#dc2626)">${a.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
            <div class="athlete-info">
              <div class="athlete-name">${a.name}</div>
              <div class="athlete-meta">${a.readiness<65?`Low readiness: ${a.readiness}%`:'Streak broken — 0 days'}</div>
            </div>
            <span class="alert-badge alert-caution">Action</span>
          </div>`).join('') || '<p style="color:var(--text-muted);font-size:13px">All athletes are performing well! 🎉</p>'}
          <div style="margin-top:14px">
            <button class="btn-primary" style="width:auto;padding:10px 20px;font-size:13px" data-route="coach/program">📐 Assign Recovery Workout</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
