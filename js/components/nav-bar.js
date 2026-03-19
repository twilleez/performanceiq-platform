/**
 * nav-bar.js — Fix 06
 *
 * Persistent bottom navigation bar for PerformanceIQ.
 * Renders role-appropriate tabs and wires up to existing router.
 *
 * Import and call after role is set and app shell renders:
 *   import { navBar } from './nav-bar.js';
 *   navBar.init(role, router);
 *
 * @param {string} role - 'athlete' | 'coach' | 'parent' | 'admin'
 * @param {object} router - your existing router object with navigate() method
 */

// Tab definitions per role.
// 'route' values must match your existing router's route keys/paths.
const NAV_TABS = {
  athlete: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'dashboard' },
    { id: 'train',     icon: '⚡', label: 'TRAIN',     route: 'training' },
    { id: 'track',     icon: '📊', label: 'TRACK',     route: 'wellness' },
    { id: 'nutrition', icon: '🥗', label: 'NUTRITION', route: 'nutrition' },
  ],
  coach: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'dashboard' },
    { id: 'team',      icon: '🎽', label: 'TEAM',      route: 'team' },
    { id: 'train',     icon: '⚡', label: 'TRAIN',     route: 'training' },
    { id: 'track',     icon: '📊', label: 'TRACK',     route: 'analytics' },
  ],
  parent: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'dashboard' },
    { id: 'athlete',   icon: '⚡', label: 'ATHLETE',   route: 'athlete-view' },
    { id: 'wellness',  icon: '💚', label: 'WELLNESS',  route: 'wellness' },
    { id: 'history',   icon: '📅', label: 'HISTORY',   route: 'history' },
  ],
  admin: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'dashboard' },
    { id: 'users',     icon: '👥', label: 'USERS',     route: 'users' },
    { id: 'analytics', icon: '📊', label: 'ANALYTICS', route: 'analytics' },
    { id: 'settings',  icon: '⚙️', label: 'SETTINGS',  route: 'settings' },
  ]
};

export const navBar = {
  _role: null,
  _router: null,
  _tabs: [],
  _activeId: 'home',
  _el: null,

  /**
   * Initialize and render the nav bar.
   *
   * @param {string} role - User role
   * @param {object} router - Router with navigate(route) method.
   *   If your router is different, see _navigate() below.
   */
  init(role = 'athlete', router = null) {
    this._role = role;
    this._router = router;
    this._tabs = NAV_TABS[role] || NAV_TABS.athlete;

    // Don't render twice
    if (document.getElementById('piq-bottom-nav')) return;

    this._render();
    this._addBodyPadding();
    this._watchKeyboard();
    this._listenToRouter();
  },

  _render() {
    const nav = document.createElement('nav');
    nav.id = 'piq-bottom-nav';
    nav.setAttribute('aria-label', 'Main navigation');

    nav.innerHTML = this._tabs.map(tab => `
      <button
        class="piq-nav-item${tab.id === this._activeId ? ' active' : ''}"
        data-nav="${tab.id}"
        data-route="${tab.route}"
        aria-label="${tab.label}"
        aria-current="${tab.id === this._activeId ? 'page' : 'false'}"
      >
        <span class="piq-nav-icon" aria-hidden="true">${tab.icon}</span>
        <span class="piq-nav-label">${tab.label}</span>
      </button>
    `).join('');

    document.body.appendChild(nav);
    this._el = nav;

    // Wire up click handlers
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.piq-nav-item');
      if (!btn) return;
      const id = btn.dataset.nav;
      const route = btn.dataset.route;
      this.setActive(id);
      this._navigate(route);
    });
  },

  /**
   * Set the active tab by id.
   * Call this from your router when the route changes.
   */
  setActive(id) {
    this._activeId = id;
    if (!this._el) return;

    this._el.querySelectorAll('.piq-nav-item').forEach(btn => {
      const isActive = btn.dataset.nav === id;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  },

  /**
   * Set active tab by route string.
   * Useful when router navigates programmatically.
   */
  setActiveByRoute(route) {
    const tab = this._tabs.find(t => t.route === route);
    if (tab) this.setActive(tab.id);
  },

  /**
   * Show a notification badge on a tab.
   * @param {string} tabId - e.g. 'team'
   * @param {number|string} count - badge text ('' to clear)
   */
  setBadge(tabId, count) {
    if (!this._el) return;
    const btn = this._el.querySelector(`[data-nav="${tabId}"]`);
    if (!btn) return;

    const existing = btn.querySelector('.piq-nav-badge');
    if (existing) existing.remove();

    if (count) {
      const badge = document.createElement('span');
      badge.className = 'piq-nav-badge';
      badge.textContent = count;
      badge.setAttribute('aria-label', `${count} notifications`);
      btn.appendChild(badge);
    }
  },

  /**
   * Navigate — wires to your existing router.
   * Adjust this method to match your router's API.
   */
  _navigate(route) {
    if (this._router?.navigate) {
      this._router.navigate(route);
    } else if (this._router?.push) {
      this._router.push(route);
    } else if (this._router?.go) {
      this._router.go(route);
    } else {
      // Fallback: dispatch a custom event your router can listen to
      document.dispatchEvent(new CustomEvent('piq:navigate', {
        detail: { route },
        bubbles: true
      }));
    }
  },

  /**
   * Listen to router events to keep active state in sync.
   * Adjust event name to match your router's change event.
   */
  _listenToRouter() {
    // Listen for the custom event dispatched by your router on route change
    document.addEventListener('piq:route-changed', (e) => {
      if (e.detail?.route) {
        this.setActiveByRoute(e.detail.route);
      }
    });

    // Also listen for hashchange as a fallback
    window.addEventListener('hashchange', () => {
      const hash = location.hash.replace('#', '').replace('/', '');
      this.setActiveByRoute(hash);
    });
  },

  _addBodyPadding() {
    document.body.classList.add('has-bottom-nav');
  },

  /** Hide the nav when the virtual keyboard is open (mobile) */
  _watchKeyboard() {
    if (!window.visualViewport) return;
    window.visualViewport.addEventListener('resize', () => {
      const keyboardOpen = window.visualViewport.height < window.innerHeight * 0.75;
      this._el?.classList.toggle('nav-hidden', keyboardOpen);
    });
  },

  /** Programmatically destroy (useful for admin/onboarding screens) */
  destroy() {
    this._el?.remove();
    this._el = null;
    document.body.classList.remove('has-bottom-nav');
  }
};
