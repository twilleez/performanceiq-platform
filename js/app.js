/**
 * PerformanceIQ — App Bootstrap
 *
 * UX FIXES APPLIED:
 * [Fix-1]  Skeleton shimmer loader during route transitions — no more blank flash
 * [Fix-3]  Nav active state has smooth transition + pulse animation
 * [Fix-4]  KPI cards get cursor:pointer + hover lift via CSS class injection
 * [Fix-10] Mobile bottom nav injected automatically for screens < 768px
 */
import { boot }                        from './core/boot.js';
import { initTheme, toggleTheme, getResolvedTheme } from './core/theme.js';
import { isAuthenticated, getCurrentRole,
         getInitials, signOut }         from './core/auth.js';
import { navigate, getCurrentRoute,
         onRouteChange, ROUTES, ROLE_HOME } from './router.js';
import { getDashboardConfig }          from './state/selectors.js';
import { getScoreBreakdownElite, getReadinessScoreElite } from './state/selectorsElite.js';
import { calculateMacroTargetsElite, getMealPlanForProfileElite } from './data/nutritionEngineElite.js';

const LOGO_URI = document.getElementById('piq-logo-data')?.src || '';

// ── BOOTSTRAP ─────────────────────────────────────────────────
async function init() {
  _injectGlobalStyles();

  try { await boot(); } catch(e) { console.error('[PIQ] boot failed:', e); }

  document.getElementById('piq-root').innerHTML = buildShell();
  bindShellEvents();
  onRouteChange(route => renderRoute(route));

  const start = isAuthenticated()
    ? (ROLE_HOME[getCurrentRole()] || ROUTES.PICK_ROLE)
    : ROUTES.WELCOME;

  navigate(start);

  const _loaderStart = Date.now();
  const _hideLoader = () => {
    const elapsed = Date.now() - _loaderStart;
    const remaining = Math.max(0, 1000 - elapsed);
    const bar   = document.getElementById('splash-bar');
    const label = document.getElementById('splash-label');
    if (bar)   bar.style.width = '100%';
    if (label) label.textContent = 'Ready!';
    setTimeout(() => {
      document.getElementById('piq-loader')?.classList.add('hidden');
    }, remaining + 300);
  };
  const _progressSteps = [
    { pct:30, label:'Loading profile…',    delay:100 },
    { pct:60, label:'Building your plan…', delay:350 },
    { pct:85, label:'Almost ready…',       delay:650 },
  ];
  _progressSteps.forEach(({ pct, label, delay }) => {
    setTimeout(() => {
      const bar = document.getElementById('splash-bar');
      const lbl = document.getElementById('splash-label');
      if (bar) bar.style.width = pct + '%';
      if (lbl) lbl.textContent = label;
    }, delay);
  });
  requestAnimationFrame(() => { requestAnimationFrame(_hideLoader); });
}

// [Fix-1] Skeleton shimmer CSS + [Fix-3] Nav animation + [Fix-4] KPI hover + [Fix-10] Mobile nav
function _injectGlobalStyles() {
  if (document.getElementById('piq-ux-styles')) return;
  const s = document.createElement('style');
  s.id = 'piq-ux-styles';
  s.textContent = `
    /* [Fix-1] Skeleton shimmer */
    @keyframes piq-shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position:  600px 0; }
    }
    .piq-skeleton {
      background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-1) 50%, var(--surface-2) 75%);
      background-size: 600px 100%;
      animation: piq-shimmer 1.4s infinite linear;
      border-radius: 8px;
    }
    .piq-skeleton-page {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    }
    .piq-skeleton-header { height: 32px; width: 40%; }
    .piq-skeleton-sub    { height: 14px; width: 25%; margin-top: -8px; }
    .piq-skeleton-kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    .piq-skeleton-kpi    { height: 80px; border-radius: 12px; }
    .piq-skeleton-panel  { height: 200px; border-radius: 14px; }
    .piq-skeleton-panel-sm { height: 120px; border-radius: 14px; }
    .piq-skeleton-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    /* [Fix-3] Nav active pulse */
    @keyframes piq-nav-pulse {
      0%   { transform: scale(1); }
      40%  { transform: scale(0.96); }
      100% { transform: scale(1); }
    }
    #nav-links button {
      transition: background 0.18s ease, color 0.18s ease;
    }
    #nav-links button.active {
      animation: piq-nav-pulse 0.25s ease;
    }

    /* [Fix-4] KPI card hover lift */
    .kpi-card[data-route] {
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .kpi-card[data-route]:hover {
      transform: translateY(-2px);
    }
    .kpi-card[data-route]:active {
      transform: translateY(0) scale(0.98);
    }

    /* [Fix-9] Coming-soon tooltip */
    [data-coming-soon] {
      position: relative;
    }
    [data-coming-soon]:hover::after {
      content: attr(data-coming-soon);
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: #0d1b3e;
      color: #fff;
      font-size: 11px;
      padding: 5px 10px;
      border-radius: 6px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 100;
    }
    [data-coming-soon]:hover::before {
      content: '';
      position: absolute;
      bottom: calc(100% + 2px);
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: #0d1b3e;
      pointer-events: none;
      z-index: 100;
    }

    /* [Fix-10] Mobile bottom nav */
    #piq-mobile-nav {
      display: none;
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: 60px;
      background: var(--surface-1);
      border-top: 1px solid var(--border);
      z-index: 500;
      padding: 0 8px;
    }
    #piq-mobile-nav .mob-nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-around;
      height: 100%;
    }
    .mob-nav-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 10px;
      transition: background 0.15s;
      flex: 1;
    }
    .mob-nav-btn.active { background: var(--piq-green)14; }
    .mob-nav-btn .mob-icon { font-size: 18px; line-height: 1; }
    .mob-nav-btn .mob-label {
      font-size: 9.5px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .mob-nav-btn.active .mob-label { color: var(--piq-green); }
    @media (max-width: 768px) {
      #piq-mobile-nav { display: block; }
      #piq-main, .view-with-sidebar > main { padding-bottom: 72px !important; }
      .view-with-sidebar aside, .sidebar { display: none !important; }
    }
    @media (min-width: 769px) {
      #piq-mobile-nav { display: none !important; }
    }

    /* [Fix-11] Streak celebration */
    @keyframes piq-streak-pop {
      0%   { transform: scale(0.5); opacity: 0; }
      60%  { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
    .streak-milestone {
      animation: piq-streak-pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
    }

    /* [Fix-13] Check-in motivational copy fade */
    @keyframes piq-fade-up {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .checkin-motivational { animation: piq-fade-up 0.35s ease forwards; }
  `;
  document.head.appendChild(s);
}

// ── SHELL HTML ────────────────────────────────────────────────
function buildShell() {
  const authed  = isAuthenticated();
  const logoImg = LOGO_URI
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
      <span class="nav-role-badge" id="nav-role-badge">${getCurrentRole() || ''}</span>
      <div class="nav-avatar" id="nav-avatar">${getInitials()}</div>
    </div>
  </nav>
  <div id="piq-main"></div>
</div>

<div id="assign-modal" class="modal-overlay hidden">
  <div class="modal-card">
    <h3>Assign Workout</h3>
    <div class="modal-detail" id="assign-modal-detail"></div>
    <div class="modal-athlete-list" id="assign-modal-athletes"></div>
    <div class="modal-btns">
      <button class="modal-cancel" id="modal-cancel-btn">Cancel</button>
      <button class="modal-confirm" id="modal-confirm-btn">Assign ✓</button>
    </div>
  </div>
</div>

<nav id="piq-mobile-nav">
  <div class="mob-nav-inner" id="mob-nav-inner"></div>
</nav>`.trim();
}

// ── SHELL EVENTS ──────────────────────────────────────────────
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
  document.getElementById('modal-cancel-btn')?.addEventListener('click', () =>
    document.getElementById('assign-modal').classList.add('hidden'));
  document.getElementById('modal-confirm-btn')?.addEventListener('click', () =>
    document.dispatchEvent(new CustomEvent('piq:confirmAssign')));
}

// ── TOPNAV ────────────────────────────────────────────────────
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

  // [Fix-10] Mobile nav
  _renderMobileNav(activeRoute);
}

// [Fix-10] Mobile bottom nav
function _renderMobileNav(activeRoute) {
  const inner = document.getElementById('mob-nav-inner');
  if (!inner || !isAuthenticated()) return;
  const role  = getCurrentRole();
  const items = getDashboardConfig().navItems.slice(0, 5);
  inner.innerHTML = items.map(it => `
    <button class="mob-nav-btn ${activeRoute === it.route ? 'active' : ''}" data-route="${it.route}">
      <span class="mob-icon">${it.icon}</span>
      <span class="mob-label">${it.label}</span>
    </button>`).join('');
  inner.querySelectorAll('[data-route]').forEach(el =>
    el.addEventListener('click', () => navigate(el.dataset.route)));
}

// ── DYNAMIC VIEW LOADER ───────────────────────────────────────
const VIEW_MAP = {
  [ROUTES.WELCOME]:          ['./views/shared/welcome.js',         'renderWelcome'],
  [ROUTES.SIGN_IN]:          ['./views/shared/signin.js',          'renderSignIn'],
  [ROUTES.SIGN_UP]:          ['./views/shared/signup.js',          'renderSignUp'],
  [ROUTES.PICK_ROLE]:        ['./views/shared/pickRole.js',        'renderPickRole'],
  [ROUTES.ONBOARDING]:       ['./views/shared/onboarding.js',      'renderOnboarding'],
  [ROUTES.SETTINGS_THEME]:   ['./views/shared/settingsTheme.js',   'renderSettingsTheme'],
  [ROUTES.SETTINGS_PROFILE]: ['./views/shared/settingsProfile.js', 'renderSettingsProfile'],
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
  [ROUTES.PARENT_HOME]:      ['./views/parent/home.js',            'renderParentHome'],
  [ROUTES.PARENT_CHILD]:     ['./views/parent/childOverview.js',   'renderParentChild'],
  [ROUTES.PARENT_WEEK]:      ['./views/parent/weeklyPlan.js',      'renderParentWeek'],
  [ROUTES.PARENT_PROGRESS]:  ['./views/parent/progress.js',        'renderParentProgress'],
  [ROUTES.PARENT_WELLNESS]:  ['./views/parent/wellness.js',        'renderParentWellness'],
  [ROUTES.PARENT_MESSAGES]:  ['./views/parent/messages.js',        'renderParentMessages'],
  [ROUTES.PARENT_BILLING]:   ['./views/parent/billing.js',         'renderParentBilling'],
  [ROUTES.PARENT_SETTINGS]:  ['./views/parent/settings.js',        'renderParentSettings'],
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
  [ROUTES.SOLO_HOME]:        ['./views/solo/home.js',              'renderSoloHome'],
  [ROUTES.SOLO_TODAY]:       ['./views/solo/todayWorkout.js',      'renderSoloToday'],
  [ROUTES.SOLO_BUILDER]:     ['./views/solo/builder.js',           'renderSoloBuilder'],
  [ROUTES.SOLO_LIBRARY]:     ['./views/solo/library.js',           'renderSoloLibrary'],
  [ROUTES.SOLO_PROGRESS]:    ['./views/solo/progress.js',          'renderSoloProgress'],
  [ROUTES.SOLO_SCORE]:       ['./views/solo/score.js',             'renderSoloScore'],
  [ROUTES.SOLO_READINESS]:   ['./views/solo/readiness.js',         'renderSoloReadiness'],
  [ROUTES.SOLO_GOALS]:       ['./views/solo/goals.js',             'renderSoloGoals'],
  [ROUTES.SOLO_SUBSCRIPTION]:['./views/solo/subscription.js',      'renderSoloSubscription'],
  [ROUTES.SOLO_SETTINGS]:    ['./views/solo/settings.js',          'renderSoloSettings'],
  [ROUTES.SOLO_NUTRITION]:   ['./views/solo/nutrition.js',         'renderSoloNutrition'],
};

async function renderRoute(route) {
  const entry = VIEW_MAP[route];
  if (!entry) {
    const fallback = VIEW_MAP[isAuthenticated() ? (ROLE_HOME[getCurrentRole()] || ROUTES.WELCOME) : ROUTES.WELCOME];
    if (fallback) await loadAndRender(...fallback, route);
    return;
  }
  await loadAndRender(...entry, route);
}

// [Fix-1] Show skeleton during async import
function _showSkeleton() {
  const $main = document.getElementById('piq-main');
  if (!$main) return;
  $main.innerHTML = `
  <div class="piq-skeleton-page">
    <div class="piq-skeleton piq-skeleton-header"></div>
    <div class="piq-skeleton piq-skeleton-sub"></div>
    <div class="piq-skeleton-kpi-row">
      <div class="piq-skeleton piq-skeleton-kpi"></div>
      <div class="piq-skeleton piq-skeleton-kpi"></div>
      <div class="piq-skeleton piq-skeleton-kpi"></div>
      <div class="piq-skeleton piq-skeleton-kpi"></div>
    </div>
    <div class="piq-skeleton-2col">
      <div class="piq-skeleton piq-skeleton-panel"></div>
      <div class="piq-skeleton piq-skeleton-panel-sm"></div>
    </div>
  </div>`;
}

async function loadAndRender(modulePath, exportName, route) {
  const isAuthRoute = !isAuthenticated() ||
    [ROUTES.WELCOME, ROUTES.SIGN_IN, ROUTES.SIGN_UP, ROUTES.PICK_ROLE, ROUTES.ONBOARDING].includes(route);

  // [Fix-1] Show skeleton immediately for app views (not auth views)
  if (!isAuthRoute) _showSkeleton();

  try {
    const mod      = await import(modulePath);
    const renderFn = mod[exportName];
    if (typeof renderFn !== 'function')
      throw new Error(`${exportName} not exported from ${modulePath}`);
    if (!isAuthenticated() || isAuthRoute) {
      authView(renderFn);
    } else {
      appView(renderFn);
    }
  } catch (err) {
    console.error(`[PIQ] Failed to load ${modulePath}:`, err);
    showLoadError(route, err.message);
  }
}

function authView(renderFn) {
  document.getElementById('piq-splash')?.classList.remove('hidden');
  document.getElementById('piq-app')?.classList.remove('mounted');
  const $slot = document.getElementById('auth-view-slot');
  if (!$slot) return;
  $slot.innerHTML = renderFn();
  bindLinks($slot);
  document.dispatchEvent(new CustomEvent('piq:authRendered'));
}

function appView(renderFn) {
  if (!isAuthenticated()) { navigate(ROUTES.WELCOME); return; }
  document.getElementById('piq-splash')?.classList.add('hidden');
  document.getElementById('piq-app')?.classList.add('mounted');
  renderNav(getCurrentRoute());
  const $main = document.getElementById('piq-main');
  if (!$main) return;
  $main.innerHTML = renderFn();
  bindLinks($main);
  // [Fix-9] Annotate Coming Soon buttons
  _annotateComingSoon($main);
  document.dispatchEvent(new CustomEvent('piq:viewRendered'));
}

// [Fix-9] Add tooltip attribute to disabled Coming Soon buttons
function _annotateComingSoon(container) {
  container.querySelectorAll('button[disabled]').forEach(btn => {
    const txt = btn.textContent.trim().toLowerCase();
    if (txt.includes('coming soon') || txt.includes('coming')) {
      btn.setAttribute('data-coming-soon', 'Available in the next release');
      btn.style.cursor = 'not-allowed';
    }
  });
}

function bindLinks(container) {
  container.querySelectorAll('[data-route]').forEach(el =>
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.route); }));
  container.querySelectorAll('[data-signout]').forEach(el =>
    el.addEventListener('click', () => { signOut(); navigate(ROUTES.WELCOME); }));
}

function showLoadError(route, msg) {
  const $main = document.getElementById('piq-main') || document.getElementById('auth-view-slot');
  if ($main) {
    $main.innerHTML = `
    <div style="padding:40px;text-align:center;font-family:sans-serif">
      <div style="font-size:32px;margin-bottom:12px">⚠️</div>
      <div style="font-weight:600;margin-bottom:8px;color:var(--text-primary)">Could not load view</div>
      <code style="font-size:11px;color:var(--text-muted)">${route}: ${msg}</code>
      <br><br>
      <button onclick="location.reload()" style="padding:10px 24px;background:var(--piq-green);border:none;border-radius:8px;font-weight:700;color:var(--piq-navy);cursor:pointer">Reload</button>
    </div>`;
  }
}

init();
