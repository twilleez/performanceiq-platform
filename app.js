// js/app.js — Application entry point and router

import { STATE, state, loadState, saveState } from './state/state.js';
import { renderDashboard, afterRenderDashboard } from './views/dashboard.js';
import { renderTrain, afterRenderTrain } from './views/train.js';
import { renderWellness, afterRenderWellness } from './views/wellness.js';
import { renderTeam, afterRenderTeam } from './views/team.js';
import { renderAthletes, afterRenderAthletes } from './views/athletes.js';
import { renderAnalytics, afterRenderAnalytics } from './views/analytics.js';
import { computeReadiness, computeFatigueScore } from './engine/readinessEngine.js';
import { computePIQScore, computePerformanceScore } from './engine/scoringEngine.js';

const appState = STATE || state;

const views = {
  dashboard: { render: renderDashboard, after: afterRenderDashboard },
  train: { render: renderTrain, after: afterRenderTrain },
  wellness: { render: renderWellness, after: afterRenderWellness },
  team: { render: renderTeam, after: afterRenderTeam, coachOnly: true },
  athletes: { render: renderAthletes, after: afterRenderAthletes, coachOnly: true },
  analytics: { render: renderAnalytics, after: afterRenderAnalytics },
};

function normalizeHash(rawHash) {
  const raw = String(rawHash || '').trim();
  const noHash = raw.startsWith('#') ? raw.slice(1) : raw;
  return noHash.startsWith('/') ? noHash.slice(1) : noHash;
}

function isCoachOnlyView(viewName) {
  return !!views[viewName]?.coachOnly;
}

function canAccessView(viewName) {
  if (!views[viewName]) return false;
  if (!isCoachOnlyView(viewName)) return true;
  return appState.role === 'coach';
}

function getSafeView(viewName) {
  if (!views[viewName]) return 'dashboard';
  if (!canAccessView(viewName)) return 'dashboard';
  return viewName;
}

function navigateTo(viewName, options = {}) {
  const { updateHash = true } = options;
  const resolvedView = getSafeView(viewName);
  const viewConfig = views[resolvedView];

  appState.currentView = resolvedView;

  updateNavStates(resolvedView);
  updateRoleUI();
  updateCoachOnlyVisibility();

  const container = document.getElementById('view-container');
  if (!container) {
    console.error('Missing #view-container');
    return;
  }

  try {
    const html = viewConfig.render();
    container.innerHTML = typeof html === 'string' ? html : '';
    container.scrollTop = 0;
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(`Render failed for view "${resolvedView}":`, err);
    container.innerHTML = `
      <div class="card" style="margin:16px;">
        <div class="card-header">
          <span class="card-title">View Error</span>
        </div>
        <div style="font-size:14px;color:var(--text-muted);">
          Failed to load <strong>${escapeHtml(resolvedView)}</strong>.
        </div>
        <pre style="margin-top:12px;white-space:pre-wrap;font-size:12px;color:var(--danger, #ff6b6b);">${escapeHtml(
          err?.message || String(err)
        )}</pre>
      </div>
    `;
    return;
  }

  try {
    if (typeof viewConfig.after === 'function') {
      viewConfig.after();
    }
  } catch (err) {
    console.error(`afterRender failed for view "${resolvedView}":`, err);
  }

  if (updateHash) {
    const desiredHash = `#${resolvedView}`;
    if (window.location.hash !== desiredHash) {
      try {
        history.pushState(null, '', desiredHash);
      } catch (err) {
        console.error('Failed to update URL hash:', err);
      }
    }
  }

  try {
    saveState();
  } catch (err) {
    console.error('saveState failed:', err);
  }

  updateTopbarScore();
}

function updateNavStates(activeView) {
  document.querySelectorAll('.nav-item, .nav-btn, .mnav-btn, [data-view]').forEach((item) => {
    item.classList.toggle('active', item.dataset.view === activeView);
  });
}

function updateRoleUI() {
  document.body.setAttribute('data-role', appState.role || 'athlete');

  document.querySelectorAll('.role-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.role === appState.role);
  });
}

function updateCoachOnlyVisibility() {
  document.querySelectorAll('[data-coach-only]').forEach((el) => {
    const show = appState.role === 'coach';
    el.style.display = show ? '' : 'none';
  });
}

function updateTopbarScore() {
  const el = document.getElementById('topbar-piq-score');
  if (!el) return;

  try {
    const readiness = computeReadiness(appState.wellness || {});
    const recovery = Math.max(0, 100 - computeFatigueScore(appState.wellness || {}));
    const perf = computePerformanceScore(Array.isArray(appState.performanceResults) ? appState.performanceResults : []);
    const piq = computePIQScore({
      readiness: Number(readiness?.score) || 0,
      compliance: 85,
      performance: Number(perf) || 0,
      recovery,
      nutrition: 70,
    });

    el.textContent = Number.isFinite(Number(piq)) ? String(piq) : '—';
  } catch (err) {
    console.error('Failed to update topbar PIQ score:', err);
    el.textContent = '—';
  }
}

function initRoleSwitch() {
  document.querySelectorAll('.role-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      if (!role) return;

      appState.role = role;

      const requestedView = appState.currentView || 'dashboard';
      const nextView = role === 'athlete' && isCoachOnlyView(requestedView)
        ? 'dashboard'
        : requestedView;

      navigateTo(nextView);
    });
  });
}

function initNavigation() {
  document.addEventListener('click', (e) => {
    const navItem = e.target.closest('[data-view]');
    if (!navItem) return;

    e.preventDefault();

    const viewName = navItem.dataset.view;
    if (!viewName) return;

    navigateTo(viewName);
    closeMobileNav();
  });

  window.addEventListener('hashchange', () => {
    const hashView = normalizeHash(window.location.hash);
    navigateTo(hashView || 'dashboard', { updateHash: false });
  });
}

function initMobileNav() {
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('nav-overlay');

  toggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('active');
  });

  overlay?.addEventListener('click', closeMobileNav);
}

function closeMobileNav() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('nav-overlay')?.classList.remove('active');
}

function init() {
  try {
    loadState();
  } catch (err) {
    console.error('loadState failed:', err);
  }

  initNavigation();
  initRoleSwitch();
  initMobileNav();
  updateRoleUI();
  updateCoachOnlyVisibility();

  try {
    appState.readiness = computeReadiness(appState.wellness || {});
  } catch (err) {
    console.error('Failed to pre-compute readiness:', err);
  }

  const initialView = normalizeHash(window.location.hash);
  navigateTo(initialView || appState.currentView || 'dashboard', { updateHash: false });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

document.addEventListener('DOMContentLoaded', init);
