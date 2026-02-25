// dataStore.js — v2.0.0
// Offline-first localStorage store with a stable API.
// core.js will mount window.PIQ.getState / saveState; this file provides fallback utilities.

(function () {
  "use strict";

  if (window.__PIQ_DATASTORE__) return;
  window.__PIQ_DATASTORE__ = true;

  const FALLBACK_KEY = "piq_v2_state";

  function safeParse(raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }

  window.PIQ_STORE = window.PIQ_STORE || {
    key: FALLBACK_KEY,
    read() {
      const raw = localStorage.getItem(FALLBACK_KEY);
      return raw ? safeParse(raw) : null;
    },
    write(obj) {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(obj));
    }
  };
})();
