import { buildSidebar } from '../../components/nav.js';
import { getAthleteProfile, patchProfile } from '../../state/state.js';
import { showToast } from '../../core/notifications.js';
export function renderSoloGoals() {
  const profile = getAthleteProfile();
  const allGoals = [
    {id:'strength',emoji:'💪',label:'Strength'},
    {id:'speed',emoji:'⚡',label:'Speed'},
    {id:'endurance',emoji:'🏃',label:'Endurance'},
    {id:'flexibility',emoji:'🧘',label:'Flexibility'},
    {id:'conditioning',emoji:'🔥',label:'Conditioning'},
    {id:'recovery',emoji:'💚',label:'Recovery'},
    {id:'vertical',emoji:'⬆️',label:'Vertical Jump'},
    {id:'recruiting',emoji:'🎓',label:'Recruiting'},
    {id:'injury_prev',emoji:'🛡️',label:'Injury Prevention'},
    {id:'nutrition',emoji:'🥗',label:'Nutrition'},
  ];
  const selected = profile.goals||[];
  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/goals')}
  <main class="page-main">
    <div class="page-header"><h1>Training <span>Goals</span></h1><p>Set your focus areas to personalise your workout programming</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px">
      <div class="panel">
        <div class="panel-title">Select Your Goals</div>
        <div style="font-size:12px;color:var(--text-muted);margin:8px 0 16px">Choose 1–3 primary goals. These directly influence your workout recommendations.</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="goals-grid">
          ${allGoals.map(g=>`
          <div class="goal-chip ${selected.includes(g.id)?'sel':''}" data-goal="${g.id}"
            style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;cursor:pointer;border:2px solid ${selected.includes(g.id)?'var(--piq-green)':'var(--border)'};background:${selected.includes(g.id)?'var(--piq-green-glow)':'var(--surface-2)'};transition:all .15s">
            <span style="font-size:16px">${g.emoji}</span>
            <span style="font-size:12.5px;font-weight:${selected.includes(g.id)?700:500};color:var(--text-primary)">${g.label}</span>
          </div>`).join('')}
        </div>
        <button class="btn-primary" style="width:100%;margin-top:18px;font-size:13px;padding:12px" id="save-goals-btn">Save Goals</button>
      </div>
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Your Current Goals</div>
          <div style="margin-top:10px">
            ${selected.length ? selected.map(id=>{
              const g = allGoals.find(x=>x.id===id)||{emoji:'🎯',label:id};
              return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)"><span>${g.emoji}</span><span style="font-size:13px;color:var(--text-primary);font-weight:600">${g.label}</span></div>`;
            }).join('') : '<div style="font-size:13px;color:var(--text-muted);padding:10px 0">No goals set yet. Select from the left panel.</div>'}
          </div>
        </div>
        <div class="panel" style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border-color:#22c95530">
          <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.06em;margin-bottom:8px">HOW GOALS ARE USED</div>
          <div style="font-size:12.5px;color:#c8d8e8;line-height:1.6">Your goals directly shape your daily workout selection and which PIQ pillars are prioritised in your score. Update them whenever your training focus shifts.</div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}
document.addEventListener('piq:viewRendered', e => {
  if (e.detail?.route !== 'solo/goals') return;
  const selected = new Set((getAthleteProfile ? getAthleteProfile().goals||[] : []));
  document.querySelectorAll('.goal-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const g = chip.dataset.goal;
      if (selected.has(g)) { selected.delete(g); chip.classList.remove('sel'); chip.style.borderColor='var(--border)'; chip.style.background='var(--surface-2)'; chip.querySelector('span:last-child').style.fontWeight=500; }
      else { selected.add(g); chip.classList.add('sel'); chip.style.borderColor='var(--piq-green)'; chip.style.background='var(--piq-green-glow)'; chip.querySelector('span:last-child').style.fontWeight=700; }
    });
  });
  document.getElementById('save-goals-btn')?.addEventListener('click', () => {
    if (typeof patchProfile === 'function') patchProfile({ goals: [...selected] });
    showToast('✅ Goals saved!', 'success');
  });
});