/**
 * empty-states.js — Fix 09
 *
 * Helper to inject consistent empty states into list containers.
 *
 * Usage:
 *   import { emptyState } from './empty-states.js';
 *
 *   // When a list/container has no items:
 *   emptyState.show(container, 'roster');
 *
 *   // Remove it when items load:
 *   emptyState.clear(container);
 */

// Pre-defined empty states for known views.
// Key = id passed to emptyState.show()
const EMPTY_STATES = {
  roster: {
    icon: '🎽',
    title: 'No athletes yet',
    body: 'Add your first athlete to start tracking their readiness and load.',
    cta: { label: '+ Add Athlete', action: 'add-athlete' }
  },
  sessions: {
    icon: '⚡',
    title: 'No sessions logged',
    body: 'Complete a training session to see your history here.',
    cta: { label: 'Build a Session', action: 'open-training' }
  },
  wellness: {
    icon: '💚',
    title: 'No wellness data yet',
    body: 'Log your first check-in to get your PIQ score and readiness.',
    cta: { label: 'Log Wellness', action: 'open-wellness' }
  },
  exercises: {
    icon: '🏋️',
    title: 'No exercises found',
    body: 'Try adjusting your sport or category filter.',
    cta: { label: 'Reset Filters', action: 'reset-filters' }
  },
  notifications: {
    icon: '🔔',
    title: "You're all caught up",
    body: 'No new notifications.',
    cta: null
  },
  history: {
    icon: '📅',
    title: 'No history yet',
    body: 'Your training and readiness history will appear here after your first logged session.',
    cta: { label: 'Build Your First Session', action: 'open-training' }
  },
  athletes: {
    icon: '👥',
    title: 'No athletes assigned',
    body: "You don't have any athletes linked to your account yet.",
    cta: { label: '+ Add Athlete', action: 'add-athlete' }
  }
};

export const emptyState = {
  /**
   * Show an empty state inside a container element.
   *
   * @param {HTMLElement} container - The list/grid container to show empty state in
   * @param {string} type - Key from EMPTY_STATES, or custom config object
   * @param {boolean} compact - Use compact variant
   */
  show(container, type = 'sessions', compact = false) {
    if (!container) return;
    this.clear(container); // Remove any existing

    const data = typeof type === 'string'
      ? (EMPTY_STATES[type] || EMPTY_STATES.sessions)
      : type;

    const el = document.createElement('div');
    el.className = `piq-empty${compact ? ' piq-empty--compact' : ''} js-piq-empty`;

    el.innerHTML = `
      <div class="piq-empty__icon" aria-hidden="true">${data.icon}</div>
      <div class="piq-empty__title">${data.title}</div>
      <p class="piq-empty__body">${data.body}</p>
      ${data.cta ? `
        <button class="piq-empty__cta" data-empty-action="${data.cta.action}">
          ${data.cta.label}
        </button>
      ` : ''}
    `;

    container.appendChild(el);

    // Wire CTA click — dispatches a custom event your app can listen for
    const btn = el.querySelector('.piq-empty__cta');
    btn?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('piq:empty-cta', {
        detail: { action: data.cta.action },
        bubbles: true
      }));
    });
  },

  /**
   * Remove the empty state from a container.
   */
  clear(container) {
    container?.querySelector('.js-piq-empty')?.remove();
  }
};


/* ══════════════════════════════════════════════════════════
   offline-indicator.js — Fix 10
   Shows online/offline status in the app header.
   ══════════════════════════════════════════════════════════ */

/**
 * Usage:
 *   import { offlineIndicator } from './empty-states.js';
 *   offlineIndicator.init();
 */

export const offlineIndicator = {
  _el: null,

  init() {
    this._render();
    this._update();

    window.addEventListener('online',  () => this._update());
    window.addEventListener('offline', () => this._update());
  },

  _render() {
    // Defer until DOM has content — retry up to 20 times over 2s
    const tryRender = (attempts = 0) => {
      const header =
        document.querySelector('.app-header') ||
        document.querySelector('#app-header') ||
        document.querySelector('header') ||
        document.querySelector('.view-header') ||
        document.querySelector('#app');

      if (!header && attempts < 20) {
        setTimeout(() => tryRender(attempts + 1), 100);
        return;
      }

      // Final fallback: append to body
      const anchor = header || document.body;

      const pill = document.createElement('div');
      pill.id = 'piq-offline-pill';
      pill.setAttribute('aria-live', 'polite');
      pill.setAttribute('aria-atomic', 'true');
      pill.style.cssText = `
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 9000;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 20px;
        font-family: 'DM Sans', sans-serif;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.02em;
        transition: background 0.3s, color 0.3s, opacity 0.5s;
        border: 1px solid transparent;
        pointer-events: none;
      `;

      document.body.appendChild(pill);
      this._el = pill;
      this._update();
    };

    tryRender();
  },

  _update() {
    if (!this._el) return;
    const online = navigator.onLine;

    if (online) {
      this._el.style.background  = 'rgba(0, 229, 153, 0.08)';
      this._el.style.color        = '#00E599';
      this._el.style.borderColor  = 'rgba(0, 229, 153, 0.2)';
      // Online state is subtle — only show briefly then fade
      this._el.style.opacity = '1';
      this._el.innerHTML = `
        <span style="font-size:8px;">●</span>
        Synced
      `;
      // Fade out after 3s — online is the expected state
      clearTimeout(this._fadeTimer);
      this._fadeTimer = setTimeout(() => {
        if (this._el) this._el.style.opacity = '0';
      }, 3000);
    } else {
      clearTimeout(this._fadeTimer);
      this._el.style.background  = 'rgba(255, 209, 102, 0.1)';
      this._el.style.color        = '#FFD166';
      this._el.style.borderColor  = 'rgba(255, 209, 102, 0.25)';
      this._el.style.opacity = '1';
      this._el.innerHTML = `
        <span style="font-size:8px;">●</span>
        Offline Mode — all features available
      `;
    }
  }
};
