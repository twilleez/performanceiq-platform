/**
 * notifications.js — Animated toast system
 *
 * UX FIXES:
 * [Fix-8]  Animated slide-in/fade-out toasts with progress bar
 * [Fix-15] Animated save confirmations with checkmark
 */

let _toastEl = null;
let _toastTimer = null;
let _progressTimer = null;

function _ensureContainer() {
  if (_toastEl) return _toastEl;
  _toastEl = document.createElement('div');
  _toastEl.id = 'piq-toast';
  _toastEl.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    z-index: 9999;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.22s ease, transform 0.22s ease;
    min-width: 220px;
    max-width: 360px;
  `;
  document.body.appendChild(_toastEl);
  return _toastEl;
}

/**
 * showToast(message, type)
 * type: 'success' | 'info' | 'warn' | 'error'
 *
 * [Fix-8] Slide-in from bottom, holds for 2.8s, fade-out.
 * Progress bar depletes across the hold duration.
 */
export function showToast(message, type = 'success') {
  const el = _ensureContainer();

  clearTimeout(_toastTimer);
  clearTimeout(_progressTimer);

  const colors = {
    success: { bg: '#0d1b3e', accent: '#22c955', icon: '✓' },
    info:    { bg: '#0d1b3e', accent: '#3b82f6', icon: 'ℹ' },
    warn:    { bg: '#0d1b3e', accent: '#f59e0b', icon: '⚠' },
    error:   { bg: '#1a0a0a', accent: '#ef4444', icon: '✕' },
  };
  const c = colors[type] || colors.success;

  el.innerHTML = `
    <div style="
      background: ${c.bg};
      border: 1px solid ${c.accent}44;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
      overflow: hidden;
      position: relative;
    ">
      <div style="
        width: 22px; height: 22px;
        border-radius: 50%;
        background: ${c.accent}22;
        border: 1.5px solid ${c.accent};
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 700; color: ${c.accent};
        flex-shrink: 0;
      ">${c.icon}</div>
      <span style="font-size: 13.5px; font-weight: 600; color: #fff; flex: 1; line-height: 1.4;">${message}</span>
      <div id="toast-progress" style="
        position: absolute;
        bottom: 0; left: 0;
        height: 2px;
        background: ${c.accent};
        width: 100%;
        border-radius: 0 0 12px 12px;
        transition: width 2.6s linear;
      "></div>
    </div>
  `;

  el.style.opacity = '0';
  el.style.transform = 'translateX(-50%) translateY(20px)';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(0)';
    });
  });

  // Start progress bar depletion
  _progressTimer = setTimeout(() => {
    const bar = document.getElementById('toast-progress');
    if (bar) bar.style.width = '0%';
  }, 50);

  // Dismiss
  _toastTimer = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(10px)';
  }, 2800);
}

/**
 * showSaveConfirmation(buttonEl, successText)
 * [Fix-15] Replaces button text with animated checkmark, then restores.
 */
export function showSaveConfirmation(buttonEl, successText = 'Saved') {
  if (!buttonEl) return;
  const original = buttonEl.textContent;
  const origBg   = buttonEl.style.background;
  buttonEl.disabled = true;
  buttonEl.innerHTML = `
    <span style="display:inline-flex;align-items:center;gap:6px">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="animation:piq-check-draw 0.3s ease forwards">
        <circle cx="7" cy="7" r="6" stroke="#0d1b3e" stroke-width="1.5"/>
        <path d="M4 7l2.5 2.5L10 5" stroke="#0d1b3e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ${successText}
    </span>
  `;
  buttonEl.style.background = 'var(--piq-green)';
  buttonEl.style.color = '#0d1b3e';

  if (!document.getElementById('piq-check-keyframes')) {
    const s = document.createElement('style');
    s.id = 'piq-check-keyframes';
    s.textContent = `
      @keyframes piq-check-draw {
        from { opacity: 0; transform: scale(0.6); }
        to   { opacity: 1; transform: scale(1); }
      }
      @keyframes piq-toast-in {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(s);
  }

  setTimeout(() => {
    buttonEl.disabled = false;
    buttonEl.textContent = original;
    buttonEl.style.background = origBg;
    buttonEl.style.color = '';
  }, 2500);
}

/**
 * showAlert(containerId, message, type)
 * Inline alert banner inside a container element.
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

  document.querySelector(`#${containerId} .piq-alert-banner`)?.remove();

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
    opacity: 0;
    transition: opacity 0.2s ease;
  `;
  banner.textContent = message;
  container.insertAdjacentElement('afterbegin', banner);
  requestAnimationFrame(() => { banner.style.opacity = '1'; });
  setTimeout(() => {
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 220);
  }, 5000);
}

export function setNavBadge(route, count) {
  const link = document.querySelector(`[data-route="${route}"]`);
  if (!link) return;
  let badge = link.querySelector('.piq-nav-badge');
  if (count <= 0) { if (badge) badge.remove(); return; }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'piq-nav-badge';
    badge.style.cssText = `
      display:inline-flex;align-items:center;justify-content:center;
      min-width:18px;height:18px;padding:0 5px;border-radius:9px;
      background:#ef4444;color:#fff;font-size:10px;font-weight:700;margin-left:auto;
    `;
    link.appendChild(badge);
  }
  badge.textContent = count > 99 ? '99+' : String(count);
}
