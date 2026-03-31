// js/views/onboarding.js — PerformanceIQ
// 4-step onboarding wizard. Fires once after signup, sets profile.onboarded = true.

import { updateProfile, getProfile } from '../core/supabase.js'
import { navigate } from '../core/router.js'

const STEPS = ['role', 'sport', 'goals', 'ready']

let _step = 0
let _data = {}

export function render(container) {
  _step = 0
  _data = {}
  const profile = getProfile()
  if (profile?.role) _data.role = profile.role
  _renderStep(container)
}

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
    <div class="onboard-progress">
      ${STEPS.map((_, i) => `
        <div class="onboard-pip ${i < _step ? 'done' : ''} ${i === _step ? 'active' : ''}"></div>
      `).join('')}
    </div>
    <p class="onboard-step-label">Step ${_step + 1} of ${STEPS.length}</p>
  `
}

function _stepContent() {
  switch (STEPS[_step]) {
    case 'role': return `
      <h2 class="onboard-title">How will you use <em>PerformanceIQ</em>?</h2>
      <p class="onboard-sub">This customizes your experience and dashboard.</p>
      <div class="onboard-grid">
        ${[
          { val: 'solo',    icon: '🏃', label: 'Solo Athlete',  desc: 'Track my own training' },
          { val: 'athlete', icon: '🏅', label: 'Team Athlete',  desc: 'Join a coached team' },
          { val: 'coach',   icon: '📋', label: 'Coach',         desc: 'Manage a roster' },
          { val: 'parent',  icon: '👪', label: 'Parent',        desc: 'Monitor my athlete' },
        ].map(r => `
          <button class="onboard-role-btn ${_data.role === r.val ? 'selected' : ''}" data-val="${r.val}">
            <span class="role-icon">${r.icon}</span>
            <span class="role-label">${r.label}</span>
            <span class="role-desc">${r.desc}</span>
          </button>
        `).join('')}
      </div>
      <button id="onboard-next" class="onboard-btn" ${_data.role ? '' : 'disabled'}>Continue →</button>
    `

    case 'sport': return `
      <h2 class="onboard-title">Your primary sport?</h2>
      <p class="onboard-sub">Used to tailor exercises, templates, and recommendations.</p>
      <div class="onboard-sport-grid">
        ${[
          { val: 'basketball', icon: '🏀', label: 'Basketball' },
          { val: 'football',   icon: '🏈', label: 'Football' },
          { val: 'soccer',     icon: '⚽', label: 'Soccer' },
          { val: 'baseball',   icon: '⚾', label: 'Baseball' },
          { val: 'volleyball', icon: '🏐', label: 'Volleyball' },
          { val: 'track',      icon: '🏃', label: 'Track & Field' },
          { val: 'other',      icon: '🎯', label: 'Other' },
        ].map(s => `
          <button class="onboard-sport-btn ${_data.sport === s.val ? 'selected' : ''}" data-val="${s.val}">
            <span>${s.icon}</span>
            <span>${s.label}</span>
          </button>
        `).join('')}
      </div>
      <button id="onboard-next" class="onboard-btn" ${_data.sport ? '' : 'disabled'}>Continue →</button>
      <button class="onboard-back-btn" id="onboard-back">← Back</button>
    `

    case 'goals': return `
      <h2 class="onboard-title">What are your goals?</h2>
      <p class="onboard-sub">Choose up to 3. These shape your workout recommendations and PIQ score weighting.</p>
      <div class="onboard-goals-grid">
        ${[
          { val: 'strength',          icon: '💪', label: 'Strength' },
          { val: 'speed',             icon: '⚡', label: 'Speed' },
          { val: 'endurance',         icon: '🫀', label: 'Endurance' },
          { val: 'flexibility',       icon: '🤸', label: 'Flexibility' },
          { val: 'conditioning',      icon: '🔥', label: 'Conditioning' },
          { val: 'recovery',          icon: '💚', label: 'Recovery' },
          { val: 'vertical_jump',     icon: '⬆️', label: 'Vertical Jump' },
          { val: 'injury_prevention', icon: '🛡', label: 'Injury Prevention' },
          { val: 'nutrition',         icon: '🥗', label: 'Nutrition' },
          { val: 'recruiting',        icon: '🎓', label: 'Recruiting' },
        ].map(g => `
          <button class="onboard-goal-btn ${(_data.goals ?? []).includes(g.val) ? 'selected' : ''}" data-val="${g.val}">
            <span>${g.icon}</span>
            <span>${g.label}</span>
          </button>
        `).join('')}
      </div>
      <p class="onboard-goal-count">${(_data.goals ?? []).length}/3 selected</p>
      <button id="onboard-next" class="onboard-btn" ${(_data.goals ?? []).length ? '' : 'disabled'}>Continue →</button>
      <button class="onboard-back-btn" id="onboard-back">← Back</button>
    `

    case 'ready': return `
      <div class="onboard-ready">
        <div class="onboard-ready-icon">🚀</div>
        <h2 class="onboard-title">You're all set!</h2>
        <p class="onboard-sub">
          Your PerformanceIQ dashboard is ready. Start by logging your first
          readiness check-in to get your initial score.
        </p>
        <div class="onboard-summary">
          <div class="onboard-summary-row">
            <span>Role</span>
            <strong>${_capitalize(_data.role)}</strong>
          </div>
          <div class="onboard-summary-row">
            <span>Sport</span>
            <strong>${_capitalize(_data.sport)}</strong>
          </div>
          <div class="onboard-summary-row">
            <span>Goals</span>
            <strong>${(_data.goals ?? []).map(_capitalize).join(', ')}</strong>
          </div>
        </div>
        <button id="onboard-finish" class="onboard-btn" style="margin-top:24px">Go to Dashboard →</button>
      </div>
    `
  }
}

function _bindStep(container) {
  const step = STEPS[_step]

  // Role selection
  container.querySelectorAll('.onboard-role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.onboard-role-btn').forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      _data.role = btn.dataset.val
      container.querySelector('#onboard-next').disabled = false
    })
  })

  // Sport selection
  container.querySelectorAll('.onboard-sport-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.onboard-sport-btn').forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      _data.sport = btn.dataset.val
      container.querySelector('#onboard-next').disabled = false
    })
  })

  // Goal selection (multi, max 3)
  container.querySelectorAll('.onboard-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val
      if (!_data.goals) _data.goals = []
      const idx = _data.goals.indexOf(val)
      if (idx >= 0) {
        _data.goals.splice(idx, 1)
        btn.classList.remove('selected')
      } else if (_data.goals.length < 3) {
        _data.goals.push(val)
        btn.classList.add('selected')
      }
      const count = container.querySelector('.onboard-goal-count')
      if (count) count.textContent = `${_data.goals.length}/3 selected`
      const next = container.querySelector('#onboard-next')
      if (next) next.disabled = _data.goals.length === 0
    })
  })

  // Next
  container.querySelector('#onboard-next')?.addEventListener('click', () => {
    _step++
    _renderStep(container)
  })

  // Back
  container.querySelector('#onboard-back')?.addEventListener('click', () => {
    _step--
    _renderStep(container)
  })

  // Finish
  container.querySelector('#onboard-finish')?.addEventListener('click', async () => {
    const btn = container.querySelector('#onboard-finish')
    btn.disabled = true
    btn.textContent = 'Saving…'
    try {
      await updateProfile({
        display_name:   _data.name ?? _data.role,  // maps to DB 'name'
        role:           _data.role,
        sport:          _data.sport,
        goals:          _data.goals ?? [],          // maps to primary_goal + secondary_goals
        onboarded:      true                        // maps to DB 'onboarding_done'
      })
      navigate('/dashboard')
    } catch (err) {
      console.error('[PIQ] onboarding save failed:', err)
      btn.disabled = false
      btn.textContent = 'Try Again'
    }
  })
}

function _capitalize(str) {
  if (!str) return ''
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
