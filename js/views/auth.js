// js/views/auth.js — PerformanceIQ
// Handles /login, /signup, /reset-password routes.
// FIX: On signup, immediately inserts a profile row with email + id,
//      so the profiles.email NOT NULL constraint is satisfied BEFORE
//      onboarding tries to update the row.

import {
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  createInitialProfile,
} from '../core/supabase.js'
import { navigate } from '../core/router.js'

// ── RENDER ────────────────────────────────────────────────────

export function render(container, path) {
  const mode = path === '/signup'         ? 'signup'
             : path === '/reset-password' ? 'reset'
             : 'login'

  container.innerHTML = `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-logo">
          <span class="auth-logo-text">Performance<span class="auth-logo-iq">IQ</span></span>
        </div>
        ${_formFor(mode)}
      </div>
    </div>
  `

  _bindForm(container, mode)
}

// ── TEMPLATES ─────────────────────────────────────────────────

function _formFor(mode) {
  if (mode === 'login') return `
    <h2 class="auth-heading">Welcome back</h2>
    <div class="auth-field">
      <label for="auth-email">Email</label>
      <input id="auth-email" type="email" autocomplete="email"
             placeholder="you@example.com" />
    </div>
    <div class="auth-field">
      <label for="auth-pass">Password</label>
      <input id="auth-pass" type="password" autocomplete="current-password"
             placeholder="••••••••" />
    </div>
    <div id="auth-error" class="auth-error" style="display:none"></div>
    <button id="auth-submit" class="auth-btn">Sign In</button>
    <div class="auth-footer">
      <a class="auth-link" data-route="/signup">Create account</a>
      <span class="auth-sep">·</span>
      <a class="auth-link" data-route="/reset-password">Forgot password?</a>
    </div>
  `

  if (mode === 'signup') return `
    <h2 class="auth-heading">Create your account</h2>
    <div class="auth-field">
      <label for="auth-name">Your name</label>
      <input id="auth-name" type="text" autocomplete="name"
             placeholder="e.g. Alex Johnson" />
    </div>
    <div class="auth-field">
      <label for="auth-email">Email</label>
      <input id="auth-email" type="email" autocomplete="email"
             placeholder="you@example.com" />
    </div>
    <div class="auth-field">
      <label for="auth-pass">Password <span class="auth-hint">(min 8 characters)</span></label>
      <input id="auth-pass" type="password" autocomplete="new-password"
             placeholder="••••••••" />
    </div>
    <div id="auth-error" class="auth-error" style="display:none"></div>
    <button id="auth-submit" class="auth-btn">Create Account</button>
    <div class="auth-footer">
      <span>Already have an account?</span>
      <a class="auth-link" data-route="/login">Sign in</a>
    </div>
  `

  if (mode === 'reset') return `
    <h2 class="auth-heading">Reset your password</h2>
    <p class="auth-desc">Enter your email and we'll send a reset link.</p>
    <div class="auth-field">
      <label for="auth-email">Email</label>
      <input id="auth-email" type="email" autocomplete="email"
             placeholder="you@example.com" />
    </div>
    <div id="auth-error" class="auth-error" style="display:none"></div>
    <div id="auth-success" class="auth-success" style="display:none"></div>
    <button id="auth-submit" class="auth-btn">Send Reset Link</button>
    <div class="auth-footer">
      <a class="auth-link" data-route="/login">← Back to sign in</a>
    </div>
  `

  return ''
}

// ── BINDING ────────────────────────────────────────────────────

function _bindForm(container, mode) {
  const submit   = container.querySelector('#auth-submit')
  const errorEl  = container.querySelector('#auth-error')
  const successEl = container.querySelector('#auth-success')

  function _showError(msg) {
    if (!errorEl) return
    errorEl.textContent = msg
    errorEl.style.display = 'block'
  }
  function _hideError() {
    if (errorEl) errorEl.style.display = 'none'
  }

  // Allow pressing Enter to submit
  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit?.click()
    })
  })

  submit?.addEventListener('click', async () => {
    _hideError()

    const email  = container.querySelector('#auth-email')?.value.trim()
    const pass   = container.querySelector('#auth-pass')?.value
    const name   = container.querySelector('#auth-name')?.value.trim()

    // ── Validation ─────────────────────────────────────────
    if (!email || !email.includes('@')) {
      _showError('Please enter a valid email address.')
      return
    }
    if (mode !== 'reset' && (!pass || pass.length < 8)) {
      _showError('Password must be at least 8 characters.')
      return
    }
    if (mode === 'signup' && !name) {
      _showError('Please enter your name.')
      return
    }

    submit.disabled    = true
    submit.textContent = mode === 'login'  ? 'Signing in…'
                       : mode === 'signup' ? 'Creating account…'
                       : 'Sending link…'

    try {

      // ── LOGIN ─────────────────────────────────────────────
      if (mode === 'login') {
        await signInWithEmail(email, pass)
        // onAuthChange in router will redirect to /dashboard or /onboarding
        return
      }

      // ── SIGNUP ────────────────────────────────────────────
      if (mode === 'signup') {
        const { user } = await signUpWithEmail(email, pass, { name })

        // FIX: Create the profile row immediately with email + id.
        // This prevents the NOT NULL constraint violation when onboarding
        // later calls updateProfile() — the row already exists with email set.
        if (user) {
          await createInitialProfile(user.id, email, { name })
        }

        navigate('/onboarding')
        return
      }

      // ── RESET ─────────────────────────────────────────────
      if (mode === 'reset') {
        await resetPassword(email)
        if (successEl) {
          successEl.textContent = `Reset link sent to ${email}. Check your inbox.`
          successEl.style.display = 'block'
        }
        submit.textContent = 'Sent!'
        // Don't re-enable — avoid double-sends
        return
      }

    } catch (err) {
      console.error('[PIQ] auth error:', err)
      _showError(_friendlyError(err.message))
      submit.disabled    = false
      submit.textContent = mode === 'login'  ? 'Sign In'
                         : mode === 'signup' ? 'Create Account'
                         : 'Send Reset Link'
    }
  })
}

// ── HELPERS ────────────────────────────────────────────────────

function _friendlyError(msg = '') {
  if (msg.includes('Invalid login credentials'))   return 'Incorrect email or password.'
  if (msg.includes('Email not confirmed'))         return 'Please check your email and confirm your account first.'
  if (msg.includes('User already registered'))     return 'An account with this email already exists. Try signing in.'
  if (msg.includes('Password should be'))          return 'Password must be at least 8 characters.'
  if (msg.includes('rate limit'))                  return 'Too many attempts. Please wait a moment and try again.'
  if (msg.includes('network'))                     return 'Network error. Check your connection and try again.'
  return msg || 'Something went wrong. Please try again.'
}
