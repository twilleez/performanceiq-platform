/**
 * PerformanceIQ — Solo Library View
 */
import { buildSidebar }                    from '../../components/nav.js';
import { EXERCISES, TRAINING_TEMPLATES }   from '../../data/exerciseLibrary.js';
import { getCurrentUser }                  from '../../core/auth.js';
import { getAthleteProfile }               from '../../state/state.js';

export function renderSoloLibrary() {
  const user    = getCurrentUser();
  const profile = getAthleteProfile();
  const sport   = profile.sport || user?.sport || 'basketball';

  const categories = ['strength','power','speed','agility','core','mobility','recovery'];

  const catPills = categories.map(c => {
    const count = EXERCISES.filter(e => e.category === c).length;
    return `<div style="padding:8px 14px;border-radius:20px;background:var(--surface-2);font-size:12.5px;font-weight:600;color:var(--text-primary);cursor:pointer;white-space:nowrap;border:1px solid var(--border)">
      ${c.charAt(0).toUpperCase()+c.slice(1)} <span style="color:var(--text-muted)">(${count})</span>
    </div>`;
  }).join('');

  const sportExercises = EXERCISES.filter(e => e.sports?.includes(sport) || e.sport === sport || e.sports?.includes('all'));
  const featured = (sportExercises.length >= 6 ? sportExercises : EXERCISES).slice(0,8);

  const featuredExercises = featured.map(e => `
  <div style="padding:12px;border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:border-color .15s;background:var(--surface)">
    <div style="font-weight:600;font-size:13px;color:var(--text-primary);margin-bottom:6px">${e.name}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap">
      <span style="font-size:10.5px;padding:2px 8px;border-radius:10px;background:var(--surface-2);color:var(--text-muted)">${e.category}</span>
      ${(e.tags||[]).slice(0,2).map(t=>`<span style="font-size:10.5px;padding:2px 8px;border-radius:10px;background:var(--surface-2);color:var(--text-muted)">${t}</span>`).join('')}
    </div>
  </div>`).join('');

  const soloTemplates = TRAINING_TEMPLATES.filter(t => t.sport === sport || t.level === 'All Levels' || t.popular).slice(0,4);
  const templateCards = soloTemplates.map(t => `
  <div class="panel" style="padding:16px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
      <div style="font-weight:700;font-size:13.5px;color:var(--text-primary);flex:1">${t.title}</div>
      ${t.popular?`<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#22c95522;color:#22c955;font-weight:700;margin-left:8px;flex-shrink:0">POPULAR</span>`:''}
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${t.sport} · ${t.duration}wk · ${t.sessions_per_week}×/week · ${t.level}</div>
    <div style="font-size:12px;color:var(--text-primary);font-weight:600;margin-bottom:10px">Focus: ${t.focus}</div>
    <div style="display:flex;gap:3px;margin-bottom:10px">
      ${(t.phases||[]).map(ph=>`<div style="flex:${ph.weeks};height:5px;background:${ph.color};border-radius:2px" title="${ph.label}"></div>`).join('')}
    </div>
    <button class="btn-draft" style="font-size:12px;padding:7px 14px;width:100%" data-route="solo/builder">Use Template</button>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/library')}
  <main class="page-main">
    <div class="page-header">
      <h1>Exercise <span>Library</span></h1>
      <p>${EXERCISES.length} exercises · ${TRAINING_TEMPLATES.length} program templates</p>
    </div>
    <div class="panel" style="margin-bottom:16px">
      <div class="panel-title">Browse by Category</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${catPills}</div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Exercises for ${sport.charAt(0).toUpperCase()+sport.slice(1)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">${featuredExercises}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:10px">Showing ${featured.length} of ${EXERCISES.length} exercises</div>
      </div>
      <div>
        <div class="panel-title" style="margin-bottom:12px">Program Templates</div>
        ${templateCards}
        <button class="btn-draft" style="width:100%;font-size:12px;margin-top:4px" data-route="solo/builder">Open Builder →</button>
      </div>
    </div>
  </main>
</div>`;
}
