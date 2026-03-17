/**
 * Coach Roster View — detailed athlete management
 */
import { buildSidebar } from '../../components/nav.js';
import { getRoster }    from '../../state/state.js';

const SPORT_EMOJI = {basketball:'🏀',football:'🏈',soccer:'⚽',baseball:'⚾',volleyball:'🏐',track:'🏃'};

export function renderCoachRoster() {
  const roster = getRoster();

  const cards = roster.map(a => `
  <div class="panel" style="padding:16px;margin-bottom:0">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="width:42px;height:42px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:20px">${SPORT_EMOJI[a.sport]||'🏅'}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px;color:var(--text-primary)">${a.name}</div>
        <div style="font-size:12px;color:var(--text-muted)">${a.position||'—'} · ${a.sport||'—'}</div>
      </div>
      ${a.readiness>=80
        ? `<span class="alert-badge alert-ready">Ready</span>`
        : a.readiness<60
        ? `<span class="alert-badge alert-caution">Caution</span>`
        : `<span class="alert-badge" style="background:var(--g200);color:var(--g600)">Moderate</span>`}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px">
      <div style="text-align:center;padding:8px;background:var(--surface-2);border-radius:8px">
        <div style="color:var(--text-muted);margin-bottom:2px">Readiness</div>
        <div style="font-weight:700;font-size:16px;color:${a.readiness>=80?'var(--piq-green)':a.readiness<60?'#ef4444':'#f59e0b'}">${a.readiness}%</div>
      </div>
      <div style="text-align:center;padding:8px;background:var(--surface-2);border-radius:8px">
        <div style="color:var(--text-muted);margin-bottom:2px">PIQ Score</div>
        <div style="font-weight:700;font-size:16px;color:var(--text-primary)">${a.piq}</div>
      </div>
      <div style="text-align:center;padding:8px;background:var(--surface-2);border-radius:8px">
        <div style="color:var(--text-muted);margin-bottom:2px">Streak</div>
        <div style="font-weight:700;font-size:16px">🔥 ${a.streak}d</div>
      </div>
    </div>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/roster')}
  <main class="page-main">
    <div class="page-header">
      <h1>Roster Management</h1>
      <p>${roster.length} athletes · Individual performance profiles</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
      ${cards}
    </div>
  </main>
</div>`;
}
