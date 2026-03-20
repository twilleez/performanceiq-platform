/**
 * PerformanceIQ — app.js ROUTE GUARD PATCH
 * ─────────────────────────────────────────────────────────────
 * This file documents the two changes required in app.js to
 * activate the route guard. It is NOT a replacement for the full
 * app.js — apply the two diffs below.
 *
 * ─────────────────────────────────────────────────────────────
 * CHANGE 1 — Add two imports at the top of app.js
 * ─────────────────────────────────────────────────────────────
 *
 * Find the existing import block (around line 1–8) and append:
 *
 *   import { canAccess }  from './core/permissions.js';
 *   import { showToast }  from './core/notifications.js';
 *
 * After the change the import block should look like this:
 *
 *   import { boot }                        from './core/boot.js';
 *   import { getThemeIcon, cycleTheme }    from './core/theme.js';
 *   import { isAuthenticated, getCurrentRole,
 *            getInitials, signOut }         from './core/auth.js';
 *   import { navigate, getCurrentRoute,
 *            onRouteChange, ROUTES,
 *            ROLE_HOME, isAuthRoute }       from './router.js';      // ← also add isAuthRoute here
 *   import { getDashboardConfig }          from './state/selectors.js';
 *   import { canAccess }                   from './core/permissions.js';  // ← NEW
 *   import { showToast }                   from './core/notifications.js'; // ← NEW
 *
 * NOTE: isAuthRoute is already exported from router.js — just add
 * it to the existing named import list if it isn't there already.
 *
 *
 * ─────────────────────────────────────────────────────────────
 * CHANGE 2 — Replace the body of renderRoute()
 * ─────────────────────────────────────────────────────────────
 *
 * Find this function (currently ~10 lines):
 *
 *   async function renderRoute(route) {
 *     const entry = VIEW_MAP[route];
 *     if (!entry) {
 *       const fallback = VIEW_MAP[isAuthenticated()
 *         ? ROLE_HOME[getCurrentRole()]
 *         : ROUTES.WELCOME];
 *       if (fallback) await loadAndRender(...fallback, route);
 *       return;
 *     }
 *     await loadAndRender(...entry, route);
 *   }
 *
 * Replace it with the guarded version below:
 */

async function renderRoute(route) {
  // ── Route guard ─────────────────────────────────────────────
  // Only runs for authenticated, non-auth routes.
  // If the current role isn't allowed to visit this route,
  // show a non-alarming toast and redirect to role home.
  if (isAuthenticated() && !isAuthRoute(route) && !canAccess(route, getCurrentRole())) {
    showToast('⛔ That area is restricted to your role.', 'warn', 3500);
    navigate(ROLE_HOME[getCurrentRole()] || ROUTES.WELCOME);
    return;
  }

  // ── Normal view resolution ───────────────────────────────────
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

/**
 * ─────────────────────────────────────────────────────────────
 * WHY THIS APPROACH
 * ─────────────────────────────────────────────────────────────
 *
 * The guard fires at the router level — before the dynamic import
 * even runs. This means:
 *
 * 1. A coach typing 'parent/child' directly into the URL hash gets
 *    redirected before any parent view code loads.
 *
 * 2. The check is a single canAccess(route, role) call that reads
 *    from ROUTE_ROLES in permissions.js — no role-string logic
 *    scattered through individual view files.
 *
 * 3. Auth routes (welcome, signin, signup, onboarding, pick-role)
 *    bypass the guard entirely via isAuthRoute() — users who are
 *    not yet authenticated can always reach them.
 *
 * 4. Settings routes ('settings/theme', 'settings/profile') are
 *    explicitly allowed for all authenticated roles in ROUTE_ROLES,
 *    so they pass through cleanly.
 *
 * ─────────────────────────────────────────────────────────────
 * TESTING CHECKLIST
 * ─────────────────────────────────────────────────────────────
 *
 * After applying:
 *
 * [ ] Sign in as coach@demo.com, manually navigate to #parent/home
 *     → should see "That area is restricted" toast, land on coach/home
 *
 * [ ] Sign in as player@demo.com, manually navigate to #coach/team
 *     → should be blocked and redirected to player/home
 *
 * [ ] Sign in as parent@demo.com, navigate to parent/home
 *     → should load normally (no false positive block)
 *
 * [ ] Unauthenticated: navigate to coach/home
 *     → app.js already handles this in loadAndRender() via the
 *        isAuthenticated() check — no double-redirect
 *
 * [ ] Any role: navigate to settings/theme
 *     → should load normally (settings/* is open to all roles)
 */
