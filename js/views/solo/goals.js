import { buildSidebar }   from '../../components/nav.js';
import { getAthleteProfile, patchProfile } from '../../state/state.js';
import { showToast }      from '../../core/notifications.js';

export function renderSoloGoals() {
  const profile = getAthleteProfile();
  const goals   = profile.goals || [];
  const ALL_GOALS = ['strength','speed','endurance','flexibility','conditioning','recovery','vertical','recruiting'];

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/goals')}
  <main class="page-main">
    <div class="page-header"><h1>My <span>Goals</span></h1><p>Focus your training priorities</p></div>
    <div class="panel" style="max-width:560px">
      <div class="panel-title">Training Goals</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Select all that apply — your goals shape recommendations.</p>
      <div class="onboard-goals" id="goals-grid">
        ${ALL_GOALS.map(g => `
        <button class="onboard-goal ${goals.includes(g)?'sel':''}" data-g="${g}">
          ${{strength:'💪',speed:'⚡',endurance:'🏃',flexibility:'🧘',conditioning:'🔥',recovery:'💚',vertical:'⬆️',recruiting:'🎓'}[g]} ${g.charAt(0).toUpperCase()+g.slice(1)}
        </button>`).join('')}
      </div>
      <div style="margin-top:24px;display:flex;gap:10px">
        <button class="btn-primary" style="width:auto;padding:11px 24px" id="save-goals-btn">Save Goals</button>
        <button class="btn-draft" style="padding:11px 20px" data-route="solo/home">← Back</button>
      </div>
      <p id="goals-saved" style="color:var(--piq-green-dark);font-size:13px;margin-top:10px;display:none">✓ Goals saved</p>
      ${goals.length ? `<div style="margin-top:16px;font-size:12.5px;color:var(--text-muted)">Current: ${goals.join(' · ')}</div>` : ''}
    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', () => {
  if (!document.getElementById('save-goals-btn')) return;
  const selected = new Set(getAthleteProfile().goals || []);

  document.querySelectorAll('#goals-grid .onboard-goal').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('sel');
      const g = btn.dataset.g;
      if (btn.classList.contains('sel')) selected.add(g); else selected.delete(g);
    });
  });

  document.getElementById('save-goals-btn')?.addEventListener('click', () => {
    patchProfile({ goals: [...selected] });
    const el = document.getElementById('goals-saved');
    if (el) { el.style.display='block'; setTimeout(()=>el.style.display='none',2500); }
    showToast('🎯 Goals saved!');
  });
});

function getAthleteProfile() {
  try { const s=JSON.parse(localStorage.getItem('piq_state_v3')||'{}'); return s.athleteProfile||{goals:[]}; }
  catch(_){ return {goals:[]}; }
}
