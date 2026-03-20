/**
 * PerformanceIQ — Notifications & Toast Utility
 * Provides showToast, showAlert, and badge helpers used across all views.
 */

// ── TOAST ─────────────────────────────────────────────────────
let _toastTimer = null;

/**
 * Show a toast notification at the bottom of the screen.
 * @param {string} message  - Text to display
 * @param {'success'|'error'|'info'|'warning'} type - Visual style
 * @param {number} duration - Auto-dismiss delay in ms (default 3000)
 */
export function showToast(message, type = 'success', duration = 3000) {
  // Remove any existing toast
  const existing = document.getElementById('piq-toast');
  if (existing) existing.remove();
  if (_toastTimer) clearTimeout(_toastTimer);

  const colors = {
    success: { bg: '#22c955', text: '#0d1b3e', icon: '✅' },
    error:   { bg: '#ef4444', text: '#fff',    icon: '❌' },
    info:    { bg: '#3b82f6', text: '#fff',    icon: 'ℹ️' },
    warning: { bg: '#f59e0b', text: '#0d1b3e', icon: '⚠️' },
  };
  const c = colors[type] || colors.success;

  const toast = document.createElement('div');
  toast.id = 'piq-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(80px);
    background: ${c.bg};
    color: ${c.text};
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 13.5px;
    font-weight: 600;
    font-family: 'Barlow', sans-serif;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,.35);
    z-index: 99999;
    max-width: 90vw;
    white-space: nowrap;
    transition: transform .3s cubic-bezier(.34,1.56,.64,1), opacity .3s ease;
    opacity: 0;
  `;
  toast.innerHTML = `<span>${c.icon}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
      toast.style.opacity = '1';
    });
  });

  // Auto-dismiss
  _toastTimer = setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(80px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ── ALERT BANNER ──────────────────────────────────────────────
/**
 * Show an inline alert banner inside a container element.
 * @param {string} containerId - ID of the container element
 * @param {string} message     - Alert text
 * @param {'success'|'error'|'info'|'warning'} type
 */
export function showAlert(containerId, message, type = 'info') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const colors = {
    success: { border: '#22c955', bg: 'rgba(34,201,85,.08)',  text: '#22c955' },
    error:   { border: '#ef4444', bg: 'rgba(239,68,68,.08)',  text: '#ef4444' },
    info:    { border: '#3b82f6', bg: 'rgba(59,130,246,.08)', text: '#3b82f6' },
    warning: { border: '#f59e0b', bg: 'rgba(245,158,11,.08)', text: '#f59e0b' },
  };
  const c = colors[type] || colors.info;

  const existing = container.querySelector('.piq-alert-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.className = 'piq-alert-banner';
  banner.style.cssText = `
    padding: 10px 14px;
    border-radius: 8px;
    border-left: 3px solid ${c.border};
    background: ${c.bg};
    color: ${c.text};
    font-size: 12.5px;
    font-weight: 600;
    margin-bottom: 12px;
  `;
  banner.textContent = message;
  container.insertAdjacentElement('afterbegin', banner);

  // Auto-remove after 5s
  setTimeout(() => banner.remove(), 5000);
}

// ── BADGE COUNTER ─────────────────────────────────────────────
/**
 * Update a numeric badge on a nav item.
 * @param {string} route - Route string matching data-route attribute
 * @param {number} count - Badge count (0 removes the badge)
 */
export function setNavBadge(route, count) {
  const link = document.querySelector(`[data-route="${route}"]`);
  if (!link) return;

  let badge = link.querySelector('.piq-nav-badge');
  if (count <= 0) {
    if (badge) badge.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'piq-nav-badge';
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      background: #ef4444;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      margin-left: auto;
    `;
    link.appendChild(badge);
  }
  badge.textContent = count > 99 ? '99+' : String(count);
}

// ── CONFIRM DIALOG ────────────────────────────────────────────
/**
 * Show a simple confirmation dialog.
 * @param {string} message   - Question to display
 * @param {Function} onConfirm - Called if user confirms
 * @param {Function} [onCancel] - Called if user cancels
 */
export function showConfirm(message, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99998;
    background: rgba(0,0,0,.6);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
  `;

  overlay.innerHTML = `
    <div style="
      background: var(--surface-1, #1a2540);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 16px;
      padding: 28px 24px;
      max-width: 360px;
      width: 100%;
      text-align: center;
    ">
      <div style="font-size:32px;margin-bottom:12px">⚠️</div>
      <p style="font-size:14px;font-weight:600;color:var(--text-primary,#fff);margin:0 0 20px">${message}</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button id="piq-confirm-cancel" style="
          flex:1; padding:10px; border-radius:8px;
          border:1px solid rgba(255,255,255,.15);
          background:transparent; color:var(--text-muted,#aaa);
          font-size:13px; font-weight:600; cursor:pointer;
        ">Cancel</button>
        <button id="piq-confirm-ok" style="
          flex:1; padding:10px; border-radius:8px;
          border:none; background:#ef4444; color:#fff;
          font-size:13px; font-weight:600; cursor:pointer;
        ">Confirm</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#piq-confirm-ok').addEventListener('click', () => {
    overlay.remove();
    if (typeof onConfirm === 'function') onConfirm();
  });
  overlay.querySelector('#piq-confirm-cancel').addEventListener('click', () => {
    overlay.remove();
    if (typeof onCancel === 'function') onCancel();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (typeof onCancel === 'function') onCancel();
    }
  });
}
