import { DEFAULT_STATE } from '../state/state.js';
const KEY = 'piq_phase12_state';
const clone = (obj) => JSON.parse(JSON.stringify(obj));
export function loadState(){
  try { const raw = localStorage.getItem(KEY); return raw ? { ...clone(DEFAULT_STATE), ...JSON.parse(raw) } : clone(DEFAULT_STATE); }
  catch { return clone(DEFAULT_STATE); }
}
export function saveState(state){ localStorage.setItem(KEY, JSON.stringify(state)); }
export function resetState(){ localStorage.removeItem(KEY); return clone(DEFAULT_STATE); }
