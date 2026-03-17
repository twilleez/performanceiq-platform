/**
 * Coach Session View — session planning and logging
 */
import { buildSidebar } from '../../components/nav.js';
import { getRoster }    from '../../state/state.js';

export function renderCoachSession() {
  const roster = getRoster();
  const ready = roster.filter(a=>a.readiness>=80);

  const sessionTypes = [
    { icon:'⚡', label:'Speed & Agility', desc:'Sprint mechanics, COD, acceleration work', color:'#3b82f6' },
    { icon:'💪', label:'Strength Block', desc:'Compound lifts, progressive overload', color:'#22c955' },
    { icon:'🏀', label:'Skill Development', desc:'Sport-specific technical work', color:'#f59e0b' },
    { icon:'🧘', label:'Recovery Session', desc:'Mobility, foam rolling, light movement', color:'#a78bfa' },
  ];

  const typeCards = sessionTypes.map(s => `
  <div style="padding:16px;border:1px solid var(--border);border-radius:12px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor='${s.color}'" onmouseout="this.style.borderColor='var(--border)'">
    <div style="font-size:24px;margin-bottom:8px">${s.icon}</div>
    <div style="font-weight:600;font-size:13.5px;color:var(--text-primary);margin-bottom:4px">${s.label}</div>
    <div style="font-size:12px;color:var(--text-muted)">${s.desc}</div>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/session')}
  <main class="page-main">
    <div class="page-header">
      <h1>Session Planner</h1>
      <p>Plan and log team training sessions</p>
    </div>
    <div class="panels-2">
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Quick Session Start</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
            ${typeCards}
          </div>
          <button class="btn-primary" style="width:100%;margin-top:16px;font-size:13px;padding:12px">Create Custom Session</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Athletes Available Today</div>
        <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:12px">${ready.length} of ${roster.length} athletes at ≥80% readiness</div>
        ${ready.slice(0,6).map(a=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:14px">🏅</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600">${a.name}</div>
            <div style="font-size:11.5px;color:var(--text-muted)">${a.position||'—'}</div>
          </div>
          <span style="font-size:12px;font-weight:700;color:var(--piq-green)">${a.readiness}%</span>
        </div>`).join('')}
      </div>
    </div>
  </main>
</div>`;
}
