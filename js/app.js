/**
 * PerformanceIQ — app.js
 * App bootstrap.  Single entry point.
 *
 * Auth contract
 * ─────────────
 * • core/auth.js  owns the session (localStorage).
 * • router.js     owns navigation + guards.
 * • Supabase       is DB/storage only — never called here.
 * • core/router.js is a shim for legacy view imports — never called here.
 */
import { boot }                         from './core/boot.js';
import { toggleTheme, getResolvedTheme } from './core/theme.js';
import { isAuthenticated, getCurrentRole,
         getInitials, signOut, signIn }  from './core/auth.js';
import { navigate, getCurrentRoute,
         onRouteChange, ROUTES,
         ROLE_HOME, suppressNextGuard }  from './router.js';
import { getDashboardConfig }           from './state/selectors.js';

function getThemeIcon() {
  return getResolvedTheme() === 'dark' ? '☀️' : '🌙';
}


const LOGO_URI = document.getElementById('piq-logo-data')?.src || '';

// ── BOOTSTRAP ─────────────────────────────────────────────────
async function init() {
  try {
    await boot();   // theme → auth → state → route guard → SW
  } catch (e) {
    console.error('[PIQ] boot failed:', e);
  }

  document.getElementById('piq-root').innerHTML = buildShell();
  bindShellEvents();
  onRouteChange(route => renderRoute(route));

  // Read initial URL hash for deep-link routing (e.g. /#/signup, /#/demo/coach)
  const hash = window.location.hash.replace(/^#\//, '');

  // Demo auto-login: /#/demo/<role> signs in the matching demo account
  if (!isAuthenticated() && hash.startsWith('demo/')) {
    const role = hash.split('/')[1];
    const DEMO_EMAIL = {
      coach:   'coach@demo.com',
      athlete: 'player@demo.com',
      player:  'player@demo.com',
      parent:  'parent@demo.com',
      admin:   'admin@demo.com',
      solo:    'solo@demo.com',
    };
    const demoEmail = DEMO_EMAIL[role];
    if (demoEmail) {
      const res = await signIn(demoEmail, 'demo');
      if (res.ok) {
        navigate(ROLE_HOME[res.session.role] || ROUTES.WELCOME);
        _animateSplash();
        return;
      }
    }
  }

  // Determine start route — guard in router.js will redirect if needed
  const start = isAuthenticated()
    ? (ROLE_HOME[getCurrentRole()] || ROUTES.PICK_ROLE)
    : (hash === 'signup' ? ROUTES.SIGN_UP : ROUTES.WELCOME);

  navigate(start);

  // Branded splash: progress bar → hide
  _animateSplash();
}

function _animateSplash() {
  const steps = [
    { pct: 30, label: 'Loading profile…',    delay: 100 },
    { pct: 60, label: 'Building your plan…', delay: 350 },
    { pct: 85, label: 'Almost ready…',       delay: 650 },
  ];
  steps.forEach(({ pct, label, delay }) => {
    setTimeout(() => {
      const bar = document.getElementById('splash-bar');
      const lbl = document.getElementById('splash-label');
      if (bar) bar.style.width = pct + '%';
      if (lbl) lbl.textContent = label;
    }, delay);
  });

  const start = Date.now();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const bar   = document.getElementById('splash-bar');
    const label = document.getElementById('splash-label');
    if (bar)   bar.style.width = '100%';
    if (label) label.textContent = 'Ready!';
    const remaining = Math.max(0, 1000 - (Date.now() - start));
    setTimeout(() => {
      document.getElementById('piq-loader')?.classList.add('hidden');
    }, remaining + 300);
  }));
}

// ── SHELL HTML ────────────────────────────────────────────────
function buildShell() {
  const authed = isAuthenticated();
  const logoImg = LOGO_URI
    ? `<img src="${LOGO_URI}" alt="PerformanceIQ">`
    : `<span style="font-family:'Oswald',sans-serif;font-size:22px;font-weight:700;
        color:var(--piq-green);letter-spacing:2px">PIQ</span>`;

  return `
<div id="piq-splash" class="${authed ? 'hidden' : ''}">
  <div class="splash-logo">
    ${logoImg}
    <div class="splash-tagline">Elite Training. Smart Results.</div>
  </div>
  <div id="auth-view-slot"></div>
</div>

<div id="piq-app" class="${authed ? 'mounted' : ''}">
  <header id="piq-topbar">
    <div class="topbar-inner">
      <div class="topbar-left">
        <button id="btn-menu" class="icon-btn" aria-label="Menu">☰</button>
        <span class="topbar-title" id="topbar-title">PerformanceIQ</span>
      </div>
      <div class="topbar-right">
        <button id="btn-theme" class="icon-btn" aria-label="Toggle theme">${getThemeIcon()}</button>
        <button id="btn-avatar" class="avatar-btn" aria-label="Profile">${getInitials()}</button>
      </div>
    </div>
  </header>

  <div id="piq-layout">
    <nav id="piq-sidebar" class="sidebar">
      <div class="sidebar-header">
        <span id="nav-role-badge" class="role-badge">${getCurrentRole() || ''}</span>
        <div id="nav-avatar" class="nav-avatar">${getInitials()}</div>
      </div>
      <ul id="sidebar-links" class="sidebar-links"></ul>
      <div class="sidebar-footer">
        <button class="sidebar-signout" data-signout>Sign Out</button>
      </div>
    </nav>

    <main id="piq-main" class="main-content" role="main"></main>
  </div>
</div>`;
}

// ── SHELL EVENT BINDINGS ──────────────────────────────────────
function bindShellEvents() {
  document.getElementById('btn-theme')?.addEventListener('click', () => {
    cycleTheme();
    const btn = document.getElementById('btn-theme');
    if (btn) btn.textContent = getThemeIcon();
  });

  document.getElementById('btn-avatar')?.addEventListener('click', () => {
    const role = getCurrentRole();
    if (role) navigate(`${role}/settings`);
  });

  document.getElementById('btn-menu')?.addEventListener('click', () => {
    document.getElementById('piq-sidebar')?.classList.toggle('open');
  });

  // Sign-out anywhere in the shell
  document.addEventListener('click', e => {
    if (e.target.closest('[data-signout]')) {
      signOut();
      navigate(ROUTES.WELCOME);
    }
  });
}

// ── SIDEBAR NAV ───────────────────────────────────────────────
const NAV_ITEMS = {
  coach:  [
    { route: ROUTES.COACH_HOME,      icon: '🏠', label: 'Dashboard' },
    { route: ROUTES.COACH_ROSTER,    icon: '👥', label: 'Roster'    },
    { route: ROUTES.COACH_PROGRAM,   icon: '📋', label: 'Program'   },
    { route: ROUTES.COACH_READINESS, icon: '💚', label: 'Readiness' },
    { route: ROUTES.COACH_ANALYTICS, icon: '📊', label: 'Analytics' },
    { route: ROUTES.COACH_CALENDAR,  icon: '📅', label: 'Calendar'  },
    { route: ROUTES.COACH_MESSAGES,  icon: '💬', label: 'Messages'  },
    { route: ROUTES.COACH_SETTINGS,  icon: '⚙️', label: 'Settings'  },
  ],
  player: [
    { route: ROUTES.PLAYER_HOME,      icon: '🏠', label: 'Dashboard'  },
    { route: ROUTES.PLAYER_TODAY,     icon: '⚡', label: 'Today'      },
    { route: ROUTES.PLAYER_LOG,       icon: '📝', label: 'Log'        },
    { route: ROUTES.PLAYER_READINESS, icon: '💚', label: 'Readiness'  },
    { route: ROUTES.PLAYER_PROGRESS,  icon: '📈', label: 'Progress'   },
    { route: ROUTES.PLAYER_SCORE,     icon: '🎯', label: 'PIQ Score'  },
    { route: ROUTES.PLAYER_NUTRITION, icon: '🥗', label: 'Nutrition'  },
    { route: ROUTES.PLAYER_SETTINGS,  icon: '⚙️', label: 'Settings'   },
  ],
  parent: [
    { route: ROUTES.PARENT_HOME,     icon: '🏠', label: 'Dashboard' },
    { route: ROUTES.PARENT_CHILD,    icon: '👤', label: 'Athlete'   },
    { route: ROUTES.PARENT_WEEK,     icon: '📅', label: 'This Week' },
    { route: ROUTES.PARENT_PROGRESS, icon: '📈', label: 'Progress'  },
    { route: ROUTES.PARENT_WELLNESS, icon: '💚', label: 'Wellness'  },
    { route: ROUTES.PARENT_MESSAGES, icon: '💬', label: 'Messages'  },
    { route: ROUTES.PARENT_BILLING,  icon: '💳', label: 'Billing'   },
    { route: ROUTES.PARENT_SETTINGS, icon: '⚙️', label: 'Settings'  },
  ],
  admin: [
    { route: ROUTES.ADMIN_HOME,       icon: '🏠', label: 'Dashboard'  },
    { route: ROUTES.ADMIN_ORG,        icon: '🏛️', label: 'Org'        },
    { route: ROUTES.ADMIN_TEAMS,      icon: '👥', label: 'Teams'      },
    { route: ROUTES.ADMIN_COACHES,    icon: '🎽', label: 'Coaches'    },
    { route: ROUTES.ADMIN_ATHLETES,   icon: '⚡', label: 'Athletes'   },
    { route: ROUTES.ADMIN_REPORTS,    icon: '📊', label: 'Reports'    },
    { route: ROUTES.ADMIN_COMPLIANCE, icon: '✅', label: 'Compliance' },
    { route: ROUTES.ADMIN_BILLING,    icon: '💳', label: 'Billing'    },
    { route: ROUTES.ADMIN_SETTINGS,   icon: '⚙️', label: 'Settings'   },
  ],
  solo: [
    { route: ROUTES.SOLO_HOME,      icon: '🏠', label: 'Dashboard' },
    { route: ROUTES.SOLO_TODAY,     icon: '⚡', label: 'Today'     },
    { route: ROUTES.SOLO_BUILDER,   icon: '🔨', label: 'Builder'   },
    { route: ROUTES.SOLO_READINESS, icon: '💚', label: 'Readiness' },
    { route: ROUTES.SOLO_PROGRESS,  icon: '📈', label: 'Progress'  },
    { route: ROUTES.SOLO_SCORE,     icon: '🎯', label: 'PIQ Score' },
    { route: ROUTES.SOLO_GOALS,     icon: '🏆', label: 'Goals'     },
    { route: ROUTES.SOLO_NUTRITION, icon: '🥗', label: 'Nutrition' },
    { route: ROUTES.SOLO_SETTINGS,  icon: '⚙️', label: 'Settings'  },
  ],
};

function renderNav(activeRoute) {
  const role   = getCurrentRole();
  const items  = NAV_ITEMS[role] || [];
  const $links = document.getElementById('sidebar-links');
  if (!$links) return;

  $links.innerHTML = items.map(it => `
    <li>
      <button class="sidebar-link ${activeRoute === it.route ? 'active' : ''}"
              data-route="${it.route}">
        <span class="link-icon">${it.icon}</span>
        <span>${it.label}</span>
      </button>
    </li>`
  ).join('');

  $links.querySelectorAll('[data-route]').forEach(el =>
    el.addEventListener('click', () => {
      document.getElementById('piq-sidebar')?.classList.remove('open');
      navigate(el.dataset.route);
    }));

  const badge  = document.getElementById('nav-role-badge');
  const avatar = document.getElementById('nav-avatar');
  if (badge)  badge.textContent  = role || '';
  if (avatar) avatar.textContent = getInitials();
}

// ── VIEW MAP ──────────────────────────────────────────────────
// [modulePath, exportName]
const VIEW_MAP = {
  // Auth / shared
  [ROUTES.WELCOME]:          ['./views/shared/welcome.js',         'renderWelcome'],
  [ROUTES.SIGN_IN]:          ['./views/shared/signin.js',          'renderSignIn'],
  [ROUTES.SIGN_UP]:          ['./views/shared/signup.js',          'renderSignUp'],
  [ROUTES.PICK_ROLE]:        ['./views/shared/pickRole.js',        'renderPickRole'],
  [ROUTES.ONBOARDING]:       ['./views/shared/onboarding.js',      'renderOnboarding'],
  [ROUTES.SETTINGS_THEME]:   ['./views/shared/settingsTheme.js',   'renderSettingsTheme'],
  [ROUTES.SETTINGS_PROFILE]: ['./views/shared/settingsProfile.js', 'renderSettingsProfile'],
  // Coach
  [ROUTES.COACH_HOME]:       ['./views/coach/home.js',             'renderCoachHome'],
  [ROUTES.COACH_TEAM]:       ['./views/coach/team.js',             'renderCoachTeam'],
  [ROUTES.COACH_ROSTER]:     ['./views/coach/roster.js',           'renderCoachRoster'],
  [ROUTES.COACH_PROGRAM]:    ['./views/coach/programBuilder.js',   'renderCoachProgram'],
  [ROUTES.COACH_SESSION]:    ['./views/coach/session.js',          'renderCoachSession'],
  [ROUTES.COACH_LIBRARY]:    ['./views/coach/library.js',          'renderCoachLibrary'],
  [ROUTES.COACH_READINESS]:  ['./views/coach/readiness.js',        'renderCoachReadiness'],
  [ROUTES.COACH_ANALYTICS]:  ['./views/coach/analytics.js',        'renderCoachAnalytics'],
  [ROUTES.COACH_MESSAGES]:   ['./views/coach/messages.js',         'renderCoachMessages'],
  [ROUTES.COACH_CALENDAR]:   ['./views/coach/calendar.js',         'renderCoachCalendar'],
  [ROUTES.COACH_REPORTS]:    ['./views/coach/reports.js',          'renderCoachReports'],
  [ROUTES.COACH_SETTINGS]:   ['./views/coach/settings.js',         'renderCoachSettings'],
  // Player
  [ROUTES.PLAYER_HOME]:      ['./views/player/home.js',            'renderPlayerHome'],
  [ROUTES.PLAYER_TODAY]:     ['./views/player/todayWorkout.js',    'renderPlayerToday'],
  [ROUTES.PLAYER_LOG]:       ['./views/player/logWorkout.js',      'renderPlayerLog'],
  [ROUTES.PLAYER_PROGRESS]:  ['./views/player/progress.js',        'renderPlayerProgress'],
  [ROUTES.PLAYER_SCORE]:     ['./views/player/score.js',           'renderPlayerScore'],
  [ROUTES.PLAYER_READINESS]: ['./views/player/readiness.js',       'renderPlayerReadiness'],
  [ROUTES.PLAYER_MESSAGES]:  ['./views/player/messages.js',        'renderPlayerMessages'],
  [ROUTES.PLAYER_CALENDAR]:  ['./views/player/calendar.js',        'renderPlayerCalendar'],
  [ROUTES.PLAYER_RECRUITING]:['./views/player/recruiting.js',      'renderPlayerRecruiting'],
  [ROUTES.PLAYER_SETTINGS]:  ['./views/player/settings.js',        'renderPlayerSettings'],
  [ROUTES.PLAYER_NUTRITION]: ['./views/player/nutrition.js',       'renderPlayerNutrition'],
  // Parent
  [ROUTES.PARENT_HOME]:      ['./views/parent/home.js',            'renderParentHome'],
  [ROUTES.PARENT_CHILD]:     ['./views/parent/childOverview.js',   'renderParentChild'],
  [ROUTES.PARENT_WEEK]:      ['./views/parent/weeklyPlan.js',      'renderParentWeek'],
  [ROUTES.PARENT_PROGRESS]:  ['./views/parent/progress.js',        'renderParentProgress'],
  [ROUTES.PARENT_WELLNESS]:  ['./views/parent/wellness.js',        'renderParentWellness'],
  [ROUTES.PARENT_MESSAGES]:  ['./views/parent/messages.js',        'renderParentMessages'],
  [ROUTES.PARENT_BILLING]:   ['./views/parent/billing.js',         'renderParentBilling'],
  [ROUTES.PARENT_SETTINGS]:  ['./views/parent/settings.js',        'renderParentSettings'],
  // Admin
  [ROUTES.ADMIN_HOME]:       ['./views/admin/home.js',             'renderAdminHome'],
  [ROUTES.ADMIN_ORG]:        ['./views/admin/org.js',              'renderAdminOrg'],
  [ROUTES.ADMIN_TEAMS]:      ['./views/admin/teams.js',            'renderAdminTeams'],
  [ROUTES.ADMIN_COACHES]:    ['./views/admin/coaches.js',          'renderAdminCoaches'],
  [ROUTES.ADMIN_ATHLETES]:   ['./views/admin/athletes.js',         'renderAdminAthletes'],
  [ROUTES.ADMIN_ADOPTION]:   ['./views/admin/adoption.js',         'renderAdminAdoption'],
  [ROUTES.ADMIN_REPORTS]:    ['./views/admin/reports.js',          'renderAdminReports'],
  [ROUTES.ADMIN_COMPLIANCE]: ['./views/admin/compliance.js',       'renderAdminCompliance'],
  [ROUTES.ADMIN_BILLING]:    ['./views/admin/billing.js',          'renderAdminBilling'],
  [ROUTES.ADMIN_SETTINGS]:   ['./views/admin/settings.js',         'renderAdminSettings'],
  // Solo
  [ROUTES.SOLO_HOME]:         ['./views/solo/home.js',             'renderSoloHome'],
  [ROUTES.SOLO_TODAY]:        ['./views/solo/todayWorkout.js',     'renderSoloToday'],
  [ROUTES.SOLO_BUILDER]:      ['./views/solo/builder.js',          'renderSoloBuilder'],
  [ROUTES.SOLO_LIBRARY]:      ['./views/solo/library.js',          'renderSoloLibrary'],
  [ROUTES.SOLO_PROGRESS]:     ['./views/solo/progress.js',         'renderSoloProgress'],
  [ROUTES.SOLO_SCORE]:        ['./views/solo/score.js',            'renderSoloScore'],
  [ROUTES.SOLO_READINESS]:    ['./views/solo/readiness.js',        'renderSoloReadiness'],
  [ROUTES.SOLO_GOALS]:        ['./views/solo/goals.js',            'renderSoloGoals'],
  [ROUTES.SOLO_SUBSCRIPTION]: ['./views/solo/subscription.js',    'renderSoloSubscription'],
  [ROUTES.SOLO_SETTINGS]:     ['./views/solo/settings.js',         'renderSoloSettings'],
  [ROUTES.SOLO_NUTRITION]:    ['./views/solo/nutrition.js',        'renderSoloNutrition'],
};

// ── ROUTE RENDERING ───────────────────────────────────────────
async function renderRoute(route) {
  const entry = VIEW_MAP[route];
  if (!entry) {
    // Unknown route → fall back to home
    const homeRoute = isAuthenticated()
      ? ROLE_HOME[getCurrentRole()]
      : ROUTES.WELCOME;
    const fallback = VIEW_MAP[homeRoute];
    if (fallback) await _loadAndRender(...fallback, homeRoute);
    return;
  }
  await _loadAndRender(...entry, route);
}

const AUTH_SCREEN_ROUTES = new Set([
  ROUTES.WELCOME, ROUTES.SIGN_IN, ROUTES.SIGN_UP,
  ROUTES.FORGOT_PASSWORD, ROUTES.PICK_ROLE, ROUTES.ONBOARDING,
]);

async function _loadAndRender(modulePath, exportName, route) {
  const isAuthScreen = !isAuthenticated() || AUTH_SCREEN_ROUTES.has(route);
  try {
    const mod      = await import(modulePath);
    const renderFn = mod[exportName];
    if (typeof renderFn !== 'function') {
      throw new Error(`${exportName} not exported from ${modulePath}`);
    }
    isAuthScreen ? _renderAuth(renderFn) : _renderApp(renderFn, route);
  } catch (err) {
    console.error(`[PIQ] Failed to load ${modulePath}:`, err);
    _renderError(route, err.message);
  }
}

function _renderAuth(renderFn) {
  document.getElementById('piq-splash')?.classList.remove('hidden');
  document.getElementById('piq-app')?.classList.remove('mounted');
  const $slot = document.getElementById('auth-view-slot');
  if (!$slot) return;
  $slot.innerHTML = renderFn();
  _bindLinks($slot);
  document.dispatchEvent(new CustomEvent('piq:authRendered'));
}

function _renderApp(renderFn, route) {
  if (!isAuthenticated()) { navigate(ROUTES.WELCOME); return; }
  document.getElementById('piq-splash')?.classList.add('hidden');
  document.getElementById('piq-app')?.classList.add('mounted');
  renderNav(route);
  const $main = document.getElementById('piq-main');
  if (!$main) return;
  $main.innerHTML = renderFn();
  _bindLinks($main);
  document.dispatchEvent(new CustomEvent('piq:viewRendered', { detail: { route } }));
}

function _bindLinks(container) {
  container.querySelectorAll('[data-route]').forEach(el =>
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.route);
    }));
  container.querySelectorAll('[data-signout]').forEach(el =>
    el.addEventListener('click', () => {
      signOut();
      navigate(ROUTES.WELCOME);
    }));
}

function _renderError(route, msg) {
  const $target = document.getElementById('piq-main')
    || document.getElementById('auth-view-slot');
  if (!$target) return;
  $target.innerHTML = `
    <div style="padding:40px;text-align:center">
      <div style="font-size:32px;margin-bottom:12px">⚠️</div>
      <div style="font-weight:600;margin-bottom:8px;color:var(--text-primary)">View failed to load</div>
      <code style="font-size:11px;color:var(--text-muted)">${route}: ${msg}</code><br><br>
      <button onclick="location.reload()"
        style="padding:10px 24px;background:var(--piq-green);border:none;
               border-radius:8px;font-weight:700;color:var(--piq-navy);cursor:pointer">
        Reload
      </button>
    </div>`;
}

// ── START ─────────────────────────────────────────────────────
init();
