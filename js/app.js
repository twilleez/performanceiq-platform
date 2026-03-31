// js/app.js — PerformanceIQ
// Central app controller. Wires router → view loading → shell rendering.

import { boot } from './core/boot.js'
import { onRouteChange } from './core/router.js'
import { getProfile, onAuthChange, signOut } from './core/supabase.js'
import { getUnreadCount, subscribeToNotifications } from './services/notificationService.js'
import { toggleTheme, getResolvedTheme, onThemeChange } from './core/theme.js'

// ── VIEW REGISTRY ─────────────────────────────────────────────
// Lazy-load each view module only when first navigated to.
const VIEW_MODULES = {
  auth:        () => import('./views/auth.js'),
  onboarding:  () => import('./views/onboarding.js'),
  dashboard:   () => import('./views/dashboard.js'),
  today:       () => import('./views/today.js'),
  builder:     () => import('./views/builder.js'),
  library:     () => import('./views/library.js'),
  progress:    () => import('./views/progress.js'),
  'piq-score': () => import('./views/piq-score.js'),
  readiness:   () => import('./views/readiness.js'),
  nutrition:   () => import('./views/nutrition.js'),
  goals:       () => import('./views/goals.js'),
  settings:    () => import('./views/settings.js'),
  team:        () => import('./views/team.js'),
  roster:      () => import('./views/roster.js'),
  assign:      () => import('./views/assign.js'),
  athlete:     () => import('./views/team.js').then(m => ({ render: m.athlete.render })),
}

let _notifUnsub = null

// ── INIT ──────────────────────────────────────────────────────
async function init() {
  // Build the persistent shell HTML
  _renderShell()

  // Wire router → view loader
  onRouteChange(async (path, route) => {
    await _loadView(route.view, path)
  })

  // Wire auth → shell updates
  onAuthChange(async (session, profile) => {
    _updateShellForAuth(session, profile)
    if (session && profile) {
      await _initNotifications(profile)
    }
  })

  // Theme toggle
  document.getElementById('topnav-theme')?.addEventListener('click', () => {
    toggleTheme()
  })

  // Keep theme icon in sync if theme changes externally
  onThemeChange((mode, resolved) => {
    const btn = document.getElementById('topnav-theme')
    if (btn) {
      btn.textContent = resolved === 'dark' ? '☀️' : '🌙'
      btn.title       = resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    }
  })

  // Set correct icon on load
  const themeBtn = document.getElementById('topnav-theme')
  if (themeBtn) {
    const resolved = getResolvedTheme()
    themeBtn.textContent = resolved === 'dark' ? '☀️' : '🌙'
    themeBtn.title       = resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  }

  // Boot (auth + router init + SW)
  await boot()
}

// ── SHELL ──────────────────────────────────────────────────────
function _renderShell() {
  document.getElementById('piq-shell').innerHTML = `
    <!-- TOP NAV -->
    <nav id="piq-topnav">
      <a class="topnav-logo" data-route="/dashboard">
        <span class="topnav-wordmark">Performance<em>IQ</em></span>
      </a>
      <div class="topnav-links" id="topnav-links">
        <button class="topnav-link" data-route="/dashboard">Dashboard</button>
        <button class="topnav-link" data-route="/today">Today</button>
        <button class="topnav-link" data-route="/builder">Builder</button>
        <button class="topnav-link" data-route="/library">Library</button>
        <button class="topnav-link" data-route="/progress">Progress</button>
        <button class="topnav-link" data-route="/piq-score">PIQ Score</button>
      </div>
      <div class="topnav-right">
        <button class="topnav-icon-btn" id="topnav-theme" data-theme-icon title="Toggle theme">🌙</button>
        <button class="topnav-icon-btn" id="topnav-notify" title="Notifications">🔔</button>
        <span class="topnav-role-badge" id="topnav-role">SOLO</span>
        <div class="topnav-avatar" id="topnav-avatar">?</div>
      </div>
    </nav>

    <!-- SIDEBAR -->
    <aside id="piq-sidebar">
      <span class="sidebar-section-label">Main</span>
      <button class="sidebar-item" data-route="/dashboard">
        <span class="sidebar-icon">🏠</span> Dashboard
      </button>
      <button class="sidebar-item" data-route="/today">
        <span class="sidebar-icon">⚡</span> Today
      </button>
      <button class="sidebar-item" data-route="/builder">
        <span class="sidebar-icon">🔨</span> Builder
      </button>
      <button class="sidebar-item" data-route="/library">
        <span class="sidebar-icon">📚</span> Library
      </button>

      <span class="sidebar-section-label">Tracking</span>
      <button class="sidebar-item" data-route="/progress">
        <span class="sidebar-icon">📈</span> Progress
      </button>
      <button class="sidebar-item" data-route="/piq-score">
        <span class="sidebar-icon">⭐</span> PIQ Score
      </button>
      <button class="sidebar-item" data-route="/readiness">
        <span class="sidebar-icon">💚</span> Readiness
      </button>
      <button class="sidebar-item" data-route="/nutrition">
        <span class="sidebar-icon">🥗</span> Nutrition
      </button>
      <button class="sidebar-item" data-route="/goals">
        <span class="sidebar-icon">🎯</span> Goals
      </button>

      <span class="sidebar-section-label" id="sidebar-team-label" style="display:none">Team</span>
      <button class="sidebar-item" id="sidebar-team-btn" data-route="/team" style="display:none">
        <span class="sidebar-icon">👥</span> My Team
      </button>
      <button class="sidebar-item" id="sidebar-roster-btn" data-route="/roster" style="display:none">
        <span class="sidebar-icon">📋</span> Roster
      </button>

      <span class="sidebar-section-label" style="margin-top:auto"></span>
      <button class="sidebar-item" data-route="/settings">
        <span class="sidebar-icon">⚙️</span> Settings
      </button>
      <button class="sidebar-item" id="sidebar-signout">
        <span class="sidebar-icon">🚪</span> Sign Out
      </button>
    </aside>

    <!-- MAIN CONTENT -->
    <main id="piq-main">
      <div id="piq-view-container" class="piq-view"></div>
    </main>

    <!-- MOBILE BOTTOM NAV -->
    <nav id="piq-bottom-nav">
      <button class="piq-nav-item" data-route="/dashboard">
        <span class="piq-nav-icon">🏠</span>
        <span class="piq-nav-label">Home</span>
      </button>
      <button class="piq-nav-item" data-route="/today">
        <span class="piq-nav-icon">⚡</span>
        <span class="piq-nav-label">Today</span>
      </button>
      <button class="piq-nav-item" data-route="/builder">
        <span class="piq-nav-icon">🔨</span>
        <span class="piq-nav-label">Builder</span>
      </button>
      <button class="piq-nav-item" data-route="/progress">
        <span class="piq-nav-icon">📈</span>
        <span class="piq-nav-label">Progress</span>
      </button>
      <button class="piq-nav-item" data-route="/piq-score">
        <span class="piq-nav-icon">⭐</span>
        <span class="piq-nav-label">PIQ</span>
      </button>
    </nav>

    <!-- OFFLINE BAR -->
    <div class="piq-offline-bar">📴 You're offline — data saved locally</div>
  `

  // Sign out
  document.getElementById('sidebar-signout')?.addEventListener('click', async () => {
    await signOut()
  })
}

// ── SHELL AUTH UPDATE ─────────────────────────────────────────
function _updateShellForAuth(session, profile) {
  const isCoach  = profile?.role === 'coach' || profile?.role === 'admin'
  const isParent = profile?.role === 'parent'

  // Role badge
  const roleBadge = document.getElementById('topnav-role')
  if (roleBadge) roleBadge.textContent = (profile?.role ?? 'guest').toUpperCase()

  // Avatar initials
  const avatar = document.getElementById('topnav-avatar')
  if (avatar && profile?.display_name) {
    const initials = profile.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
    avatar.textContent = initials
  }

  // Coach-only nav items
  document.getElementById('sidebar-team-label').style.display  = (isCoach || isParent) ? '' : 'none'
  document.getElementById('sidebar-team-btn').style.display    = isCoach ? '' : 'none'
  document.getElementById('sidebar-roster-btn').style.display  = isCoach ? '' : 'none'
}

// ── VIEW LOADER ───────────────────────────────────────────────
let _loadingView = null

async function _loadView(viewName, path) {
  if (_loadingView === viewName) return
  _loadingView = viewName

  const container = document.getElementById('piq-view-container')
  if (!container) return

  // Show skeleton while loading
  container.innerHTML = `
    <div class="piq-loading-view">
      <div class="piq-skeleton" style="height:32px;width:220px;border-radius:8px"></div>
      <div class="piq-skeleton" style="height:16px;width:160px;border-radius:6px;margin-top:8px"></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:24px">
        ${Array(4).fill('<div class="piq-skeleton" style="height:100px;border-radius:12px"></div>').join('')}
      </div>
    </div>
  `

  try {
    const loader = VIEW_MODULES[viewName]
    if (!loader) throw new Error(`Unknown view: ${viewName}`)

    const mod = await loader()
    if (_loadingView !== viewName) return // Navigated away while loading

    container.innerHTML = ''
    mod.render(container, path)
  } catch (err) {
    console.error('[PIQ] View load error:', err)
    container.innerHTML = `
      <div class="piq-empty" style="margin-top:60px">
        <div class="piq-empty__icon">⚠️</div>
        <div class="piq-empty__title">Failed to load</div>
        <div class="piq-empty__body">${err.message}</div>
        <button class="piq-empty__cta" onclick="location.reload()">Reload</button>
      </div>
    `
  } finally {
    _loadingView = null
  }
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
async function _initNotifications(profile) {
  // Unsubscribe old listener
  if (_notifUnsub) { _notifUnsub(); _notifUnsub = null }

  // Update badge count
  const count = await getUnreadCount()
  _updateNotifBadge(count)

  // Real-time listener
  _notifUnsub = subscribeToNotifications((newNotif) => {
    _updateNotifBadge('+')
  })

  // Click to go to notifications (settings page for now)
  document.getElementById('topnav-notify')?.addEventListener('click', () => {
    import('./core/router.js').then(m => m.navigate('/settings'))
  })
}

function _updateNotifBadge(count) {
  const btn = document.getElementById('topnav-notify')
  if (!btn) return
  const existing = btn.querySelector('.notif-badge')
  if (count > 0 || count === '+') {
    if (!existing) {
      const badge = document.createElement('span')
      badge.className = 'notif-badge'
      badge.style.cssText = `
        position:absolute;top:4px;right:4px;width:8px;height:8px;
        background:#EF4444;border-radius:50%;border:2px solid var(--nav-bg);
      `
      btn.style.position = 'relative'
      btn.appendChild(badge)
    }
  } else {
    existing?.remove()
  }
}

// ── SKELETON STYLES (injected once) ──────────────────────────
const skeletonStyle = document.createElement('style')
skeletonStyle.textContent = `
  .piq-skeleton {
    background: linear-gradient(90deg, #E8E9F0 25%, #F0F2F8 50%, #E8E9F0 75%);
    background-size: 200% 100%;
    animation: piq-shimmer 1.3s linear infinite;
  }
  @keyframes piq-shimmer {
    0%   { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }
  .piq-loading-view { padding: 28px 0; }
`
document.head.appendChild(skeletonStyle)

// ── START ──────────────────────────────────────────────────────
init()
