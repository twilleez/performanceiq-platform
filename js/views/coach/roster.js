import { buildSidebar } from '../../components/nav.js';
import { getRoster } from '../../state/state.js';
const SPORT_EMOJI = {basketball:'🏀',football:'🏈',soccer:'⚽',baseball:'⚾',volleyball:'🏐',track:'🏃'};
export function renderCoachRoster() {
  const roster = getRoster();
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/roster')}
  <main class="page-main">
    <div class="page-header"><h1>Roster <span>Management</span></h1><p>${roster.length} athletes · Individual performance profiles</p></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${roster.map(a => `
      <div class="panel" style="padding:16px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:42px;height:42px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:20px">${SPORT_EMOJI[a.sport]||'🏅'}</div>
          <div style="flex:1"><div style="font-weight:700;font-size:14px;color:var(--text-primary)">${a.name}</div><div style="font-size:12px;color:var(--text-muted)">${a.position||'—'} · ${a.sport||'—'}</div></div>
          <span class="alert-badge ${a.readiness>=80?'alert-ready':a.readiness<60?'alert-caution':''}" style="${a.readiness>=60&&a.readiness<80?'background:var(--surface-2);color:var(--text-muted)':''}">${a.readiness>=80?'Ready':a.readiness<60?'Caution':'Moderate'}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;font-size:12px">
          <div style="padding:8px;background:var(--surface-2);border-radius:8px"><div style="color:var(--text-muted);margin-bottom:2px">Readiness</div><div style="font-weight:700;font-size:16px;color:${a.readiness>=80?'var(--piq-green)':a.readiness<60?'#ef4444':'#f59e0b'}">${a.readiness}%</div></div>
          <div style="padding:8px;background:var(--surface-2);border-radius:8px"><div style="color:var(--text-muted);margin-bottom:2px">PIQ</div><div style="font-weight:700;font-size:16px;color:var(--text-primary)">${a.piq}</div></div>
          <div style="padding:8px;background:var(--surface-2);border-radius:8px"><div style="color:var(--text-muted);margin-bottom:2px">Streak</div><div style="font-weight:700;font-size:16px">🔥${a.streak}d</div></div>
        </div>
        <div style="margin-top:10px;font-size:11.5px;color:var(--text-muted)">
          ${a.level?`Level: <strong>${a.level}</strong> &nbsp;·&nbsp; `:''}
          ${a.compPhase?`Phase: <strong>${a.compPhase}</strong>`:''}
        </div>
      </div>`).join('')}
    </div>
  </main>
</div>`;
}