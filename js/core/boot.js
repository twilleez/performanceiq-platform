/**
 * PerformanceIQ Boot v4
 * Production auth is reconciled with Supabase before route selection and
 * confirmation-link sessions are adopted when Supabase emits SIGNED_IN.
 */
import { initTheme } from './theme.js';
import {
  initAuth,
  reconcileSupabaseSession,
  syncSupabaseSession,
  clearAuthSession,
  isAuthenticated,
  needsOnboarding,
  getCurrentRole,
} from './auth.js';
import { loadState } from '../state/state.js';
import { supabase } from './supabase.js';
import { navigate, ROUTES, ROLE_HOME } from '../router.js';

let _booted = false;

export async function boot() {
  if (_booted) return;
  _booted = true;

  initTheme();
  initAuth();

  // A local production session is only a cache. Confirm/adopt the authoritative
  // Supabase session before app.js chooses the initial route. This also handles
  // email-confirmation redirects where Supabase has a session but PIQ does not.
  await reconcileSupabaseSession();

  loadState();
  _syncSupabaseSession();
  _registerSW();
}

function _syncSupabaseSession() {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      clearAuthSession();
      navigate(ROUTES.WELCOME);
      return;
    }

    // Do not perform Supabase calls directly inside the auth callback. Schedule
    // them for the next task so Supabase's auth lock can finish first.
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
      setTimeout(async () => {
        const synced = await syncSupabaseSession();
        if (!synced || !isAuthenticated()) return;
        if (needsOnboarding()) navigate(ROUTES.ONBOARDING);
        else navigate(ROLE_HOME[getCurrentRole()] || ROUTES.PICK_ROLE);
      }, 0);
    }
  });
}

function _registerSW() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/performanceiq-platform/sw.js')
      .catch(() => {});
  });
}
