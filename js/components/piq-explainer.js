/**
 * piq-explainer.js — Fix 03
 *
 * Shows a one-time tooltip on the PIQ ring for first-time users.
 * Uses localStorage to track seen state. Never shows again after dismiss.
 *
 * Import and call after dashboard renders:
 *   import { piqExplainer } from './piq-explainer.js';
 *   piqExplainer.init();
 *
 * Requires:
 *   - A DOM element with id="piq-ring" (or data-piq-ring attribute)
 *     on the athlete dashboard.
 *   - tooltips.css linked in <head>.
 */

const STORAGE_KEY = 'piq_explainer_seen';

export const piqExplainer = {
  /**
   * Initialize — shows explainer on first visit only.
   * Call this after the athlete dashboard has rendered.
   */
  init() {
    // Only show for athlete role, only on first visit
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Wait one render tick so the ring is painted before we anchor to it
    requestAnimationFrame(() => {
      setTimeout(() => this._show(), 400);
    });
  },

  _show() {
    // Find the PIQ ring anchor — try common selectors from the codebase
    const anchor =
      document.getElementById('piq-ring') ||
      document.querySelector('[data-piq-ring]') ||
      document.querySelector('.piq-ring') ||
      document.querySelector('.piq-score-ring');

    if (!anchor) return; // Dashboard not rendered or wrong role — bail silently

    // Build the tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'piq-explainer-tooltip';
    tooltip.className = 'piq-tooltip piq-tooltip--explainer';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-live', 'polite');

    tooltip.innerHTML = `
      <div class="piq-tooltip__arrow"></div>
      <div class="piq-tooltip__header">
        <span class="piq-tooltip__icon">⚡</span>
        <span class="piq-tooltip__title">Your PIQ Score</span>
      </div>
      <p class="piq-tooltip__body">
        Reflects your readiness to train <em>today</em> — calculated from
        your wellness inputs, training load, and recovery data.
        The higher the score, the more your body is ready to perform.
      </p>
      <button class="piq-tooltip__dismiss" id="piq-explainer-dismiss">
        Got it
      </button>
    `;

    document.body.appendChild(tooltip);

    // Position the tooltip below/beside the ring
    this._position(tooltip, anchor);

    // Reposition on resize
    const reposition = () => this._position(tooltip, anchor);
    window.addEventListener('resize', reposition, { passive: true });

    // Dismiss handler
    const dismiss = document.getElementById('piq-explainer-dismiss');
    dismiss?.addEventListener('click', () => {
      this._dismiss(tooltip);
      window.removeEventListener('resize', reposition);
    });

    // Also dismiss on outside click (after 1s delay to prevent instant dismiss)
    setTimeout(() => {
      const outsideClick = (e) => {
        if (!tooltip.contains(e.target)) {
          this._dismiss(tooltip);
          window.removeEventListener('resize', reposition);
          document.removeEventListener('click', outsideClick);
        }
      };
      document.addEventListener('click', outsideClick);
    }, 1000);

    // Animate in
    requestAnimationFrame(() => {
      tooltip.classList.add('piq-tooltip--visible');
    });
  },

  _position(tooltip, anchor) {
    const rect = anchor.getBoundingClientRect();
    const tooltipW = 260;
    const gap = 12;

    // Default: below the ring, centered
    let top = rect.bottom + gap + window.scrollY;
    let left = rect.left + rect.width / 2 - tooltipW / 2 + window.scrollX;

    // Clamp to viewport
    const vw = window.innerWidth;
    if (left < 12) left = 12;
    if (left + tooltipW > vw - 12) left = vw - tooltipW - 12;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.width = `${tooltipW}px`;
  },

  _dismiss(tooltip) {
    tooltip.classList.remove('piq-tooltip--visible');
    tooltip.classList.add('piq-tooltip--hiding');
    localStorage.setItem(STORAGE_KEY, '1');
    setTimeout(() => tooltip.remove(), 300);
  },

  /**
   * Dev helper — reset seen state so explainer shows again.
   * Call from browser console: piqExplainer.reset()
   */
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[PIQ] Explainer reset. Refresh to see it again.');
  }
};
