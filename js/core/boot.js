/**
 * PerformanceIQ Boot
 * initAuth is now async (Supabase session restore).
 * Everything else unchanged.
 */

import { initTheme }  from './theme.js';
import { initAuth }   from './auth.js';
import { loadState }  from '../state/state.js';

let _booted = false;

export async function boot() {
  if (_booted) return;
  _booted = true;

  // 1. Theme first — prevents flash before any auth check
  initTheme();

  // 2. Auth — now async, waits for Supabase session restore
  //    Demo sessions resolve instantly from localStorage.
  //    Real sessions do one network call to Supabase.
  await initAuth();

  // 3. App state — hydrate from localStorage
  loadState();

  // 4. PWA service worker (non-blocking)
  _registerSW();
}

function _registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/performanceiq-platform/sw.js').catch(() => {
        // SW is optional — no-op in dev or when file missing
      });
    });
  }
}
