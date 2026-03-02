// /js/services/storage.js
// Safe localStorage wrapper with error boundaries and JSON helpers.

export const Storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      console.warn("[Storage.get] failed", err);
      throw err;
    }
  },

  set(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (err) {
      console.warn("[Storage.set] failed", err);
      throw err;
    }
  },

  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn("[Storage.remove] failed", err);
      throw err;
    }
  },

  getJSON(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn("[Storage.getJSON] failed", err);
      return fallback;
    }
  },

  setJSON(key, obj) {
    try {
      window.localStorage.setItem(key, JSON.stringify(obj));
      return true;
    } catch (err) {
      console.warn("[Storage.setJSON] failed", err);
      return false;
    }
  }
};
