/**
 * Coach Library View — exercise and program library
 */
import { buildSidebar }                      from '../../components/nav.js';
import { EXERCISES, TRAINING_TEMPLATES }   from '../../data/exerciseLibrary.js';

export function renderCoachLibrary() {
  const categories = ['strength','power','speed','agility','core','mobility','recovery'];
  const catCounts = categories.map(c => ({ cat: c, count: EXERCISES.filter(e=>e.category===c).length }));

  const catPills = catCounts.map(c => `
  <div style="padding:8px 14px;border-radius:20px;background:var(--surface-2);font-size:12.5px;font-weight:600;color:var(--text-primary);cursor:pointer;white-space:nowrap">
    ${c.cat.charAt(0).toUpperCase()+c.cat.slice(1)} <span style="color:var(--text-muted)">(${c.count})</span>
  </div>`).join('');

  const featuredExercises = EXERCISES.slice(0,8).map(e => `
  <div style="padding:12px;border:1px solid var(--border);border-radius:10px">
    <div style="font-weight:600;font-size:13px;color:var(--text-primary);margin-bottom:4px">${e.name}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:var(--surface-2);color:var(--text-muted)">${e.category}</span>
      ${e.tags.slice(0,2).map(t=>`<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:var(--surface-2);color:var(--text-muted)">${t}</span>`).join('')}
    </div>
  </div>`).join('');

  const templateCards = TRAINING_TEMPLATES.slice(0,4).map(t => `
  <div class="panel" style="padding:16px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <div style="font-weight:700;font-size:13.5px;color:var(--text-primary);flex:1">${t.title}</div>
      ${t.popular?`<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#22c95522;color:#22c955;font-weight:700;margin-left:8px">POPULAR</span>`:''}
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${t.sport} · ${t.duration}w · ${t.sessions_per_week}x/week · ${t.level}</div>
    <div style="font-size:12px;color:var(--text-primary);font-weight:600;margin-bottom:6px">Focus: ${t.focus}</div>
    <button class="btn-draft" style="font-size:12px;padding:7px 14px;width:100%">Use Template</button>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/library')}
  <main class="page-main">
    <div class="page-header">
      <h1>Exercise Library</h1>
      <p>${EXERCISES.length} exercises · ${TRAINING_TEMPLATES.length} program templates</p>
    </div>
    <div class="panel" style="margin-bottom:16px">
      <div class="panel-title">Browse by Category</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${catPills}</div>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Exercises</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">${featuredExercises}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:10px">Showing 8 of ${EXERCISES.length} exercises</div>
      </div>
      <div>
        <div class="panel-title" style="margin-bottom:12px">Program Templates</div>
        ${templateCards}
      </div>
    </div>
  </main>
</div>`;
}
