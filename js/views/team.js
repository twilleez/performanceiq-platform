// js/views/team.js — PerformanceIQ
import { getMyTeams, createTeam, joinTeamByCode } from '../services/teamService.js'
import { navigate } from '../core/router.js'
import { getProfile } from '../core/supabase.js'

export async function render(container) {
  const teams   = await getMyTeams()
  const profile = getProfile()
  const isCoach = profile?.role === 'coach' || profile?.role === 'admin'

  container.innerHTML = `
    <div class="view-page-header">
      <h1 class="view-page-title">My <em class="hl">Team</em></h1>
    </div>

    ${isCoach ? `
      <!-- Create team -->
      <div class="panel" style="margin-bottom:18px">
        <div class="panel-head"><span class="panel-title">Create a Team</span></div>
        <div style="padding:16px 20px;display:flex;gap:10px">
          <input id="team-name" placeholder="Team name" style="flex:1;padding:10px 14px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg)">
          <button id="create-team" style="padding:10px 20px;background:var(--accent-green);color:white;border:none;border-radius:8px;font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;cursor:pointer">
            CREATE
          </button>
        </div>
      </div>` : `
      <!-- Join team -->
      <div class="panel" style="margin-bottom:18px">
        <div class="panel-head"><span class="panel-title">Join a Team</span></div>
        <div style="padding:16px 20px;display:flex;gap:10px">
          <input id="invite-code" placeholder="Enter invite code" style="flex:1;padding:10px 14px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg)">
          <button id="join-team" style="padding:10px 20px;background:var(--accent-blue);color:white;border:none;border-radius:8px;font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;cursor:pointer">
            JOIN
          </button>
        </div>
        <div id="join-msg" style="padding:0 20px 16px;font-size:12px;color:var(--accent-red);display:none"></div>
      </div>`}

    <!-- Teams list -->
    <div class="panel">
      <div class="panel-head"><span class="panel-title">Your Teams</span></div>
      ${teams.length ? teams.map(t => `
        <div class="session-row" onclick="navigate('/roster?team=${t.id}')" style="cursor:pointer">
          <div class="session-icon si-today">🏆</div>
          <div style="flex:1;min-width:0">
            <div class="session-name">${t.name}</div>
            <div class="session-meta">${t.sport} ${t.invite_code ? '· Code: '+t.invite_code : ''}</div>
          </div>
          <span class="session-badge sb-next">${t.my_role}</span>
        </div>`).join('')
      : `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
           ${isCoach ? 'Create your first team above.' : 'Join a team using your coach\'s invite code.'}
         </div>`}
    </div>
  `

  container.querySelector('#create-team')?.addEventListener('click', async (e) => {
    const name = container.querySelector('#team-name')?.value.trim()
    if (!name) return
    e.target.disabled=true
    try { await createTeam({ name, sport: profile?.sport }); await render(container) }
    catch (err) { alert(err.message) }
    e.target.disabled=false
  })

  container.querySelector('#join-team')?.addEventListener('click', async (e) => {
    const code = container.querySelector('#invite-code')?.value.trim()
    if (!code) return
    const msg = container.querySelector('#join-msg')
    e.target.disabled=true; e.target.textContent='Joining…'
    try {
      await joinTeamByCode(code)
      await render(container)
    } catch (err) {
      if (msg) { msg.textContent=err.message; msg.style.display='block' }
    }
    e.target.disabled=false; e.target.textContent='JOIN'
  })

  container.querySelectorAll('[onclick]').forEach(el => {
    const path = el.getAttribute('onclick')?.match(/'([^']+)'/)?.[1]
    if (path) { el.addEventListener('click', () => navigate(path)); el.removeAttribute('onclick') }
  })
}

// ─────────────────────────────────────────────────────────────
// js/views/roster.js
export const roster = {
  async render(container) {
    container.innerHTML = `
      <div class="view-page-header">
        <h1 class="view-page-title">Team <em class="hl">Roster</em></h1>
      </div>
      <div class="piq-empty">
        <div class="piq-empty__icon">📋</div>
        <div class="piq-empty__title">Roster view coming soon</div>
        <div class="piq-empty__body">Full athlete roster with PIQ scores and readiness indicators.</div>
      </div>`
  }
}

// ─────────────────────────────────────────────────────────────
// js/views/assign.js
export const assign = {
  async render(container) {
    container.innerHTML = `
      <div class="view-page-header">
        <h1 class="view-page-title">Assign <em class="hl">Workout</em></h1>
      </div>
      <div class="piq-empty">
        <div class="piq-empty__icon">📤</div>
        <div class="piq-empty__title">Workout assignment coming soon</div>
        <div class="piq-empty__body">Push workouts to individual athletes or the whole roster.</div>
      </div>`
  }
}

// ─────────────────────────────────────────────────────────────
// js/views/athlete.js (parent view)
export const athlete = {
  async render(container) {
    container.innerHTML = `
      <div class="view-page-header">
        <h1 class="view-page-title">Athlete <em class="hl">Overview</em></h1>
      </div>
      <div class="piq-empty">
        <div class="piq-empty__icon">👪</div>
        <div class="piq-empty__title">Athlete monitoring coming soon</div>
        <div class="piq-empty__body">View your linked athlete's PIQ score, readiness, and training history.</div>
      </div>`
  }
}
