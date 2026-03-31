// js/views/roster.js — PerformanceIQ
// Coach view: full athlete roster with live PIQ scores, readiness, and quick actions.

import { getMyTeams, getTeamAthleteStats, removeMember } from '../services/teamService.js'
import { navigate } from '../core/router.js'

export async function render(container) {
  container.innerHTML = _skeleton()

  const teams = await getMyTeams()

  if (!teams.length) {
    container.innerHTML = `
      <div class="view-page-header">
        <h1 class="view-page-title">Team <em class="hl">Roster</em></h1>
      </div>
      <div class="piq-empty">
        <div class="piq-empty__icon">📋</div>
        <div class="piq-empty__title">No team yet</div>
        <div class="piq-empty__body">Create a team first, then athletes can join with your invite code.</div>
        <button onclick="navigate('/team')" class="piq-empty__cta">Go to Team Setup</button>
      </div>`
    _bindNav(container)
    return
  }

  // Default to first team
  let activeTeam = teams[0]
  let athletes   = []
  let loading    = true

  const _loadAthletes = async () => {
    loading  = true
    athletes = await getTeamAthleteStats(activeTeam.id)
    loading  = false
  }

  await _loadAthletes()
  _renderRoster(container, teams, activeTeam, athletes)
}

function _renderRoster(container, teams, activeTeam, athletes) {
  const readyCount    = athletes.filter(a => a.readiness?.tier === 'high').length
  const moderateCount = athletes.filter(a => a.readiness?.tier === 'moderate').length
  const riskCount     = athletes.filter(a => a.piq?.injury_risk === 'high' || a.piq?.injury_risk === 'moderate').length

  container.innerHTML = `
    <div class="view-page-header">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <h1 class="view-page-title">Team <em class="hl">Roster</em></h1>
          <p class="view-page-subtitle">${activeTeam.name} · ${athletes.length} athlete${athletes.length !== 1 ? 's' : ''}</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${teams.length > 1 ? `
            <select id="team-select" style="padding:7px 12px;border:1.5px solid var(--card-border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text-primary);background:var(--card-bg);cursor:pointer">
              ${teams.map(t => `<option value="${t.id}" ${t.id===activeTeam.id?'selected':''}>${t.name}</option>`).join('')}
            </select>` : ''}
          <button onclick="navigate('/assign')" style="padding:8px 16px;background:var(--accent-green);color:white;border:none;border-radius:8px;font-family:'Oswald',sans-serif;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:0.06em">
            ASSIGN WORKOUT
          </button>
        </div>
      </div>
    </div>

    <!-- Summary strip -->
    <div class="kpi-strip" style="margin-bottom:22px">
      <div class="kpi-card">
        <div class="kpi-lbl">Roster Size</div>
        <div class="kpi-val kv-navy">${athletes.length}</div>
        <div class="kpi-sub ks-muted">athletes</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Ready Today</div>
        <div class="kpi-val kv-green">${readyCount}</div>
        <div class="kpi-sub ks-green">high readiness</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Train Smart</div>
        <div class="kpi-val kv-blue">${moderateCount}</div>
        <div class="kpi-sub ks-muted">moderate</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Load Risk</div>
        <div class="kpi-val" style="color:var(--accent-red)">${riskCount}</div>
        <div class="kpi-sub ks-muted">flagged</div>
      </div>
    </div>

    <!-- Invite code -->
    <div style="background:var(--nav-bg);border-radius:10px;padding:14px 18px;margin-bottom:22px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:4px">Invite Code</div>
        <div style="font-family:'Oswald',sans-serif;font-size:22px;font-weight:700;color:var(--accent-green);letter-spacing:0.12em">${activeTeam.invite_code ?? '—'}</div>
      </div>
      <button id="copy-code" style="padding:8px 16px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.7);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">
        Copy Code
      </button>
    </div>

    <!-- Athlete table -->
    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">Athletes</span>
        <input id="roster-search" type="text" placeholder="Search..."
          style="padding:6px 12px;border:1.5px solid var(--card-border);border-radius:6px;font-size:12px;color:var(--text-primary);background:var(--card-bg);width:160px">
      </div>

      ${athletes.length === 0 ? `
        <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">
          No athletes yet. Share your invite code: <strong>${activeTeam.invite_code}</strong>
        </div>
      ` : `
        <!-- Table header -->
        <div style="display:grid;grid-template-columns:1fr 80px 80px 80px 100px 36px;gap:8px;padding:10px 20px;border-bottom:1px solid var(--card-border);font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted)">
          <span>Athlete</span><span style="text-align:center">PIQ</span><span style="text-align:center">Readiness</span><span style="text-align:center">Soreness</span><span style="text-align:center">Risk</span><span></span>
        </div>
        <div id="athlete-rows">
          ${athletes.map(a => _athleteRow(a)).join('')}
        </div>
      `}
    </div>
  `

  // Team switcher
  container.querySelector('#team-select')?.addEventListener('change', async (e) => {
    const team = teams.find(t => t.id === e.target.value)
    if (!team) return
    const newAthletes = await getTeamAthleteStats(team.id)
    _renderRoster(container, teams, team, newAthletes)
  })

  // Copy invite code
  container.querySelector('#copy-code')?.addEventListener('click', async (e) => {
    await navigator.clipboard.writeText(activeTeam.invite_code ?? '').catch(() => {})
    e.target.textContent = 'Copied!'
    setTimeout(() => e.target.textContent = 'Copy Code', 2000)
  })

  // Search filter
  container.querySelector('#roster-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase()
    container.querySelectorAll('.athlete-row').forEach(row => {
      const name = row.dataset.name?.toLowerCase() ?? ''
      row.style.display = name.includes(q) ? '' : 'none'
    })
  })

  // Remove athlete buttons
  container.querySelectorAll('.remove-athlete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const name = btn.dataset.name
      if (!confirm(`Remove ${name} from the roster?`)) return
      btn.disabled = true
      try {
        await removeMember(activeTeam.id, btn.dataset.id)
        btn.closest('.athlete-row').remove()
      } catch (err) {
        alert(err.message)
        btn.disabled = false
      }
    })
  })

  _bindNav(container)
}

function _athleteRow(a) {
  const piq       = a.piq?.piq_score   ? Math.round(a.piq.piq_score) : '—'
  const readScore = a.readiness?.score  ?? '—'
  const tier      = a.readiness?.tier   ?? null
  const soreness  = a.readiness?.soreness ?? '—'
  const risk      = a.piq?.injury_risk  ?? '—'

  const tierColor = tier === 'high' ? '#24C054' : tier === 'low' ? '#EF4444' : tier === 'moderate' ? '#F59E0B' : 'var(--text-muted)'
  const riskColor = risk === 'high' ? '#EF4444' : risk === 'moderate' ? '#F59E0B' : risk === 'low' ? '#24C054' : 'var(--text-muted)'

  const initials  = (a.display_name ?? a.name ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return `
    <div class="session-row athlete-row" data-name="${(a.display_name ?? a.name ?? '').toLowerCase()}"
      style="display:grid;grid-template-columns:1fr 80px 80px 80px 100px 36px;gap:8px;align-items:center;padding:12px 20px">
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--nav-bg);display:flex;align-items:center;justify-content:center;font-family:'Oswald',sans-serif;font-size:12px;font-weight:700;color:white;flex-shrink:0">
          ${initials}
        </div>
        <div style="min-width:0">
          <div class="session-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.display_name ?? a.name ?? 'Unknown'}</div>
          <div class="session-meta">${a.sport ?? ''} ${a.position ? '· '+a.position : ''}</div>
        </div>
      </div>
      <div style="text-align:center;font-family:'Oswald',sans-serif;font-size:18px;font-weight:700;color:var(--accent-green)">${piq}</div>
      <div style="text-align:center;font-family:'Oswald',sans-serif;font-size:18px;font-weight:700;color:${tierColor}">${readScore}</div>
      <div style="text-align:center;font-size:12px;color:var(--text-muted)">${soreness}</div>
      <div style="text-align:center">
        ${risk !== '—' ? `
          <span style="padding:3px 10px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;
            background:${riskColor}22;color:${riskColor}">
            ${risk}
          </span>` : '<span style="color:var(--text-muted);font-size:12px">—</span>'}
      </div>
      <button class="remove-athlete" data-id="${a.id}" data-name="${a.display_name ?? a.name ?? ''}"
        style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:15px;padding:4px;border-radius:4px;transition:color 0.15s"
        title="Remove from roster">✕</button>
    </div>`
}

function _bindNav(container) {
  container.querySelectorAll('[onclick]').forEach(el => {
    const path = el.getAttribute('onclick')?.match(/'([^']+)'/)?.[1]
    if (path) { el.addEventListener('click', () => navigate(path)); el.removeAttribute('onclick') }
  })
}

function _skeleton() {
  return `<div>
    <div class="piq-skeleton" style="height:32px;width:220px;border-radius:8px;margin-bottom:8px"></div>
    <div class="piq-skeleton" style="height:14px;width:160px;border-radius:6px;margin-bottom:24px"></div>
    <div class="kpi-strip">${Array(4).fill('<div class="piq-skeleton" style="height:96px;border-radius:12px"></div>').join('')}</div>
    <div class="piq-skeleton" style="height:60px;border-radius:10px;margin-bottom:22px"></div>
    <div class="piq-skeleton" style="height:300px;border-radius:12px"></div>
  </div>`
}
