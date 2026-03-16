/**
 * PerformanceIQ — App Bootstrap v2
 * Main render loop with proper event dispatch for view binding.
 */
import { boot }                        from './core/boot.js';
import { getThemeIcon, cycleTheme }    from './core/theme.js';
import { isAuthenticated, getCurrentRole,
         getInitials, signOut }         from './core/auth.js';
import { navigate, getCurrentRoute,
         onRouteChange, ROUTES, ROLE_HOME } from './router.js';
import { getDashboardConfig }          from './state/selectors.js';
import { LOGO_URI }                    from './data/logo.js';

// Shared views
import { renderWelcome }        from './views/shared/welcome.js';
import { renderSignIn }         from './views/shared/signin.js';
import { renderSignUp }         from './views/shared/signup.js';
import { renderPickRole }       from './views/shared/pickRole.js';
import { renderOnboarding }     from './views/shared/onboarding.js';
import { renderSettingsTheme }  from './views/shared/settingsTheme.js';
import { renderSettingsProfile} from './views/shared/settingsProfile.js';

// Coach views
import { renderCoachHome }      from './views/coach/home.js';
import { renderCoachTeam }      from './views/coach/team.js';
import { renderCoachRoster }    from './views/coach/roster.js';
import { renderCoachProgram }   from './views/coach/programBuilder.js';
import { renderCoachReadiness } from './views/coach/readiness.js';
import { renderCoachAnalytics } from './views/coach/analytics.js';
import { renderCoachMessages }  from './views/coach/messages.js';
import { renderCoachCalendar }  from './views/coach/calendar.js';
import { renderCoachSettings }  from './views/coach/settings.js';

// Player views
import { renderPlayerHome }     from './views/player/home.js';
import { renderPlayerToday }    from './views/player/todayWorkout.js';
import { renderPlayerLog }      from './views/player/logWorkout.js';
import { renderPlayerProgress } from './views/player/progress.js';
import { renderPlayerScore }    from './views/player/score.js';
import { renderPlayerReadiness} from './views/player/readiness.js';
import { renderPlayerMessages } from './views/player/messages.js';
import { renderPlayerSettings } from './views/player/settings.js';

// Parent views
import { renderParentHome }     from './views/parent/home.js';
import { renderParentChild }    from './views/parent/childOverview.js';
import { renderParentWeek }     from './views/parent/weeklyPlan.js';
import { renderParentProgress } from './views/parent/progress.js';
import { renderParentMessages } from './views/parent/messages.js';
import { renderParentBilling }  from './views/parent/billing.js';
import { renderParentSettings } from './views/parent/settings.js';

// Admin views
import { renderAdminHome }      from './views/admin/home.js';
import { renderAdminSettings }  from './views/admin/settings.js';

// Solo views
import { renderSoloHome }       from './views/solo/home.js';
import { renderSoloToday }      from './views/solo/todayWorkout.js';
import { renderSoloBuilder }    from './views/solo/builder.js';
import { renderSoloLibrary }    from './views/solo/library.js';
import { renderSoloProgress }   from './views/solo/progress.js';
import { renderSoloScore }      from './views/solo/score.js';
import { renderSoloReadiness }  from './views/solo/readiness.js';
import { renderSoloGoals }      from './views/solo/goals.js';
import { renderSoloSettings }   from './views/solo/settings.js';

// ── BOOTSTRAP ────────────────────────────────────────────────
async function init() {
  await boot();

  document.getElementById('piq-root').innerHTML = buildShell();
  bindShellEvents();
  onRouteChange(route => renderRoute(route));

  const start = isAuthenticated()
    ? (ROLE_HOME[getCurrentRole()] || ROUTES.PICK_ROLE)
    : ROUTES.WELCOME;
  navigate(start);

  requestAnimationFrame(() => {
    document.getElementById('piq-loader')?.classList.add('hidden');
  });
}

// ── SHELL STRUCTURE ───────────────────────────────────────────
function buildShell() {
  const authed = isAuthenticated();
  return `
<div id="piq-splash" class="${authed ? 'hidden' : ''}">
  <div class="splash-logo">
    <img src="${LOGO_URI}" alt="PerformanceIQ">
    <div class="splash-tagline">Elite Training. Smart Results.</div>
  </div>
  <div id="auth-view-slot"></div>
</div>

<div id="piq-app" class="${authed ? 'mounted' : ''}">
  <nav id="piq-nav">
    <div class="nav-logo" id="nav-logo-btn">
      <img src="${LOGO_URI}" alt="PerformanceIQ">
    </div>
    <ul class="nav-links" id="nav-links"></ul>
    <div class="nav-right">
      <button class="nav-theme-btn" id="theme-toggle-btn">${getThemeIcon()}</button>
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
</div>`.trim();
}

// ── SHELL EVENTS ─────────────────────────────────────────────
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
}

// ── ROUTE MAP ─────────────────────────────────────────────────
const ROUTE_MAP = {
  [ROUTES.WELCOME]:          () => authView(renderWelcome),
  [ROUTES.SIGN_IN]:          () => authView(renderSignIn),
  [ROUTES.SIGN_UP]:          () => authView(renderSignUp),
  [ROUTES.PICK_ROLE]:        () => authView(renderPickRole),
  [ROUTES.ONBOARDING]:       () => authView(renderOnboarding),
  [ROUTES.SETTINGS_THEME]:   () => appView(renderSettingsTheme),
  [ROUTES.SETTINGS_PROFILE]: () => appView(renderSettingsProfile),
  // Coach
  [ROUTES.COACH_HOME]:       () => appView(renderCoachHome),
  [ROUTES.COACH_TEAM]:       () => appView(renderCoachTeam),
  [ROUTES.COACH_ROSTER]:     () => appView(renderCoachRoster),
  [ROUTES.COACH_PROGRAM]:    () => appView(renderCoachProgram),
  [ROUTES.COACH_READINESS]:  () => appView(renderCoachReadiness),
  [ROUTES.COACH_ANALYTICS]:  () => appView(renderCoachAnalytics),
  [ROUTES.COACH_MESSAGES]:   () => appView(renderCoachMessages),
  [ROUTES.COACH_CALENDAR]:   () => appView(renderCoachCalendar),
  [ROUTES.COACH_SETTINGS]:   () => appView(renderCoachSettings),
  // Player
  [ROUTES.PLAYER_HOME]:      () => appView(renderPlayerHome),
  [ROUTES.PLAYER_TODAY]:     () => appView(renderPlayerToday),
  [ROUTES.PLAYER_LOG]:       () => appView(renderPlayerLog),
  [ROUTES.PLAYER_PROGRESS]:  () => appView(renderPlayerProgress),
  [ROUTES.PLAYER_SCORE]:     () => appView(renderPlayerScore),
  [ROUTES.PLAYER_READINESS]: () => appView(renderPlayerReadiness),
  [ROUTES.PLAYER_MESSAGES]:  () => appView(renderPlayerMessages),
  [ROUTES.PLAYER_SETTINGS]:  () => appView(renderPlayerSettings),
  // Parent
  [ROUTES.PARENT_HOME]:      () => appView(renderParentHome),
  [ROUTES.PARENT_CHILD]:     () => appView(renderParentChild),
  [ROUTES.PARENT_WEEK]:      () => appView(renderParentWeek),
  [ROUTES.PARENT_PROGRESS]:  () => appView(renderParentProgress),
  [ROUTES.PARENT_MESSAGES]:  () => appView(renderParentMessages),
  [ROUTES.PARENT_BILLING]:   () => appView(renderParentBilling),
  [ROUTES.PARENT_SETTINGS]:  () => appView(renderParentSettings),
  // Admin
  [ROUTES.ADMIN_HOME]:       () => appView(renderAdminHome),
  [ROUTES.ADMIN_SETTINGS]:   () => appView(renderAdminSettings),
  // Solo
  [ROUTES.SOLO_HOME]:        () => appView(renderSoloHome),
  [ROUTES.SOLO_TODAY]:       () => appView(renderSoloToday),
  [ROUTES.SOLO_BUILDER]:     () => appView(renderSoloBuilder),
  [ROUTES.SOLO_LIBRARY]:     () => appView(renderSoloLibrary),
  [ROUTES.SOLO_PROGRESS]:    () => appView(renderSoloProgress),
  [ROUTES.SOLO_SCORE]:       () => appView(renderSoloScore),
  [ROUTES.SOLO_READINESS]:   () => appView(renderSoloReadiness),
  [ROUTES.SOLO_GOALS]:       () => appView(renderSoloGoals),
  [ROUTES.SOLO_SETTINGS]:    () => appView(renderSoloSettings),
};

function renderRoute(route) {
  const handler = ROUTE_MAP[route];
  if (handler) { handler(); return; }
  // Fallback to role home or welcome
  const fallback = isAuthenticated()
    ? ROUTE_MAP[ROLE_HOME[getCurrentRole()]]
    : ROUTE_MAP[ROUTES.WELCOME];
  if (fallback) fallback();
}

// ── RENDER HELPERS ────────────────────────────────────────────
function authView(renderFn) {
  document.getElementById('piq-splash')?.classList.remove('hidden');
  document.getElementById('piq-app')?.classList.remove('mounted');
  const $slot = document.getElementById('auth-view-slot');
  if (!$slot) return;
  $slot.innerHTML = renderFn();
  // Wire navigation links
  bindLinks($slot);
  // Fire event so view modules can bind their own handlers
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
  // Fire event so view modules can bind their own handlers
  document.dispatchEvent(new CustomEvent('piq:viewRendered'));
}

// Bind [data-route] and [data-signout] within a container
function bindLinks(container) {
  container.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.route);
    });
  });
  container.querySelectorAll('[data-signout]').forEach(el => {
    el.addEventListener('click', () => {
      signOut();
      navigate(ROUTES.WELCOME);
    });
  });
}

init();
