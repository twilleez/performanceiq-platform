/**
 * shell.js — PerformanceIQ Dual Layout Shell (Phase 15C)
 * Desktop: sidebar + topnav grid
 * Mobile:  sticky topnav + bottom nav
 * Role-aware nav: athlete / coach / parent / admin
 */
import { router } from '../core/router.js';
import { state }  from '../state/state.js';

const ICON_SRC = "data:image/png;base64,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";

const SIDEBAR_CONFIGS = {
  athlete: [
    { section:'MY TRAINING', items:[
      { icon:'🏠', label:'Dashboard',    route:'player-home',      id:'home' },
      { icon:'⚡', label:'Log Session', route:'player-log',       id:'log' },
      { icon:'📊', label:'My Score',    route:'player-score',     id:'score' },
      { icon:'🥗', label:'Nutrition',   route:'player-nutrition', id:'nutrition' },
    ]},
    { section:'PERFORMANCE', items:[
      { icon:'🧠', label:'Mindset',     route:'player-score',     id:'mindset' },
    ]},
  ],
  player: [
    { section:'MY TRAINING', items:[
      { icon:'🏠', label:'Dashboard',    route:'player-home',      id:'home' },
      { icon:'⚡', label:'Log Session', route:'player-log',       id:'log' },
      { icon:'📊', label:'My Score',    route:'player-score',     id:'score' },
      { icon:'🥗', label:'Nutrition',   route:'player-nutrition', id:'nutrition' },
    ]},
  ],
  coach: [
    { section:'TRAINING', items:[
      { icon:'📋', label:'Workout Plan',    route:'player-home',      id:'plan' },
      { icon:'🔧', label:'Session Builder', route:'player-log',       id:'builder' },
      { icon:'📚', label:'Exercise Library',route:'player-log',       id:'library' },
      { icon:'🏆', label:'Personal Records',route:'player-score',     id:'records' },
      { icon:'📝', label:'Session Log',     route:'player-score',     id:'session-log' },
    ]},
    { section:'TOOLS', items:[
      { icon:'📊', label:'Periodization',   route:'coach-program',    id:'periodization' },
      { icon:'⚡', label:'Load Manager',    route:'coach-analytics',  id:'load' },
      { icon:'👥', label:'Team Roster',     route:'coach-team',       id:'team' },
    ]},
  ],
  parent: [
    { section:'FAMILY', items:[
      { icon:'🏠', label:'Overview',      route:'parent-home',  id:'overview' },
      { icon:'⚡', label:'Athlete View',  route:'player-home',  id:'athlete' },
      { icon:'📅', label:'Schedule',      route:'player-home',  id:'schedule' },
    ]},
  ],
  admin: [
    { section:'PLATFORM', items:[
      { icon:'🏛️', label:'Admin Panel',  route:'admin-home',   id:'admin' },
      { icon:'👥', label:'Users',        route:'coach-team',   id:'users' },
      { icon:'📊', label:'Analytics',    route:'coach-analytics',id:'analytics' },
    ]},
  ],
};

const TOPNAV_LINKS = {
  athlete: [
    { label:'Dashboard',  route:'player-home' },
    { label:'Training',   route:'player-log' },
    { label:'Nutrition',  route:'player-nutrition' },
    { label:'My Score',   route:'player-score' },
  ],
  player:  [
    { label:'Dashboard',  route:'player-home' },
    { label:'Training',   route:'player-log' },
    { label:'Nutrition',  route:'player-nutrition' },
    { label:'My Score',   route:'player-score' },
  ],
  coach:   [
    { label:'Workout Plan', route:'player-home' },
    { label:'Training',     route:'player-log' },
    { label:'Analytics',    route:'coach-analytics' },
    { label:'Team',         route:'coach-team' },
    { label:'Schedule',     route:'coach-program' },
  ],
  parent:  [
    { label:'Family View', route:'parent-home' },
    { label:'Training',    route:'player-log' },
    { label:'Nutrition',   route:'player-nutrition' },
    { label:'Analytics',   route:'player-score' },
    { label:'Schedule',    route:'player-home' },
  ],
};

function getRoleBadge(r) {
  return {coach:'COACH',athlete:'ATHLETE',player:'PLAYER',parent:'PARENT',admin:'ADMIN'}[r] || 'USER';
}
function getInitials(r) {
  return {coach:'CO',athlete:'AT',player:'AT',parent:'PA',admin:'AD'}[r] || 'WL';
}

export const shell = {
  _init: false,
  _role: 'athlete',

  init(role = 'athlete') {
    if (this._init) return;
    this._init = true;
    this._role = role;

    const appEl = document.getElementById('app');
    if (!appEl) return;

    const shellEl = document.createElement('div');
    shellEl.id = 'piq-shell';
    document.body.insertBefore(shellEl, appEl);

    // ── Top Nav
    const nav = document.createElement('nav');
    nav.id = 'piq-topnav';
    nav.setAttribute('aria-label','Primary navigation');

    const links = TOPNAV_LINKS[role] || TOPNAV_LINKS.athlete;
    nav.innerHTML = `
      <div class="topnav-logo" data-route="player-home">
        <img src="${ICON_SRC}" alt="PIQ" />
        <span class="topnav-wordmark">Performance<em>IQ</em></span>
      </div>
      <div class="topnav-links" id="topnav-links">
        ${links.map(l => `<button class="topnav-link" data-route="${l.route}">${l.label}</button>`).join('')}
      </div>
      <div class="topnav-right">
        <button class="topnav-icon-btn" title="Notifications" aria-label="Notifications">🔔</button>
        <span class="topnav-role-badge">${getRoleBadge(role)}</span>
        <div class="topnav-avatar" aria-label="Account">${getInitials(role)}</div>
      </div>`;
    shellEl.appendChild(nav);

    // ── Sidebar (desktop only — hidden via CSS on mobile)
    const sidebar = document.createElement('aside');
    sidebar.id = 'piq-sidebar';
    sidebar.setAttribute('aria-label','Sidebar navigation');

    const sections = SIDEBAR_CONFIGS[role] || SIDEBAR_CONFIGS.athlete;
    sidebar.innerHTML = sections.map(sec => `
      <div class="sidebar-section-label">${sec.section}</div>
      ${sec.items.map(item => `
        <button class="sidebar-item" data-route="${item.route}" data-id="${item.id}"
                aria-label="${item.label}">
          <span class="sidebar-icon">${item.icon}</span>
          <span>${item.label}</span>
        </button>`).join('')}
    `).join('');
    shellEl.appendChild(sidebar);

    // ── Main
    const main = document.createElement('main');
    main.id = 'piq-main';
    main.appendChild(appEl);
    shellEl.appendChild(main);

    // ── Event delegation
    shellEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-route]');
      if (btn) router.navigate(btn.dataset.route);
    });

    document.addEventListener('piq:route-changed', e => this.setActive(e.detail?.route));
  },

  setActive(route) {
    document.querySelectorAll('.sidebar-item').forEach(el =>
      el.classList.toggle('active', el.dataset.route === route));
    document.querySelectorAll('.topnav-link').forEach(el =>
      el.classList.toggle('active', el.dataset.route === route));
  },
};
