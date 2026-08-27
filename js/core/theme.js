// js/core/theme.js — PerformanceIQ
// Light / Dark / System theme manager.
// Branded dark mode is the first-run default so authenticated screens match
// the navy/green public auth experience. Users can still choose light/system.

const STORAGE_KEY = 'piq_theme'   // 'light' | 'dark' | 'system'
const ROOT        = document.documentElement
const DEFAULT_THEME = 'dark'

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME
  _apply(saved)

  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (getTheme() === 'system') _apply('system')
    })
}

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME
}

export function getResolvedTheme() {
  return ROOT.getAttribute('data-theme') ?? DEFAULT_THEME
}

export function setTheme(mode) {
  if (!['light', 'dark', 'system'].includes(mode)) return
  localStorage.setItem(STORAGE_KEY, mode)
  _apply(mode)
  _notifyListeners(mode)
}

export function toggleTheme() {
  const current = getResolvedTheme()
  setTheme(current === 'dark' ? 'light' : 'dark')
}

const _listeners = new Set()
export function onThemeChange(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

function _apply(mode) {
  const resolved = mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode

  ROOT.setAttribute('data-theme', resolved)

  const metaTheme = document.querySelector('meta[name="theme-color"]')
  if (metaTheme) {
    metaTheme.content = resolved === 'dark' ? '#010D14' : '#0D1B40'
  }

  document.querySelectorAll('[data-theme-icon]').forEach(el => {
    el.textContent = resolved === 'dark' ? '☀️' : '🌙'
    el.title       = resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  })
}

function _notifyListeners(mode) {
  _listeners.forEach(fn => fn(mode, getResolvedTheme()))
}
