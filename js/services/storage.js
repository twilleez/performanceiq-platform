export const Storage = {
  getRaw(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setRaw(key, val) {
    try { localStorage.setItem(key, val); return true; } catch { return false; }
  },
  getJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); return true; } catch { return false; }
  }
};
