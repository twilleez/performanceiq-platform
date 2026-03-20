/**
 * PerformanceIQ — Bottom Navigation Bar
 * ─────────────────────────────────────────────────────────────
 * Persistent mobile-first nav bar. Role-aware tabs wire directly
 * to the app router via the imported navigate() function.
 *
 * FIXES APPLIED (friction audit)
 *  • Route strings corrected to slash format (coach/home, not coach-home)
 *    to match the ROUTES constants in router.js.
 *  • _listenToRouter() now listens to piq:viewRendered (which app.js
 *    actually dispatches) instead of piq:route-changed (which nothing
 *    dispatches).
 *  • _navigate() calls the imported navigate() directly — no custom
 *    event fallback needed since the router is a peer module.
 *  • 'player' role added as an alias for 'athlete' so both role strings
 *    work without a separate lookup.
 *
 * SECTIONS
 *  1. Tab definitions
 *  2. navBar object — public API
 *  3. Render & DOM helpers
 *  4. Navigation & router sync
 *  5. CSS injection
 */

import { navigate } from '../router.js';

// ── 1. TAB DEFINITIONS ────────────────────────────────────────
//
// Route strings MUST match the slash-format values in ROUTES (router.js).
// Label is uppercase by convention (caps, no periods).

const NAV_TABS = {
  // Athletes on a team
  player: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'player/home'      },
    { id: 'today',     icon: '⚡', label: 'TODAY',     route: 'player/today'     },
    { id: 'log',       icon: '✏️', label: 'LOG',       route: 'player/log'       },
    { id: 'score',     icon: '📊', label: 'SCORE',     route: 'player/score'     },
  ],
  // 'athlete' is kept as an alias — some legacy code may pass this string
  get athlete() { return this.player; },

  coach: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'coach/home'       },
    { id: 'team',      icon: '🎽', label: 'TEAM',      route: 'coach/team'       },
    { id: 'readiness', icon: '💚', label: 'READINESS', route: 'coach/readiness'  },
    { id: 'analytics', icon: '📈', label: 'ANALYTICS', route: 'coach/analytics'  },
  ],

  parent: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'parent/home'      },
    { id: 'child',     icon: '🏅', label: 'ATHLETE',   route: 'parent/child'     },
    { id: 'progress',  icon: '📈', label: 'PROGRESS',  route: 'parent/progress'  },
    { id: 'messages',  icon: '💬', label: 'MESSAGES',  route: 'parent/messages'  },
  ],

  admin: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'admin/home'       },
    { id: 'athletes',  icon: '👥', label: 'ATHLETES',  route: 'admin/athletes'   },
    { id: 'analytics', icon: '📊', label: 'ANALYTICS', route: 'admin/adoption'   },
    { id: 'settings',  icon: '⚙️', label: 'SETTINGS',  route: 'admin/settings'   },
  ],

  solo: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'solo/home'        },
    { id: 'today',     icon: '⚡', label: 'TODAY',     route: 'solo/today'       },
    { id: 'score',     icon: '📊', label: 'SCORE',     route: 'solo/score'       },
    { id: 'readiness', icon: '💚', label: 'READINESS', route: 'solo/readiness'   },
  ],
};


// ── 2. navBar PUBLIC API ──────────────────────────────────────

export const navBar = {
  _role:     null,
  _tabs:     [],
  _activeId: 'home',
  _el:       null,

  /**
   * Mount the nav bar for the given role.
   * Safe to call multiple times — only renders once per session.
   *
   * @param {string} role - 'player' | 'coach' | 'parent' | 'admin' | 'solo'
   */
  init(role = 'player') {
    this._role = role;
    this._tabs = NAV_TABS[role] || NAV_TABS.player;

    // Idempotent — do not render twice
    if (document.getElementById('piq-bottom-nav')) {
      this._el = document.getElementById('piq-bottom-nav');
      return;
    }

    this._injectStyles();
    this._render();
    this._addBodyPadding();
    this._watchKeyboard();
    this._listenToRouter();
  },

  /**
   * Force the active tab by tab id.
   * @param {string} id
   */
  setActive(id) {
    this._activeId = id;
    if (!this._el) return;
    this._el.querySelectorAll('.piq-nav-item').forEach(btn => {
      const active = btn.dataset.nav === id;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
  },

  /**
   * Match the active tab to the current route string.
   * Matches on exact route OR route prefix (handles sub-routes).
   * @param {string} route
   */
  setActiveByRoute(route) {
    if (!route) return;
    // Try exact match first, then prefix match
    const tab =
      this._tabs.find(t => t.route === route) ||
      this._tabs.find(t => route.startsWith(t.route.split('/')[0] + '/'));
    if (tab) this.setActive(tab.id);
  },

  /**
   * Show a badge count on a tab (e.g. unread messages).
   * Pass count = '' or 0 to remove the badge.
   * @param {string} tabId
   * @param {string|number} count
   */
  setBadge(tabId, count) {
    if (!this._el) return;
    const btn = this._el.querySelector(`[data-nav="${tabId}"]`);
    if (!btn) return;
    btn.querySelector('.piq-nav-badge')?.remove();
    if (count) {
      const badge = document.createElement('span');
      badge.className = 'piq-nav-badge';
      badge.textContent = count;
      badge.setAttribute('aria-label', `${count} notifications`);
      btn.appendChild(badge);
    }
  },

  /** Remove the nav bar entirely (e.g. for onboarding or auth screens). */
  destroy() {
    this._el?.remove();
    this._el = null;
    document.body.classList.remove('has-bottom-nav');
  },


  // ── 3. RENDER & DOM HELPERS ─────────────────────────────────

  _render() {
    const nav = document.createElement('nav');
    nav.id = 'piq-bottom-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Main navigation');

    nav.innerHTML = this._tabs.map(tab => `
      <button
        class="piq-nav-item${tab.id === this._activeId ? ' active' : ''}"
        data-nav="${tab.id}"
        data-route="${tab.route}"
        aria-label="${tab.label}"
        aria-current="${tab.id === this._activeId ? 'page' : 'false'}"
        type="button"
      >
        <span class="piq-nav-icon" aria-hidden="true">${tab.icon}</span>
        <span class="piq-nav-label">${tab.label}</span>
      </button>
    `).join('');

    // Single delegated click handler — no per-button listeners
    nav.addEventListener('click', e => {
      const btn = e.target.closest('.piq-nav-item');
      if (!btn) return;
      this.setActive(btn.dataset.nav);
      navigate(btn.dataset.route);
    });

    document.body.appendChild(nav);
    this._el = nav;
  },

  _addBodyPadding() {
    document.body.classList.add('has-bottom-nav');
  },

  /** Collapse the bar when the virtual keyboard pushes the viewport up. */
  _watchKeyboard() {
    if (!window.visualViewport) return;
    window.visualViewport.addEventListener('resize', () => {
      const keyboardOpen = window.visualViewport.height < window.innerHeight * 0.75;
      this._el?.classList.toggle('nav-hidden', keyboardOpen);
    });
  },


  // ── 4. ROUTER SYNC ───────────────────────────────────────────

  _listenToRouter() {
    // piq:viewRendered is dispatched by app.js appView() on every
    // authenticated route render — it carries detail.route.
    // This is the canonical signal that the active route has changed.
    document.addEventListener('piq:viewRendered', e => {
      const route = e.detail?.route;
      if (route) this.setActiveByRoute(route);
    });

    // Fallback: plain hashchange for any direct URL manipulation
    window.addEventListener('hashchange', () => {
      const hash = location.hash.replace(/^#\/?/, '');
      if (hash) this.setActiveByRoute(hash);
    });
  },


  // ── 5. CSS INJECTION ─────────────────────────────────────────
  //
  // Self-contained styles so the component works without an
  // external stylesheet. Injected once per page load.

  _injectStyles() {
    if (document.getElementById('piq-nav-bar-styles')) return;

    const style = document.createElement('style');
    style.id = 'piq-nav-bar-styles';
    style.textContent = `
      #piq-bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        display: flex;
        align-items: stretch;
        background: var(--surface, #0d1b3e);
        border-top: 1px solid var(--border, rgba(255,255,255,0.1));
        height: 60px;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        transition: transform 0.2s ease;
      }

      #piq-bottom-nav.nav-hidden {
        transform: translateY(100%);
      }

      .piq-nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        background: none;
        border: none;
        color: var(--text-muted, rgba(255,255,255,0.45));
        font-family: 'Barlow Condensed', 'Oswald', sans-serif;
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: 0.06em;
        cursor: pointer;
        padding: 8px 4px 6px;
        position: relative;
        transition: color 0.15s ease;
        -webkit-tap-highlight-color: transparent;
      }

      .piq-nav-item:hover,
      .piq-nav-item.active {
        color: var(--piq-green, #22c955);
      }

      .piq-nav-item.active::before {
        content: '';
        position: absolute;
        top: 0;
        left: 20%;
        right: 20%;
        height: 2px;
        background: var(--piq-green, #22c955);
        border-radius: 0 0 3px 3px;
      }

      .piq-nav-icon {
        font-size: 18px;
        line-height: 1;
        display: block;
      }

      .piq-nav-label {
        display: block;
        line-height: 1;
      }

      .piq-nav-badge {
        position: absolute;
        top: 6px;
        right: calc(50% - 18px);
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 8px;
        background: #ef4444;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'DM Sans', sans-serif;
        letter-spacing: 0;
      }

      /* Body padding so content isn't hidden behind the bar */
      body.has-bottom-nav #piq-main,
      body.has-bottom-nav .page-main {
        padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
      }
    `;
    document.head.appendChild(style);
  },
};
