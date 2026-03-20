/**
 * PerformanceIQ — Permissions
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for what each role is allowed to do
 * and which routes each role is allowed to visit.
 *
 * SECTIONS
 *  1. Role capability map
 *  2. Route ownership map
 *  3. Public query API
 *  4. Usage guide (JSDoc)
 */

// ── 1. ROLE CAPABILITY MAP ────────────────────────────────────
//
// Each key is an action string that call sites use.
// Each value is the set of roles permitted to perform that action.
//
// Naming convention: verb_noun
//   view_*      → read-only access to a data set or screen
//   log_*       → create a new data entry
//   edit_*      → modify existing data
//   delete_*    → remove data
//   manage_*    → admin-level control (create/edit/delete users/teams)
//
// Add new capabilities here as features ship — never scatter
// role-string checks across individual view files.

const ROLE_CAPABILITIES = {

  // ── Workout & Training ─────────────────────────────────────
  /** Log a workout session for yourself */
  log_workout:              ['player', 'solo'],
  /** View own workout history */
  view_own_workouts:        ['player', 'solo', 'coach', 'parent'],
  /** Edit a workout log entry after submission */
  edit_own_workout:         ['player', 'solo'],
  /** Delete a workout log entry */
  delete_own_workout:       ['player', 'solo'],
  /** Assign a workout or program to a player */
  assign_workout:           ['coach'],
  /** Build and save a session/program template */
  build_program:            ['coach', 'solo'],
  /** Access the exercise library (read) */
  view_library:             ['player', 'solo', 'coach'],

  // ── Readiness & Wellness ───────────────────────────────────
  /** Submit daily wellness / readiness check-in */
  log_readiness:            ['player', 'solo'],
  /** View own readiness history */
  view_own_readiness:       ['player', 'solo', 'coach', 'parent'],
  /** View team-wide readiness dashboard */
  view_team_readiness:      ['coach'],
  /** View readiness data for their linked child */
  view_child_readiness:     ['parent'],

  // ── PIQ Score & Analytics ─────────────────────────────────
  /** View own PIQ score breakdown */
  view_own_score:           ['player', 'solo'],
  /** View a player's PIQ score (coach perspective) */
  view_player_score:        ['coach'],
  /** View team-wide analytics and aggregate trends */
  view_team_analytics:      ['coach'],
  /** View progress/trend charts for their linked child */
  view_child_progress:      ['parent'],
  /** Access full platform analytics (multi-team) */
  view_platform_analytics:  ['admin'],

  // ── Nutrition ─────────────────────────────────────────────
  /** Log meals / food intake */
  log_nutrition:            ['player', 'solo'],
  /** View own nutrition log */
  view_own_nutrition:       ['player', 'solo', 'parent'],
  /** View nutrition data for their linked child */
  view_child_nutrition:     ['parent'],

  // ── Roster & Team Management ──────────────────────────────
  /** View the team roster */
  view_roster:              ['coach'],
  /** View their child's basic info on the roster */
  view_child_profile:       ['parent'],
  /** Add, edit, or remove athletes from the roster */
  manage_roster:            ['coach'],
  /** View the weekly/seasonal program plan */
  view_program:             ['coach', 'player'],

  // ── Messaging ─────────────────────────────────────────────
  /** Send and receive messages */
  send_messages:            ['coach', 'player', 'parent'],
  /** View message history */
  view_messages:            ['coach', 'player', 'parent'],

  // ── Calendar ──────────────────────────────────────────────
  /** View the team calendar */
  view_calendar:            ['coach', 'player'],
  /** Add or edit calendar events */
  manage_calendar:          ['coach'],

  // ── Recruiting ────────────────────────────────────────────
  /** Access the recruiting profile feature */
  view_recruiting:          ['player'],

  // ── Admin / Platform ──────────────────────────────────────
  /** Manage coaches, teams, and org settings */
  manage_platform:          ['admin'],
  /** View billing and subscription info */
  view_billing:             ['admin', 'parent', 'solo'],
  /** Manage billing */
  manage_billing:           ['admin'],
  /** View compliance reports */
  view_compliance:          ['admin'],

  // ── Settings (always permitted for the session owner) ─────
  /** View and edit own profile settings */
  edit_own_settings:        ['coach', 'player', 'parent', 'admin', 'solo'],
  /** Toggle app theme */
  toggle_theme:             ['coach', 'player', 'parent', 'admin', 'solo'],
};


// ── 2. ROUTE OWNERSHIP MAP ────────────────────────────────────
//
// Maps route prefixes (the segment before the first '/') to the
// set of roles that may visit any route under that prefix.
//
// Special cases:
//   shared routes (welcome, signin, etc.) are handled by isAuthRoute()
//   in router.js and are never checked here.
//   settings/* is accessible to all authenticated roles.

const ROUTE_ROLES = {
  'coach':    ['coach'],
  'player':   ['player'],
  'parent':   ['parent'],
  'admin':    ['admin'],
  'solo':     ['solo'],
  'settings': ['coach', 'player', 'parent', 'admin', 'solo'],
};


// ── 3. PUBLIC QUERY API ───────────────────────────────────────

/**
 * Check whether a given role is permitted to perform an action.
 *
 * @param {string} action  - Key from ROLE_CAPABILITIES (e.g. 'log_workout')
 * @param {string} role    - Role string (e.g. 'player', 'coach')
 * @returns {boolean}
 *
 * @example
 * if (!can('log_workout', getCurrentRole())) {
 *   toast('You don\'t have permission to log workouts.', 'warn');
 *   return;
 * }
 */
export function can(action, role) {
  if (!action || !role) return false;
  const allowed = ROLE_CAPABILITIES[action];
  if (!allowed) {
    // Unknown action — fail closed, log for developer awareness
    console.warn(`[PIQ Permissions] Unknown capability: "${action}"`);
    return false;
  }
  return allowed.includes(role);
}

/**
 * Check whether a given role is permitted to visit a route.
 * Used by the route guard in app.js before dynamic imports fire.
 *
 * Auth routes (welcome, signin, signup, etc.) are always permitted —
 * pass them through without checking.
 *
 * @param {string} route  - Full route string (e.g. 'coach/home', 'player/log')
 * @param {string} role   - Current session role
 * @returns {boolean}
 *
 * @example
 * // In renderRoute() inside app.js:
 * if (isAuthenticated() && !isAuthRoute(route) && !canAccess(route, getCurrentRole())) {
 *   toast('Access restricted.', 'warn');
 *   navigate(ROLE_HOME[getCurrentRole()]);
 *   return;
 * }
 */
export function canAccess(route, role) {
  if (!route || !role) return false;

  // Determine the route's namespace from its first segment
  const namespace = route.split('/')[0];

  const allowed = ROUTE_ROLES[namespace];
  if (!allowed) {
    // Route has no namespace (e.g. single-segment auth routes) — allow
    return true;
  }
  return allowed.includes(role);
}

/**
 * Return the full capability map for a role — useful for debugging
 * and for building role-aware UI (e.g. conditionally rendering buttons).
 *
 * @param {string} role
 * @returns {Object.<string, boolean>}
 *
 * @example
 * const caps = getCapabilities('parent');
 * // { log_workout: false, view_child_readiness: true, … }
 */
export function getCapabilities(role) {
  return Object.fromEntries(
    Object.entries(ROLE_CAPABILITIES).map(([action, roles]) => [
      action,
      roles.includes(role),
    ]),
  );
}

// ── 4. USAGE GUIDE ────────────────────────────────────────────
//
// A. Gating a UI button or section inside a view:
//
//   import { can } from '../../core/permissions.js';
//   import { getCurrentRole } from '../../core/auth.js';
//
//   const role = getCurrentRole();
//   const showAssignBtn = can('assign_workout', role);
//
//   return `
//     ${showAssignBtn ? `<button id="assign-btn">Assign Workout</button>` : ''}
//   `;
//
// B. Gating a write action before it executes:
//
//   import { can } from '../../core/permissions.js';
//   import { assertNotDemo } from '../../core/auth.js';
//
//   function handleSaveCheckin() {
//     if (!assertNotDemo()) return;               // demo guard
//     if (!can('log_readiness', getCurrentRole())) {
//       toast('Only athletes can log readiness.', 'warn');
//       return;
//     }
//     // … proceed with save
//   }
//
// C. Route guard in app.js (see renderRoute):
//
//   import { canAccess } from './core/permissions.js';
//
//   // Before the dynamic import:
//   if (isAuthenticated() && !isAuthRoute(route) && !canAccess(route, getCurrentRole())) {
//     showToast('Access restricted.', 'warn');
//     navigate(ROLE_HOME[getCurrentRole()]);
//     return;
//   }
