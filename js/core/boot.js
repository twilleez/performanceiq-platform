/**
 * PerformanceIQ Boot
 * Initial load, state hydration, PWA hooks.
 * Called once by app.js before anything renders.
 */

import { initTheme }  from './theme.js';
import { initAuth }   from './auth.js';
import { loadState }  from '../state/state.js';

let _booted = false;

export async function boot() {
  if (_booted) return;
  _booted = true;

  // 1. Theme — apply before any paint to avoid flash
  initTheme();

  // 2. Auth session — restore from localStorage
  initAuth();

  // 3. App state — hydrate from localStorage
  loadState();

  // 4. PWA service worker (non-blocking)
  registerSW();
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW optional — no-op in dev
      });
    });
  }
}
