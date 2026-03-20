/**
 * Coach Home Dashboard v2
 * Role-specific view: team management, athlete monitoring, programming.
 * Coaches see team-level KPIs, readiness distribution, and action items.
 */
import { buildSidebar }          from '../../components/nav.js';
import { getCurrentUser, getCurrentRole } from '../../core/auth.js';
import { getRoster }             from '../../state/state.js';

export function renderCoachHome() {
  const user   = getCurrentUser() || {};
  const role   = getCurrentRole() || 'coach';
  const fname  = user.name?.split(' ')[0] || 'Coach';
  const roster = getRoster();
  const hour   = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Team analytics
  const avgPIQ      = Math.round(roster.reduce((s,a) => s+a.piq, 0) / roster.length);
  const avgReadiness = Math.round(roster.reduce((s,a) => s+a.readiness, 0) / roster.length);
  const highReady   = roster.filter(a => a.readiness >= 80).length;
  const lowReady    = roster.filter(a => a.readiness < 60).length;
  const onStreak    = roster.filter(a => a.streak >= 3).length;
  const atRisk      = roster.filter(a => a.readiness < 55 || a.streak === 0);

  // Sort roster by readiness for display
  const sortedRoster = [...roster].sort((a,b) => b.readiness - a.readiness);

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/home')}
  <main class="page-main">

    <div class="page-header">
      <h1>${greeting}, <span>Coach ${fname}</span></h1>
      <p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · ${roster.length} Athletes · Team Overview</p>
    </div>

    <!-- Team KPI Row -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:20px">
      ${_coachKPI('Avg PIQ', avgPIQ, 'Team average', '#22c955', '🏅')}
      ${_coachKPI('Avg Readiness', avgReadiness, 'Today', avgReadiness>=75?'#22c955':avgReadiness>=60?'#f59e0b':'#ef4444', '💚')}
      ${_coachKPI('High Ready', highReady, 'Athletes ≥80', '#22c955', '⚡')}
      ${_coachKPI('At Risk', lowReady, 'Readiness <60', lowReady>0?'#ef4444':'#22c955', '⚠️')}
      ${_coachKPI('On Streak', onStreak, '3+ day streak', '#f59e0b', '🔥')}
    </div>

    <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:20px">
      <div>
        <!-- Roster Readiness Table -->
        <div class="panel" style="margin-bottom:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <div class="panel-title" style="margin:0">Roster Readiness</div>
            <div style="display:flex;gap:8px">
              <button class="btn-draft" style="padding:6px 12px;font-size:11px" data-route="coach/readiness">Full Report</button>
              <button class="btn-draft" style="padding:6px 12px;font-size:11px" data-route="coach/roster">Manage Roster</button>
            </div>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12.5px">
              <thead>
                <tr style="border-bottom:2px solid var(--border)">
                  <th style="text-align:left;padding:8px 6px;color:var(--text-muted);font-weight:600;font-size:11px">ATHLETE</th>
                  <th style="text-align:center;padding:8px 6px;color:var(--text-muted);font-weight:600;font-size:11px">POS</th>
                  <th style="text-align:center;padding:8px 6px;color:var(--text-muted);font-weight:600;font-size:11px">READINESS</th>
                  <th style="text-align:center;padding:8px 6px;color:var(--text-muted);font-weight:600;font-size:11px">PIQ</th>
                  <th style="text-align:center;padding:8px 6px;color:var(--text-muted);font-weight:600;font-size:11px">STREAK</th>
                  <th style="text-align:center;padding:8px 6px;color:var(--text-muted);font-weight:600;font-size:11px">STATUS</th>
                </tr>
              </thead>
              <tbody>
                ${sortedRoster.map(a => {
                  const rColor = a.readiness >= 80 ? '#22c955' : a.readiness >= 60 ? '#f59e0b' : '#ef4444';
                  const status = a.readiness >= 80 ? {label:'Ready',color:'#22c955'} : a.readiness >= 60 ? {label:'Moderate',color:'#f59e0b'} : {label:'At Risk',color:'#ef4444'};
                  return `
                <tr style="border-bottom:1px solid var(--border);cursor:pointer" data-route="coach/roster">
                  <td style="padding:10px 6px;font-weight:600;color:var(--text-primary)">${a.name}</td>
                  <td style="padding:10px 6px;text-align:center;color:var(--text-muted)">${a.position}</td>
                  <td style="padding:10px 6px;text-align:center">
                    <span style="font-weight:700;color:${rColor}">${a.readiness}</span>
                    <div style="height:3px;width:40px;margin:3px auto 0;background:var(--surface-2);border-radius:2px;overflow:hidden">
                      <div style="height:100%;width:${a.readiness}%;background:${rColor};border-radius:2px"></div>
                    </div>
                  </td>
                  <td style="padding:10px 6px;text-align:center;font-weight:700;color:var(--piq-green)">${a.piq}</td>
                  <td style="padding:10px 6px;text-align:center;color:${a.streak>=3?'#f59e0b':'var(--text-muted)'}">${a.streak > 0 ? a.streak + 'd 🔥' : '—'}</td>
                  <td style="padding:10px 6px;text-align:center">
                    <span style="padding:3px 10px;border-radius:12px;background:${status.color}20;color:${status.color};font-size:10px;font-weight:700;border:1px solid ${status.color}40">${status.label}</span>
                  </td>
                </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- At-Risk Athletes Alert -->
        ${atRisk.length > 0 ? `
        <div class="panel" style="border:1px solid #ef444440;background:#ef444408;margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span style="font-size:18px">⚠️</span>
            <div class="panel-title" style="margin:0;color:#ef4444">Athletes Needing Attention (${atRisk.length})</div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">These athletes have low readiness or missed recent sessions. Consider modifying their training load today.</div>
          ${atRisk.map(a => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #ef444420">
            <div>
              <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${a.name}</span>
              <span style="font-size:11px;color:var(--text-muted);margin-left:8px">${a.position}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              ${a.readiness < 60 ? `<span style="font-size:11px;color:#ef4444">Readiness: ${a.readiness}</span>` : ''}
              ${a.streak === 0 ? `<span style="font-size:11px;color:#f59e0b">No streak</span>` : ''}
            </div>
          </div>`).join('')}
        </div>` : ''}
      </div>

      <div>
        <!-- Readiness Distribution -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Team Readiness Distribution</div>
          <div style="margin-top:14px">
            ${[
              { label: 'High (80–100)', count: highReady, total: roster.length, color: '#22c955' },
              { label: 'Moderate (60–79)', count: roster.filter(a=>a.readiness>=60&&a.readiness<80).length, total: roster.length, color: '#f59e0b' },
              { label: 'Low (<60)', count: lowReady, total: roster.length, color: '#ef4444' },
            ].map(b => `
            <div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:12px;color:var(--text-muted)">${b.label}</span>
                <span style="font-size:12px;font-weight:700;color:${b.color}">${b.count} athletes</span>
              </div>
              <div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${Math.round((b.count/b.total)*100)}%;background:${b.color};border-radius:4px;transition:width 600ms ease"></div>
              </div>
            </div>`).join('')}
          </div>
        </div>

        <!-- Quick Coach Actions -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Coach Actions</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
            ${[
              ['📐', 'Build Training Program', 'coach/program'],
              ['📋', 'View Full Roster', 'coach/roster'],
              ['💚', 'Team Readiness Report', 'coach/readiness'],
              ['📈', 'Team Analytics', 'coach/analytics'],
              ['💬', 'Message Athletes', 'coach/messages'],
              ['📅', 'Team Calendar', 'coach/calendar'],
            ].map(([icon, label, route]) => `
            <button class="btn-draft" style="display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;font-size:13px" data-route="${route}">
              <span style="font-size:16px">${icon}</span> ${label}
            </button>`).join('')}
          </div>
        </div>

        <!-- Coaching Science Tip -->
        <div class="panel" style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border:1px solid #22c95530">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.06em;margin-bottom:8px">COACHING INSIGHT</div>
          <div style="font-size:13px;color:#c8d8e8;line-height:1.6;font-style:italic">"The best coaches don't just design great workouts — they monitor readiness and adjust load in real time. Athlete monitoring is the most evidence-based tool in modern coaching." — NSCA Strength & Conditioning Journal</div>
        </div>
      </div>
    </div>

  </main>
</div>`;
}

function _coachKPI(label, value, sub, color, icon) {
  return `
<div class="panel" style="border-bottom:3px solid ${color}">
  <div style="display:flex;align-items:flex-start;justify-content:space-between">
    <div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase">${label}</div>
      <div style="font-size:24px;font-weight:900;color:${color};margin:4px 0 2px">${value}</div>
      <div style="font-size:11px;color:var(--text-muted)">${sub}</div>
    </div>
    <span style="font-size:22px">${icon}</span>
  </div>
</div>`;
}
