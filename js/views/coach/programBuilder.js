import { buildSidebar } from '../../components/nav.js';
import { getRoster } from '../../state/state.js';
export function renderCoachProgram() {
  const phases = [
    {id:'pre',label:'Pre-Season',color:'#3b82f6',weeks:6,focus:'Base fitness, volume'},
    {id:'in', label:'In-Season', color:'#22c955',weeks:18,focus:'Maintain, peaking'},
    {id:'post',label:'Post-Season',color:'#f59e0b',weeks:4,focus:'Recovery, transition'},
    {id:'off', label:'Off-Season', color:'#a78bfa',weeks:12,focus:'Strength, development'},
  ];
  const templates = [
    {name:'Basketball — In-Season Maintenance',sessions:4,duration:'8 wk',level:'Intermediate',sport:'🏀'},
    {name:'Athletic Development Block',sessions:3,duration:'6 wk',level:'All Levels',sport:'⚡'},
    {name:'Speed & Power Focus',sessions:4,duration:'4 wk',level:'Advanced',sport:'🏃'},
    {name:'Recovery & Deload Week',sessions:2,duration:'1 wk',level:'All Levels',sport:'💚'},
  ];
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/program')}
  <main class="page-main">
    <div class="page-header"><h1>Program <span>Builder</span></h1><p>Build and assign periodized training programs to your roster</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Season Phases</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
            ${phases.map(p=>`
            <div style="padding:12px;border:1px solid ${p.color}40;border-radius:10px;background:${p.color}0a">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div style="font-weight:700;font-size:13.5px;color:var(--text-primary)">${p.label}</div>
                <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${p.color}22;color:${p.color};font-weight:700">${p.weeks}wk</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px">${p.focus}</div>
            </div>`).join('')}
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Assign to Roster</div>
          <div style="font-size:12.5px;color:var(--text-muted);margin:10px 0">Select athletes to receive this program:</div>
          ${getRoster().map(a=>`
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
            <input type="checkbox" id="ath-${a.id}" style="accent-color:var(--piq-green)">
            <label for="ath-${a.id}" style="font-size:13px;color:var(--text-primary);cursor:pointer;flex:1">${a.name}</label>
            <span style="font-size:11.5px;color:var(--text-muted)">${a.position||'—'}</span>
          </div>`).join('')}
          <button class="btn-primary" style="width:100%;margin-top:14px;font-size:13px;padding:11px">Assign Program</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Program Templates</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
          ${templates.map(t=>`
          <div style="padding:14px;border:1px solid var(--border);border-radius:12px;cursor:pointer;transition:border-color .15s" style="hover:border-color:var(--piq-green)">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
              <span style="font-size:20px">${t.sport}</span>
              <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${t.name}</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <span style="font-size:11px;padding:2px 8px;border-radius:8px;background:var(--surface-2);color:var(--text-muted)">${t.sessions}x/week</span>
              <span style="font-size:11px;padding:2px 8px;border-radius:8px;background:var(--surface-2);color:var(--text-muted)">${t.duration}</span>
              <span style="font-size:11px;padding:2px 8px;border-radius:8px;background:var(--surface-2);color:var(--text-muted)">${t.level}</span>
            </div>
            <button class="btn-draft" style="width:100%;font-size:12px;padding:7px 12px;margin-top:10px">Use Template →</button>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </main>
</div>`;
}