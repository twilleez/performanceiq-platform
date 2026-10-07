import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getRoster, getState } from '../../state/state.js';
import { pendingUploads } from '../../services/cloudSync.js';
import { esc, hasNum, pct, avg, count, readinessTone, loadColor, shortDate, syncNotice } from '../../components/athleteMetrics.js';

function shell(route, title, body) {
  return `<div class="view-with-sidebar">
    ${buildSidebar('coach', route)}
    <main class="page-main">
      <div class="page-header"><h1>${title}</h1><p>Real data from athletes sharing with this coach</p></div>
      ${syncNotice(getState().cloud, pendingUploads())}
      ${body}
    </main>
  </div>`;
}

function invite() { return '<div data-piq-link-panel="coach"></div>'; }

function empty(route) {
  return shell(route, 'Coach <span>Dashboard</span>', `
    <div class="panel" style="text-align:center;padding:28px 20px;margin-bottom:16px">
      <div style="font-size:30px">🎽</div>
      <div style="font-weight:700;margin-top:8px">No athletes are sharing with you yet</div>
      <div style="font-size:12.5px;color:var(--text-muted);margin-top:6px">
        Send your coach code to an athlete. They must connect you from Settings → Share my data.
      </div>
    </div>
    ${invite()}`);
}

function stats(roster) {
  const checked = count(roster, 'readiness');
  return `<div class="kpi-row">
    <div class="kpi-card"><div class="kpi-lbl">Athletes</div><div class="kpi-val">${roster.length}</div><div class="kpi-chg">Sharing with you</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Checked in today</div><div class="kpi-val">${checked}</div><div class="kpi-chg">Readiness check-ins</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Avg readiness</div><div class="kpi-val">${pct(avg(roster,'readiness'))}</div><div class="kpi-chg">Real check-ins only</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Low readiness</div><div class="kpi-val">${count(roster,'readiness',v=>v<60)}</div><div class="kpi-chg">Under 60% today</div></div>
  </div>`;
}

function table(roster) {
  const rows = roster.map(a => {
    const tone = readinessTone(a.readiness);
    const load = hasNum(a.acwr)
      ? `<strong style="color:${loadColor(a.loadZone)}">${a.acwr.toFixed(2)}</strong>`
      : '<span style="color:var(--text-muted)">—</span>';
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px;text-align:left"><strong>${esc(a.name)}</strong><div style="font-size:11px;color:var(--text-muted)">${esc([a.position,a.sport].filter(Boolean).join(' · ')||'—')}</div></td>
      <td style="padding:10px;text-align:center;color:${tone.color};font-weight:700">${hasNum(a.readiness)?a.readiness+'%':'—'}</td>
      <td style="padding:10px;text-align:center">${hasNum(a.piq)?a.piq:'—'}</td>
      <td style="padding:10px;text-align:center">${a.sessions7 ?? 0}</td>
      <td style="padding:10px;text-align:center">${load}</td>
      <td style="padding:10px;text-align:center">${a.streak ?? 0}</td>
      <td style="padding:10px;text-align:center;color:var(--text-muted)">${shortDate(a.lastSessionTs)}</td>
    </tr>`;
  }).join('');
  return `<div class="panel"><div class="panel-title">Athletes</div><div style="overflow-x:auto;margin-top:10px">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th>Athlete</th><th>Readiness</th><th>PIQ</th><th>7d Days</th><th>Load Ratio</th><th>Streak</th><th>Last Session</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div></div>`;
}

function attention(roster) {
  const flagged = roster.filter(a => (hasNum(a.readiness)&&a.readiness<60) || ['danger','spike'].includes(a.loadZone) || a.sessions7===0);
  if (!flagged.length) return '';
  return `<div class="panel" style="margin-bottom:16px;border-color:rgba(245,158,11,.35)">
    <div class="panel-title">Athletes Needing Attention</div>
    ${flagged.map(a=>`<div style="padding:8px 0;border-bottom:1px solid var(--border)"><strong>${esc(a.name)}</strong><div style="font-size:11.5px;color:var(--text-muted)">${hasNum(a.readiness)&&a.readiness<60?'Low readiness. ':''}${['danger','spike'].includes(a.loadZone)?'Load above recent baseline. ':''}${a.sessions7===0?'No session in 7 days.':''}</div></div>`).join('')}
  </div>`;
}

function render(route, title) {
  const roster = getRoster();
  if (!roster.length) return empty(route);
  return shell(route, title, `${stats(roster)}${attention(roster)}${table(roster)}${route==='coach/roster'?invite():''}`);
}

export function renderRealCoachHome() {
  const name = getCurrentUser()?.name?.split(' ')[0] || 'Coach';
  return render('coach/home', `Welcome, <span>${esc(name)}</span>`);
}
export function renderRealCoachTeam() { return render('coach/team', 'Team <span>Overview</span>'); }
export function renderRealCoachRoster() { return render('coach/roster', 'Roster <span>Management</span>'); }
export function renderRealCoachReadiness() { return render('coach/readiness', 'Team <span>Readiness</span>'); }
export function renderRealCoachAnalytics() { return render('coach/analytics', 'Team <span>Analytics</span>'); }
export function renderRealCoachReports() { return render('coach/reports', 'Team <span>Reports</span>'); }
