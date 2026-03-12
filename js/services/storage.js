const KEY = "piq_apple_athlete_mode";
export function saveState(state){ localStorage.setItem(KEY, JSON.stringify(state)); }
export function loadState(){ try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }
