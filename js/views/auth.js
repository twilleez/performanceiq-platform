// js/views/auth.js — PerformanceIQ
// Handles /login, /signup, /reset-password views.

import { signInWithEmail, signUpWithEmail, resetPassword } from '../core/supabase.js'
import { navigate } from '../core/router.js'

// ── RENDER ────────────────────────────────────────────────────

export function render(container, route) {
  const mode = route === '/signup' ? 'signup'
    : route === '/reset-password' ? 'reset'
    : 'login'

  container.innerHTML = _template(mode)
  _bind(container, mode)
}

function _template(mode) {
  const isLogin  = mode === 'login'
  const isSignup = mode === 'signup'
  const isReset  = mode === 'reset'

  return `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-logo">
          <span class="auth-logo-word">Performance<em>IQ</em></span>
        </div>

        <h1 class="auth-title">
          ${isLogin ? 'Welcome back' : isSignup ? 'Create your account' : 'Reset password'}
        </h1>
        <p class="auth-subtitle">
          ${isLogin ? 'Sign in to your PerformanceIQ account'
            : isSignup ? 'Start your performance journey'
            : 'Enter your email and we\'ll send a reset link'}
        </p>

        <div id="auth-error" class="auth-error" style="display:none"></div>
        <div id="auth-success" class="auth-success" style="display:none"></div>

        <form id="auth-form" class="auth-form" novalidate>
          ${isSignup ? `
            <div class="auth-field">
              <label class="auth-label">Your Name</label>
              <input id="auth-name" type="text" class="auth-input" placeholder="First Last" autocomplete="name" required />
            </div>
          ` : ''}

          <div class="auth-field">
            <label class="auth-label">Email</label>
            <input id="auth-email" type="email" class="auth-input" placeholder="you@example.com" autocomplete="email" required />
          </div>

          ${!isReset ? `
            <div class="auth-field">
              <label class="auth-label">Password</label>
              <div class="auth-pw-wrap">
                <input id="auth-password" type="password" class="auth-input" placeholder="${isSignup ? 'Min 8 characters' : '••••••••'}" autocomplete="${isSignup ? 'new-password' : 'current-password'}" required minlength="8" />
                <button type="button" id="auth-pw-toggle" class="auth-pw-toggle" aria-label="Toggle password visibility">👁</button>
              </div>
            </div>
          ` : ''}

          ${isSignup ? `
            <div class="auth-field">
              <label class="auth-label">I am a</label>
              <select id="auth-role" class="auth-input auth-select">
                <option value="solo">Solo Athlete</option>
                <option value="athlete">Team Athlete</option>
                <option value="coach">Coach</option>
                <option value="parent">Parent</option>
              </select>
            </div>
          ` : ''}

          <button type="submit" id="auth-submit" class="auth-btn">
            ${isLogin ? 'Sign In' : isSignup ? 'Create Account' : 'Send Reset Link'}
          </button>
        </form>

        <div class="auth-footer">
          ${isLogin ? `
            <a class="auth-link" data-route="/reset-password">Forgot password?</a>
            <span class="auth-sep">·</span>
            <a class="auth-link" data-route="/signup">Create account</a>
          ` : isSignup ? `
            <a class="auth-link" data-route="/login">Already have an account? Sign in</a>
          ` : `
            <a class="auth-link" data-route="/login">Back to sign in</a>
          `}
        </div>
      </div>
    </div>
  `
}

// ── BIND ──────────────────────────────────────────────────────

function _bind(container, mode) {
  const form     = container.querySelector('#auth-form')
  const errorEl  = container.querySelector('#auth-error')
  const successEl= container.querySelector('#auth-success')
  const submitBtn= container.querySelector('#auth-submit')
  const pwToggle = container.querySelector('#auth-pw-toggle')
  const pwInput  = container.querySelector('#auth-password')

  // Password toggle
  pwToggle?.addEventListener('click', () => {
    const isHidden = pwInput.type === 'password'
    pwInput.type = isHidden ? 'text' : 'password'
    pwToggle.textContent = isHidden ? '🙈' : '👁'
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    _clearMessages(errorEl, successEl)

    const email    = container.querySelector('#auth-email')?.value.trim()
    const password = container.querySelector('#auth-password')?.value
    const name     = container.querySelector('#auth-name')?.value.trim()
    const role     = container.querySelector('#auth-role')?.value ?? 'solo'

    if (!email) { _showError(errorEl, 'Please enter your email.'); return }
    if (mode !== 'reset' && !password) { _showError(errorEl, 'Please enter your password.'); return }
    if (mode === 'signup' && password?.length < 8) { _showError(errorEl, 'Password must be at least 8 characters.'); return }

    submitBtn.disabled = true
    submitBtn.textContent = 'Please wait…'

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
        navigate('/dashboard')
      } else if (mode === 'signup') {
        await signUpWithEmail(email, password, { display_name: name || email, role })
        _showSuccess(successEl, 'Account created! Check your email to confirm, then sign in.')
        setTimeout(() => navigate('/login'), 3000)
      } else if (mode === 'reset') {
        await resetPassword(email)
        _showSuccess(successEl, 'Reset link sent! Check your inbox.')
      }
    } catch (err) {
      _showError(errorEl, _friendlyError(err.message))
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = mode === 'login' ? 'Sign In'
        : mode === 'signup' ? 'Create Account' : 'Send Reset Link'
    }
  })
}

function _showError(el, msg)   { el.textContent = msg; el.style.display = 'block' }
function _showSuccess(el, msg) { el.textContent = msg; el.style.display = 'block' }
function _clearMessages(...els){ els.forEach(el => { el.textContent = ''; el.style.display = 'none' }) }

function _friendlyError(msg) {
  if (msg.includes('Invalid login')) return 'Incorrect email or password.'
  if (msg.includes('Email not confirmed')) return 'Please confirm your email first.'
  if (msg.includes('already registered')) return 'An account with this email already exists.'
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment.'
  return msg
}
