// js/app.js — Application entry point and router

import { state } from './state/state.js';
import { renderDashboard, afterRenderDashboard } from './views/dashboard.js';
import { renderTrain, afterRenderTrain } from './views/train.js';
import { renderWellness, afterRenderWellness } from './views/wellness.js';
import { renderTeam, afterRenderTeam } from './views/team.js';
import { renderAthletes, afterRenderAthletes } from './views/athletes.js';
import { renderAnalytics, afterRenderAnalytics } from './views/analytics.js';
import { computeReadiness } from './engine/readinessEngine.js';
import { computePIQScore, computePerformanceScore } from './engine/scoringEngine.js';
import { computeFatigueScore } from './engine/readinessEngine.js';

const views = {
  dashboard: { render: renderDashboard, after: afterRenderDashboard },
  train:     { render: renderTrain,     after: afterRenderTrain },
  wellness:  { render: renderWellness,  after: afterRenderWellness },
  team:      { render: renderTeam,      after: afterRenderTeam },
  athletes:  { render: renderAthletes,  after: afterRenderAthletes },
  analytics: { render: renderAnalytics, after: afterRenderAnalytics },
};

function navigateTo(viewName) {
  const v = views[viewName];
  if (!v) return;

  state.currentView = viewName;

  // Update nav active states
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Render view
  const container = document.getElementById('view-container');
  container.innerHTML = v.render();
  container.scrollTop = 0;
  window.scrollTo(0, 0);

  // Run after-render hooks (event bindings, animations)
  if (v.after) v.after();

  // Update topbar score
  updateTopbarScore();
}

function updateTopbarScore() {
  const el = document.getElementById('topbar-piq-score');
  if (!el) return;
  const readiness = computeReadiness(state.wellness);
  const recovery = Math.max(0, 100 - computeFatigueScore(state.wellness));
  const perf = computePerformanceScore(state.performanceResults);
  const piq = computePIQScore({ readiness: readiness.score, compliance: 85, performance: perf, recovery, nutrition: 70 });
  el.textContent = piq;
}

function initRoleSwitch() {
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      state.role = role;
      document.body.setAttribute('data-role', role);
      document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === role));

      // If coach switches and is on a coach-only view, stay; if athlete switches away from coach view, redirect
      if (role === 'athlete' && (state.currentView === 'team' || state.currentView === 'athletes')) {
        navigateTo('dashboard');
      } else {
        navigateTo(state.currentView);
      }
    });
  });
}

function initNavigation() {
  // Nav link clicks
  document.addEventListener('click', (e) => {
    const navItem = e.target.closest('[data-view]');
    if (navItem) {
      e.preventDefault();
      const viewName = navItem.dataset.view;
      navigateTo(viewName);
      closeMobileNav();
    }
  });

  // Hash-based routing
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (views[hash]) navigateTo(hash);
  });
}

function initMobileNav() {
  const toggle  = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('nav-overlay');

  toggle?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });

  overlay?.addEventListener('click', closeMobileNav);
}

function closeMobileNav() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('nav-overlay')?.classList.remove('active');
}

// ── Boot ──
function init() {
  initNavigation();
  initRoleSwitch();
  initMobileNav();

  // Pre-compute readiness
  state.readiness = computeReadiness(state.wellness);

  // Navigate to initial view
  const hash = window.location.hash.slice(1);
  navigateTo(views[hash] ? hash : 'dashboard');
}

document.addEventListener('DOMContentLoaded', init);
