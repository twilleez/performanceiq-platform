/**
 * player/home.js — Phase 15C
 *
 * Fix 03: PIQ ring has id="piq-ring" so piqExplainer.init() can anchor to it
 * Fix 05: Readiness banner has data-readiness-level attribute for applyReadinessCopy()
 * Fix 09: Session history uses emptyState.show() when empty
 */
import { state }             from '../../state/state.js';
import { router }            from '../../core/router.js';
import { renderEmptyState }  from '../../app.js';
import { getReadinessCopy }  from '../../components/readiness-copy.js';
import { ROUTES }            from '../../app.js';

// PIQ Score formula v1 (from selectors.js spec)
function calcPIQ(stateObj) {
  const logs     = stateObj.logs     || [];
  const wellness = stateObj.wellness || [];

  // Training Consistency 35% — sessions in last 7 days vs target (4)
  const recent7  = logs.filter(l => Date.now() - new Date(l.date) < 7 * 86400000);
  const consistency = Math.min(recent7.length / 4, 1) * 35;

  // Readiness Index 30% — average today's wellness (sleep, soreness inverted, stress inverted)
  const todayW   = wellness[wellness.length - 1] || {};
  const sleep    = (todayW.sleep    || 5) / 10;
  const soreness = 1 - (todayW.soreness || 5) / 10;
  const stress   = 1 - (todayW.stress   || 5) / 10;
  const readiness = ((sleep + soreness + stress) / 3) * 30;

  // Workout Compliance 25% — completed / planned (last 14 days)
  const last14   = logs.filter(l => Date.now() - new Date(l.date) < 14 * 86400000);
  const compliance = last14.length > 0
    ? Math.min(last14.filter(l => l.completed).length / last14.length, 1) * 25
    : 12.5; // neutral baseline if no data

  // Load Management 10% — ACWR proxy (simple acute/chronic ratio)
  const acute   = recent7.reduce((s, l) => s + (l.load || 5), 0) / 7;
  const chronic = logs.slice(-28).reduce((s, l) => s + (l.load || 5), 0) / 28 || 1;
  const acwr    = acute / chronic;
  const loadMgmt = (acwr >= 0.8 && acwr <= 1.3) ? 10 : 5;

  const total = Math.round(consistency + readiness + compliance + loadMgmt);
  return Math.max(0, Math.min(100, total));
}

function getReadinessLevel(wellness = []) {
  const w = wellness[wellness.length - 1] || {};
  const score = (
    ((w.sleep    || 5) / 10) +
    (1 - (w.soreness || 5) / 10) +
    (1 - (w.stress   || 5) / 10)
  ) / 3;

  if (score >= 0.72) return 'high';
  if (score >= 0.45) return 'moderate';
  return 'low';
}

export function renderPlayerHome(container) {
  const s          = state.getAll();
  const piqScore   = calcPIQ(s);
  const rlevel     = getReadinessLevel(s.wellness);
  const readiness  = getReadinessCopy(rlevel);
  const sessions   = s.sessions || [];
  const sport      = s.sport || 'Athlete';

  // Ring stroke math
  const circumference = 2 * Math.PI * 50; // r=50
  const offset = circumference - (piqScore / 100) * circumference;

  container.innerHTML = `
    <div class="view-screen player-home">

      <!-- Header -->
      <div class="view-header">
        <div class="view-header-left">
          <div class="view-sport-badge">${sport}</div>
          <div class="season-phase-badge" id="season-phase-badge">
            ${s.seasonPhase ? `📅 ${s.seasonPhase.toUpperCase()}` : ''}
          </div>
        </div>
        <button class="icon-btn" aria-label="Settings" onclick="void(0)">⚙️</button>
      </div>

      <!-- PIQ Ring — id="piq-ring" required by Fix 03 piqExplainer -->
      <div class="piq-ring-section">
        <div class="piq-ring-outer" id="piq-ring" role="img"
             aria-label="PIQ Score: ${piqScore} out of 100">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="50" fill="none"
              stroke="rgba(255,107,53,0.12)" stroke-width="10"/>
            <circle cx="70" cy="70" r="50" fill="none"
              stroke="#FF6B35" stroke-width="10"
              stroke-dasharray="${circumference.toFixed(1)}"
              stroke-dashoffset="${offset.toFixed(1)}"
              stroke-linecap="round"
              transform="rotate(-90 70 70)"/>
          </svg>
          <div class="piq-ring-center">
            <span class="piq-score-num">${piqScore}</span>
            <span class="piq-score-label">PIQ</span>
          </div>
        </div>
        <div class="piq-ring-caption">Today's Performance Index</div>
      </div>

      <!-- Readiness Banner — data-readiness-level required by Fix 05 -->
      <div class="readiness-banner card"
           data-readiness-level="${rlevel}"
           data-level="${rlevel}">
        <div class="readiness-level-label" style="color:${readiness.color}">
          ${readiness.emoji} ${readiness.label}
        </div>
        <div class="readiness-reason">
          ${_readinessReason(s.wellness)}
        </div>
        <!-- Fix 05: action copy injected here by applyReadinessCopy() -->
      </div>

      <!-- Quick actions -->
      <div class="quick-actions">
        <button class="quick-btn" data-route="${ROUTES.PLAYER_LOG}">
          <span class="quick-icon">⚡</span>
          <span>Log Session</span>
        </button>
        <button class="quick-btn" data-route="${ROUTES.PLAYER_SCORE}">
          <span class="quick-icon">📊</span>
          <span>My Score</span>
        </button>
        <button class="quick-btn" data-route="${ROUTES.PLAYER_NUTRITION}">
          <span class="quick-icon">🥗</span>
          <span>Nutrition</span>
        </button>
      </div>

      <!-- Recent sessions -->
      <div class="section-header-row">
        <div class="section-label">RECENT SESSIONS</div>
        <button class="text-btn" data-route="${ROUTES.PLAYER_LOG}">See all</button>
      </div>
      <div id="session-list" class="session-list"></div>

    </div>
  `;

  // ── Render session list (Fix 09 empty state) ─────────────
  const sessionList = container.querySelector('#session-list');
  if (!sessions.length) {
    renderEmptyState(sessionList, 'sessions', true);
  } else {
    sessionList.innerHTML = sessions.slice(-5).reverse().map(s => `
      <div class="session-card">
        <div class="session-card-left">
          <div class="session-card-sport">${s.sport || sport}</div>
          <div class="session-card-date">${_formatDate(s.date)}</div>
        </div>
        <div class="session-card-right">
          <div class="session-card-rpe">RPE ${s.rpe || '—'}</div>
          <div class="session-card-status ${s.completed ? 'done' : 'missed'}">
            ${s.completed ? '✓' : '✗'}
          </div>
        </div>
      </div>
    `).join('');
  }

  // ── Quick action routing ──────────────────────────────────
  container.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => router.navigate(btn.dataset.route));
  });
}

function _readinessReason(wellness = []) {
  const w = wellness[wellness.length - 1];
  if (!w) return 'Log your wellness below to get a personalised readiness explanation.';
  const parts = [];
  if (w.sleep >= 7)     parts.push('sleep was good');
  if (w.sleep <= 4)     parts.push('sleep was poor');
  if (w.soreness <= 3)  parts.push('soreness is low');
  if (w.soreness >= 7)  parts.push('soreness is high');
  if (w.stress <= 3)    parts.push('stress is low');
  if (w.stress >= 7)    parts.push('stress is elevated');
  if (!parts.length)    return 'Your readiness is based on today\'s wellness inputs.';
  return parts.slice(0, 3).join(', ').replace(/,([^,]*)$/, ' and$1') + '.';
}

function _formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
