/**
 * PerformanceIQ — Solo Workout Builder v2
 */
import { buildSidebar }                    from '../../components/nav.js';
import { TRAINING_TEMPLATES, SPORT_EMOJI } from '../../data/exerciseLibrary.js';
import { getState, patchBuilder, addWorkoutLog } from '../../state/state.js';
import { showToast }                       from '../../core/notifications.js';
import { navigate }                        from '../../router.js';

function exRow(ex, i) {
  return `<div class="ex-row" id="ex-row-${i}" style="display:grid;grid-template-columns:1fr 70px 70px 80px 32px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
    <input type="text"   class="ex-name" value="${ex.name||''}" placeholder="Exercise name" data-idx="${i}" style="padding:7px 10px;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--text-primary);font-size:13px;width:100%">
    <input type="number" class="ex-sets" value="${ex.sets||3}" min="1" max="20" data-idx="${i}" style="padding:7px 8px;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--text-primary);font-size:13px;width:100%;text-align:center">
    <input type="number" class="ex-reps" value="${ex.reps||8}" min="1" max="100" data-idx="${i}" style="padding:7px 8px;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--text-primary);font-size:13px;width:100%;text-align:center">
    <input type="number" class="ex-rest" value="${ex.rest||60}" min="0" max="600" data-idx="${i}" style="padding:7px 8px;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--text-primary);font-size:13px;width:100%;text-align:center">
    <button class="ex-del" data-idx="${i}" style="width:28px;height:28px;border-radius:6px;border:none;background:#ef444422;color:#ef4444;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">×</button>
  </div>`;
}

export function renderSoloBuilder() {
  const BS = getState().builder;
  const d  = BS.draft;

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/builder')}
  <main class="page-main">
    <div class="page-header">
      <h1>Workout <span>Builder</span></h1>
      <p>Design your own training or load a template.</p>
    </div>

    <div class="tab-bar" style="display:flex;gap:6px;margin-bottom:20px">
      <button class="tab-btn ${BS.activeTab==='plan'?'active':''}" id="tab-plan" style="padding:9px 20px;border-radius:8px;border:1px solid var(--border);background:${BS.activeTab==='plan'?'var(--piq-green)':'var(--surface-2)'};color:${BS.activeTab==='plan'?'#0d1b3e':'var(--text-muted)'};font-weight:600;font-size:13px;cursor:pointer">My Plans</button>
      <button class="tab-btn ${BS.activeTab!=='plan'?'active':''}" id="tab-build" style="padding:9px 20px;border-radius:8px;border:1px solid var(--border);background:${BS.activeTab!=='plan'?'var(--piq-green)':'var(--surface-2)'};color:${BS.activeTab!=='plan'?'#0d1b3e':'var(--text-muted)'};font-weight:600;font-size:13px;cursor:pointer">Builder</button>
    </div>

    <div id="plan-view" ${BS.activeTab!=='plan'?'style="display:none"':''}>
      <div class="panel" style="margin-bottom:16px">
        <div class="panel-title">Popular Templates</div>
        ${TRAINING_TEMPLATES.filter(t=>t.popular).slice(0,5).map(t=>`
        <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:20px;flex-shrink:0">${SPORT_EMOJI[t.sport]||'📋'}</span>
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px;color:var(--text-primary)">${t.title}</div>
            <div style="font-size:11.5px;color:var(--text-muted)">${t.duration}wk · ${t.focus} · ${t.sessions_per_week}×/week</div>
          </div>
          <button class="btn-draft" style="font-size:11px;padding:5px 12px;flex-shrink:0" data-route="solo/builder">Load</button>
        </div>`).join('')}
      </div>
    </div>

    <div id="builder-view" ${BS.activeTab==='plan'?'style="display:none"':''}>

      <!-- Template trigger -->
      <div id="tpl-trigger" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border:2px dashed var(--border);border-radius:12px;cursor:pointer;margin-bottom:16px;background:var(--surface-2);transition:border-color .15s">
        <div>
          <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">📋 ${d ? `Loaded: ${d.title||'Untitled'}` : 'Load a Training Template'}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${d ? `${d.sport||''} · ${d.duration||'?'}wk` : 'Start from proven programs for any sport'}</div>
        </div>
        <span style="font-size:18px;color:var(--text-muted)">⬇️</span>
      </div>

      <div class="panel" style="margin-bottom:16px">
        <div class="panel-title">Workout Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <div class="b-field"><label>Workout Name</label><input type="text" id="b-title" value="${d?.title||''}" placeholder="e.g. Lower Body Power"></div>
          <div class="b-field"><label>Sport</label>
            <select id="b-sport">
              ${['basketball','football','soccer','baseball','volleyball','track'].map(s=>`<option value="${s}" ${(d?.sport||'basketball')===s?'selected':''}>${SPORT_EMOJI[s]||''} ${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
            </select></div>
          <div class="b-field"><label>Session Type</label>
            <select id="b-day-type">
              ${['Strength','Power','Speed','Conditioning','Recovery'].map(dt=>`<option ${(d?.day_type||'Strength')===dt?'selected':''}>${dt}</option>`).join('')}
            </select></div>
          <div class="b-field"><label>Date</label><input type="date" id="b-date" value="${new Date().toISOString().slice(0,10)}"></div>
        </div>
      </div>

      <div class="panel" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="panel-title" style="margin:0">Exercises</div>
          <div style="display:grid;grid-template-columns:1fr 70px 70px 80px 32px;gap:8px;font-size:11px;font-weight:700;color:var(--text-muted);padding-right:2px">
            <span>Name</span><span style="text-align:center">Sets</span><span style="text-align:center">Reps</span><span style="text-align:center">Rest(s)</span><span></span>
          </div>
        </div>
        <div id="ex-list">
          ${(d?.exercises||[{name:'',sets:3,reps:8,rest:60}]).map((ex,i)=>exRow(ex,i)).join('')}
        </div>
        <button id="btn-add-ex" style="margin-top:10px;padding:8px 16px;border:1px dashed var(--border);border-radius:8px;background:transparent;color:var(--piq-green);font-size:13px;font-weight:600;cursor:pointer;width:100%">+ Add Exercise</button>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn-primary" id="btn-log" style="font-size:13px;padding:12px 24px">✅ Log Workout</button>
        <button class="btn-draft" id="btn-draft" style="font-size:13px;padding:12px 20px">💾 Save Draft</button>
      </div>
    </div>

  </main>
</div>

<!-- Template Picker Sheet -->
<div id="tpl-picker-sheet" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.6);backdrop-filter:blur(4px)">
  <div style="position:absolute;bottom:0;left:0;right:0;max-height:80vh;background:var(--surface);border-radius:16px 16px 0 0;overflow:hidden;display:flex;flex-direction:column">
    <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <h3 style="font-family:'Oswald',sans-serif;font-size:16px;font-weight:700">Load Template</h3>
      <button id="tpl-close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted)">✕</button>
    </div>
    <div style="padding:12px 20px;border-bottom:1px solid var(--border);display:flex;gap:6px;flex-wrap:wrap" id="tpl-filters">
      <button class="tpl-sport-btn active" data-filter="all" style="padding:6px 14px;border-radius:16px;border:1px solid var(--border);background:var(--piq-green);color:#0d1b3e;font-size:12px;font-weight:600;cursor:pointer">All</button>
      ${['basketball','football','soccer','baseball','volleyball','track'].map(s=>`
      <button class="tpl-sport-btn" data-filter="${s}" style="padding:6px 14px;border-radius:16px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-muted);font-size:12px;font-weight:600;cursor:pointer">${SPORT_EMOJI[s]||''} ${s.charAt(0).toUpperCase()+s.slice(1)}</button>`).join('')}
    </div>
    <div id="tpl-grid" style="overflow-y:auto;padding:12px 20px;display:flex;flex-direction:column;gap:8px"></div>
  </div>
</div>`;
}

function _renderGrid(filter) {
  const grid = document.getElementById('tpl-grid');
  if (!grid) return;
  const templates = filter === 'all' ? TRAINING_TEMPLATES : TRAINING_TEMPLATES.filter(t => t.sport === filter);
  grid.innerHTML = templates.map(t => `
  <div class="tpl-picker-row" data-tpl="${t.id}" style="padding:14px;border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:border-color .15s;background:var(--surface-2)">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px">
      <div>
        <div style="font-size:10px;color:var(--text-muted);font-weight:600;margin-bottom:2px">${SPORT_EMOJI[t.sport]||''} ${t.sport?.toUpperCase()}</div>
        <div style="font-weight:700;font-size:13.5px;color:var(--text-primary)">${t.title}</div>
      </div>
      ${t.popular?`<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#22c95522;color:#22c955;font-weight:700;flex-shrink:0">⭐ POPULAR</span>`:''}
    </div>
    <div style="display:flex;gap:3px;margin-bottom:8px">
      ${(t.phases||[]).map(ph=>`<div style="flex:${ph.weeks};height:4px;background:${ph.color};border-radius:2px" title="${ph.label} ${ph.weeks}wk"></div>`).join('')}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <span style="font-size:11px;padding:2px 8px;border-radius:8px;background:var(--surface);color:var(--text-muted);border:1px solid var(--border)">${t.duration}wk</span>
      <span style="font-size:11px;padding:2px 8px;border-radius:8px;background:var(--surface);color:var(--text-muted);border:1px solid var(--border)">${t.sessions_per_week}×/wk</span>
      <span style="font-size:11px;padding:2px 8px;border-radius:8px;background:var(--surface);color:var(--text-muted);border:1px solid var(--border)">${t.focus}</span>
    </div>
  </div>`).join('');

  grid.querySelectorAll('[data-tpl]').forEach(el => {
    el.addEventListener('click', () => {
      const t = TRAINING_TEMPLATES.find(x => x.id === el.dataset.tpl);
      if (!t) return;
      patchBuilder({ draft: { ...t, exercises: t.exercises.map(name => ({name,sets:3,reps:8,rest:60})) } });
      document.getElementById('tpl-picker-sheet').style.display = 'none';
      navigate('solo/builder');
    });
  });
}

document.addEventListener('piq:viewRendered', e => {
  if (e.detail?.route !== 'solo/builder') return;

  document.getElementById('tab-plan')?.addEventListener('click', () => {
    patchBuilder({ activeTab:'plan' });
    document.getElementById('plan-view').style.display  = 'block';
    document.getElementById('builder-view').style.display = 'none';
    document.getElementById('tab-plan').style.background  = 'var(--piq-green)';
    document.getElementById('tab-plan').style.color       = '#0d1b3e';
    document.getElementById('tab-build').style.background = 'var(--surface-2)';
    document.getElementById('tab-build').style.color      = 'var(--text-muted)';
  });
  document.getElementById('tab-build')?.addEventListener('click', () => {
    patchBuilder({ activeTab:'builder' });
    document.getElementById('plan-view').style.display  = 'none';
    document.getElementById('builder-view').style.display = 'block';
    document.getElementById('tab-build').style.background = 'var(--piq-green)';
    document.getElementById('tab-build').style.color      = '#0d1b3e';
    document.getElementById('tab-plan').style.background  = 'var(--surface-2)';
    document.getElementById('tab-plan').style.color       = 'var(--text-muted)';
  });

  document.getElementById('tpl-trigger')?.addEventListener('click', () => {
    document.getElementById('tpl-picker-sheet').style.display = 'block';
    _renderGrid('all');
  });
  document.getElementById('tpl-close-btn')?.addEventListener('click', () => {
    document.getElementById('tpl-picker-sheet').style.display = 'none';
  });

  document.querySelectorAll('.tpl-sport-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tpl-sport-btn').forEach(b => {
        b.style.background = 'var(--surface-2)'; b.style.color = 'var(--text-muted)';
      });
      btn.style.background = 'var(--piq-green)'; btn.style.color = '#0d1b3e';
      _renderGrid(btn.dataset.filter);
    });
  });

  document.getElementById('btn-add-ex')?.addEventListener('click', () => {
    const list = document.getElementById('ex-list');
    const idx  = list.querySelectorAll('.ex-row').length;
    const div  = document.createElement('div');
    div.innerHTML = exRow({name:'',sets:3,reps:8,rest:60}, idx);
    list.appendChild(div.firstElementChild);
  });
  document.getElementById('ex-list')?.addEventListener('click', e => {
    if (e.target.classList.contains('ex-del')) {
      document.getElementById(`ex-row-${e.target.dataset.idx}`)?.remove();
    }
  });

  document.getElementById('btn-log')?.addEventListener('click', () => {
    const title = document.getElementById('b-title')?.value.trim() || 'Solo Workout';
    const exercises = Array.from(document.querySelectorAll('#ex-list .ex-row'))
      .map(row => ({ name: row.querySelector('.ex-name')?.value||'', sets:+(row.querySelector('.ex-sets')?.value||3), reps:+(row.querySelector('.ex-reps')?.value||8), rest:+(row.querySelector('.ex-rest')?.value||60) }))
      .filter(e => e.name.trim());
    addWorkoutLog({ title, exercises: exercises.length, sport: document.getElementById('b-sport')?.value, completed:true, avgRPE:6, duration:45 });
    patchBuilder({ draft: null });
    showToast(`✅ "${title}" logged!`);
    navigate('solo/home');
  });

  document.getElementById('btn-draft')?.addEventListener('click', () => {
    const exercises = Array.from(document.querySelectorAll('#ex-list .ex-row'))
      .map(row => ({ name: row.querySelector('.ex-name')?.value||'', sets:+(row.querySelector('.ex-sets')?.value||3), reps:+(row.querySelector('.ex-reps')?.value||8), rest:+(row.querySelector('.ex-rest')?.value||60) }));
    patchBuilder({ draft: { title: document.getElementById('b-title')?.value||'', sport: document.getElementById('b-sport')?.value||'basketball', exercises } });
    showToast('💾 Draft saved');
  });
});
