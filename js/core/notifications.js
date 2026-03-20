/**
 * PerformanceIQ Notifications — Toast utility
 */
let _timer = null;

export function showToast(message, type = 'success', duration = 3000) {
  document.getElementById('piq-toast')?.remove();
  if (_timer) clearTimeout(_timer);

  const colors = {
    success: { bg: '#22c955', text: '#0d1b3e', icon: '✅' },
    error:   { bg: '#ef4444', text: '#fff',    icon: '❌' },
    info:    { bg: '#3b82f6', text: '#fff',    icon: 'ℹ️' },
    warning: { bg: '#f59e0b', text: '#0d1b3e', icon: '⚠️' },
    warn:    { bg: '#f59e0b', text: '#0d1b3e', icon: '⚠️' },
  };
  const c = colors[type] || colors.success;
  const el = document.createElement('div');
  el.id = 'piq-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);
    background:${c.bg};color:${c.text};padding:12px 20px;border-radius:12px;font-size:13.5px;
    font-weight:600;font-family:'Barlow',sans-serif;display:flex;align-items:center;gap:8px;
    box-shadow:0 8px 32px rgba(0,0,0,.35);z-index:99999;max-width:90vw;white-space:nowrap;
    transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .3s ease;opacity:0`;
  el.innerHTML = `<span>${c.icon}</span><span>${message}</span>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transform = 'translateX(-50%) translateY(0)';
    el.style.opacity = '1';
  }));
  _timer = setTimeout(() => {
    el.style.transform = 'translateX(-50%) translateY(80px)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 350);
  }, duration);
}

export const errorToast = (m) => showToast(m, 'error');
export const warnToast  = (m) => showToast(m, 'warn');
export const infoToast  = (m) => showToast(m, 'info');
