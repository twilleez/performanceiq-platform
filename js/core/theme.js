/**
 * PerformanceIQ Theme Engine
 * Supports 'light' | 'dark' | 'system'
 */

const STORAGE_KEY = 'piq_theme';
const VALID_THEMES = ['light', 'dark', 'system'];

let _currentTheme = 'system';
let _listeners    = [];

// ── HELPERS ──────────────────────────────────────────────────
function getSystemPreference() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveEffectiveTheme(theme) {
  return theme === 'system' ? getSystemPreference() : theme;
}

function applyTheme(theme) {
  const effective = resolveEffectiveTheme(theme);
  document.documentElement.setAttribute('data-theme', effective);

  // Update meta theme-color for browser chrome
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', effective === 'dark' ? '#0f1827' : '#0d1b3e');
}

// ── PUBLIC API ───────────────────────────────────────────────
export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  _currentTheme = VALID_THEMES.includes(saved) ? saved : 'system';
  applyTheme(_currentTheme);

  // React to OS-level changes when theme is 'system'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (_currentTheme === 'system') applyTheme('system');
  });
}

export function setTheme(theme) {
  if (!VALID_THEMES.includes(theme)) return;
  _currentTheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  _listeners.forEach(fn => fn(theme, resolveEffectiveTheme(theme)));
}

export function getTheme()          { return _currentTheme; }
export function getEffectiveTheme() { return resolveEffectiveTheme(_currentTheme); }
export function isDark()            { return getEffectiveTheme() === 'dark'; }

export function onThemeChange(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

/** Cycle: light → dark → system */
export function cycleTheme() {
  const order = ['light', 'dark', 'system'];
  const next  = order[(order.indexOf(_currentTheme) + 1) % order.length];
  setTheme(next);
  return next;
}

export function getThemeIcon() {
  return _currentTheme === 'light' ? '☀️' :
         _currentTheme === 'dark'  ? '🌙' : '⚙️';
}
