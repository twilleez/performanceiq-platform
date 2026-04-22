/**
 * PerformanceIQ Boot v2
 * Adds Supabase session sync alongside localStorage hydration.
 */
import { initTheme } from './theme.js';
import { initAuth }  from './auth.js';
import { loadState } from '../state/state.js';
import { supabase }  from './supabase.js';
import { navigate, ROLE_HOME, ROUTES } from '../router.js';

let _booted = false;

export async function boot() {
  if (_booted) return;
  _booted = true;

  // 1. Theme before any paint
  initTheme();

  // 2. Restore localStorage session (fast, synchronous)
  initAuth();

  // 3. Hydrate app state
  loadState();

  // 4. Supabase session sync (async, non-blocking for demo users)
  syncSupabaseSession();

  // 5. PWA service worker
  registerSW();
}

/**
 * Sync Supabase session state with localStorage session.
 * Non-blocking — runs after initial render.
 * Handles tab-restore and token refresh transparently.
 */
async function syncSupabaseSession() {
  const { data: { session } } = await supabase.auth.getSession();

  // Listen for future auth changes (sign in from another tab, token refresh, etc.)
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      localStorage.removeItem('piq_session_v2');
      navigate(ROUTES.WELCOME);
    }
    // SIGNED_IN and TOKEN_REFRESHED are handled by signIn/signUp functions
  });
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/performanceiq-platform/sw.js').catch(() => {});
    });
  }
}
