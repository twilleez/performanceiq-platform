/**
 * PerformanceIQ — App Bootstrap
 * ─────────────────────────────────────────────────────────────
 * Uses dynamic imports so views load lazily and a single bad
 * module can't block the entire app from starting.
 *
 * FIXES APPLIED (friction audit)
 *  Fix 1 — piq:viewRendered now carries { detail: { route } }
 *           so every view's event listener guard (e.detail?.route)
 *           actually passes. This unblocks all form submissions.
 *  Fix 3 — Artificial 1-second splash delay is skipped for
 *           returning authenticated sessions. First-time / logged-
 *           out visits keep the branded splash experience.
 *  Fix 4 — (see nav-bar.js) appView already dispatches the event
 *           nav-bar needs; no changes required here beyond Fix 1.
 *
 * SECTIONS
 *  1.  Imports
 *  2.  Bootstrap
 *  3.  Shell HTML
 *  4.  Shell events
 *  5.  Top nav
 *  6.  Route guard + dynamic view loader
 *  7.  View renderers   ← Fix 1 lives here (appView)
 *  8.  Link binding & error display
 */

// ── 1. IMPORTS ────────────────────────────────────────────────

import { boot }                              from './core/boot.js';
import { getThemeIcon, cycleTheme }          from './core/theme.js';
import { isAuthenticated, getCurrentRole,
         getInitials, signOut }               from './core/auth.js';
import { navigate, getCurrentRoute,
         onRouteChange, isAuthRoute,
         ROUTES, ROLE_HOME }                  from './router.js';
import { getDashboardConfig }                from './state/selectors.js';
import { canAccess }                         from './core/permissions.js';
import { showToast }                         from './core/notifications.js';

// Logo URI comes from the DOM so the 200KB image doesn't block module parse
const LOGO_URI = document.getElementById('piq-logo-data')?.src || '';


// ── 2. BOOTSTRAP ─────────────────────────────────────────────

async function init() {
  // Boot is idempotent — safe to call even if something already ran it
  try {
    await boot();
  } catch (e) {
    console.error('[PIQ] boot failed:', e);
  }

  document.getElementById('piq-root').innerHTML = buildShell();
  bindShellEvents();
  onRouteChange(route => renderRoute(route));

  const start = isAuthenticated()
    ? (ROLE_HOME[getCurrentRole()] || ROUTES.PICK_ROLE)
    : ROUTES.WELCOME;

  navigate(start);

  // ── Fix 3: Splash delay ──────────────────────────────────────
  // Returning authenticated users already know the app — skip the
  // branded wait and show their dashboard immediately.
  // First-time / logged-out visits keep the full splash experience.
  const isReturningUser = isAuthenticated();

  if (isReturningUser) {
    // Hide loader on next paint — no artificial delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById('piq-loader')?.classList.add('hidden');
      });
    });
  } else {
    // First-time experience: animated progress bar then fade out
    const _loaderStart = Date.now();

    const _progressSteps = [
      { pct: 30, label: 'Loading profile…',    delay: 100 },
      { pct: 60, label: 'Building your plan…', delay: 350 },
      { pct: 85, label: 'Almost ready…',       delay: 650 },
    ];

    _progressSteps.forEach(({ pct, label, delay }) => {
      setTimeout(() => {
        const bar = document.getElementById('splash-bar');
        const lbl = document.getElementById('splash-label');
        if (bar) bar.style.width = pct + '%';
        if (lbl) lbl.textContent = label;
      }, delay);
    });

    const _hideLoader = () => {
      const elapsed    = Date.now() - _loaderStart;
      const remaining  = Math.max(0, 1000 - elapsed);
      const bar        = document.getElementById('splash-bar');
      const label      = document.getElementById('splash-label');
      if (bar)   bar.style.width = '100%';
      if (label) label.textContent = 'Ready!';
      setTimeout(() => {
        document.getElementById('piq-loader')?.classList.add('hidden');
      }, remaining + 300); // linger 300ms on "Ready!" state
    };

    requestAnimationFrame(() => { requestAnimationFrame(_hideLoader); });
  }
}


// ── 3. SHELL HTML ─────────────────────────────────────────────

function buildShell() {
  const authed   = isAuthenticated();
  const logoImg  = LOGO_URI
    ? `<img src="${LOGO_URI}" alt="PerformanceIQ">`
    : `<span style="font-family:'Oswald',sans-serif;font-size:22px;font-weight:700;color:var(--piq-green);letter-spacing:2px">PIQ</span>`;

  return `
<div id="piq-splash" class="${authed ? 'hidden' : ''}">
  <div class="splash-logo">
    ${logoImg}
    <div class="splash-tagline">Elite Training. Smart Results.</div>
  </div>
  <div id="auth-view-slot"></div>
</div>

<div id="piq-app" class="${authed ? 'mounted' : ''}">
  <nav id="piq-nav">
    <div class="nav-logo" id="nav-logo-btn">${logoImg}</div>
    <ul class="nav-links" id="nav-links"></ul>
    <div class="nav-right">
      <button class="nav-theme-btn" id="theme-toggle-btn" title="Toggle theme">${getThemeIcon()}</button>
      <button class="nav-install-btn hidden" id="pwa-install-btn" title="Install app"
        style="padding:5px 11px;border-radius:7px;border:1px solid rgba(34,201,85,.4);
               background:rgba(34,201,85,.08);color:var(--piq-green);font-size:11.5px;
               font-weight:700;cursor:pointer;letter-spacing:.03em">
        ⬇ Install
      </button>
      <span class="nav-role-badge" id="nav-role-badge">${getCurrentRole() || ''}</span>
      <div class="nav-avatar" id="nav-avatar">${getInitials()}</div>
    </div>
  </nav>
  <div id="piq-main"></div>
</div>

<div id="assign-modal" class="modal-overlay hidden">
  <div class="modal-card">
    <h3>Assign Workout</h3>
    <div class="modal-detail"   id="assign-modal-detail"></div>
    <div class="modal-athlete-list" id="assign-modal-athletes"></div>
    <div class="modal-btns">
      <button class="modal-cancel"  id="modal-cancel-btn">Cancel</button>
      <button class="modal-confirm" id="modal-confirm-btn">Assign ✓</button>
    </div>
  </div>
</div>`.trim();
}


// ── PWA INSTALL PROMPT ────────────────────────────────────────
// Capture the browser's install prompt and surface it as a nav button.
// The button only appears when the browser fires beforeinstallprompt
// (i.e. the app is installable but not yet installed).

let _installPrompt = null;

window.addEventListener('beforeinstallprompt', ev => {
  ev.preventDefault();
  _installPrompt = ev;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  _installPrompt = null;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.classList.add('hidden');
  showToast('✅ PIQ installed! Launch it from your home screen.', 'success');
});


// ── 4. SHELL EVENTS ───────────────────────────────────────────

function bindShellEvents() {
  document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
    cycleTheme();
    document.getElementById('theme-toggle-btn').textContent = getThemeIcon();
  });

  document.getElementById('nav-logo-btn')?.addEventListener('click', () => {
    if (isAuthenticated()) navigate(ROLE_HOME[getCurrentRole()] || ROUTES.WELCOME);
  });

  document.getElementById('nav-avatar')?.addEventListener('click', () => {
    if (isAuthenticated()) navigate(getCurrentRole() + '/settings');
  });

  // PWA install button — triggers deferred prompt
  document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
    if (!_installPrompt) return;
    _installPrompt.prompt();
    const { outcome } = await _installPrompt.userChoice;
    if (outcome === 'accepted') {
      _installPrompt = null;
      document.getElementById('pwa-install-btn')?.classList.add('hidden');
    }
  });

  document.getElementById('modal-cancel-btn')?.addEventListener('click', () =>
    document.getElementById('assign-modal')?.classList.add('hidden'));

  document.getElementById('modal-confirm-btn')?.addEventListener('click', () =>
    document.dispatchEvent(new CustomEvent('piq:confirmAssign')));
}


// ── 5. TOP NAV ────────────────────────────────────────────────

function renderNav(activeRoute) {
  const $links = document.getElementById('nav-links');
  if (!$links || !isAuthenticated()) return;

  const items = getDashboardConfig().navItems.slice(0, 6);
  $links.innerHTML = items.map(it =>
    `<li><button class="${activeRoute === it.route ? 'active' : ''}" data-route="${it.route}">
      <span>${it.icon}</span> ${it.label}
    </button></li>`
  ).join('');

  $links.querySelectorAll('[data-route]').forEach(el =>
    el.addEventListener('click', () => navigate(el.dataset.route)));

  document.getElementById('nav-role-badge').textContent = getCurrentRole() || '';
  document.getElementById('nav-avatar').textContent     = getInitials();
}


// ── 6. ROUTE GUARD + DYNAMIC VIEW LOADER ─────────────────────

// Maps route string → [module path, export name]
const VIEW_MAP = {
  // Auth / shared
  [ROUTES.WELCOME]:           ['./views/shared/welcome.js',         'renderWelcome'],
  [ROUTES.SIGN_IN]:           ['./views/shared/signin.js',          'renderSignIn'],
  [ROUTES.SIGN_UP]:           ['./views/shared/signup.js',          'renderSignUp'],
  [ROUTES.PICK_ROLE]:         ['./views/shared/pickRole.js',        'renderPickRole'],
  [ROUTES.ONBOARDING]:        ['./views/shared/onboarding.js',      'renderOnboarding'],
  [ROUTES.SETTINGS_THEME]:    ['./views/shared/settingsTheme.js',   'renderSettingsTheme'],
  [ROUTES.SETTINGS_PROFILE]:  ['./views/shared/settingsProfile.js', 'renderSettingsProfile'],

  // Coach
  [ROUTES.COACH_HOME]:        ['./views/coach/home.js',             'renderCoachHome'],
  [ROUTES.COACH_TEAM]:        ['./views/coach/team.js',             'renderCoachTeam'],
  [ROUTES.COACH_ROSTER]:      ['./views/coach/roster.js',           'renderCoachRoster'],
  [ROUTES.COACH_PROGRAM]:     ['./views/coach/programBuilder.js',   'renderCoachProgram'],
  [ROUTES.COACH_READINESS]:   ['./views/coach/readiness.js',        'renderCoachReadiness'],
  [ROUTES.COACH_ANALYTICS]:   ['./views/coach/analytics.js',        'renderCoachAnalytics'],
  [ROUTES.COACH_MESSAGES]:    ['./views/coach/messages.js',         'renderCoachMessages'],
  [ROUTES.COACH_CALENDAR]:    ['./views/coach/calendar.js',         'renderCoachCalendar'],
  [ROUTES.COACH_REPORTS]:     ['./views/coach/reports.js',          'renderCoachReports'],
  [ROUTES.COACH_SETTINGS]:    ['./views/coach/settings.js',         'renderCoachSettings'],
  [ROUTES.COACH_ATHLETE_DETAIL]:['./views/coach/athleteDetail.js',   'renderCoachAthleteDetail'],
  [ROUTES.COACH_LEADERBOARD]: ['./views/coach/leaderboard.js',       'renderCoachLeaderboard'],

  // Player
  [ROUTES.PLAYER_HOME]:       ['./views/player/home.js',            'renderPlayerHome'],
  [ROUTES.PLAYER_TODAY]:      ['./views/player/todayWorkout.js',    'renderPlayerToday'],
  [ROUTES.PLAYER_LOG]:        ['./views/player/logWorkout.js',      'renderPlayerLog'],
  [ROUTES.PLAYER_PROGRESS]:   ['./views/player/progress.js',        'renderPlayerProgress'],
  [ROUTES.PLAYER_SCORE]:      ['./views/player/score.js',           'renderPlayerScore'],
  [ROUTES.PLAYER_READINESS]:  ['./views/player/readiness.js',       'renderPlayerReadiness'],
  [ROUTES.PLAYER_MESSAGES]:   ['./views/player/messages.js',        'renderPlayerMessages'],
  [ROUTES.PLAYER_CALENDAR]:   ['./views/player/calendar.js',        'renderPlayerCalendar'],
  [ROUTES.PLAYER_RECRUITING]: ['./views/player/recruiting.js',      'renderPlayerRecruiting'],
  [ROUTES.PLAYER_SETTINGS]:   ['./views/player/settings.js',        'renderPlayerSettings'],
  [ROUTES.PLAYER_NUTRITION]:  ['./views/player/nutrition.js',       'renderPlayerNutrition'],
  [ROUTES.PLAYER_MINDSET]:    ['./views/player/mindset.js',         'renderPlayerMindset'],

  // Parent
  [ROUTES.PARENT_HOME]:       ['./views/parent/home.js',            'renderParentHome'],
  [ROUTES.PARENT_CHILD]:      ['./views/parent/childOverview.js',   'renderParentChild'],
  [ROUTES.PARENT_WEEK]:       ['./views/parent/weeklyPlan.js',      'renderParentWeek'],
  [ROUTES.PARENT_PROGRESS]:   ['./views/parent/progress.js',        'renderParentProgress'],
  [ROUTES.PARENT_WELLNESS]:   ['./views/parent/wellness.js',        'renderParentWellness'],
  [ROUTES.PARENT_MESSAGES]:   ['./views/parent/messages.js',        'renderParentMessages'],
  [ROUTES.PARENT_BILLING]:    ['./views/parent/billing.js',         'renderParentBilling'],
  [ROUTES.PARENT_SETTINGS]:   ['./views/parent/settings.js',        'renderParentSettings'],

  // Admin
  [ROUTES.ADMIN_HOME]:        ['./views/admin/home.js',             'renderAdminHome'],
  [ROUTES.ADMIN_ORG]:         ['./views/admin/org.js',              'renderAdminOrg'],
  [ROUTES.ADMIN_TEAMS]:       ['./views/admin/teams.js',            'renderAdminTeams'],
  [ROUTES.ADMIN_COACHES]:     ['./views/admin/coaches.js',          'renderAdminCoaches'],
  [ROUTES.ADMIN_ATHLETES]:    ['./views/admin/athletes.js',         'renderAdminAthletes'],
  [ROUTES.ADMIN_ADOPTION]:    ['./views/admin/adoption.js',         'renderAdminAdoption'],
  [ROUTES.ADMIN_REPORTS]:     ['./views/admin/reports.js',          'renderAdminReports'],
  [ROUTES.ADMIN_COMPLIANCE]:  ['./views/admin/compliance.js',       'renderAdminCompliance'],
  [ROUTES.ADMIN_BILLING]:     ['./views/admin/billing.js',          'renderAdminBilling'],
  [ROUTES.ADMIN_SETTINGS]:    ['./views/admin/settings.js',         'renderAdminSettings'],

  // Solo
  [ROUTES.SOLO_HOME]:         ['./views/solo/home.js',              'renderSoloHome'],
  [ROUTES.SOLO_TODAY]:        ['./views/solo/todayWorkout.js',      'renderSoloToday'],
  [ROUTES.SOLO_BUILDER]:      ['./views/solo/builder.js',           'renderSoloBuilder'],
  [ROUTES.SOLO_LIBRARY]:      ['./views/solo/library.js',           'renderSoloLibrary'],
  [ROUTES.SOLO_PROGRESS]:     ['./views/solo/progress.js',          'renderSoloProgress'],
  [ROUTES.SOLO_SCORE]:        ['./views/solo/score.js',             'renderSoloScore'],
  [ROUTES.SOLO_READINESS]:    ['./views/solo/readiness.js',         'renderSoloReadiness'],
  [ROUTES.SOLO_GOALS]:        ['./views/solo/goals.js',             'renderSoloGoals'],
  [ROUTES.SOLO_SUBSCRIPTION]: ['./views/solo/subscription.js',      'renderSoloSubscription'],
  [ROUTES.SOLO_SETTINGS]:     ['./views/solo/settings.js',          'renderSoloSettings'],
  [ROUTES.SOLO_NUTRITION]:    ['./views/solo/nutrition.js',         'renderSoloNutrition'],
  [ROUTES.SOLO_MINDSET]:      ['./views/solo/mindset.js',           'renderSoloMindset'],
};

async function renderRoute(route) {
  // ── Route guard ──────────────────────────────────────────────
  // Only runs for authenticated, non-auth routes.
  // Blocks cross-role navigation (e.g. a coach typing parent/child).
  if (isAuthenticated() && !isAuthRoute(route) && !canAccess(route, getCurrentRole())) {
    showToast('⛔ That area is restricted to your role.', 'warn', 3500);
    navigate(ROLE_HOME[getCurrentRole()] || ROUTES.WELCOME);
    return;
  }

  // ── View resolution ──────────────────────────────────────────
  const entry = VIEW_MAP[route];
  if (!entry) {
    // Unknown route → fall back to role home
    const fallback = VIEW_MAP[
      isAuthenticated() ? ROLE_HOME[getCurrentRole()] : ROUTES.WELCOME
    ];
    if (fallback) await loadAndRender(...fallback, route);
    return;
  }

  await loadAndRender(...entry, route);
}

async function loadAndRender(modulePath, exportName, route) {
  const isAuth = !isAuthenticated() ||
    [ROUTES.WELCOME, ROUTES.SIGN_IN, ROUTES.SIGN_UP,
     ROUTES.PICK_ROLE, ROUTES.ONBOARDING].includes(route);

  try {
    const mod      = await import(modulePath);
    const renderFn = mod[exportName];
    if (typeof renderFn !== 'function') {
      throw new Error(`${exportName} not exported from ${modulePath}`);
    }

    if (!isAuthenticated() || isAuth) {
      authView(renderFn);
    } else {
      appView(renderFn, route);
    }
  } catch (err) {
    console.error(`[PIQ] Failed to load ${modulePath}:`, err);
    showLoadError(route, err.message);
  }
}


// ── 7. VIEW RENDERERS ─────────────────────────────────────────

function authView(renderFn) {
  document.getElementById('piq-splash')?.classList.remove('hidden');
  document.getElementById('piq-app')?.classList.remove('mounted');
  const $slot = document.getElementById('auth-view-slot');
  if (!$slot) return;
  $slot.innerHTML = renderFn();
  bindLinks($slot);
  document.dispatchEvent(new CustomEvent('piq:authRendered'));
}

/**
 * Render an authenticated app view.
 *
 * Fix 1: piq:viewRendered now carries { detail: { route } } so that
 * every view module's guard (e.detail?.route !== 'player/log') resolves
 * correctly and form/button wiring actually fires.
 *
 * @param {Function} renderFn  - The view's render function
 * @param {string}   route     - The current route string
 */
function appView(renderFn, route) {
  if (!isAuthenticated()) { navigate(ROUTES.WELCOME); return; }

  document.getElementById('piq-splash')?.classList.add('hidden');
  document.getElementById('piq-app')?.classList.add('mounted');

  renderNav(route);

  const $main = document.getElementById('piq-main');
  if (!$main) return;
  $main.innerHTML = renderFn();
  bindLinks($main);

  // ── Fix 1 ── include route in detail so view listeners can guard on it
  document.dispatchEvent(new CustomEvent('piq:viewRendered', {
    detail: { route },
  }));
}


// ── 8. LINK BINDING & ERROR DISPLAY ──────────────────────────

function bindLinks(container) {
  container.querySelectorAll('[data-route]').forEach(el =>
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.route); }));
  container.querySelectorAll('[data-signout]').forEach(el =>
    el.addEventListener('click', () => { signOut(); navigate(ROUTES.WELCOME); }));
}

function showLoadError(route, msg) {
  const $main = document.getElementById('piq-main')
             || document.getElementById('auth-view-slot');
  if ($main) {
    $main.innerHTML = `
    <div style="padding:40px;text-align:center;font-family:sans-serif">
      <div style="font-size:32px;margin-bottom:12px">⚠️</div>
      <div style="font-weight:600;margin-bottom:8px;color:var(--text-primary)">Could not load view</div>
      <code style="font-size:11px;color:var(--text-muted)">${route}: ${msg}</code>
      <br><br>
      <button onclick="location.reload()"
        style="padding:10px 24px;background:var(--piq-green);border:none;border-radius:8px;
               font-weight:700;color:var(--piq-navy);cursor:pointer">
        Reload
      </button>
    </div>`;
  }
}

init();
