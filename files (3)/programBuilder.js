/**
 * Coach Program Builder
 * Full workout builder with template picker — ported from 15A/15B.
 */
import { buildSidebar }             from '../../components/nav.js';
import { TRAINING_TEMPLATES, SPORT_EMOJI } from '../../data/exerciseLibrary.js';
import { getState, patchBuilder, addWorkoutLog } from '../../state/state.js';
import { showToast }                from '../../core/notifications.js';
import { getRoster }                from '../../state/state.js';
import { navigate }                 from '../../router.js';

export function renderCoachProgram() {
  const BS = getState().builder;
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/program')}
  <main class="page-main">
    <div class="page-header">
      <h1>Program <span>Builder</span></h1>
      <p>Build workouts from scratch or load a template.</p>
    </div>

    <!-- Tab bar -->
    <div class="tab-bar">
      <button class="tab-btn ${BS.activeTab==='plan'?'active':''}" id="tab-plan">Training Plans</button>
      <button class="tab-btn ${BS.activeTab==='builder'?'active':''}" id="tab-build">Workout Builder</button>
    </div>

    <!-- Plan view -->
    <div id="plan-view" ${BS.activeTab!=='plan'?'style="display:none"':''}>
      <div class="panel">
        <div class="panel-title">Active Training Plans</div>
        ${planRows()}
      </div>
    </div>

    <!-- Builder view -->
    <div id="builder-view" ${BS.activeTab!=='builder'?'style="display:none"':''}>
      ${builderHTML(BS)}
    </div>
  </main>
</div>

<!-- Template Picker Sheet -->
<div id="tpl-picker-sheet" class="tpl-picker-sheet">
  <div class="tpl-picker-inner">
    <div class="tpl-picker-head">
      <h3>Load Template</h3>
      <button class="tpl-close" id="tpl-close-btn">✕</button>
    </div>
    <div class="tpl-sport-filters" id="tpl-filters">
      <button class="tpl-sport-btn active" data-filter="all">All</button>
      ${['basketball','football','soccer','baseball','volleyball','track'].map(s=>
        `<button class="tpl-sport-btn" data-filter="${s}">${SPORT_EMOJI[s]} ${s[0].toUpperCase()+s.slice(1)}</button>`
      ).join('')}
    </div>
    <div class="tpl-grid" id="tpl-grid"></div>
  </div>
</div>

<!-- Assign modal is global in shell -->`;
}

function planRows() {
  const plans = TRAINING_TEMPLATES.filter(t=>t.popular).slice(0,5);
  if (!plans.length) return '<p style="color:var(--text-muted)">No active plans. Create one in the Builder tab.</p>';
  return plans.map(t=>`
  <div class="w-row">
    <div class="w-icon">${SPORT_EMOJI[t.sport]||'📋'}</div>
    <div class="w-info">
      <div class="w-name">${t.title}</div>
      <div class="w-meta">${t.duration}wk · ${t.sessions_per_week}x/wk · ${t.focus}</div>
    </div>
    <span class="w-badge">${t.level}</span>
  </div>`).join('');
}

function builderHTML(BS) {
  const d = BS.draft;
  return `
<!-- Load template trigger -->
<div class="builder-tpl-trigger" id="tpl-trigger">
  <div class="btpl-text">
    <div class="btpl-head">📋 ${d ? `Template: ${d.title||'Untitled'}` : 'Load a Training Template'}</div>
    <div class="btpl-sub">${d ? `${d.sport||''} · ${d.duration||'?'}wk · ${d.sessions_per_week||'?'}x/wk` : 'Start from proven programs for any sport'}</div>
  </div>
  <div class="btpl-icon">⬇️</div>
</div>

${d ? `
<div class="assign-banner" id="assign-banner">
  <p>✅ <strong>${d.title}</strong> loaded — ${(d.exercises||[]).length} exercises ready to assign</p>
  <button class="banner-dismiss" id="banner-dismiss">×</button>
</div>` : ''}

<!-- Workout form -->
<div class="panel">
  <div class="panel-title">Workout Details</div>
  <div class="b-field-row">
    <div class="b-field"><label>Workout Name</label>
      <input type="text" id="b-title" value="${d?.title||''}" placeholder="e.g. Pre-Season Power Block Wk1"></div>
    <div class="b-field"><label>Sport</label>
      <select id="b-sport">
        ${['basketball','football','soccer','baseball','volleyball','track'].map(s=>
          `<option value="${s}" ${d?.sport===s?'selected':''}>${SPORT_EMOJI[s]} ${s[0].toUpperCase()+s.slice(1)}</option>`
        ).join('')}
      </select></div>
  </div>
  <div class="b-field-row">
    <div class="b-field"><label>Day Type</label>
      <select id="b-day-type">
        <option ${d?.day_type==='Strength'?'selected':''}>Strength</option>
        <option ${d?.day_type==='Power'?'selected':''}>Power</option>
        <option ${d?.day_type==='Speed'?'selected':''}>Speed</option>
        <option ${d?.day_type==='Conditioning'?'selected':''}>Conditioning</option>
        <option ${d?.day_type==='Recovery'?'selected':''}>Recovery</option>
      </select></div>
    <div class="b-field"><label>Date</label>
      <input type="date" id="b-date" value="${new Date().toISOString().split('T')[0]}"></div>
  </div>

  <!-- Phase bar -->
  ${d?.phases ? `
  <div class="plan-phase-bar" style="margin-bottom:16px">
    ${d.phases.map(ph=>`<div class="plan-phase-segment" style="background:${ph.color};flex:${ph.weeks}">${ph.label}</div>`).join('')}
  </div>` : ''}

  <!-- Exercise table -->
  <div class="panel-title" style="margin-top:4px">Exercises</div>
  <div class="ex-header">
    <span>Exercise</span><span>Sets</span><span>Reps</span><span>Rest (s)</span><span></span>
  </div>
  <div id="ex-list">
    ${(d?.exercises||[]).map((ex,i)=>exRow(ex,i)).join('')}
    ${!(d?.exercises?.length) ? exRow({name:'',sets:3,reps:8,rest:60},0) : ''}
  </div>
  <div style="margin-top:10px">
    <button class="btn-add-ex" id="btn-add-ex">+ Add Exercise</button>
  </div>

  <div style="display:flex;gap:12px;margin-top:24px;flex-wrap:wrap">
    <button class="btn-assign" id="btn-assign">📋 Assign to Athletes</button>
    <button class="btn-draft" id="btn-draft">💾 Save Draft</button>
  </div>
</div>`;
}

function exRow(ex, i) {
  return `<div class="ex-row" id="ex-row-${i}">
  <input type="text"   class="ex-name" value="${ex.name||''}" placeholder="Exercise name" data-idx="${i}">
  <input type="number" class="ex-sets" value="${ex.sets||3}"  min="1" max="20" data-idx="${i}">
  <input type="number" class="ex-reps" value="${ex.reps||8}"  min="1" max="100" data-idx="${i}">
  <input type="number" class="ex-rest" value="${ex.rest||60}" min="0" max="600" data-idx="${i}">
  <button class="ex-del" data-idx="${i}">×</button>
</div>`;
}

// ── EVENT BINDING (called after DOM inject) ───────────────────
document.addEventListener('piq:viewRendered', wireBuilder);

function wireBuilder() {
  // Tab switch
  document.getElementById('tab-plan')?.addEventListener('click', () => {
    patchBuilder({activeTab:'plan'});
    document.getElementById('plan-view').style.display  = 'block';
    document.getElementById('builder-view').style.display = 'none';
    document.getElementById('tab-plan').classList.add('active');
    document.getElementById('tab-build').classList.remove('active');
  });
  document.getElementById('tab-build')?.addEventListener('click', () => {
    patchBuilder({activeTab:'builder'});
    document.getElementById('plan-view').style.display  = 'none';
    document.getElementById('builder-view').style.display = 'block';
    document.getElementById('tab-build').classList.add('active');
    document.getElementById('tab-plan').classList.remove('active');
  });

  // Template picker
  document.getElementById('tpl-trigger')?.addEventListener('click', openPicker);
  document.getElementById('tpl-close-btn')?.addEventListener('click', closePicker);

  // Sport filters
  document.querySelectorAll('.tpl-sport-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tpl-sport-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderGrid(btn.dataset.filter);
    });
  });

  // Banner dismiss
  document.getElementById('banner-dismiss')?.addEventListener('click', () => {
    document.getElementById('assign-banner')?.classList.add('hidden');
  });

  // Add exercise
  document.getElementById('btn-add-ex')?.addEventListener('click', addExercise);

  // Delete exercise (event delegation)
  document.getElementById('ex-list')?.addEventListener('click', e => {
    if (e.target.classList.contains('ex-del')) removeExercise(+e.target.dataset.idx);
  });

  // Assign button
  document.getElementById('btn-assign')?.addEventListener('click', openAssignModal);

  // Draft button
  document.getElementById('btn-draft')?.addEventListener('click', () => {
    saveDraft();
    showToast('💾 Draft saved');
  });

  // Confirm assign — listen to global event
  document.addEventListener('piq:confirmAssign', confirmAssign, {once:true});

  // Render template grid initially
  renderGrid('all');
}

function openPicker() {
  document.getElementById('tpl-picker-sheet')?.classList.add('open');
  renderGrid('all');
}
function closePicker() {
  document.getElementById('tpl-picker-sheet')?.classList.remove('open');
}

function renderGrid(filter) {
  const grid = document.getElementById('tpl-grid');
  if (!grid) return;
  const templates = filter==='all'
    ? TRAINING_TEMPLATES
    : TRAINING_TEMPLATES.filter(t=>t.sport===filter);
  grid.innerHTML = templates.map(t=>`
  <div class="tpl-picker-row" data-tpl="${t.id}">
    <div class="tpl-picker-row-sport">${SPORT_EMOJI[t.sport]||''} ${t.sport}</div>
    <div class="tpl-picker-row-title">${t.title}</div>
    <div class="tpl-picker-phases">
      ${(t.phases||[]).map(ph=>`<div class="tpl-phase-pip" style="background:${ph.color}" title="${ph.label} ${ph.weeks}wk"></div>`).join('')}
    </div>
    <div class="tpl-picker-meta">
      <span class="tpl-meta-chip">${t.duration}wk</span>
      <span class="tpl-meta-chip">${t.sessions_per_week}x/wk</span>
      <span class="tpl-meta-chip">${t.focus}</span>
      <span class="tpl-meta-chip">${t.level}</span>
      ${t.popular?'<span class="tpl-popular-badge">⭐ Popular</span>':''}
    </div>
  </div>`).join('');

  grid.querySelectorAll('[data-tpl]').forEach(el => {
    el.addEventListener('click', () => loadTemplate(el.dataset.tpl));
  });
}

function loadTemplate(id) {
  const t = TRAINING_TEMPLATES.find(x=>x.id===id);
  if (!t) return;
  const draft = {
    ...t,
    exercises: t.exercises.map(name=>({name,sets:3,reps:8,rest:60})),
    loadedTemplateId: id,
  };
  patchBuilder({draft, loadedTemplateId: id, pickerOpen:false});
  closePicker();
  // Re-render builder area
  const $bv = document.getElementById('builder-view');
  if ($bv) {
    $bv.innerHTML = builderHTML(getState().builder);
    wireBuilder();
    showToast(`✅ Loaded: ${t.title}`);
  }
}

function collectExercises() {
  return Array.from(document.querySelectorAll('#ex-list .ex-row')).map(row => ({
    name: row.querySelector('.ex-name')?.value || '',
    sets: +(row.querySelector('.ex-sets')?.value||3),
    reps: +(row.querySelector('.ex-reps')?.value||8),
    rest: +(row.querySelector('.ex-rest')?.value||60),
  })).filter(e=>e.name.trim());
}

function addExercise() {
  const list = document.getElementById('ex-list');
  if (!list) return;
  const idx  = list.querySelectorAll('.ex-row').length;
  const row  = document.createElement('div');
  row.innerHTML = exRow({name:'',sets:3,reps:8,rest:60}, idx);
  list.appendChild(row.firstElementChild);
  row.querySelector('.ex-del')?.addEventListener('click', e => removeExercise(+e.target.dataset.idx));
}

function removeExercise(idx) {
  document.getElementById(`ex-row-${idx}`)?.remove();
}

function saveDraft() {
  const title   = document.getElementById('b-title')?.value   || '';
  const sport   = document.getElementById('b-sport')?.value   || 'basketball';
  const dayType = document.getElementById('b-day-type')?.value|| 'Strength';
  const exercises = collectExercises();
  patchBuilder({ draft: { ...getState().builder.draft, title, sport, day_type:dayType, exercises }});
}

function openAssignModal() {
  saveDraft();
  const d = getState().builder.draft;
  if (!d?.title?.trim()) { showToast('Add a workout name first', 'warn'); return; }

  document.getElementById('assign-modal-detail').innerHTML = `
  <div>📋 <span>${d.title}</span></div>
  <div>🏅 <span>${(d.exercises||[]).length} exercises</span> · ${d.sport||''} · ${d.day_type||''}</div>
  <div>📅 <span>${document.getElementById('b-date')?.value||'today'}</span></div>`;

  const roster = getRoster();
  document.getElementById('assign-modal-athletes').innerHTML =
    '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">SELECT ATHLETES</div>' +
    roster.map((a,i)=>`
    <div class="modal-athlete-check" data-idx="${i}">
      <div class="mac-cb checked" id="acb-${i}"></div>
      <span style="font-size:13px">${a.name}</span>
      <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${a.position||''}</span>
    </div>`).join('');

  document.querySelectorAll('.modal-athlete-check').forEach(el => {
    el.addEventListener('click', () => el.querySelector('.mac-cb').classList.toggle('checked'));
  });

  document.getElementById('assign-modal').classList.remove('hidden');
}

function confirmAssign() {
  const d = getState().builder.draft;
  const roster = getRoster();
  const selected = roster.filter((_,i)=>document.getElementById('acb-'+i)?.classList.contains('checked'));

  addWorkoutLog({
    title:      d?.title||'Untitled',
    exercises:  (d?.exercises||[]).length,
    sport:      d?.sport,
    date:       document.getElementById('b-date')?.value,
    assignedTo: selected.map(a=>a.name),
    completed:  false,
    avgRPE:     null,
  });

  document.getElementById('assign-modal').classList.add('hidden');
  showToast(`✅ Assigned to ${selected.length} athlete${selected.length!==1?'s':''}`);
  patchBuilder({draft:null, loadedTemplateId:null});
  navigate('coach/program');
}
