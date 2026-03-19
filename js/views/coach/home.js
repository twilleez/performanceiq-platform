/**
 * coach/home.js — Phase 15C
 * Fix 09: Empty state when no athletes are assigned
 * Fix 05: Readiness copy on team overview cards
 */
import { state }           from '../../state/state.js';
import { router }          from '../../core/router.js';
import { renderEmptyState } from '../../app.js';
import { getReadinessCopy } from '../../components/readiness-copy.js';
import { ROUTES }          from '../../app.js';

export function renderCoachHome(container) {
  const s        = state.getAll();
  const athletes = s.athletes || [];

  container.innerHTML = `
    <div class="view-screen coach-home">

      <div class="view-header">
        <div>
          <div class="view-title">COACH HQ</div>
          <div class="view-subtitle">${athletes.length} athlete${athletes.length !== 1 ? 's' : ''} tracked</div>
        </div>
        <button class="icon-btn" id="add-athlete-btn" aria-label="Add athlete">+</button>
      </div>

      <!-- KPI Strip -->
      <div class="kpi-strip">
        <div class="kpi-card">
          <div class="kpi-val">${athletes.length}</div>
          <div class="kpi-lbl">Athletes</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-val">${_readyCount(athletes)}</div>
          <div class="kpi-lbl">Ready Today</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-val">${_cautionCount(athletes)}</div>
          <div class="kpi-lbl">Caution</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-val">${_sessions7d(s.sessions)}</div>
          <div class="kpi-lbl">Sessions 7d</div>
        </div>
      </div>

      <!-- Quick nav -->
      <div class="quick-actions">
        <button class="quick-btn" data-route="${ROUTES.COACH_PROGRAM}">
          <span class="quick-icon">📋</span><span>Program</span>
        </button>
        <button class="quick-btn" data-route="${ROUTES.COACH_TEAM}">
          <span class="quick-icon">🎽</span><span>Team</span>
        </button>
        <button class="quick-btn" data-route="${ROUTES.COACH_ANALYTICS}">
          <span class="quick-icon">📊</span><span>Analytics</span>
        </button>
      </div>

      <!-- Roster -->
      <div class="section-header-row">
        <div class="section-label">ATHLETE ROSTER</div>
        <button class="text-btn" data-route="${ROUTES.COACH_TEAM}">Manage</button>
      </div>
      <div id="athlete-roster"></div>

    </div>
  `;

  // ── Render roster (Fix 09) ────────────────────────────────
  const rosterEl = container.querySelector('#athlete-roster');
  if (!athletes.length) {
    renderEmptyState(rosterEl, 'roster');
  } else {
    rosterEl.innerHTML = athletes.map(a => {
      const readiness = getReadinessCopy(a.readiness || 'moderate');
      return `
        <div class="athlete-row card">
          <div class="athlete-row-avatar">${a.initials || a.name?.slice(0,2).toUpperCase() || 'AT'}</div>
          <div class="athlete-row-info">
            <div class="athlete-name">${a.name || 'Athlete'}</div>
            <div class="athlete-sport">${a.sport || s.sport || '—'}</div>
          </div>
          <div class="athlete-row-status" style="color:${readiness.color}">
            <div class="athlete-piq">${a.piq || '—'}</div>
            <div class="athlete-readiness-label">${readiness.emoji} ${readiness.label}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Routing ───────────────────────────────────────────────
  container.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => router.navigate(btn.dataset.route));
  });

  container.querySelector('#add-athlete-btn')?.addEventListener('click', () => {
    router.navigate(ROUTES.COACH_TEAM);
  });
}

function _readyCount(athletes) {
  return athletes.filter(a => a.readiness === 'high' || a.readiness === 'optimal').length;
}
function _cautionCount(athletes) {
  return athletes.filter(a => a.readiness === 'moderate' || a.readiness === 'caution').length;
}
function _sessions7d(sessions = []) {
  return sessions.filter(s => Date.now() - new Date(s.date) < 7 * 86400000).length;
}
