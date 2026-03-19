/**
 * state.js — Phase 15C
 * Simple key-value store with persistence.
 */

const _store = {};
const _listeners = {};

export const state = {
  get(key) {
    return _store[key] ?? null;
  },

  set(key, value) {
    _store[key] = value;
    (_listeners[key] || []).forEach(fn => fn(value));
    _persist();
  },

  on(key, fn) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(fn);
    return () => {
      _listeners[key] = _listeners[key].filter(f => f !== fn);
    };
  },

  getAll() {
    return { ..._store };
  }
};

function _persist() {
  try {
    const toSave = {
      role:        _store.role,
      sport:       _store.sport,
      seasonPhase: _store.seasonPhase,
      onboarded:   _store.onboarded,
      logs:        _store.logs,
      wellness:    _store.wellness,
      athletes:    _store.athletes,
      sessions:    _store.sessions,
    };
    localStorage.setItem('PIQ_STATE_v1', JSON.stringify(toSave));
  } catch (e) {
    console.warn('[PIQ] State persist failed:', e);
  }
}
