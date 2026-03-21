/**
 * PerformanceIQ Theme Engine
 */
const STORAGE_KEY = 'piq_theme';
const VALID = ['light', 'dark', 'system'];
let _current = 'system';
let _listeners = [];

function sysPref() { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
function resolve(t) { return t === 'system' ? sysPref() : t; }
function apply(t) {
  document.documentElement.setAttribute('data-theme', resolve(t));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = resolve(t) === 'dark' ? '#0f1827' : '#0d1b3e';
}

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  _current = VALID.includes(saved) ? saved : 'system';
  apply(_current);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (_current === 'system') apply('system');
  });
}

export function setTheme(t) {
  if (!VALID.includes(t)) return;
  _current = t;
  localStorage.setItem(STORAGE_KEY, t);
  apply(t);
  _listeners.forEach(fn => fn(t, resolve(t)));
}

export function getTheme()          { return _current; }
export function getEffectiveTheme() { return resolve(_current); }
export function isDark()            { return resolve(_current) === 'dark'; }
export function onThemeChange(fn)   { _listeners.push(fn); return () => { _listeners = _listeners.filter(l => l !== fn); }; }
export function cycleTheme() {
  const next = ['light','dark','system'][([ 'light','dark','system'].indexOf(_current) + 1) % 3];
  setTheme(next); return next;
}
export function getThemeIcon() { return _current === 'light' ? '☀️' : _current === 'dark' ? '🌙' : '⚙️'; }
