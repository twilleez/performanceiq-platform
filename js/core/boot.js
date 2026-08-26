/**
 * PerformanceIQ Boot v3
 * Production auth is reconciled with Supabase before route selection.
 */
import { initTheme } from './theme.js';
import { initAuth, reconcileSupabaseSession, clearAuthSession } from './auth.js';
import { loadState } from '../state/state.js';
import { supabase } from './supabase.js';
import { navigate, ROUTES } from '../router.js';

let _booted = false;

export async function boot() {
  if (_booted) return;
  _booted = true;

  initTheme();
  initAuth();

  // A local production session is only a cache. Confirm it against Supabase
  // before app.js decides the initial authenticated route.
  await reconcileSupabaseSession();

  loadState();
  _syncSupabaseSession();
  _registerSW();
}

function _syncSupabaseSession() {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      // Clear both storage and the in-memory auth module state.
      clearAuthSession();
      navigate(ROUTES.WELCOME);
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
