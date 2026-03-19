/**
 * app.js — PerformanceIQ Phase 15C
 *
 * Changes from Phase 15B:
 *  - Fix 01: bootLoader.hide() / showError() wired into init
 *  - Fix 03: piqExplainer.init() called after athlete dashboard renders
 *  - Fix 04: wellnessTooltips.init() called after wellness form renders
 *  - Fix 05: applyReadinessCopy() called after readiness renders
 *  - Fix 06: navBar.init() called after role/router are established
 *  - Fix 07: sessionReady.show() wired into training generator
 *  - Fix 08: swap hint class applied to first exercise card in render
 *  - Fix 09: emptyState.show() called in all list-render functions
 *  - Fix 10: offlineIndicator.init() called in init()
 */

// ── CORE ──────────────────────────────────────────────────────
import { router }       from './core/router.js';
import { boot }         from './core/boot.js';
import { state }        from './state/state.js';

// ── PHASE 15C: New patch modules ──────────────────────────────
import { bootLoader }           from './components/boot-loader.js';     // Fix 01
import { piqExplainer }         from './components/piq-explainer.js';   // Fix 03
import { wellnessTooltips }     from './components/wellness-tooltips.js'; // Fix 04
import { applyReadinessCopy }   from './components/readiness-copy.js';  // Fix 05
import { navBar }               from './components/nav-bar.js';         // Fix 06
import { sessionReady }         from './components/session-ready.js';   // Fix 07
import { emptyState,
         offlineIndicator }     from './components/empty-states.js';    // Fix 09+10

// ── ROUTE MAP (dynamic imports — no static import for views) ──
export const ROUTES = {
  // Auth
  WELCOME:       'welcome',
  SIGN_IN:       'sign-in',
  SIGN_UP:       'sign-up',
  PICK_ROLE:     'pick-role',
  ONBOARDING:    'onboarding',

  // Coach
  COACH_HOME:    'coach-home',
  COACH_PROGRAM: 'coach-program',
  COACH_TEAM:    'coach-team',
  COACH_ANALYTICS: 'coach-analytics',

  // Player / Athlete
  PLAYER_HOME:   'player-home',
  PLAYER_LOG:    'player-log',
  PLAYER_SCORE:  'player-score',
  PLAYER_NUTRITION: 'player-nutrition',

  // Parent
  PARENT_HOME:   'parent-home',

  // Admin
  ADMIN_HOME:    'admin-home',

  // Solo
  SOLO_HOME:     'solo-home',
  SOLO_BUILDER:  'solo-builder',
  SOLO_SCORE:    'solo-score',
};

// Dynamic view map — each entry: [moduleUrl, exportedFunctionName]
const VIEW_MAP = {
  [ROUTES.WELCOME]:          ['./views/auth/welcome.js',         'renderWelcome'],
  [ROUTES.SIGN_IN]:          ['./views/auth/signin.js',          'renderSignIn'],
  [ROUTES.SIGN_UP]:          ['./views/auth/signup.js',          'renderSignUp'],
  [ROUTES.PICK_ROLE]:        ['./views/auth/pickRole.js',        'renderPickRole'],
  [ROUTES.ONBOARDING]:       ['./views/auth/onboarding.js',      'renderOnboarding'],

  [ROUTES.COACH_HOME]:       ['./views/coach/home.js',           'renderCoachHome'],
  [ROUTES.COACH_PROGRAM]:    ['./views/coach/program.js',        'renderCoachProgram'],
  [ROUTES.COACH_TEAM]:       ['./views/coach/team.js',           'renderCoachTeam'],
  [ROUTES.COACH_ANALYTICS]:  ['./views/coach/analytics.js',      'renderCoachAnalytics'],

  [ROUTES.PLAYER_HOME]:      ['./views/player/home.js',          'renderPlayerHome'],
  [ROUTES.PLAYER_LOG]:       ['./views/player/logWorkout.js',    'renderPlayerLog'],
  [ROUTES.PLAYER_SCORE]:     ['./views/player/score.js',         'renderPlayerScore'],
  [ROUTES.PLAYER_NUTRITION]: ['./views/player/nutrition.js',     'renderPlayerNutrition'],

  [ROUTES.PARENT_HOME]:      ['./views/parent/home.js',          'renderParentHome'],
  [ROUTES.ADMIN_HOME]:       ['./views/admin/home.js',           'renderAdminHome'],

  [ROUTES.SOLO_HOME]:        ['./views/solo/home.js',            'renderSoloHome'],
  [ROUTES.SOLO_BUILDER]:     ['./views/solo/builder.js',         'renderSoloBuilder'],
  [ROUTES.SOLO_SCORE]:       ['./views/solo/score.js',           'renderSoloScore'],
};

// ── NAVIGATE ──────────────────────────────────────────────────

/**
 * Navigate to a route.
 * Dynamically imports the view module, renders it into #app,
 * then fires post-render hooks for the relevant fixes.
 */
export async function navigate(route, params = {}) {
  const appEl = document.getElementById('app');
  if (!appEl) return;

  const entry = VIEW_MAP[route];
  if (!entry) {
    appEl.innerHTML = `<div style="padding:40px;text-align:center;color:rgba(255,255,255,0.4);">
      Unknown route: ${route}
    </div>`;
    return;
  }

  const [moduleUrl, fnName] = entry;

  // Show skeleton while module loads
  appEl.innerHTML = _skeleton();

  try {
    const mod = await import(moduleUrl);
    const renderFn = mod[fnName];

    if (typeof renderFn !== 'function') {
      throw new Error(`${fnName} is not exported from ${moduleUrl}`);
    }

    await renderFn(appEl, params);

    // ── POST-RENDER HOOKS ────────────────────────────────────

    // Fix 05 — readiness action copy (any view may have a readiness banner)
    applyReadinessCopy();

    // Fix 06 — keep nav active state in sync
    navBar.setActiveByRoute(route);

    // Fix 03 — PIQ explainer (athlete home only)
    if (route === ROUTES.PLAYER_HOME) {
      piqExplainer.init();
    }

    // Fix 04 — wellness tooltips (log workout + onboarding wellness step)
    if (route === ROUTES.PLAYER_LOG || route === ROUTES.ONBOARDING) {
      wellnessTooltips.init();
    }

    // Dispatch route-changed event for any listeners
    document.dispatchEvent(new CustomEvent('piq:route-changed', {
      detail: { route, params },
      bubbles: true
    }));

  } catch (err) {
    console.error(`[PIQ] Failed to render route "${route}":`, err);
    appEl.innerHTML = _errorView(route, err);
  }
}

// ── INIT ──────────────────────────────────────────────────────

async function init() {
  try {
    // Fix 10 — offline indicator (fires before anything else)
    offlineIndicator.init();

    // Clear the boot timeout failsafe
    clearTimeout(window.__piqBootTimeout);

    // Boot: checks auth state, determines initial route
    const initialRoute = await boot(state, ROUTES);

    // Fix 06 — init nav bar based on role from state
    const role = state.get('role');
    navBar.init(role, { navigate });

    // Navigate to initial route
    await navigate(initialRoute);

    // Fix 01 — hide boot loader after first render
    bootLoader.hide();

  } catch (err) {
    console.error('[PIQ] Init failed:', err);
    bootLoader.showError('PerformanceIQ failed to start. Please refresh.');
  }
}

// ── EMPTY STATE HELPERS (exported for use in view modules) ────

/**
 * Render empty state into a container.
 * Import and use in any view module that has a list:
 *
 *   import { renderEmptyState, clearEmptyState } from '../../app.js';
 *   renderEmptyState(containerEl, 'roster');
 */
export function renderEmptyState(container, type, compact = false) {
  emptyState.show(container, type, compact);
}
export function clearEmptyState(container) {
  emptyState.clear(container);
}

/**
 * Show session-ready bottom sheet.
 * Import in training generator modules:
 *
 *   import { showSessionReady } from '../../app.js';
 *   showSessionReady({ exerciseCount: 8, durationMins: 45, ... });
 */
export function showSessionReady(opts) {
  sessionReady.show(opts);
}

// ── SKELETON / ERROR HELPERS ──────────────────────────────────

function _skeleton() {
  return `
    <div style="padding:24px;display:grid;gap:14px;">
      ${[1,2,3].map(() => `
        <div style="background:rgba(255,255,255,0.04);border-radius:10px;height:80px;
          animation:piq-shimmer 1.4s ease-in-out infinite;"></div>
      `).join('')}
    </div>
    <style>
      @keyframes piq-shimmer {
        0%,100%{opacity:.4} 50%{opacity:.8}
      }
    </style>
  `;
}

function _errorView(route, err) {
  return `
    <div style="padding:40px 24px;text-align:center;">
      <div style="font-size:28px;margin-bottom:12px;">⚠️</div>
      <div style="font-family:Oswald,sans-serif;font-size:16px;color:#FF6B35;
           margin-bottom:8px;letter-spacing:0.04em;">VIEW FAILED TO LOAD</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.35);margin-bottom:20px;line-height:1.5;">
        Route: ${route}<br>${err?.message || 'Unknown error'}
      </div>
      <button onclick="location.reload()"
        style="background:rgba(255,107,53,0.15);border:1px solid rgba(255,107,53,0.3);
               color:#FF6B35;font-family:Oswald,sans-serif;font-size:13px;font-weight:600;
               letter-spacing:0.06em;padding:10px 22px;border-radius:8px;cursor:pointer;">
        RELOAD
      </button>
    </div>
  `;
}

// ── Listen to empty-state CTA clicks ──────────────────────────
document.addEventListener('piq:empty-cta', (e) => {
  switch (e.detail?.action) {
    case 'add-athlete':    navigate(ROUTES.COACH_TEAM);           break;
    case 'open-training':  navigate(ROUTES.PLAYER_LOG);           break;
    case 'open-wellness':  navigate(ROUTES.PLAYER_LOG);           break;
    case 'reset-filters':
      document.dispatchEvent(new CustomEvent('piq:reset-filters', { bubbles: true }));
      break;
  }
});

// ── START ──────────────────────────────────────────────────────
init();
