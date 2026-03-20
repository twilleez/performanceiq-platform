/**
 * Solo Builder — same builder as coach, personal mode
 */
import { buildSidebar }             from '../../components/nav.js';
import { TRAINING_TEMPLATES, SPORT_EMOJI } from '../../data/exerciseLibrary.js';
import { getState, patchBuilder, addWorkoutLog } from '../../state/state.js';
import { showToast }                from '../../core/notifications.js';
import { navigate }                 from '../../router.js';

export function renderSoloBuilder() {
  const BS = getState().builder;
  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/builder')}
  <main class="page-main">
    <div class="page-header">
      <h1>Workout <span>Builder</span></h1>
      <p>Design your own training or load a template.</p>
    </div>
    <div class="tab-bar">
      <button class="tab-btn ${BS.activeTab==='plan'?'active':''}" id="tab-plan">My Plans</button>
      <button class="tab-btn ${BS.activeTab==='builder'?'active':''}" id="tab-build">Builder</button>
    </div>

    <div id="plan-view" ${BS.activeTab!=='plan'?'style="display:none"':''}>
      <div class="panel">
        <div class="panel-title">Saved Plans</div>
        ${TRAINING_TEMPLATES.filter(t=>t.popular).slice(0,4).map(t=>`
        <div class="w-row">
          <div class="w-icon">${SPORT_EMOJI[t.sport]||'📋'}</div>
          <div class="w-info"><div class="w-name">${t.title}</div>
          <div class="w-meta">${t.duration}wk · ${t.focus}</div></div>
          <span class="w-badge">${t.sport}</span>
        </div>`).join('')}
      </div>
    </div>

    <div id="builder-view" ${BS.activeTab!=='builder'?'style="display:none"':''}>
      <!-- Template trigger -->
      <div class="builder-tpl-trigger" id="tpl-trigger">
        <div class="btpl-text">
          <div class="btpl-head">📋 ${BS.draft ? `Loaded: ${BS.draft.title||'Untitled'}` : 'Load a Training Template'}</div>
          <div class="btpl-sub">${BS.draft ? `${BS.draft.sport||''} · ${BS.draft.duration||'?'}wk` : 'Start from proven programs for any sport'}</div>
        </div>
        <div class="btpl-icon">⬇️</div>
      </div>

      <div class="panel">
        <div class="panel-title">Workout Details</div>
        <div class="b-field-row">
          <div class="b-field"><label>Name</label>
            <input type="text" id="b-title" value="${BS.draft?.title||''}" placeholder="Workout name"></div>
          <div class="b-field"><label>Sport</label>
            <select id="b-sport">
              ${['basketball','football','soccer','baseball','volleyball','track'].map(s=>
                `<option value="${s}" ${BS.draft?.sport===s?'selected':''}>${SPORT_EMOJI[s]} ${s[0].toUpperCase()+s.slice(1)}</option>`
              ).join('')}
            </select></div>
        </div>
        <div class="b-field-row">
          <div class="b-field"><label>Type</label>
            <select id="b-day-type">
              ${['Strength','Power','Speed','Conditioning','Recovery'].map(d=>
                `<option ${BS.draft?.day_type===d?'selected':''}>${d}</option>`
              ).join('')}
            </select></div>
          <div class="b-field"><label>Date</label>
            <input type="date" id="b-date" value="${new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="panel-title" style="margin-top:4px">Exercises</div>
        <div class="ex-header">
          <span>Exercise</span><span>Sets</span><span>Reps</span><span>Rest (s)</span><span></span>
        </div>
        <div id="ex-list">
          ${(BS.draft?.exercises||[{name:'',sets:3,reps:8,rest:60}]).map((ex,i)=>`
          <div class="ex-row" id="ex-row-${i}">
            <input type="text" class="ex-name" value="${ex.name||''}" placeholder="Exercise name" data-idx="${i}">
            <input type="number" class="ex-sets" value="${ex.sets||3}" min="1" max="20" data-idx="${i}">
            <input type="number" class="ex-reps" value="${ex.reps||8}" min="1" max="100" data-idx="${i}">
            <input type="number" class="ex-rest" value="${ex.rest||60}" min="0" max="600" data-idx="${i}">
            <button class="ex-del" data-idx="${i}">×</button>
          </div>`).join('')}
        </div>
        <button class="btn-add-ex" id="btn-add-ex" style="margin-top:10px">+ Add Exercise</button>
        <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
          <button class="btn-assign" id="btn-log">✅ Log This Workout</button>
          <button class="btn-draft" id="btn-draft">💾 Save Draft</button>
        </div>
      </div>
    </div>
  </main>
</div>

<!-- Template picker -->
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
</div>`;
}

document.addEventListener('piq:viewRendered', wireSoloBuilder);

function wireSoloBuilder() {
  if (!document.getElementById('btn-log')) return;

  // Tabs
  document.getElementById('tab-plan')?.addEventListener('click', () => {
    patchBuilder({activeTab:'plan'});
    document.getElementById('plan-view').style.display    = 'block';
    document.getElementById('builder-view').style.display = 'none';
    document.getElementById('tab-plan').classList.add('active');
    document.getElementById('tab-build').classList.remove('active');
  });
  document.getElementById('tab-build')?.addEventListener('click', () => {
    patchBuilder({activeTab:'builder'});
    document.getElementById('plan-view').style.display    = 'none';
    document.getElementById('builder-view').style.display = 'block';
    document.getElementById('tab-build').classList.add('active');
    document.getElementById('tab-plan').classList.remove('active');
  });

  // Picker
  document.getElementById('tpl-trigger')?.addEventListener('click', openPicker);
  document.getElementById('tpl-close-btn')?.addEventListener('click', closePicker);
  document.querySelectorAll('.tpl-sport-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tpl-sport-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGrid(btn.dataset.filter);
    });
  });

  // Add/remove exercises
  document.getElementById('btn-add-ex')?.addEventListener('click', () => {
    const list = document.getElementById('ex-list');
    const idx  = list.querySelectorAll('.ex-row').length;
    const div  = document.createElement('div');
    div.innerHTML = `<div class="ex-row" id="ex-row-${idx}">
      <input type="text" class="ex-name" placeholder="Exercise name" data-idx="${idx}">
      <input type="number" class="ex-sets" value="3" min="1" max="20" data-idx="${idx}">
      <input type="number" class="ex-reps" value="8" min="1" max="100" data-idx="${idx}">
      <input type="number" class="ex-rest" value="60" min="0" max="600" data-idx="${idx}">
      <button class="ex-del" data-idx="${idx}">×</button>
    </div>`;
    list.appendChild(div.firstElementChild);
  });
  document.getElementById('ex-list')?.addEventListener('click', e => {
    if (e.target.classList.contains('ex-del')) {
      document.getElementById(`ex-row-${e.target.dataset.idx}`)?.remove();
    }
  });

  // Log workout
  document.getElementById('btn-log')?.addEventListener('click', () => {
    const title = document.getElementById('b-title')?.value.trim() || 'Solo Workout';
    const exercises = collectExercises();
    addWorkoutLog({
      title, exercises: exercises.length,
      sport: document.getElementById('b-sport')?.value,
      date:  document.getElementById('b-date')?.value,
      completed: true, avgRPE: 6,
    });
    patchBuilder({ draft: null });
    showToast(`✅ "${title}" logged!`);
    navigate('solo/home');
  });

  document.getElementById('btn-draft')?.addEventListener('click', () => {
    saveDraft();
    showToast('💾 Draft saved');
  });

  renderGrid('all');
}

function collectExercises() {
  return Array.from(document.querySelectorAll('#ex-list .ex-row')).map(row => ({
    name: row.querySelector('.ex-name')?.value || '',
    sets: +(row.querySelector('.ex-sets')?.value||3),
    reps: +(row.querySelector('.ex-reps')?.value||8),
    rest: +(row.querySelector('.ex-rest')?.value||60),
  })).filter(e => e.name.trim());
}

function saveDraft() {
  patchBuilder({ draft: {
    ...getState().builder.draft,
    title:    document.getElementById('b-title')?.value   || '',
    sport:    document.getElementById('b-sport')?.value   || 'basketball',
    day_type: document.getElementById('b-day-type')?.value|| 'Strength',
    exercises: collectExercises(),
  }});
}

function openPicker()  { document.getElementById('tpl-picker-sheet')?.classList.add('open'); renderGrid('all'); }
function closePicker() { document.getElementById('tpl-picker-sheet')?.classList.remove('open'); }

function renderGrid(filter) {
  const grid = document.getElementById('tpl-grid');
  if (!grid) return;
  const templates = filter === 'all'
    ? TRAINING_TEMPLATES
    : TRAINING_TEMPLATES.filter(t => t.sport === filter);
  grid.innerHTML = templates.map(t => `
  <div class="tpl-picker-row" data-tpl="${t.id}">
    <div class="tpl-picker-row-sport">${SPORT_EMOJI[t.sport]||''} ${t.sport}</div>
    <div class="tpl-picker-row-title">${t.title}</div>
    <div class="tpl-picker-phases">
      ${(t.phases||[]).map(ph=>`<div class="tpl-phase-pip" style="background:${ph.color};flex:${ph.weeks}" title="${ph.label}"></div>`).join('')}
    </div>
    <div class="tpl-picker-meta">
      <span class="tpl-meta-chip">${t.duration}wk</span>
      <span class="tpl-meta-chip">${t.sessions_per_week}x/wk</span>
      <span class="tpl-meta-chip">${t.focus}</span>
      ${t.popular?'<span class="tpl-popular-badge">⭐</span>':''}
    </div>
  </div>`).join('');

  grid.querySelectorAll('[data-tpl]').forEach(el => {
    el.addEventListener('click', () => {
      const t = TRAINING_TEMPLATES.find(x => x.id === el.dataset.tpl);
      if (!t) return;
      patchBuilder({ draft: { ...t, exercises: t.exercises.map(name=>({name,sets:3,reps:8,rest:60})) }});
      closePicker();
      navigate('solo/builder');
    });
  });
}
