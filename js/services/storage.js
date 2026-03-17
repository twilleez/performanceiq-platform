/**
 * PerformanceIQ Storage Service
 * Safe localStorage read/write helpers.
 */

export function loadFromStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) { return fallback; }
}

export function saveToStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (_) { /* quota exceeded / private mode */ }
}

export function removeFromStorage(key) {
  try { localStorage.removeItem(key); }
  catch (_) {}
}

export function clearStorage() {
  try { localStorage.clear(); }
  catch (_) {}
}
