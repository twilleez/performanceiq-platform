/**
 * PerformanceIQ Boot
 * Initial load, state hydration, PWA hooks.
 */
import { initTheme } from './theme.js';
import { initAuth }  from './auth.js';
import { loadState } from '../state/state.js';

let _booted = false;

export async function boot() {
  if (_booted) return;
  _booted = true;
  initTheme();
  initAuth();
  loadState();
  registerSW();
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}
