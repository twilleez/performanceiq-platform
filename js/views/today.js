// js/views/today.js — PerformanceIQ
// Active training view. Shows today's workout with exercise checklist + completion.

import { getTodayWorkout, completeWorkout, getWorkouts, createWorkout } from '../services/workoutService.js'
import { getTodayReadiness } from '../services/readinessService.js'
import { navigate }          from '../core/router.js'
import { getProfile }        from '../core/supabase.js'

let _workout  = null
let _checked  = new Set()   // completed exercise indices
let _rpe      = 5

export async function render(container) {
  container.innerHTML = _skeleton()

  const [workout, readiness] = await Promise.all([
    getTodayWorkout(),
    getTodayReadiness()
  ])

  _workout = workout
  _checked = new Set()
  _rpe     = 5

  if (!workout) {
    _renderEmpty(container, readiness)
    return
  }

  _renderWorkout(container, workout, readiness)
}

// ── EMPTY STATE ───────────────────────────────────────────────

function _renderEmpty(container, readiness) {
  container.innerHTML = `
    <div class="view-page-header">
      <h1 class="view-page-title">Today's <em class="hl">Training</em></h1>
      <p class="view-page-subtitle">${_dateStr()}</p>
    </div>

    ${readiness ? '' : `
      <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:14px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
        <span style="font-size:18px">⚠️</span>
        <div>
          <div style="font-size:13px;font-weight:600;color:#92400E">No readiness check-in today</div>
          <div style="font-size:12px;color:#92400E">Log how you feel before training for accurate PIQ scoring.</div>
        </div>
        <button onclick="navigate('/readiness')" style="margin-left:auto;padding:6px 14px;background:#F59E0B;color:white;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">
          Log Now
        </button>
      </div>`}

    <div class="piq-empty">
      <div class="piq-empty__icon">🏋️</div>
      <div class="piq-empty__title">No workout scheduled today</div>
      <div class="piq-empty__body">Build a custom session or pick a program template from the library.</div>
      <div style="display:flex;gap:10px;margin-top:4px">
        <button onclick="navigate('/builder')" class="btn-outline" style="width:auto;padding:10px 20px">Build Workout</button>
        <button onclick="navigate('/library')" style="padding:10px 20px;background:transparent;border:1.5px solid var(--card-border);border-radius:8px;font-family:'Oswald',sans-serif;font-size:12.5px;font-weight:700;letter-spacing:0.06em;cursor:pointer;color:var(--text-secondary)">Browse Library</button>
      </div>
    </div>
  `
  _bindNav(container)
}

// ── WORKOUT VIEW ──────────────────────────────────────────────

function _renderWorkout(container, w, readiness) {
  const exercises = Array.isArray(w.exercises) ? w.exercises : []
  const done      = w.status === 'completed'

  container.innerHTML = `
    <div class="view-page-header">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <h1 class="view-page-title">${w.title}</h1>
          <p class="view-page-subtitle">
            ${_dateStr()} · ${w.day_type ?? 'Training'}
            ${w.duration_min ? ' · ' + w.duration_min + ' min' : ''}
          </p>
        </div>
        <span class="session-badge ${done ? 'sb-done' : 'sb-next'}">${done ? 'Completed' : 'Today'}</span>
      </div>
    </div>

    ${readiness ? `
      <div style="background:var(--accent-green-dim);border:1px solid var(--accent-green-border);border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
        <span style="font-size:18px">✅</span>
        <div style="font-size:13px;color:var(--text-primary)">
          Readiness: <strong>${readiness.score}/100</strong> · ${readiness.tier}
          · Sleep ${readiness.sleep_hrs}h · Soreness: ${readiness.soreness}
        </div>
      </div>
    ` : `
      <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#92400E">
        ⚠️ <a onclick="navigate('/readiness')" style="cursor:pointer;text-decoration:underline">Log your readiness</a> for accurate PIQ scoring
      </div>
    `}

    <!-- Exercise list -->
    <div class="panel" style="margin-bottom:20px">
      <div class="panel-head">
        <span class="panel-title">Exercises (${exercises.length})</span>
        <span style="font-size:12px;color:var(--text-muted)" id="progress-label">
          ${done ? 'All done' : '0 / ' + exercises.length + ' completed'}
        </span>
      </div>
      <div id="exercise-list">
        ${exercises.length
          ? exercises.map((ex, i) => _exerciseRow(ex, i, done)).join('')
          : `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
               No exercises in this workout yet.
               <button onclick="navigate('/builder')" style="display:block;margin:12px auto 0;background:none;border:none;color:var(--accent-green);cursor:pointer;font-size:13px">Edit in Builder →</button>
             </div>`
        }
      </div>
    </div>

    <!-- Recovery cue -->
    ${w.recovery_cue ? `
      <div class="panel" style="margin-bottom:20px">
        <div class="panel-head"><span class="panel-title">Recovery Protocol</span></div>
        <div style="padding:16px 20px;font-size:13px;color:var(--text-secondary);line-height:1.6">${w.recovery_cue}</div>
      </div>` : ''}

    <!-- Complete panel -->
    ${!done ? `
      <div class="panel" id="complete-panel">
        <div class="panel-head"><span class="panel-title">Complete Session</span></div>
        <div style="padding:16px 20px">
          <div style="margin-bottom:16px">
            <label style="font-size:12px;font-weight:700;color:var(--text-muted);letter-spacing:0.06em;text-transform:uppercase;display:block;margin-bottom:8px">
              Session RPE (1 = easy, 10 = max effort)
            </label>
            <div style="display:flex;align-items:center;gap:12px">
              <input type="range" id="rpe-slider" min="1" max="10" value="5" style="flex:1"
                oninput="document.getElementById('rpe-val').textContent=this.value;window._piqRpe=+this.value">
              <span id="rpe-val" style="font-family:'Oswald',sans-serif;font-size:22px;font-weight:700;color:var(--accent-green);min-width:24px">5</span>
            </div>
          </div>
          <div style="margin-bottom:16px">
            <label style="font-size:12px;font-weight:700;color:var(--text-muted);letter-spacing:0.06em;text-transform:uppercase;display:block;margin-bottom:6px">Session Notes (optional)</label>
            <textarea id="session-notes" style="width:100%;padding:10px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;resize:vertical;min-height:60px;color:var(--text-primary);background:var(--card-bg)" placeholder="How did it feel? Any PRs?"></textarea>
          </div>
          <button id="complete-btn" style="
            width:100%;padding:14px;background:var(--accent-green);color:white;
            border:none;border-radius:8px;font-family:'Oswald',sans-serif;
            font-size:16px;font-weight:700;letter-spacing:0.06em;cursor:pointer;
            transition:background 0.15s">
            ✓ COMPLETE SESSION
          </button>
        </div>
      </div>` : `
      <div style="text-align:center;padding:20px;color:var(--text-muted)">
        <div style="font-size:32px;margin-bottom:8px">🎉</div>
        <div style="font-size:14px;font-weight:600;color:var(--text-primary)">Session complete!</div>
        <div style="font-size:12px;margin-top:4px">
          ${w.duration_min ? w.duration_min + ' min' : ''} · RPE ${w.rpe_actual ?? '—'}
        </div>
        <button onclick="navigate('/progress')" style="margin-top:16px;background:none;border:none;color:var(--accent-green);font-size:13px;cursor:pointer;font-weight:600">
          View Progress →
        </button>
      </div>`}
  `

  window._piqRpe = 5
  _bindWorkout(container, w, exercises)
}

function _exerciseRow(ex, i, done) {
  const name   = typeof ex === 'string' ? ex : (ex.name ?? ex.exercise ?? `Exercise ${i+1}`)
  const detail = typeof ex === 'object'
    ? [ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`, ex.rest_s && `${ex.rest_s}s rest`].filter(Boolean).join(' · ')
    : ''
  const note   = typeof ex === 'object' ? ex.note ?? '' : ''

  return `
    <div class="session-row exercise-row" data-idx="${i}" style="cursor:pointer" onclick="window._piqToggleEx(${i})">
      <div style="width:24px;height:24px;border-radius:6px;border:2px solid var(--card-border);
        display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;
        background:${done ? 'var(--accent-green)' : 'transparent'};
        border-color:${done ? 'var(--accent-green)' : 'var(--card-border)'}" id="check-${i}">
        ${done ? '<span style="color:white;font-size:12px">✓</span>' : ''}
      </div>
      <div style="flex:1;min-width:0">
        <div class="session-name" id="ex-name-${i}" style="${done ? 'text-decoration:line-through;opacity:0.6' : ''}">${name}</div>
        ${detail ? `<div class="session-meta">${detail}</div>` : ''}
        ${note   ? `<div style="font-size:11px;color:var(--accent-green);margin-top:2px;font-style:italic">${note}</div>` : ''}
      </div>
    </div>`
}

function _bindWorkout(container, w, exercises) {
  _bindNav(container)

  // Exercise toggle
  window._piqToggleEx = (i) => {
    if (w.status === 'completed') return
    if (_checked.has(i)) _checked.delete(i)
    else _checked.add(i)

    const check = document.getElementById(`check-${i}`)
    const name  = document.getElementById(`ex-name-${i}`)
    if (check) {
      const active = _checked.has(i)
      check.style.background    = active ? 'var(--accent-green)' : 'transparent'
      check.style.borderColor   = active ? 'var(--accent-green)' : 'var(--card-border)'
      check.innerHTML           = active ? '<span style="color:white;font-size:12px">✓</span>' : ''
      if (name) name.style.cssText = active ? 'text-decoration:line-through;opacity:0.6' : ''
    }

    const label = document.getElementById('progress-label')
    if (label) label.textContent = `${_checked.size} / ${exercises.length} completed`
  }

  // Complete button
  const completeBtn = container.querySelector('#complete-btn')
  if (completeBtn) {
    completeBtn.addEventListener('click', async () => {
      const notes = container.querySelector('#session-notes')?.value ?? ''
      completeBtn.disabled    = true
      completeBtn.textContent = 'Saving…'

      try {
        await completeWorkout(w.id, {
          rpeActual:    window._piqRpe ?? 5,
          notes,
          exerciseLogs: exercises.map((ex, i) => ({
            name:      typeof ex === 'string' ? ex : ex.name,
            completed: _checked.has(i)
          }))
        })
        await render(container)
      } catch (err) {
        console.error('[PIQ] complete workout:', err)
        completeBtn.disabled    = false
        completeBtn.textContent = '✓ COMPLETE SESSION'
        alert('Failed to save. Check your connection and try again.')
      }
    })
  }
}

function _bindNav(container) {
  container.querySelectorAll('[onclick]').forEach(el => {
    const fn   = el.getAttribute('onclick')
    const path = fn?.match(/'([^']+)'/)?.[1]
    if (path) { el.addEventListener('click', () => navigate(path)); el.removeAttribute('onclick') }
  })
}

function _dateStr() {
  return new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
}

function _skeleton() {
  return `<div>
    <div class="piq-skeleton" style="height:32px;width:220px;border-radius:8px;margin-bottom:8px"></div>
    <div class="piq-skeleton" style="height:14px;width:160px;border-radius:6px;margin-bottom:24px"></div>
    <div class="piq-skeleton" style="height:200px;border-radius:12px;margin-bottom:16px"></div>
    <div class="piq-skeleton" style="height:140px;border-radius:12px"></div>
  </div>`
}
