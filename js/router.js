/**
 * PerformanceIQ Router
 * Route table + navigation helpers
 */

export const ROUTES = {
  WELCOME: 'welcome', SIGN_IN: 'signin', SIGN_UP: 'signup',
  FORGOT_PASSWORD: 'forgot-password', PICK_ROLE: 'pick-role',
  JOIN_TEAM: 'join-team', ONBOARDING: 'onboarding',
  SETTINGS_THEME: 'settings/theme', SETTINGS_PROFILE: 'settings/profile',
  COACH_HOME: 'coach/home', COACH_TEAM: 'coach/team', COACH_ROSTER: 'coach/roster',
  COACH_ATHLETE_DETAIL: 'coach/athlete/:id', COACH_PROGRAM: 'coach/program',
  COACH_SESSION: 'coach/session', COACH_LIBRARY: 'coach/library',
  COACH_READINESS: 'coach/readiness', COACH_ANALYTICS: 'coach/analytics',
  COACH_MESSAGES: 'coach/messages', COACH_CALENDAR: 'coach/calendar',
  COACH_REPORTS: 'coach/reports', COACH_SETTINGS: 'coach/settings',
  PLAYER_HOME: 'player/home', PLAYER_TODAY: 'player/today',
  PLAYER_EXERCISE: 'player/exercise/:id', PLAYER_LOG: 'player/log',
  PLAYER_PROGRESS: 'player/progress', PLAYER_SCORE: 'player/score',
  PLAYER_READINESS: 'player/readiness', PLAYER_MESSAGES: 'player/messages',
  PLAYER_CALENDAR: 'player/calendar', PLAYER_RECRUITING: 'player/recruiting',
  PLAYER_SETTINGS: 'player/settings', PLAYER_NUTRITION: 'player/nutrition',
  PARENT_HOME: 'parent/home', PARENT_CHILD: 'parent/child',
  PARENT_WEEK: 'parent/week', PARENT_PROGRESS: 'parent/progress',
  PARENT_WELLNESS: 'parent/wellness', PARENT_MESSAGES: 'parent/messages',
  PARENT_BILLING: 'parent/billing', PARENT_SETTINGS: 'parent/settings',
  ADMIN_HOME: 'admin/home', ADMIN_ORG: 'admin/org', ADMIN_TEAMS: 'admin/teams',
  ADMIN_COACHES: 'admin/coaches', ADMIN_ATHLETES: 'admin/athletes',
  ADMIN_ADOPTION: 'admin/adoption', ADMIN_REPORTS: 'admin/reports',
  ADMIN_COMPLIANCE: 'admin/compliance', ADMIN_BILLING: 'admin/billing',
  ADMIN_SETTINGS: 'admin/settings',
  SOLO_HOME: 'solo/home', SOLO_TODAY: 'solo/today', SOLO_BUILDER: 'solo/builder',
  SOLO_LIBRARY: 'solo/library', SOLO_PROGRESS: 'solo/progress',
  SOLO_SCORE: 'solo/score', SOLO_READINESS: 'solo/readiness',
  SOLO_GOALS: 'solo/goals', SOLO_SUBSCRIPTION: 'solo/subscription',
  SOLO_SETTINGS: 'solo/settings', SOLO_NUTRITION: 'solo/nutrition',
};

export const ROLE_HOME = {
  coach: ROUTES.COACH_HOME, player: ROUTES.PLAYER_HOME,
  parent: ROUTES.PARENT_HOME, admin: ROUTES.ADMIN_HOME, solo: ROUTES.SOLO_HOME,
};

let _currentRoute = ROUTES.WELCOME;
let _routeParams = {};
let _listeners = [];

export function navigate(route, params = {}) {
  _currentRoute = route;
  _routeParams = params;
  _listeners.forEach(fn => fn(route, params));
}

export function getCurrentRoute() { return _currentRoute; }
export function getRouteParams()  { return _routeParams; }

export function onRouteChange(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

export function goHome(role) { navigate(ROLE_HOME[role] || ROUTES.WELCOME); }

export function isAuthRoute(route) {
  return [ROUTES.WELCOME, ROUTES.SIGN_IN, ROUTES.SIGN_UP,
          ROUTES.FORGOT_PASSWORD, ROUTES.PICK_ROLE, ROUTES.JOIN_TEAM].includes(route);
}

export function routeMatchesRole(route, role) {
  return route.startsWith(role + '/') || !route.includes('/');
}
