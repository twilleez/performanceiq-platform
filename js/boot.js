// /js/boot.js
// FIX: top-level await requires "type=module" AND a supporting environment.
// Wrapped in async IIFE for maximum compatibility and added proper error boundary.

import { initApp } from './app.js';

function safeHideLoader() {
  try {
    const el = document.getElementById('loadingScreen');
    if (!el) return;
    el.style.display = 'none';
    el.style.pointerEvents = 'none';
  } catch {}
}

(async () => {
  try {
    await initApp();
  } catch (err) {
    console.error('[PIQ] boot failed', err);
    safeHideLoader();
  }
})();
