/**
 * Coach Program Builder — v2
 * Three-tab layout: Top Programs | Workout Builder | Exercise Library
 * Evidence sources: NSCA CSCS 2022, Bompa & Buzzichelli 2019, Gabbett BJSM 2016,
 *   Morin & Samozino 2016, Petersen et al. 2011, Markovic 2007
 */
import { buildSidebar }                         from '../../components/nav.js';
import { EXERCISES, TRAINING_TEMPLATES,
         SPORT_EMOJI }                           from '../../data/exerciseLibrary.js';
import { getState, patchBuilder,
         addWorkoutLog, getRoster }              from '../../state/state.js';
import { showToast }                            from '../../core/notifications.js';
import { navigate }                             from '../../router.js';

// ── CONSTANTS ─────────────────────────────────────────────────
const SPORTS      = ['basketball','football','soccer','baseball','volleyball','track'];
const CATEGORIES  = ['strength','power','speed','agility','core','mobility','recovery'];
const CAT_COLORS  = {
  strength:'#EEEDFE', power:'#FAECE7', speed:'#EAF3DE',
  agility:'#FAEEDA',  core:'#E6F1FB',  mobility:'#E1F5EE', recovery:'#F1EFE8',
};
const CAT_TEXT = {
  strength:'#534AB7', power:'#993C1D', speed:'#3B6D11',
  agility:'#854F0B',  core:'#185FA5',  mobility:'#0F6E56', recovery:'#5F5E5A',
};
const SPORT_DOT = {
  basketball:'#E24B4A', football:'#EF9F27', soccer:'#639922',
  baseball:'#1D9E75',   volleyball:'#7F77DD', track:'#D85A30',
};

// ── PROGRAM SOURCE CITATIONS ──────────────────────────────────
const PROG_SOURCE = {
  'bb-preseason-12w':  'NSCA CSCS 2022 – basketball periodization',
  'bb-inseason-4w':    'Bompa & Buzzichelli 2019 – in-season load management',
  'bb-guard-speed-4w': 'Morin & Samozino 2016 – sprint force-velocity',
  'bb-strength-8w':    'NSCA CSCS 2022 – youth strength foundation',
  'fb-offseason-16w':  'Bompa & Buzzichelli 2019 – off-season strength-power block',
  'fb-speed-6w':       'Morin & Samozino 2016 – acceleration mechanics',
  'fb-preseason-8w':   'Gabbett BJSM 2016 – training load and injury risk',
  'sc-hamstring-4w':   'Petersen et al. 2011 (BJSM) – Nordic curl RCT',
  'sc-preseason-8w':   'Gabbett BJSM 2016 – pre-season conditioning load',
  'ba-rotational-12w': 'Fleisig & Andrews 2012 – rotational mechanics in baseball',
  'ba-arm-care-6w':    'NSCA CSCS 2022 – overhead athlete arm care',
  'ba-preseason-8w':   'Bompa & Buzzichelli 2019 – full athletic preparation',
  'vb-jump-6w':        'Markovic 2007 – plyometric training meta-analysis',
  'vb-preseason-8w':   'NSCA CSCS 2022 – volleyball periodization',
  'vb-shoulder-4w':    'NSCA CSCS 2022 – overhead athlete shoulder resilience',
  'tr-speed-8w':       'Morin & Samozino 2016 – max velocity sprint program',
  'tr-strength-6w':    'Bompa & Buzzichelli 2019 – posterior chain strength',
  'tr-xc-10w':         'NSCA CSCS 2022 – cross-country aerobic base',
  'tr-taper-3w':       'Bompa & Buzzichelli 2019 – competition taper protocol',
};

// ── RENDER ────────────────────────────────────────────────────
export function renderCoachProgram() {
  const BS = getState().builder;
  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/program')}
  <main class="page-main">
    <div class="page-header">
      <h1>Program <span>Builder</span></h1>
      <p>Build workouts from scratch or load from proven programs.</p>
    </div>

    <div class="tab-bar">
      <button class="tab-btn ${BS.activeTab==='programs'?'active':''}" id="tab-programs">Top Programs</button>
      <button class="tab-btn ${BS.activeTab==='builder'?'active':''}"  id="tab-build">Workout Builder</button>
      <button class="tab-btn ${BS.activeTab==='library'?'active':''}"  id="tab-library">Exercise Library</button>
    </div>

    <!-- TOP PROGRAMS -->
    <div id="view-programs" ${BS.activeTab!=='programs'?'style="display:none"':''}>
      ${programsHTML()}
    </div>

    <!-- BUILDER -->
    <div id="view-builder" ${BS.activeTab!=='builder'?'style="display:none"':''}>
      ${builderHTML(BS)}
    </div>

    <!-- LIBRARY -->
    <div id="view-library" ${BS.activeTab!=='library'?'style="display:none"':''}>
      ${libraryHTML()}
    </div>
  </main>
</div>

<!-- Assign modal (global shell) -->`;
}

// ── TOP PROGRAMS ──────────────────────────────────────────────
function programsHTML() {
  return `
<div class="piq-sport-filters" id="prog-sport-filters">
  <button class="piq-sf-btn active" data-sport="all">All Sports</button>
  ${SPORTS.map(s=>`<button class="piq-sf-btn" data-sport="${s}">${SPORT_EMOJI[s]} ${s[0].toUpperCase()+s.slice(1)}</button>`).join('')}
</div>
<div class="piq-prog-grid" id="prog-grid">
  ${renderProgCards('all')}
</div>`;
}

function renderProgCards(sport) {
  const list = sport === 'all' ? TRAINING_TEMPLATES : TRAINING_TEMPLATES.filter(t=>t.sport===sport);
  if (!list.length) return '<p style="color:var(--text-muted);padding:1rem">No programs for this sport yet.</p>';
  return list.map(t => {
    const dotColor = SPORT_DOT[t.sport] || '#888';
    const source   = PROG_SOURCE[t.id] || 'NSCA CSCS 2022';
    return `
<div class="piq-prog-card">
  <div class="piq-prog-sport">
    <span class="piq-sport-dot" style="background:${dotColor}"></span>
    ${SPORT_EMOJI[t.sport]||''} ${t.sport}
  </div>
  <div class="piq-prog-title">${esc(t.title)}</div>
  <div class="piq-prog-chips">
    <span class="piq-chip">${t.duration}wk</span>
    <span class="piq-chip">${t.sessions_per_week}x/wk</span>
    <span class="piq-chip piq-chip-focus">${esc(t.focus)}</span>
    <span class="piq-chip">${esc(t.level)}</span>
    ${t.popular ? '<span class="piq-chip piq-chip-pop">Popular</span>' : ''}
  </div>
  <div class="piq-phase-bar">
    ${(t.phases||[]).map(ph=>`<div class="piq-phase-seg" style="flex:${ph.weeks};background:${ph.color}" title="${esc(ph.label)} – ${ph.weeks}wk"></div>`).join('')}
  </div>
  <div class="piq-prog-source">Source: ${esc(source)}</div>
  <button class="piq-load-btn" data-tpl="${t.id}">Load into builder</button>
</div>`;
  }).join('');
}

// ── BUILDER ───────────────────────────────────────────────────
function builderHTML(BS) {
  const d = BS.draft;
  const exRows = (d?.exercises||[]).map((ex,i) => exRow(ex,i)).join('');
  return `
${d ? `
<div class="piq-loaded-banner" id="loaded-banner">
  ✅ <strong>${esc(d.title)}</strong> loaded — ${(d.exercises||[]).length} exercises ready
  <button class="piq-banner-x" id="banner-dismiss">×</button>
</div>` : ''}

<div class="panel">
  <div class="panel-title">Workout details</div>
  <div class="b-field-row">
    <div class="b-field">
      <label>Workout name</label>
      <input type="text" id="b-title" value="${esc(d?.title||'')}" placeholder="e.g. Pre-Season Power Day 1">
    </div>
    <div class="b-field">
      <label>Sport</label>
      <select id="b-sport">
        ${SPORTS.map(s=>`<option value="${s}" ${d?.sport===s?'selected':''}>${SPORT_EMOJI[s]} ${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="b-field-row">
    <div class="b-field">
      <label>Session type</label>
      <select id="b-day-type">
        ${['Strength','Power','Speed','Conditioning','Recovery'].map(v=>`<option ${d?.day_type===v?'selected':''}>${v}</option>`).join('')}
      </select>
    </div>
    <div class="b-field">
      <label>Phase</label>
      <select id="b-phase">
        ${['Pre-Season','In-Season','Off-Season','Post-Season'].map(v=>`<option ${d?.phase===v?'selected':''}>${v}</option>`).join('')}
      </select>
    </div>
    <div class="b-field">
      <label>Date</label>
      <input type="date" id="b-date" value="${new Date().toISOString().split('T')[0]}">
    </div>
  </div>
  ${d?.phases ? `
  <div class="plan-phase-bar" style="margin:12px 0 0">
    ${d.phases.map(ph=>`<div class="plan-phase-segment" style="background:${ph.color};flex:${ph.weeks}" title="${esc(ph.label)}">${ph.label}</div>`).join('')}
  </div>` : ''}
</div>

<div class="panel" style="margin-top:16px">
  <div class="panel-title" style="display:flex;justify-content:space-between;align-items:center">
    <span>Exercises <span id="ex-count" style="font-weight:400;color:var(--text-muted)">(${(d?.exercises||[]).length})</span></span>
    <button class="piq-add-ex-btn" id="btn-go-library">+ Browse library</button>
  </div>

  <div class="ex-header">
    <span style="flex:2">Exercise</span>
    <span>Category</span>
    <span>Sets</span>
    <span>Reps</span>
    <span>Rest (s)</span>
    <span>Note</span>
    <span></span>
  </div>
  <div id="ex-list">
    ${exRows || `<div class="ex-empty-state" id="ex-empty">No exercises yet — browse the library or load a program above.</div>`}
  </div>
  <div style="margin-top:10px;display:flex;gap:8px">
    <button class="btn-add-ex" id="btn-add-ex">+ Add blank row</button>
  </div>
</div>

<div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
  <button class="btn-assign" id="btn-assign">📋 Assign to athletes</button>
  <button class="btn-draft"  id="btn-draft">💾 Save draft</button>
</div>`;
}

function exRow(ex, i) {
  const cat = ex.category || ex.cat || 'strength';
  const bg  = CAT_COLORS[cat] || '#f5f5f5';
  const fg  = CAT_TEXT[cat]   || '#333';
  return `<div class="ex-row" id="ex-row-${i}">
  <input type="text"   class="ex-name" value="${esc(ex.name||'')}" placeholder="Exercise name" data-idx="${i}">
  <span class="piq-cat-tag" style="background:${bg};color:${fg}">${cat}</span>
  <input type="number" class="ex-sets" value="${ex.sets||3}"  min="1" max="20"  data-idx="${i}">
  <input type="text"   class="ex-reps" value="${ex.reps||'8'}" placeholder="8" data-idx="${i}" style="width:58px">
  <input type="number" class="ex-rest" value="${ex.rest||90}" min="0" max="600" step="5" data-idx="${i}">
  <input type="text"   class="ex-note" value="${esc(ex.note||'')}" placeholder="coaching cue…" data-idx="${i}">
  <button class="ex-del" data-idx="${i}">×</button>
</div>`;
}

// ── EXERCISE LIBRARY ──────────────────────────────────────────
function libraryHTML() {
  const counts = CATEGORIES.map(c=>({cat:c, n: EXERCISES.filter(e=>e.category===c).length}));
  return `
<div class="piq-lib-search-row">
  <input type="text" id="lib-search" placeholder="Search exercises by name or tag…">
</div>
<div class="piq-cat-pills" id="lib-cat-pills">
  ${catPillHTML('all', EXERCISES.length, true)}
  ${counts.map(c=>catPillHTML(c.cat, c.n, false)).join('')}
</div>
<div class="piq-ex-grid" id="lib-ex-grid">
  ${renderExGrid('all', '')}
</div>
<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
  <button class="btn-draft" id="btn-back-builder" style="width:100%">← Back to builder</button>
</div>`;
}

function catPillHTML(cat, count, active) {
  const label = cat === 'all' ? 'All' : cat.charAt(0).toUpperCase()+cat.slice(1);
  const bg  = active ? (CAT_COLORS[cat]||'var(--surface-2)') : 'var(--surface-1)';
  const fg  = active ? (CAT_TEXT[cat]||'var(--text-primary)') : 'var(--text-muted)';
  return `<button class="piq-cat-pill ${active?'active':''}" data-cat="${cat}"
    style="background:${bg};color:${fg}">${label} <span style="opacity:.6">(${count})</span></button>`;
}

function renderExGrid(cat, query) {
  const added = new Set(collectExercises().map(e=>e.name));
  let list = cat === 'all' ? EXERCISES : EXERCISES.filter(e=>e.category===cat);
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(e=>e.name.toLowerCase().includes(q) || e.tags.some(t=>t.includes(q)));
  }
  if (!list.length) return '<div style="padding:1rem;color:var(--text-muted);font-size:13px">No exercises found.</div>';
  return list.map(e => {
    const isAdded = added.has(e.name);
    const bg  = CAT_COLORS[e.category] || '#f5f5f5';
    const fg  = CAT_TEXT[e.category]   || '#333';
    return `
<div class="piq-ex-item ${isAdded?'piq-ex-added':''}" data-exid="${e.id}">
  <div>
    <div class="piq-ex-name">${esc(e.name)}</div>
    <div style="margin-top:3px">
      <span class="piq-cat-tag" style="background:${bg};color:${fg}">${e.category}</span>
      ${e.tags.slice(0,2).map(t=>`<span class="piq-tag">${esc(t)}</span>`).join('')}
    </div>
  </div>
  <button class="piq-ex-add-btn" title="${isAdded?'Remove':'Add'}">${isAdded?'✓':'+'}</button>
</div>`;
  }).join('');
}

// ── EVENT BINDING ─────────────────────────────────────────────
document.addEventListener('piq:viewRendered', wireBuilder);

function wireBuilder() {
  // ── Tab switching
  document.getElementById('tab-programs')?.addEventListener('click', () => switchTab('programs'));
  document.getElementById('tab-build')?.addEventListener('click',    () => switchTab('builder'));
  document.getElementById('tab-library')?.addEventListener('click',  () => switchTab('library'));
  document.getElementById('btn-go-library')?.addEventListener('click', () => switchTab('library'));
  document.getElementById('btn-back-builder')?.addEventListener('click', () => switchTab('builder'));

  // ── Banner dismiss
  document.getElementById('banner-dismiss')?.addEventListener('click', () => {
    document.getElementById('loaded-banner')?.remove();
  });

  // ── Top programs: sport filter
  document.getElementById('prog-sport-filters')?.addEventListener('click', e => {
    const btn = e.target.closest('.piq-sf-btn');
    if (!btn) return;
    document.querySelectorAll('.piq-sf-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const grid = document.getElementById('prog-grid');
    if (grid) grid.innerHTML = renderProgCards(btn.dataset.sport);
    // re-bind load buttons
    bindLoadButtons();
  });
  bindLoadButtons();

  // ── Builder: add blank row
  document.getElementById('btn-add-ex')?.addEventListener('click', addBlankRow);

  // ── Builder: delete row (delegation)
  document.getElementById('ex-list')?.addEventListener('click', e => {
    if (e.target.classList.contains('ex-del')) {
      e.target.closest('.ex-row')?.remove();
      refreshExCount();
    }
  });

  // ── Builder: assign / draft
  document.getElementById('btn-assign')?.addEventListener('click', openAssignModal);
  document.getElementById('btn-draft')?.addEventListener('click', () => {
    saveDraft();
    showToast('💾 Draft saved');
  });
  document.addEventListener('piq:confirmAssign', confirmAssign, {once:true});

  // ── Library: search
  document.getElementById('lib-search')?.addEventListener('input', e => {
    const cat = document.querySelector('.piq-cat-pill.active')?.dataset.cat || 'all';
    const grid = document.getElementById('lib-ex-grid');
    if (grid) grid.innerHTML = renderExGrid(cat, e.target.value);
    bindExAddButtons();
  });

  // ── Library: category pills
  document.getElementById('lib-cat-pills')?.addEventListener('click', e => {
    const pill = e.target.closest('.piq-cat-pill');
    if (!pill) return;
    document.querySelectorAll('.piq-cat-pill').forEach(p => {
      p.classList.remove('active');
      const c = p.dataset.cat;
      p.style.background = CAT_COLORS[c] || 'var(--surface-1)';
      p.style.color = CAT_TEXT[c] || 'var(--text-muted)';
    });
    pill.classList.add('active');
    const c = pill.dataset.cat;
    pill.style.background = c==='all' ? 'var(--surface-2)' : (CAT_COLORS[c]||'var(--surface-2)');
    pill.style.color = c==='all' ? 'var(--text-primary)' : (CAT_TEXT[c]||'var(--text-primary)');
    const q = document.getElementById('lib-search')?.value || '';
    const grid = document.getElementById('lib-ex-grid');
    if (grid) grid.innerHTML = renderExGrid(c, q);
    bindExAddButtons();
  });

  bindExAddButtons();
}

function switchTab(tab) {
  patchBuilder({ activeTab: tab });
  ['programs','builder','library'].forEach(t => {
    const view = document.getElementById('view-'+t);
    const btn  = document.getElementById('tab-'+(t==='builder'?'build':t));
    if (view) view.style.display = t === tab ? '' : 'none';
    if (btn)  btn.classList.toggle('active', t === tab);
  });
  if (tab === 'library') bindExAddButtons();
  if (tab === 'builder') refreshExCount();
}

function bindLoadButtons() {
  document.querySelectorAll('.piq-load-btn').forEach(btn => {
    btn.addEventListener('click', () => loadTemplate(btn.dataset.tpl));
  });
}

function bindExAddButtons() {
  document.querySelectorAll('.piq-ex-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item  = btn.closest('.piq-ex-item');
      const exId  = item?.dataset.exid;
      const ex    = EXERCISES.find(e => e.id === exId);
      if (!ex) return;
      const list = document.getElementById('ex-list');
      if (!list) return;

      const existing = Array.from(list.querySelectorAll('.ex-name')).find(i=>i.value===ex.name);
      if (existing) {
        // Remove
        existing.closest('.ex-row')?.remove();
        item.classList.remove('piq-ex-added');
        btn.textContent = '+';
      } else {
        // Add
        const idx = list.querySelectorAll('.ex-row').length;
        const div = document.createElement('div');
        div.innerHTML = exRow({ name:ex.name, category:ex.category, sets:3, reps:'8', rest:90, note:'' }, idx);
        list.querySelector('.ex-empty-state')?.remove();
        const empty = document.getElementById('ex-empty');
        if (empty) empty.remove();
        list.appendChild(div.firstElementChild);
        item.classList.add('piq-ex-added');
        btn.textContent = '✓';
      }
      refreshExCount();
    });
  });
}

function loadTemplate(id) {
  const t = TRAINING_TEMPLATES.find(x=>x.id===id);
  if (!t) return;
  const draft = {
    ...t,
    exercises: t.exercises.map(name => {
      const ex = EXERCISES.find(e=>e.name===name);
      return { name, category: ex?.category||'strength', sets:3, reps:'8', rest:90, note:'' };
    }),
    loadedTemplateId: id,
  };
  patchBuilder({ draft, loadedTemplateId: id, activeTab: 'builder' });
  // Re-render builder panel
  const bv = document.getElementById('view-builder');
  if (bv) {
    bv.innerHTML = builderHTML(getState().builder);
    wireBuilder();
  }
  switchTab('builder');
  showToast(`✅ Loaded: ${t.title}`);
}

function addBlankRow() {
  const list = document.getElementById('ex-list');
  if (!list) return;
  const empty = document.getElementById('ex-empty');
  if (empty) empty.remove();
  const idx = list.querySelectorAll('.ex-row').length;
  const div = document.createElement('div');
  div.innerHTML = exRow({ name:'', category:'strength', sets:3, reps:'8', rest:90, note:'' }, idx);
  list.appendChild(div.firstElementChild);
  refreshExCount();
}

function refreshExCount() {
  const n = document.querySelectorAll('#ex-list .ex-row').length;
  const el = document.getElementById('ex-count');
  if (el) el.textContent = `(${n})`;
}

function collectExercises() {
  return Array.from(document.querySelectorAll('#ex-list .ex-row')).map(row => ({
    name:     row.querySelector('.ex-name')?.value?.trim() || '',
    category: row.querySelector('.piq-cat-tag')?.textContent?.trim() || 'strength',
    sets:     +(row.querySelector('.ex-sets')?.value  || 3),
    reps:     row.querySelector('.ex-reps')?.value    || '8',
    rest:     +(row.querySelector('.ex-rest')?.value  || 90),
    note:     row.querySelector('.ex-note')?.value    || '',
  })).filter(e => e.name);
}

function saveDraft() {
  patchBuilder({
    draft: {
      ...getState().builder.draft,
      title:    document.getElementById('b-title')?.value    || '',
      sport:    document.getElementById('b-sport')?.value    || 'basketball',
      day_type: document.getElementById('b-day-type')?.value || 'Strength',
      phase:    document.getElementById('b-phase')?.value    || 'In-Season',
      exercises: collectExercises(),
    }
  });
}

function openAssignModal() {
  saveDraft();
  const d = getState().builder.draft;
  if (!d?.title?.trim()) { showToast('Add a workout name first', 'warn'); return; }

  const detailEl = document.getElementById('assign-modal-detail');
  if (detailEl) {
    detailEl.innerHTML = `
    <div>📋 <span>${esc(d.title)}</span></div>
    <div>🏅 <span>${(d.exercises||[]).length} exercises</span> · ${esc(d.sport||'')} · ${esc(d.day_type||'')}</div>
    <div>📅 <span>${document.getElementById('b-date')?.value||'today'}</span></div>`;
  }

  const roster = getRoster();
  const athletesEl = document.getElementById('assign-modal-athletes');
  if (athletesEl) {
    athletesEl.innerHTML =
      '<div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">SELECT ATHLETES</div>' +
      roster.map((a,i)=>`
      <div class="modal-athlete-check" data-idx="${i}">
        <div class="mac-cb checked" id="acb-${i}"></div>
        <span style="font-size:13px">${esc(a.name)}</span>
        <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${esc(a.position||'')}</span>
      </div>`).join('');
    document.querySelectorAll('.modal-athlete-check').forEach(el => {
      el.addEventListener('click', () => el.querySelector('.mac-cb').classList.toggle('checked'));
    });
  }

  document.getElementById('assign-modal')?.classList.remove('hidden');
}

function confirmAssign() {
  const d      = getState().builder.draft;
  const roster = getRoster();
  const selected = roster.filter((_,i) => document.getElementById('acb-'+i)?.classList.contains('checked'));

  addWorkoutLog({
    title:      d?.title || 'Untitled',
    exercises:  (d?.exercises||[]).length,
    sport:      d?.sport,
    date:       document.getElementById('b-date')?.value,
    assignedTo: selected.map(a=>a.name),
    completed:  false,
    avgRPE:     null,
  });

  document.getElementById('assign-modal')?.classList.add('hidden');
  showToast(`✅ Assigned to ${selected.length} athlete${selected.length!==1?'s':''}`);
  patchBuilder({ draft: null, loadedTemplateId: null });
  navigate('coach/program');
}

// ── UTILITY ───────────────────────────────────────────────────
function esc(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
