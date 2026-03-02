import { THEME_KEY } from '../state/keys.js';
import { Storage } from '../services/storage.js';
import { dom } from './dom.js';

export function getThemePref() {
  const saved = (Storage.getRaw(THEME_KEY) || '').toLowerCase();
  if (saved === 'light' || saved === 'dark') return saved;

  const domTheme = (document.documentElement.getAttribute('data-theme') || '').toLowerCase();
  return (domTheme === 'light' || domTheme === 'dark') ? domTheme : 'dark';
}

export function applyTheme(theme) {
  const t = (theme === 'light') ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  Storage.setRaw(THEME_KEY, t);

  if (dom.btnTheme) dom.btnTheme.textContent = (t === 'dark') ? '🌙' : '☀️';
  if (dom.settingTheme) dom.settingTheme.value = t;
}

export function toggleTheme() {
  applyTheme(getThemePref() === 'dark' ? 'light' : 'dark');
}
