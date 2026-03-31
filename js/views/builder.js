// js/views/builder.js — PerformanceIQ
import { getExercises, createWorkout } from '../services/workoutService.js'
import { navigate } from '../core/router.js'
import { getProfile } from '../core/supabase.js'

let _exercises  = []
let _selected   = []   // {exercise, sets, reps, rest_s, note}
let _title      = ''
let _dayType    = 'strength'
let _date       = new Date().toISOString().split('T')[0]

export async function render(container) {
  _exercises = await getExercises()
  _selected  = []
  _title     = ''
  _renderBuilder(container)
}

function _renderBuilder(container) {
  const profile = getProfile()

  container.innerHTML = `
    <div class="view-page-header">
      <h1 class="view-page-title">Workout <em class="hl">Builder</em></h1>
      <p class="view-page-subtitle">Build your custom training session</p>
    </div>

    <div class="two-col">
      <!-- Left: search + add -->
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><span class="panel-title">Session Details</span></div>
          <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">
            <div>
              <label class="rpanel-title" style="display:block;margin-bottom:6px">Workout Title</label>
              <input id="wo-title" type="text" value="${_title}" placeholder="e.g. Push Day A"
                style="width:100%;padding:10px 14px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text-primary);background:var(--card-bg)"
                oninput="_title=this.value">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <label class="rpanel-title" style="display:block;margin-bottom:6px">Type</label>
                <select id="wo-daytype" style="width:100%;padding:9px 12px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg)">
                  ${['strength','power','speed','conditioning','recovery','mobility'].map(t =>
                    `<option value="${t}" ${_dayType===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`
                  ).join('')}
                </select>
              </div>
              <div>
                <label class="rpanel-title" style="display:block;margin-bottom:6px">Date</label>
                <input id="wo-date" type="date" value="${_date}"
                  style="width:100%;padding:9px 12px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg)">
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><span class="panel-title">Add Exercises</span></div>
          <div style="padding:12px 16px">
            <input id="ex-search" type="text" placeholder="Search exercises..."
              style="width:100%;padding:9px 14px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg);margin-bottom:10px"
              oninput="_filterExercises(this.value)">
            <div id="ex-list" style="max-height:300px;overflow-y:auto">
              ${_renderExList(_exercises)}
            </div>
          </div>
        </div>
      </div>

      <!-- Right: current session -->
      <div>
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">Session (${_selected.length})</span>
          </div>
          <div id="session-list">
            ${_selected.length ? _selected.map((s, i) => _sessionExRow(s, i)).join('')
              : `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
                   Add exercises from the left to build your session.
                 </div>`}
          </div>
          ${_selected.length ? `
            <div style="padding:16px 20px;border-top:1px solid var(--card-border)">
              <div id="builder-msg" style="display:none;background:#FEE2E2;border:1px solid #FCA5A5;color:#991B1B;padding:10px;border-radius:8px;font-size:12px;margin-bottom:10px"></div>
              <button id="save-workout" style="
                width:100%;padding:13px;background:var(--accent-green);color:white;border:none;
                border-radius:8px;font-family:'Oswald',sans-serif;font-size:15px;font-weight:700;
                letter-spacing:0.06em;cursor:pointer">
                SAVE WORKOUT
              </button>
            </div>` : ''}
        </div>
      </div>
    </div>
  `

  // Wire input handlers
  const titleInput   = container.querySelector('#wo-title')
  const dayTypeSelect= container.querySelector('#wo-daytype')
  const dateInput    = container.querySelector('#wo-date')

  if (titleInput)    titleInput.addEventListener('input',  e => { _title   = e.target.value })
  if (dayTypeSelect) dayTypeSelect.addEventListener('change', e => { _dayType = e.target.value })
  if (dateInput)     dateInput.addEventListener('change',  e => { _date    = e.target.value })

  // Exercise search
  window._filterExercises = (q) => {
    const listEl = container.querySelector('#ex-list')
    if (!listEl) return
    const filtered = q.trim()
      ? _exercises.filter(e => e.name.toLowerCase().includes(q.toLowerCase()) || (e.category||'').includes(q.toLowerCase()))
      : _exercises
    listEl.innerHTML = _renderExList(filtered)
    _bindExList(container)
  }

  // Add exercise
  window._addEx = (id) => {
    const ex = _exercises.find(e => e.id === id)
    if (!ex) return
    _selected.push({ exercise: ex, sets: 3, reps: '8-10', rest_s: 60 })
    _renderBuilder(container)
  }

  // Remove exercise
  window._removeEx = (i) => {
    _selected.splice(i, 1)
    _renderBuilder(container)
  }

  // Save workout
  container.querySelector('#save-workout')?.addEventListener('click', async (e) => {
    const title = container.querySelector('#wo-title')?.value.trim() || _title
    if (!title) {
      const msg = container.querySelector('#builder-msg')
      if (msg) { msg.textContent='Please add a workout title.'; msg.style.display='block' }
      return
    }
    e.target.disabled=true; e.target.textContent='Saving…'
    try {
      await createWorkout({
        title,
        dayType:   container.querySelector('#wo-daytype')?.value ?? _dayType,
        scheduledDate: container.querySelector('#wo-date')?.value ?? _date,
        sport:     getProfile()?.sport,
        exercises: _selected.map(s => ({
          name:    s.exercise.name,
          sets:    s.sets,
          reps:    s.reps,
          rest_s:  s.rest_s,
        }))
      })
      _selected = []; _title = ''
      navigate('/today')
    } catch (err) {
      const msg = container.querySelector('#builder-msg')
      if (msg) { msg.textContent=err.message; msg.style.display='block' }
      e.target.disabled=false; e.target.textContent='SAVE WORKOUT'
    }
  })

  _bindExList(container)
}

function _renderExList(exs) {
  if (!exs.length) return `<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:13px">No exercises found.</div>`
  return exs.map(ex => `
    <div style="display:flex;align-items:center;padding:10px 4px;border-bottom:1px solid var(--card-border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${ex.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${ex.category}${ex.muscles?.length?' · '+ex.muscles.slice(0,2).join(', '):''}</div>
      </div>
      <button onclick="_addEx('${ex.id}')" style="
        padding:5px 12px;background:var(--accent-green-dim);border:1px solid var(--accent-green-border);
        color:var(--accent-green);border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;
        font-family:'Oswald',sans-serif;letter-spacing:0.04em;white-space:nowrap">
        + ADD
      </button>
    </div>`).join('')
}

function _sessionExRow(item, i) {
  return `
    <div class="session-row">
      <div class="session-icon si-today" style="font-size:13px;font-weight:700">${i+1}</div>
      <div style="flex:1;min-width:0">
        <div class="session-name">${item.exercise.name}</div>
        <div class="session-meta">${item.sets} sets · ${item.reps} reps · ${item.rest_s}s rest</div>
      </div>
      <button onclick="_removeEx(${i})" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:4px 8px">✕</button>
    </div>`
}

function _bindExList(container) {
  container.querySelectorAll('[onclick^="_addEx"]').forEach(btn => {
    const m = btn.getAttribute('onclick').match(/'([^']+)'/)
    if (m) btn.addEventListener('click', () => window._addEx(m[1]))
    btn.removeAttribute('onclick')
  })
  container.querySelectorAll('[onclick^="_removeEx"]').forEach(btn => {
    const m = btn.getAttribute('onclick').match(/\((\d+)\)/)
    if (m) btn.addEventListener('click', () => window._removeEx(+m[1]))
    btn.removeAttribute('onclick')
  })
}
