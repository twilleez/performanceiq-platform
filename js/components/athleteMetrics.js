/**
 * PerformanceIQ — Athlete metric display helpers
 * Shared by the signed-in (non-demo) coach and parent screens.
 */
export function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export const hasNum = v => typeof v === 'number' && Number.isFinite(v);
export const num    = v => (hasNum(v) ? String(v) : '—');
export const pct    = v => (hasNum(v) ? `${v}%` : '—');
export function avg(list, key) {
  const values = list.map(a => a?.[key]).filter(hasNum);
  return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null;
}
export function count(list, key, test = () => true) {
  return list.filter(a => hasNum(a?.[key]) && test(a[key])).length;
}
export function byNumberDesc(key) {
  return (a, b) => (hasNum(b?.[key]) ? b[key] : -Infinity) - (hasNum(a?.[key]) ? a[key] : -Infinity);
}
export function readinessTone(value) {
  if (!hasNum(value)) return { color: 'var(--text-muted)', label: 'No check-in today', bg: 'var(--surface-2)' };
  if (value >= 80)    return { color: '#22c955', label: 'Ready',    bg: 'rgba(34,201,85,.15)' };
  if (value >= 60)    return { color: '#f59e0b', label: 'Moderate', bg: 'rgba(245,158,11,.15)' };
  return { color: '#ef4444', label: 'Low', bg: 'rgba(239,68,68,.15)' };
}
const LOAD_COLORS = {
  'danger': '#ef4444', 'spike': '#f59e0b', 'sweet-spot': '#22c955',
  'undertraining': '#3b82f6', 'detraining': '#94a3b8', 'no-data': 'var(--text-muted)',
};
export function loadColor(zone) { return LOAD_COLORS[zone] || 'var(--text-muted)'; }
export function shortDate(value) {
  if (value == null || value === '') return '—';
  let d;
  const m = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export function sparkline(values, color = '#22c955', w = 56, h = 22) {
  const v = (values || []).filter(hasNum);
  if (v.length < 2) return '';
  const min = Math.min(...v), max = Math.max(...v), range = max - min || 1, pad = 3;
  const y = val => h - pad - ((val - min) / range) * (h - pad * 2);
  const pts = v.map((val, i) => `${((i / (v.length - 1)) * w).toFixed(1)},${y(val).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block;flex-shrink:0" role="img" aria-label="Readiness over the last ${v.length} check-ins">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
    <circle cx="${w.toFixed(1)}" cy="${y(v[v.length - 1]).toFixed(1)}" r="2.5" fill="${color}"/>
  </svg>`;
}
export function kpi(label, value, sub, color = 'var(--text-primary)') {
  return `
  <div class="kpi-card">
    <div class="kpi-lbl">${esc(label)}</div>
    <div class="kpi-val" style="color:${color}">${value}</div>
    <div class="kpi-chg">${esc(sub)}</div>
  </div>`;
}
export function syncNotice(cloud = {}, pending = 0) {
  if (!cloud.lastError && !pending) return '';
  const text = cloud.lastError
    ? `Could not refresh from the server (${esc(cloud.lastError)}). Showing the last data saved on this device.`
    : `${pending} item${pending === 1 ? '' : 's'} waiting to upload.`;
  return `<div role="status" style="margin-bottom:14px;padding:10px 14px;border-radius:10px;border:1px solid rgba(245,158,11,.4);background:rgba(245,158,11,.08);font-size:12.5px;color:var(--text-primary)">${text}</div>`;
}
