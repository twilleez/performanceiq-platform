/**
 * PerformanceIQ Boot v2
 * Adds Supabase session sync alongside localStorage hydration.
 * All changes are additive — existing behavior is fully preserved.
 */
import { initTheme }                       from './theme.js';
import { initAuth }                        from './auth.js';
import { loadState }                       from '../state/state.js';
import { supabase }                        from './supabase.js';
import { navigate, ROUTES }               from '../router.js';

let _booted = false;

export async function boot() {
  if (_booted) return;
  _booted = true;

  // 1. Theme — must apply before any paint to avoid flash
  initTheme();

  // 2. Auth session — restore from localStorage (fast, synchronous)
  initAuth();

  // 3. App state — hydrate from localStorage
  loadState();

  // 4. Supabase session sync — async, non-blocking
  //    Runs after initial render so it never delays first paint
  _syncSupabaseSession();

  // 5. PWA service worker
  _registerSW();
}

/**
 * Sync Supabase auth state with the app's localStorage session.
 *
 * Responsibilities:
 *   - Listen for sign-out events from other tabs → clear session + redirect
 *   - Listen for token refresh events → no-op (Supabase handles token silently)
 *
 * We do NOT re-fetch the profile on every auth event to avoid
 * re-triggering the router guard on token refresh.
 */
function _syncSupabaseSession() {
  supabase.auth.onAuthStateChange((event, _session) => {
    if (event === 'SIGNED_OUT') {
      // Another tab signed out — clear our local session too
      localStorage.removeItem('piq_session_v2');
      navigate(ROUTES.WELCOME);
    }
    // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED:
    // handled by signIn/signUp in auth.js — no action needed here
  });
}

function _registerSW() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/performanceiq-platform/sw.js')
      .catch(() => {
        // SW is optional — fail silently in dev and non-HTTPS environments
      });
  });
}
