/**
 * session-ready.js — Fix 07
 *
 * Shows a "Session Ready" bottom sheet after training generation.
 * Displays exercise count, duration estimate, and intensity label.
 * Primary CTA: Start Session. Secondary: Save for Later.
 *
 * Import and call after your training generator produces a session:
 *   import { sessionReady } from './session-ready.js';
 *
 *   // After generation completes:
 *   sessionReady.show({
 *     exerciseCount: 8,
 *     durationMins: 45,
 *     intensity: 'moderate',   // 'high' | 'moderate' | 'low' | 'recovery'
 *     sport: 'Basketball',
 *     phase: 'In-Season',
 *     onStart: () => beginSession(),
 *     onSave:  () => saveSessionForLater()
 *   });
 */

const INTENSITY_LABELS = {
  high:     { label: '🔥 HIGH INTENSITY',     cls: 'high' },
  moderate: { label: '⚡ MODERATE INTENSITY', cls: 'moderate' },
  low:      { label: '💚 LOW INTENSITY',      cls: 'low' },
  recovery: { label: '🔵 ACTIVE RECOVERY',    cls: 'recovery' }
};

export const sessionReady = {
  _el: null,
  _onStart: null,
  _onSave: null,

  /**
   * Show the session-ready bottom sheet.
   *
   * @param {object} opts
   * @param {number}   opts.exerciseCount  - Number of exercises in session
   * @param {number}   opts.durationMins   - Estimated duration in minutes
   * @param {string}   opts.intensity      - 'high' | 'moderate' | 'low' | 'recovery'
   * @param {string}   [opts.sport]        - Sport name for context
   * @param {string}   [opts.phase]        - PADM phase label
   * @param {Function} [opts.onStart]      - Called when "Start Session" is tapped
   * @param {Function} [opts.onSave]       - Called when "Save for Later" is tapped
   */
  show({ exerciseCount = 0, durationMins = 0, intensity = 'moderate', sport = '', phase = '', onStart, onSave } = {}) {
    this._onStart = onStart;
    this._onSave  = onSave;

    // Remove any existing instance
    this.hide(true);

    const iData = INTENSITY_LABELS[intensity] || INTENSITY_LABELS.moderate;
    const sets = Math.round(exerciseCount * 3); // rough set estimate
    const sportLabel = sport ? `${sport}${phase ? ' · ' + phase : ''}` : (phase || '');

    // Build markup
    const overlay = document.createElement('div');
    overlay.id = 'piq-session-ready';

    overlay.innerHTML = `
      <div class="session-ready-card" role="dialog" aria-modal="true" aria-label="Session Ready">
        <div class="session-ready-handle" aria-hidden="true"></div>

        <div class="session-ready-header">
          <div class="session-ready-check" aria-hidden="true">✓</div>
          <div>
            <div class="session-ready-title">SESSION READY</div>
            <div class="session-ready-subtitle">${sportLabel || 'Your session has been built'}</div>
          </div>
        </div>

        <div class="session-ready-stats">
          <div class="session-stat">
            <div class="session-stat-value">${exerciseCount}</div>
            <div class="session-stat-label">Exercises</div>
          </div>
          <div class="session-stat">
            <div class="session-stat-value">${durationMins}</div>
            <div class="session-stat-label">Est. Mins</div>
          </div>
          <div class="session-stat">
            <div class="session-stat-value">${sets}</div>
            <div class="session-stat-label">Total Sets</div>
          </div>
        </div>

        <div class="session-intensity-badge ${iData.cls}">
          ${iData.label}
        </div>

        <div class="session-ready-actions">
          <button class="session-start-btn" id="piq-session-start">
            <span class="btn-icon" aria-hidden="true">▶</span>
            START SESSION
          </button>
          <button class="session-save-btn" id="piq-session-save">
            Save for Later
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this._el = overlay;

    // Animate in after DOM paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('visible');
      });
    });

    // Wire CTAs
    document.getElementById('piq-session-start')?.addEventListener('click', () => {
      this.hide();
      this._onStart?.();
    });

    document.getElementById('piq-session-save')?.addEventListener('click', () => {
      this.hide();
      this._onSave?.();
    });

    // Dismiss on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hide();
    });

    // Trap focus inside card
    this._trapFocus(overlay);
  },

  /**
   * Hide and remove the session-ready sheet.
   * @param {boolean} immediate - Skip animation if true
   */
  hide(immediate = false) {
    if (!this._el) return;
    const el = this._el;
    this._el = null;

    if (immediate) {
      el.remove();
      return;
    }

    el.classList.remove('visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 500); // fallback
  },

  _trapFocus(container) {
    const focusable = container.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    focusable[0].focus();

    container.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      if (e.key === 'Escape') this.hide();
    });
  }
};
