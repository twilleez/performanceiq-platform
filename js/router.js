/**
 * PerformanceIQ — router.js
 * Flat in-memory router.  No Supabase dependency.
 * app.js is the only consumer of navigate(); views use this module
 * only for ROUTES constants and goHome().
 *
 * Guard contract
 * ──────────────
 * Guards are sync functions: (toRoute) => string | null
 *   • return null      → allow navigation
 *   • return routeKey  → redirect to that route instead
 *
 * suppressNextGuard() lets async save operations (e.g. onboarding finish)
 * call navigate() immediately after without triggering a bounce-back.
 */

// ── ROUTE REGISTRY ────────────────────────────────────────────
export const ROUTES = {
  // Auth / shared
  WELCOME:          'welcome',
  SIGN_IN:          'signin',
  SIGN_UP:          'signup',
  FORGOT_PASSWORD:  'forgot-password',
  PICK_ROLE:        'pick-role',
  JOIN_TEAM:        'join-team',
  ONBOARDING:       'onboarding',

  // Settings (shared, role-aware)
  SETTINGS_THEME:   'settings/theme',
  SETTINGS_PROFILE: 'settings/profile',

  // Coach
  COACH_HOME:           'coach/home',
  COACH_TEAM:           'coach/team',
  COACH_ROSTER:         'coach/roster',
  COACH_ATHLETE_DETAIL: 'coach/athlete/:id',
  COACH_PROGRAM:        'coach/program',
  COACH_SESSION:        'coach/session',
  COACH_LIBRARY:        'coach/library',
  COACH_READINESS:      'coach/readiness',
  COACH_ANALYTICS:      'coach/analytics',
  COACH_MESSAGES:       'coach/messages',
  COACH_CALENDAR:       'coach/calendar',
  COACH_REPORTS:        'coach/reports',
  COACH_SETTINGS:       'coach/settings',

  // Player
  PLAYER_HOME:       'player/home',
  PLAYER_TODAY:      'player/today',
  PLAYER_EXERCISE:   'player/exercise/:id',
  PLAYER_LOG:        'player/log',
  PLAYER_PROGRESS:   'player/progress',
  PLAYER_SCORE:      'player/score',
  PLAYER_READINESS:  'player/readiness',
  PLAYER_MESSAGES:   'player/messages',
  PLAYER_CALENDAR:   'player/calendar',
  PLAYER_RECRUITING: 'player/recruiting',
  PLAYER_SETTINGS:   'player/settings',
  PLAYER_NUTRITION:  'player/nutrition',

  // Parent
  PARENT_HOME:     'parent/home',
  PARENT_CHILD:    'parent/child',
  PARENT_WEEK:     'parent/week',
  PARENT_PROGRESS: 'parent/progress',
  PARENT_WELLNESS: 'parent/wellness',
  PARENT_MESSAGES: 'parent/messages',
  PARENT_BILLING:  'parent/billing',
  PARENT_SETTINGS: 'parent/settings',

  // Admin
  ADMIN_HOME:       'admin/home',
  ADMIN_ORG:        'admin/org',
  ADMIN_TEAMS:      'admin/teams',
  ADMIN_COACHES:    'admin/coaches',
  ADMIN_ATHLETES:   'admin/athletes',
  ADMIN_ADOPTION:   'admin/adoption',
  ADMIN_REPORTS:    'admin/reports',
  ADMIN_COMPLIANCE: 'admin/compliance',
  ADMIN_BILLING:    'admin/billing',
  ADMIN_SETTINGS:   'admin/settings',

  // Solo
  SOLO_HOME:         'solo/home',
  SOLO_TODAY:        'solo/today',
  SOLO_BUILDER:      'solo/builder',
  SOLO_LIBRARY:      'solo/library',
  SOLO_PROGRESS:     'solo/progress',
  SOLO_SCORE:        'solo/score',
  SOLO_READINESS:    'solo/readiness',
  SOLO_GOALS:        'solo/goals',
  SOLO_SUBSCRIPTION: 'solo/subscription',
  SOLO_SETTINGS:     'solo/settings',
  SOLO_NUTRITION:    'solo/nutrition',
};

// ── ROLE → HOME ROUTE MAP ─────────────────────────────────────
export const ROLE_HOME = {
  coach:  ROUTES.COACH_HOME,
  player: ROUTES.PLAYER_HOME,
  parent: ROUTES.PARENT_HOME,
  admin:  ROUTES.ADMIN_HOME,
  solo:   ROUTES.SOLO_HOME,
};

// ── ROUTER STATE ──────────────────────────────────────────────
let _currentRoute = ROUTES.WELCOME;
let _routeParams  = {};
let _listeners    = [];
let _guards       = [];
let _skipNextGuard = false;

// ── GUARD SUPPRESSION ─────────────────────────────────────────
/**
 * Call this before navigate() inside an async save handler so the
 * guard doesn't redirect back to onboarding mid-write.
 */
export function suppressNextGuard() {
  _skipNextGuard = true;
}

// ── GUARD REGISTRATION ────────────────────────────────────────
/** Register a route guard.  Returns an unsubscribe function. */
export function addGuard(fn) {
  _guards.push(fn);
  return () => { _guards = _guards.filter(g => g !== fn); };
}

// ── NAVIGATION ────────────────────────────────────────────────
export function navigate(route, params = {}) {
  let destination = route;

  if (_skipNextGuard) {
    _skipNextGuard = false;
  } else {
    // Run guards in registration order; first redirect wins
    for (const guard of _guards) {
      const redirect = guard(route);
      if (redirect && redirect !== route) {
        destination = redirect;
        break;
      }
    }
  }

  _currentRoute = destination;
  _routeParams  = params;
  _listeners.forEach(fn => fn(destination, params));
}

export function getCurrentRoute() { return _currentRoute; }
export function getRouteParams()  { return _routeParams;  }

// ── LISTENER REGISTRATION ─────────────────────────────────────
/** Subscribe to route changes.  Returns an unsubscribe function. */
export function onRouteChange(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

// ── HELPERS ───────────────────────────────────────────────────
export function goHome(role) {
  navigate(ROLE_HOME[role] || ROUTES.WELCOME);
}

export const AUTH_ROUTES = new Set([
  ROUTES.WELCOME,
  ROUTES.SIGN_IN,
  ROUTES.SIGN_UP,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.PICK_ROLE,
  ROUTES.JOIN_TEAM,
  ROUTES.ONBOARDING,
]);

export function isAuthRoute(route) {
  return AUTH_ROUTES.has(route);
}

export function routeMatchesRole(route, role) {
  return route.startsWith(role + '/') || !route.includes('/');
}
