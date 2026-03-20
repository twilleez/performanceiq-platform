/**
 * PerformanceIQ — Storage Service
 * ─────────────────────────────────────────────────────────────
 * Safe localStorage read/write helpers.
 *
 * SECTIONS
 *  1. Unguarded helpers  (theme, UI state — fine in demo mode)
 *  2. Guarded helpers    (athlete data — blocked in demo mode)
 *  3. Bulk helpers       (clear / list keys)
 *
 * RULE OF THUMB
 *  • Use saveToStorage()         for preferences & UI state (always OK)
 *  • Use guardedSaveToStorage()  for any data the user "owns" as an athlete
 *    (workouts, check-ins, nutrition logs, roster edits, etc.)
 */

import { assertNotDemo } from '../core/auth.js';

// ── 1. UNGUARDED HELPERS ──────────────────────────────────────
//
// Safe to call regardless of demo mode. Use these for:
//   • Theme preference
//   • Onboarding flags
//   • UI layout preferences
//   • Any non-athlete-data persistence

/**
 * Read a value from localStorage.
 * @template T
 * @param {string} key
 * @param {T}      fallback  Returned when the key is absent or parse fails.
 * @returns {T}
 */
export function loadFromStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

/**
 * Write a value to localStorage (no demo protection).
 * @param {string} key
 * @param {*}      value  Will be JSON-serialised.
 */
export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    // Quota exceeded or private-mode restriction — silently ignore.
  }
}

/**
 * Remove a key from localStorage (no demo protection).
 * @param {string} key
 */
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}


// ── 2. GUARDED HELPERS ────────────────────────────────────────
//
// These wrap assertNotDemo() and return false when the guard fires,
// letting call sites bail cleanly without needing to know about
// demo mode themselves.
//
// Use for:
//   • piq_state_v4   (workout log, readiness check-in, nutrition)
//   • Roster edits
//   • Any data that represents a real athlete's record

/**
 * Write a value to localStorage — blocked in demo mode.
 *
 * Returns true if the write succeeded, false if blocked by the
 * demo guard or if localStorage threw (quota / private mode).
 *
 * @param {string} key
 * @param {*}      value
 * @param {string} [demoMessage]  Custom toast message shown to demo users.
 * @returns {boolean}
 *
 * @example
 * function saveWorkout(log) {
 *   const ok = guardedSaveToStorage('piq_state_v4', state);
 *   if (!ok) return;  // toast was already shown by the guard
 *   toast('Workout saved!', 'success');
 * }
 */
export function guardedSaveToStorage(key, value, demoMessage) {
  if (!assertNotDemo(demoMessage)) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Remove a key from localStorage — blocked in demo mode.
 *
 * Returns true if removal succeeded, false if blocked.
 *
 * @param {string} key
 * @param {string} [demoMessage]
 * @returns {boolean}
 *
 * @example
 * function deleteEntry(id) {
 *   if (!guardedRemoveFromStorage('piq_entry_' + id)) return;
 *   toast('Entry deleted.', 'success');
 * }
 */
export function guardedRemoveFromStorage(key, demoMessage) {
  if (!assertNotDemo(demoMessage)) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (_) {
    return false;
  }
}


// ── 3. BULK HELPERS ───────────────────────────────────────────

/**
 * Clear all localStorage keys.
 * Intentionally NOT guarded — used only by signOut() which is
 * always the user's own action.
 */
export function clearStorage() {
  try {
    localStorage.clear();
  } catch (_) {}
}

/**
 * Return all localStorage keys that start with a given prefix.
 * Useful for enumerating per-entry records.
 *
 * @param {string} prefix
 * @returns {string[]}
 *
 * @example
 * const logKeys = listStorageKeys('piq_log_');
 */
export function listStorageKeys(prefix = '') {
  try {
    return Object.keys(localStorage).filter(k => k.startsWith(prefix));
  } catch (_) {
    return [];
  }
}
