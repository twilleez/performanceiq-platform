/**
 * nav-bar.js  (remediated)
 *
 * Changes from prior version:
 *   All NAV_TABS route strings corrected from hyphenated format ('player-home')
 *   to the slash-separated format used by ROUTES constants ('player/home').
 *   The hyphenated strings never matched any VIEW_MAP entry, so every bottom-nav
 *   tap silently fell through to the role-home fallback.
 *
 *   Route strings now directly mirror router.js ROUTES values. If ROUTES ever
 *   change, update both files — or better, import ROUTES here directly:
 *     import { ROUTES } from '../router.js';
 *   and reference e.g. ROUTES.PLAYER_HOME instead of the string literal.
 */

const NAV_TABS = {
  athlete: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'player/home' },
    { id: 'train',     icon: '⚡', label: 'TRAIN',     route: 'player/today' },
    { id: 'track',     icon: '📊', label: 'TRACK',     route: 'player/score' },
    { id: 'nutrition', icon: '🥗', label: 'NUTRITION', route: 'player/nutrition' },
  ],
  // 'player' is an alias for 'athlete' — both map to the player workspace
  player: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'player/home' },
    { id: 'train',     icon: '⚡', label: 'TRAIN',     route: 'player/today' },
    { id: 'track',     icon: '📊', label: 'TRACK',     route: 'player/score' },
    { id: 'nutrition', icon: '🥗', label: 'NUTRITION', route: 'player/nutrition' },
  ],
  coach: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'coach/home' },
    { id: 'team',      icon: '🎽', label: 'TEAM',      route: 'coach/team' },
    { id: 'readiness', icon: '💚', label: 'READINESS', route: 'coach/readiness' },
    { id: 'analytics', icon: '📊', label: 'ANALYTICS', route: 'coach/analytics' },
  ],
  parent: [
    { id: 'home',     icon: '🏠', label: 'HOME',     route: 'parent/home' },
    { id: 'athlete',  icon: '⚡', label: 'ATHLETE',  route: 'parent/child' },
    { id: 'wellness', icon: '💚', label: 'WELLNESS', route: 'parent/wellness' },
    { id: 'progress', icon: '📈', label: 'PROGRESS', route: 'parent/progress' },
  ],
  admin: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'admin/home' },
    { id: 'athletes',  icon: '🏃', label: 'ATHLETES',  route: 'admin/athletes' },
    { id: 'analytics', icon: '📊', label: 'ANALYTICS', route: 'admin/adoption' },
    { id: 'settings',  icon: '⚙️', label: 'SETTINGS',  route: 'admin/settings' },
  ],
  solo: [
    { id: 'home',      icon: '🏠', label: 'HOME',      route: 'solo/home' },
    { id: 'train',     icon: '⚡', label: 'TRAIN',     route: 'solo/today' },
    { id: 'score',     icon: '🏅', label: 'PIQ',       route: 'solo/score' },
    { id: 'nutrition', icon: '🥗', label: 'NUTRITION', route: 'solo/nutrition' },
  ],
};

export const navBar = {
  _role:     null,
  _router:   null,
  _tabs:     [],
  _activeId: 'home',
  _el:       null,

  /**
   * Initialize and render the bottom nav bar.
   * @param {string} role   - User role ('athlete'|'player'|'coach'|'parent'|'admin'|'solo')
   * @param {object} router - Router object with a navigate(route) method.
   */
  init(role = 'athlete', router = null) {
    this._role   = role;
    this._router = router;
    this._tabs   = NAV_TABS[role] || NAV_TABS.athlete;

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
        aria-current="${tab.id === this._activeId ? 'page' : 'false'}">
        <span class="piq-nav-icon">${tab.icon}</span>
        <span class="piq-nav-label">${tab.label}</span>
      </button>`).join('');

    nav.querySelectorAll('[data-route]').forEach(btn =>
      btn.addEventListener('click', () => {
        this.setActiveById(btn.dataset.nav);
        this._navigate(btn.dataset.route);
      })
    );

    document.body.appendChild(nav);
    this._el = nav;
  },

  setActiveById(id) {
    this._activeId = id;
    this._el?.querySelectorAll('.piq-nav-item').forEach(btn => {
      const active = btn.dataset.nav === id;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
  },

  setActiveByRoute(route) {
    const tab = this._tabs.find(t => t.route === route);
    if (tab) this.setActiveById(tab.id);
  },

  _navigate(route) {
    if (this._router?.navigate) {
      this._router.navigate(route);
    } else if (this._router?.push) {
      this._router.push(route);
    } else {
      document.dispatchEvent(new CustomEvent('piq:navigate', {
        detail: { route },
        bubbles: true,
      }));
    }
  },

  _listenToRouter() {
    document.addEventListener('piq:route-changed', e => {
      if (e.detail?.route) this.setActiveByRoute(e.detail.route);
    });
    window.addEventListener('hashchange', () => {
      const hash = location.hash.replace('#', '').replace(/^\//, '');
      this.setActiveByRoute(hash);
    });
  },

  _addBodyPadding() {
    document.body.classList.add('has-bottom-nav');
  },

  _watchKeyboard() {
    if (!window.visualViewport) return;
    window.visualViewport.addEventListener('resize', () => {
      const keyboardOpen = window.visualViewport.height < window.innerHeight * 0.75;
      this._el?.classList.toggle('nav-hidden', keyboardOpen);
    });
  },

  destroy() {
    this._el?.remove();
    this._el = null;
    document.body.classList.remove('has-bottom-nav');
  },
};
