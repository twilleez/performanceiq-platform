function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function setCSS(name, value) { try { document.documentElement.style.setProperty(name, value); } catch {} }

function hexToRgb(hex) {
  const h = String(hex || '').replace('#','').trim();
  const v = (h.length === 3) ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(v, 16);
  if (!Number.isFinite(n) || v.length !== 6) return { r: 0, g: 0, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function hexToRgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(a)})`;
}
function blendHex(fg, bg, amount) {
  const a = clamp01(amount);
  const A = hexToRgb(fg), B = hexToRgb(bg);
  const r = Math.round(A.r * (1 - a) + B.r * a);
  const g = Math.round(A.g * (1 - a) + B.g * a);
  const b = Math.round(A.b * (1 - a) + B.b * a);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export const SPORT_THEMES = {
  basketball: { accent:'#2EC4B6', blue:'#4a9eff', orange:'#ff6b2b' },
  football:   { accent:'#7CFF57', blue:'#3B82F6', orange:'#F59E0B' },
  soccer:     { accent:'#22C55E', blue:'#60A5FA', orange:'#FB7185' },
  baseball:   { accent:'#EF4444', blue:'#3B82F6', orange:'#F97316' },
  volleyball: { accent:'#A855F7', blue:'#4a9eff', orange:'#F59E0B' },
  track:      { accent:'#00d4aa', blue:'#4a9eff', orange:'#F59E0B' },
};

export function applySportTheme(sport) {
  const theme = SPORT_THEMES[String(sport || '').toLowerCase()] || SPORT_THEMES.basketball;

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const bgHex  = isDark ? '#070b12' : '#ffffff';

  const accent = blendHex(theme.accent, bgHex, isDark ? 0.08 : 0.00);
  const blue   = theme.blue   || '#4a9eff';
  const orange = theme.orange || '#ff6b2b';

  setCSS('--accent', accent);
  setCSS('--blue', blue);
  setCSS('--orange', orange);

  setCSS('--accent-dim',    hexToRgba(accent, 0.11));
  setCSS('--accent-2',      hexToRgba(accent, 0.16));
  setCSS('--accent-glow',   hexToRgba(accent, 0.30));
  setCSS('--accent-border', hexToRgba(accent, 0.22));

  try {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#070b12' : '#f5f7fb');
  } catch {}
}
