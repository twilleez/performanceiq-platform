// js/views/assign.js — PerformanceIQ
// Coach assigns a workout to individual athletes or the whole roster.

import { getMyTeams, getRoster }       from '../services/teamService.js'
import { getWorkouts, createWorkout }   from '../services/workoutService.js'
import { supabase }                     from '../core/supabase.js'
import { navigate }                     from '../core/router.js'

export async function render(container) {
  container.innerHTML = _skeleton()

  const [teams, myWorkouts] = await Promise.all([
    getMyTeams(),
    getWorkouts({ limit: 30 })
  ])

  if (!teams.length) {
    container.innerHTML = `
      <div class="view-page-header">
        <h1 class="view-page-title">Assign <em class="hl">Workout</em></h1>
      </div>
      <div class="piq-empty">
        <div class="piq-empty__icon">📤</div>
        <div class="piq-empty__title">No team yet</div>
        <div class="piq-empty__body">Create a team and add athletes before assigning workouts.</div>
        <button onclick="navigate('/team')" class="piq-empty__cta">Team Setup</button>
      </div>`
    _bindNav(container)
    return
  }

  let activeTeam = teams[0]
  let roster     = await getRoster(activeTeam.id)
  let selected   = new Set()  // athlete IDs to assign to
  let selectedWO = null       // workout object to assign

  const _rerender = () => _renderAssign(container, teams, activeTeam, roster, myWorkouts, selected, selectedWO, {
    onTeamChange: async (teamId) => {
      activeTeam = teams.find(t => t.id === teamId) ?? activeTeam
      roster     = await getRoster(activeTeam.id)
      selected   = new Set()
      _rerender()
    },
    onToggleAthlete: (id) => {
      if (selected.has(id)) selected.delete(id)
      else selected.add(id)
      _rerender()
    },
    onSelectAll: () => {
      if (selected.size === roster.length) selected = new Set()
      else selected = new Set(roster.map(a => a.id))
      _rerender()
    },
    onSelectWorkout: (wo) => {
      selectedWO = selectedWO?.id === wo.id ? null : wo
      _rerender()
    },
    onAssign: async (date) => {
      if (!selectedWO || !selected.size) return
      const btn = container.querySelector('#assign-btn')
      if (btn) { btn.disabled = true; btn.textContent = 'Assigning…' }

      let successCount = 0
      const errors     = []

      for (const athleteId of selected) {
        try {
          // Create a copy of the workout for this athlete on the given date
          await supabase.from('workouts').insert({
            athlete_id:     athleteId,
            assigned_by:    (await supabase.auth.getUser()).data?.user?.id,
            title:          selectedWO.title,
            sport:          selectedWO.sport,
            day_type:       selectedWO.day_type,
            exercises:      selectedWO.exercises,
            notes:          selectedWO.notes ?? '',
            recovery_cue:   selectedWO.recovery_cue ?? '',
            scheduled_date: date,
            status:         'planned'
          })
          successCount++
        } catch (err) {
          errors.push(err.message)
        }
      }

      if (btn) { btn.disabled = false; btn.textContent = 'ASSIGN WORKOUT' }

      if (successCount > 0) {
        alert(`✅ Assigned "${selectedWO.title}" to ${successCount} athlete${successCount !== 1 ? 's' : ''}.`)
        selected   = new Set()
        selectedWO = null
        _rerender()
      } else {
        alert('Failed to assign. ' + errors[0])
      }
    }
  })

  _rerender()
}

function _renderAssign(container, teams, activeTeam, roster, workouts, selected, selectedWO, handlers) {
  const today   = new Date().toISOString().split('T')[0]
  const canAssign = selectedWO && selected.size > 0

  container.innerHTML = `
    <div class="view-page-header">
      <h1 class="view-page-title">Assign <em class="hl">Workout</em></h1>
      <p class="view-page-subtitle">Pick a workout, select athletes, set date</p>
    </div>

    <div class="two-col">
      <!-- Left: pick workout + date -->
      <div>
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><span class="panel-title">1. Select Workout</span></div>
          <div style="padding:12px 16px;max-height:300px;overflow-y:auto">
            ${workouts.length ? workouts.map(w => `
              <div class="session-row workout-pick" data-id="${w.id}" style="cursor:pointer;
                background:${selectedWO?.id===w.id?'var(--accent-green-dim)':'transparent'};
                border-left:3px solid ${selectedWO?.id===w.id?'var(--accent-green)':'transparent'}">
                <div style="flex:1;min-width:0">
                  <div class="session-name">${w.title}</div>
                  <div class="session-meta">${w.day_type ?? 'training'} · ${w.exercises?.length ?? 0} exercises</div>
                </div>
                ${selectedWO?.id===w.id ? '<span style="color:var(--accent-green);font-size:18px">✓</span>' : ''}
              </div>`).join('')
            : `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">
                No workouts yet. <button onclick="navigate('/builder')" style="background:none;border:none;color:var(--accent-green);cursor:pointer;font-size:13px">Build one →</button>
               </div>`}
          </div>
        </div>

        <!-- Date -->
        <div class="panel" style="margin-bottom:18px">
          <div class="panel-head"><span class="panel-title">2. Schedule Date</span></div>
          <div style="padding:16px 20px">
            <input type="date" id="assign-date" value="${today}"
              min="${today}"
              style="width:100%;padding:10px 14px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text-primary);background:var(--card-bg)">
          </div>
        </div>

        <!-- Assign button -->
        <button id="assign-btn" ${canAssign ? '' : 'disabled'} style="
          width:100%;padding:14px;border:none;border-radius:8px;
          background:${canAssign?'var(--accent-green)':'var(--card-border)'};
          color:${canAssign?'white':'var(--text-muted)'};
          font-family:'Oswald',sans-serif;font-size:15px;font-weight:700;
          letter-spacing:0.06em;cursor:${canAssign?'pointer':'not-allowed'};
          transition:all 0.15s">
          ${canAssign ? `ASSIGN TO ${selected.size} ATHLETE${selected.size!==1?'S':''}` : 'SELECT WORKOUT + ATHLETES'}
        </button>
      </div>

      <!-- Right: athlete list -->
      <div>
        ${teams.length > 1 ? `
          <div style="margin-bottom:12px">
            <select id="team-select" style="width:100%;padding:9px 12px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg)">
              ${teams.map(t => `<option value="${t.id}" ${t.id===activeTeam.id?'selected':''}>${t.name}</option>`).join('')}
            </select>
          </div>` : ''}

        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">3. Select Athletes</span>
            <button id="select-all" style="font-size:12px;color:var(--accent-green);background:none;border:none;cursor:pointer;font-weight:600">
              ${selected.size === roster.length && roster.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          ${roster.length ? roster.map(a => {
            const active   = selected.has(a.id)
            const initials = (a.display_name ?? '?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
            return `
              <div class="session-row athlete-select" data-id="${a.id}" style="cursor:pointer;
                background:${active?'var(--accent-green-dim)':'transparent'}">
                <div style="width:20px;height:20px;border-radius:4px;border:2px solid ${active?'var(--accent-green)':'var(--card-border)'};
                  background:${active?'var(--accent-green)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  ${active?'<span style="color:white;font-size:11px;font-weight:700">✓</span>':''}
                </div>
                <div style="width:32px;height:32px;border-radius:50%;background:var(--nav-bg);display:flex;align-items:center;justify-content:center;font-family:\'Oswald\',sans-serif;font-size:11px;font-weight:700;color:white;flex-shrink:0">
                  ${initials}
                </div>
                <div style="flex:1;min-width:0">
                  <div class="session-name">${a.display_name ?? 'Unknown'}</div>
                  <div class="session-meta">${a.sport ?? ''} ${a.team_role ? '· '+a.team_role : ''}</div>
                </div>
              </div>`
          }).join('') : `
            <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
              No athletes on this team yet.
            </div>`}
        </div>
      </div>
    </div>
  `

  // Workout selection
  container.querySelectorAll('.workout-pick').forEach(row => {
    row.addEventListener('click', () => {
      const wo = workouts.find(w => w.id === row.dataset.id)
      if (wo) handlers.onSelectWorkout(wo)
    })
  })

  // Athlete selection
  container.querySelectorAll('.athlete-select').forEach(row => {
    row.addEventListener('click', () => handlers.onToggleAthlete(row.dataset.id))
  })

  // Select all
  container.querySelector('#select-all')?.addEventListener('click', handlers.onSelectAll)

  // Team switcher
  container.querySelector('#team-select')?.addEventListener('change', (e) => handlers.onTeamChange(e.target.value))

  // Assign
  container.querySelector('#assign-btn')?.addEventListener('click', () => {
    const date = container.querySelector('#assign-date')?.value ?? new Date().toISOString().split('T')[0]
    handlers.onAssign(date)
  })

  _bindNav(container)
}

function _bindNav(container) {
  container.querySelectorAll('[onclick]').forEach(el => {
    const path = el.getAttribute('onclick')?.match(/'([^']+)'/)?.[1]
    if (path) { el.addEventListener('click', () => navigate(path)); el.removeAttribute('onclick') }
  })
}

function _skeleton() {
  return `<div>
    <div class="piq-skeleton" style="height:32px;width:200px;border-radius:8px;margin-bottom:8px"></div>
    <div class="piq-skeleton" style="height:14px;width:160px;border-radius:6px;margin-bottom:24px"></div>
    <div class="two-col">
      <div class="piq-skeleton" style="height:400px;border-radius:12px"></div>
      <div class="piq-skeleton" style="height:400px;border-radius:12px"></div>
    </div>
  </div>`
}
