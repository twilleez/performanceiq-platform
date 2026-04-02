// js/views/onboarding.js — PerformanceIQ
// 4-step onboarding wizard. Fires once after first sign-up.
// FIX: includes email in profile upsert (NOT NULL constraint)
// FIX: guards against null session mid-flow
// FIX: shows user-facing error on save failure instead of silent navigate

import { updateProfile, getUser, getProfile } from '../core/supabase.js'
import { navigate } from '../core/router.js'

// ── CONSTANTS ─────────────────────────────────────────────────

const STEPS = ['role', 'sport', 'goals', 'ready']

const ROLES = [
  { val: 'solo_athlete',  label: 'Solo Athlete',   desc: 'Track my own training',  emoji: '🏃' },
  { val: 'team_athlete',  label: 'Team Athlete',   desc: 'Join a coached team',     emoji: '🏅' },
  { val: 'coach',         label: 'Coach',          desc: 'Manage a roster',         emoji: '📋' },
  { val: 'parent',        label: 'Parent',         desc: 'Monitor my athlete',      emoji: '👨‍👩‍👧' },
]

const SPORTS = [
  { val: 'basketball', label: 'Basketball', emoji: '🏀' },
  { val: 'football',   label: 'Football',   emoji: '🏈' },
  { val: 'soccer',     label: 'Soccer',     emoji: '⚽' },
  { val: 'baseball',   label: 'Baseball',   emoji: '⚾' },
  { val: 'volleyball', label: 'Volleyball', emoji: '🏐' },
  { val: 'track',      label: 'Track',      emoji: '🏃' },
  { val: 'swimming',   label: 'Swimming',   emoji: '🏊' },
  { val: 'tennis',     label: 'Tennis',     emoji: '🎾' },
  { val: 'lacrosse',   label: 'Lacrosse',   emoji: '🥍' },
  { val: 'wrestling',  label: 'Wrestling',  emoji: '🤼' },
  { val: 'other',      label: 'Other',      emoji: '🏆' },
]

const GOALS = [
  { val: 'strength',    label: 'Build Strength',          emoji: '💪' },
  { val: 'speed',       label: 'Improve Speed',           emoji: '⚡' },
  { val: 'endurance',   label: 'Increase Endurance',      emoji: '🫀' },
  { val: 'muscle',      label: 'Gain Muscle',             emoji: '🏋️' },
  { val: 'athleticism', label: 'Overall Athleticism',     emoji: '🎯' },
  { val: 'recovery',    label: 'Better Recovery',         emoji: '😴' },
]

// ── MODULE STATE ─────────────────────────────────────────────

let _step = 0
let _data = {}     // accumulates selections across steps

// ── PUBLIC API ────────────────────────────────────────────────

export function render(container) {
  _step = 0
  _data = {}

  // Pre-fill role if already set (e.g. from pick-role screen)
  const profile = getProfile()
  if (profile?.role) _data.role = profile.role

  _renderStep(container)
}

// ── INTERNAL ──────────────────────────────────────────────────

function _renderStep(container) {
  container.innerHTML = `
    <div class="onboard-shell">
      <div class="onboard-card">
        ${_progressBar()}
        ${_stepContent()}
      </div>
    </div>
  `
  _bindStep(container)
}

function _progressBar() {
  return `
    <div class="onboard-progress" role="progressbar"
         aria-valuenow="${_step + 1}" aria-valuemin="1" aria-valuemax="${STEPS.length}"
         aria-label="Step ${_step + 1} of ${STEPS.length}">
      ${STEPS.map((_, i) => `
        <div class="onboard-pip ${i < _step ? 'done' : ''} ${i === _step ? 'active' : ''}"></div>
      `).join('')}
    </div>
    <p class="onboard-step-label">STEP ${_step + 1} OF ${STEPS.length}</p>
  `
}

function _stepContent() {
  switch (STEPS[_step]) {

    case 'role':
      return `
        <h1 class="onboard-title">How will you use<br><span class="onboard-brand">PerformanceIQ</span>?</h1>
        <p class="onboard-subtitle">This customizes your experience and dashboard.</p>
        <div class="onboard-grid">
          ${ROLES.map(r => `
            <button class="onboard-role-btn ${_data.role === r.val ? 'selected' : ''}"
                    data-val="${r.val}" aria-pressed="${_data.role === r.val}">
              <span class="onboard-role-emoji">${r.emoji}</span>
              <strong>${r.label}</strong>
              <span class="onboard-role-desc">${r.desc}</span>
            </button>
          `).join('')}
        </div>
        <button id="onboard-next" class="onboard-btn" ${!_data.role ? 'disabled' : ''}>
          Continue →
        </button>
      `

    case 'sport':
      return `
        <h1 class="onboard-title">What's your <span class="onboard-brand">primary sport</span>?</h1>
        <p class="onboard-subtitle">We'll tailor workouts and tracking to your sport.</p>
        <div class="onboard-sport-grid">
          ${SPORTS.map(s => `
            <button class="onboard-sport-btn ${_data.sport === s.val ? 'selected' : ''}"
                    data-val="${s.val}" aria-pressed="${_data.sport === s.val}">
              <span>${s.emoji}</span>
              <span>${s.label}</span>
            </button>
          `).join('')}
        </div>
        <button id="onboard-next" class="onboard-btn" ${!_data.sport ? 'disabled' : ''}>
          Continue →
        </button>
        <button id="onboard-back" class="onboard-back-btn">← Back</button>
      `

    case 'goals':
      return `
        <h1 class="onboard-title">What are your <span class="onboard-brand">goals</span>?</h1>
        <p class="onboard-subtitle">Choose up to 3 — we'll prioritize accordingly.</p>
        <div class="onboard-goals-grid">
          ${GOALS.map(g => `
            <button class="onboard-goal-btn ${(_data.goals ?? []).includes(g.val) ? 'selected' : ''}"
                    data-val="${g.val}" aria-pressed="${(_data.goals ?? []).includes(g.val)}">
              <span>${g.emoji}</span>
              <span>${g.label}</span>
            </button>
          `).join('')}
        </div>
        <p class="onboard-goal-count">${(_data.goals ?? []).length}/3 selected</p>
        <button id="onboard-next" class="onboard-btn" ${!(_data.goals?.length) ? 'disabled' : ''}>
          Continue →
        </button>
        <button id="onboard-back" class="onboard-back-btn">← Back</button>
      `

    case 'ready': {
      const roleName  = ROLES.find(r => r.val === _data.role)?.label  ?? _data.role  ?? '—'
      const sportName = SPORTS.find(s => s.val === _data.sport)?.label ?? _data.sport ?? '—'
      const goalNames = (_data.goals ?? [])
        .map(v => GOALS.find(g => g.val === v)?.label ?? v)
        .join(', ') || '—'
      return `
        <h1 class="onboard-title">You're all set,<br><span class="onboard-brand">let's go! 🎉</span></h1>
        <p class="onboard-subtitle">Start by logging your first readiness check-in to get your initial PIQ Score.</p>
        <div class="onboard-summary">
          <div class="onboard-summary-row"><span>Role</span><strong>${roleName}</strong></div>
          <div class="onboard-summary-row"><span>Sport</span><strong>${sportName}</strong></div>
          <div class="onboard-summary-row"><span>Goals</span><strong>${goalNames}</strong></div>
        </div>
        <div id="onboard-error" class="onboard-error" style="display:none"></div>
        <button id="onboard-finish" class="onboard-btn" style="margin-top:24px">Go to Dashboard →</button>
        <button id="onboard-back" class="onboard-back-btn">← Back</button>
      `
    }

    default:
      return ''
  }
}

function _bindStep(container) {

  // ── Role selection ────────────────────────────────────────
  container.querySelectorAll('.onboard-role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _data.role = btn.dataset.val
      container.querySelectorAll('.onboard-role-btn').forEach(b => {
        b.classList.toggle('selected', b.dataset.val === _data.role)
        b.setAttribute('aria-pressed', b.dataset.val === _data.role)
      })
      const next = container.querySelector('#onboard-next')
      if (next) next.disabled = false
    })
  })

  // ── Sport selection ───────────────────────────────────────
  container.querySelectorAll('.onboard-sport-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _data.sport = btn.dataset.val
      container.querySelectorAll('.onboard-sport-btn').forEach(b => {
        b.classList.toggle('selected', b.dataset.val === _data.sport)
        b.setAttribute('aria-pressed', b.dataset.val === _data.sport)
      })
      const next = container.querySelector('#onboard-next')
      if (next) next.disabled = false
    })
  })

  // ── Goal selection (multi, max 3) ─────────────────────────
  container.querySelectorAll('.onboard-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val
      if (!_data.goals) _data.goals = []
      const idx = _data.goals.indexOf(val)
      if (idx >= 0) {
        _data.goals.splice(idx, 1)
        btn.classList.remove('selected')
        btn.setAttribute('aria-pressed', 'false')
      } else if (_data.goals.length < 3) {
        _data.goals.push(val)
        btn.classList.add('selected')
        btn.setAttribute('aria-pressed', 'true')
      }
      const countEl = container.querySelector('.onboard-goal-count')
      if (countEl) countEl.textContent = `${_data.goals.length}/3 selected`
      const next = container.querySelector('#onboard-next')
      if (next) next.disabled = _data.goals.length === 0
    })
  })

  // ── Next ──────────────────────────────────────────────────
  container.querySelector('#onboard-next')?.addEventListener('click', () => {
    _step++
    _renderStep(container)
  })

  // ── Back ──────────────────────────────────────────────────
  container.querySelector('#onboard-back')?.addEventListener('click', () => {
    _step--
    _renderStep(container)
  })

  // ── Finish ────────────────────────────────────────────────
  container.querySelector('#onboard-finish')?.addEventListener('click', async () => {
    const btn      = container.querySelector('#onboard-finish')
    const errorEl  = container.querySelector('#onboard-error')
    const backBtn  = container.querySelector('#onboard-back')

    btn.disabled     = true
    btn.textContent  = 'Saving…'
    if (errorEl)  errorEl.style.display = 'none'
    if (backBtn)  backBtn.disabled = true

    try {
      // ── FIX: get email from current session and include in upsert ──
      const user = getUser()
      if (!user) throw new Error('Session expired — please sign in again.')

      const email = user.email
        ?? user.supabaseSession?.user?.email
        ?? ''

      if (!email) {
        throw new Error('Could not read email from session. Please sign in again.')
      }

      await updateProfile({
        email,                                  // ← NOT NULL constraint satisfied
        role:            _data.role     ?? 'solo_athlete',
        sport:           _data.sport    ?? 'other',
        goals:           _data.goals    ?? [],
        onboarded:       true,                  // maps to onboarding_done in supabase.js
      })

      // Navigate to dashboard on success
      navigate('/dashboard')

    } catch (err) {
      console.error('[PIQ] onboarding save error:', err)

      // Show user-facing error instead of silent navigate
      if (errorEl) {
        errorEl.textContent = err.message?.includes('Session expired')
          ? err.message
          : 'Failed to save your profile. Please try again.'
        errorEl.style.display = 'block'
      }

      btn.disabled    = false
      btn.textContent = 'Try Again'
      if (backBtn) backBtn.disabled = false
    }
  })
}

// ── HELPERS ───────────────────────────────────────────────────

function _capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
}
