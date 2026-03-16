/**
 * PerformanceIQ Notifications
 * In-app toast system. No dependencies.
 */

let _container = null;

function getContainer() {
  if (_container) return _container;
  _container = document.createElement('div');
  _container.id = 'piq-toasts';
  Object.assign(_container.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '9000',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
    pointerEvents: 'none',
  });
  document.body.appendChild(_container);
  return _container;
}

/**
 * Show a toast.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warn'} type
 * @param {number} duration ms
 */
export function toast(message, type = 'success', duration = 2800) {
  const el = document.createElement('div');

  const colors = {
    success: { bg: 'var(--piq-green)',      color: 'var(--piq-navy)' },
    error:   { bg: '#ef4444',               color: '#fff' },
    warn:    { bg: '#f59e0b',               color: '#1c1400' },
    info:    { bg: 'var(--piq-blue)',        color: '#fff' },
  };
  const { bg, color } = colors[type] || colors.info;

  Object.assign(el.style, {
    background: bg,
    color,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '13.5px',
    fontWeight: '600',
    padding: '11px 22px',
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,.18)',
    pointerEvents: 'auto',
    animation: 'fadeUp .3s var(--ease-spring, cubic-bezier(.22,1,.36,1)) both',
    maxWidth: '380px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  });
  el.textContent = message;

  getContainer().appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = 'opacity .25s, transform .25s';
    setTimeout(() => el.remove(), 260);
  }, duration);
}

export const showToast   = (msg) => toast(msg, 'success');
export const errorToast  = (msg) => toast(msg, 'error');
export const warnToast   = (msg) => toast(msg, 'warn');
export const infoToast   = (msg) => toast(msg, 'info');
