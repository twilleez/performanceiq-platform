// js/core/theme.js — PerformanceIQ
// Light / Dark / System theme manager.
// Call initTheme() once at boot. Everything else is automatic.

const STORAGE_KEY = 'piq_theme'   // 'light' | 'dark' | 'system'
const ROOT        = document.documentElement

// ── PUBLIC API ────────────────────────────────────────────────

/**
 * Call once from boot.js before the app renders.
 * Applies saved preference immediately — no flash.
 */
export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) ?? 'system'
  _apply(saved)

  // Track system preference changes when mode is 'system'
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (getTheme() === 'system') _apply('system')
    })
}

/** Get the currently saved preference: 'light' | 'dark' | 'system' */
export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) ?? 'system'
}

/** Get the resolved theme actually being displayed: 'light' | 'dark' */
export function getResolvedTheme() {
  return ROOT.getAttribute('data-theme') ?? 'light'
}

/** Set theme and persist */
export function setTheme(mode) {
  if (!['light', 'dark', 'system'].includes(mode)) return
  localStorage.setItem(STORAGE_KEY, mode)
  _apply(mode)
  _notifyListeners(mode)
}

/** Toggle between light and dark (ignores system) */
export function toggleTheme() {
  const current = getResolvedTheme()
  setTheme(current === 'dark' ? 'light' : 'dark')
}

/** Subscribe to theme changes. Returns unsubscribe fn. */
const _listeners = new Set()
export function onThemeChange(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

// ── INTERNAL ──────────────────────────────────────────────────

function _apply(mode) {
  const resolved = mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode

  ROOT.setAttribute('data-theme', resolved)

  // Update meta theme-color to match nav
  const metaTheme = document.querySelector('meta[name="theme-color"]')
  if (metaTheme) {
    metaTheme.content = resolved === 'dark' ? '#010D14' : '#0D1B40'
  }

  // Update any theme toggle icons already in the DOM
  document.querySelectorAll('[data-theme-icon]').forEach(el => {
    el.textContent = resolved === 'dark' ? '☀️' : '🌙'
    el.title       = resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  })
}

function _notifyListeners(mode) {
  _listeners.forEach(fn => fn(mode, getResolvedTheme()))
}
