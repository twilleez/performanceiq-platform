// js/core/router.js — PerformanceIQ
// Hash-based SPA router with auth guards, role guards, and preloading.

import { isAuthed, getProfile, onAuthChange } from './supabase.js'
import { flushOfflineQueue } from '../services/workoutService.js'

// ── ROUTE TABLE ───────────────────────────────────────────────
const ROUTES = {
  '/login':          { view: 'auth',        public: true },
  '/signup':         { view: 'auth',        public: true },
  '/reset-password': { view: 'auth',        public: true },
  '/onboarding':     { view: 'onboarding',  public: false },
  '/dashboard':      { view: 'dashboard',   public: false },
  '/today':          { view: 'today',       public: false },
  '/builder':        { view: 'builder',     public: false },
  '/library':        { view: 'library',     public: false },
  '/progress':       { view: 'progress',    public: false },
  '/piq-score':      { view: 'piq-score',   public: false },
  '/readiness':      { view: 'readiness',   public: false },
  '/nutrition':      { view: 'nutrition',   public: false },
  '/goals':          { view: 'goals',       public: false },
  '/settings':       { view: 'settings',    public: false },
  // Coach-only
  '/team':           { view: 'team',        public: false, roles: ['coach','admin'] },
  '/roster':         { view: 'roster',      public: false, roles: ['coach','admin'] },
  '/assign':         { view: 'assign',      public: false, roles: ['coach','admin'] },
  // Parent-only
  '/athlete':        { view: 'athlete',     public: false, roles: ['parent','admin'] },
}

const DEFAULT_AUTHED   = '/dashboard'
const DEFAULT_UNAUTHED = '/login'

let _currentRoute = null
let _listeners    = new Set()

// ── PUBLIC API ────────────────────────────────────────────────

export function getCurrentRoute() { return _currentRoute }

export function navigate(path, { replace = false } = {}) {
  const url = '#' + path
  if (replace) {
    history.replaceState(null, '', url)
  } else {
    history.pushState(null, '', url)
  }
  _resolve(path)
}

export function onRouteChange(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

// ── ROUTER INIT ───────────────────────────────────────────────

export function initRouter() {
  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    _resolve(_getHashPath())
  })

  // Handle auth state changes — re-resolve current route
  onAuthChange(() => {
    _resolve(_currentRoute ?? _getHashPath())
  })

  // Handle clicks on [data-route] elements (delegated)
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-route]')
    if (!el) return
    e.preventDefault()
    navigate(el.dataset.route)
  })

  // Resolve initial route
  _resolve(_getHashPath() || DEFAULT_AUTHED)
}

// ── RESOLUTION ────────────────────────────────────────────────

async function _resolve(path) {
  // Normalize path
  if (!path || path === '/') path = isAuthed() ? DEFAULT_AUTHED : DEFAULT_UNAUTHED

  const route = ROUTES[path]

  if (!route) {
    // 404 → send to default
    navigate(isAuthed() ? DEFAULT_AUTHED : DEFAULT_UNAUTHED, { replace: true })
    return
  }

  // Auth guard
  if (!route.public && !isAuthed()) {
    navigate(DEFAULT_UNAUTHED, { replace: true })
    return
  }

  // Redirect authed users away from auth pages
  if (route.public && isAuthed() && path !== '/reset-password') {
    const profile = getProfile()
    if (profile && !profile.onboarded) {
      navigate('/onboarding', { replace: true })
      return
    }
    navigate(DEFAULT_AUTHED, { replace: true })
    return
  }

  // Onboarding guard — force new users through onboarding first
  if (isAuthed() && path !== '/onboarding') {
    const profile = getProfile()
    if (profile && !profile.onboarded) {
      navigate('/onboarding', { replace: true })
      return
    }
  }

  // Role guard
  if (route.roles && isAuthed()) {
    const profile = getProfile()
    if (profile && !route.roles.includes(profile.role)) {
      navigate(DEFAULT_AUTHED, { replace: true })
      return
    }
  }

  _currentRoute = path

  // Flush any offline ops when coming online
  if (isAuthed() && navigator.onLine) {
    flushOfflineQueue().catch(console.warn)
  }

  // Notify listeners (views render here)
  _listeners.forEach(fn => fn(path, route))

  // Update active nav state
  _updateNavActive(path)
}

function _getHashPath() {
  return window.location.hash.replace('#', '') || null
}

function _updateNavActive(path) {
  // Sidebar items
  document.querySelectorAll('.sidebar-item[data-route], .topnav-link[data-route]').forEach(el => {
    el.classList.toggle('active', el.dataset.route === path)
  })
  // Bottom nav
  document.querySelectorAll('.piq-nav-item[data-route]').forEach(el => {
    el.classList.toggle('active', el.dataset.route === path ||
      (el.dataset.route === '/dashboard' && path === DEFAULT_AUTHED))
  })
}
