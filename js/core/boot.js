/**
 * PerformanceIQ — core/boot.js
 * One-time init sequence called by app.js before any rendering.
 *
 * Order matters:
 *  1. Theme   — applied before first paint to prevent flash
 *  2. Auth    — session restored from localStorage
 *  3. State   — app state hydrated from localStorage
 *  4. Guard   — auth route guard registered in router
 *  5. SW      — service worker registered (non-blocking)
 */

import { initTheme }                              from './theme.js';
import { initAuth, isAuthenticated, needsOnboarding } from './auth.js';
import { loadState }                              from '../state/state.js';
import { addGuard, ROUTES, isAuthRoute, AUTH_ROUTES } from '../router.js';

let _booted = false;

export async function boot() {
  if (_booted) return;
  _booted = true;

  // 1. Theme
  initTheme();

  // 2. Auth
  initAuth();

  // 3. State
  loadState();

  // 4. Route guard — runs on every navigate() call
  //    Keeps unauthenticated users on auth routes.
  //    Sends authenticated users who haven't finished onboarding
  //    back to the onboarding flow.
  addGuard((route) => {
    const authed = isAuthenticated();

    // Unauthenticated → must stay on auth screens
    if (!authed && !isAuthRoute(route)) {
      return ROUTES.WELCOME;
    }

    // Authenticated but onboarding incomplete → force onboarding
    // (except when already on auth/onboarding routes)
    if (authed && needsOnboarding() && !isAuthRoute(route)) {
      return ROUTES.ONBOARDING;
    }

    // Authenticated + complete → don't let them hit auth screens
    if (authed && !needsOnboarding() && isAuthRoute(route)
        && route !== ROUTES.ONBOARDING) {
      // Let pick-role and onboarding pass through naturally;
      // redirect away from login/signup/welcome only.
      const publicAuthRoutes = new Set([
        ROUTES.WELCOME, ROUTES.SIGN_IN, ROUTES.SIGN_UP, ROUTES.FORGOT_PASSWORD
      ]);
      if (publicAuthRoutes.has(route)) return null; // handled by app.js start logic
    }

    return null; // allow
  });

  // 5. Service worker (non-blocking)
  _registerSW();
}

function _registerSW() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/performanceiq-platform/sw.js')
      .catch(() => { /* optional in dev */ });
  });
}
