/**
 * player/home.js — Phase 15C
 * C1: PIQ shows "—" + unlock CTA when no data
 * C4: Wellness slider hints applied via data-wellness-field
 * C5: Header logo at 34px
 * Fix 03: piq-ring id for explainer tooltip
 * Fix 05: data-readiness-level for action copy injection
 * Fix 09: empty state for session list
 */
import { state }             from '../../state/state.js';
import { router }            from '../../core/router.js';
import { renderEmptyState }  from '../../app.js';
import { getReadinessCopy }  from '../../components/readiness-copy.js';
import { inline }            from '../../components/logo.js';
import { ROUTES }            from '../../app.js';

// ── PIQ Formula v1 ───────────────────────────────────────────
function calcPIQ(s) {
  const logs     = s.logs     || [];
  const wellness = s.wellness || [];
  if (!logs.length && !wellness.length) return null; // no data yet

  const recent7  = logs.filter(l => Date.now() - new Date(l.date) < 7*86400000);
  const consistency = Math.min(recent7.length / 4, 1) * 35;

  const w = wellness[wellness.length - 1] || {};
  const sleep    = (w.sleep    || 5) / 10;
  const soreness = 1 - (w.soreness || 5) / 10;
  const stress   = 1 - (w.stress   || 5) / 10;
  const readiness = ((sleep + soreness + stress) / 3) * 30;

  const last14    = logs.filter(l => Date.now() - new Date(l.date) < 14*86400000);
  const compliance = last14.length
    ? Math.min(last14.filter(l => l.completed).length / last14.length, 1) * 25
    : 12.5;

  const acute  = recent7.reduce((a,l) => a + (l.load||5), 0) / 7;
  const chronic = logs.slice(-28).reduce((a,l) => a + (l.load||5), 0) / 28 || 1;
  const acwr   = acute / chronic;
  const loadMgmt = (acwr >= 0.8 && acwr <= 1.3) ? 10 : 5;

  return Math.max(0, Math.min(100, Math.round(consistency + readiness + compliance + loadMgmt)));
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

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function renderPlayerHome(container) {
  const s        = state.getAll();
  const piqScore = calcPIQ(s);                     // null = no data yet (C1)
  const rlevel   = getReadinessLevel(s.wellness);
  const readiness = getReadinessCopy(rlevel);
  const sessions  = s.sessions || [];
  const sport     = s.sport || 'Athlete';
  const hasData   = piqScore !== null;

  // Ring stroke math
  const R   = 58;
  const circ = +(2 * Math.PI * R).toFixed(1);
  const offset = hasData ? +((1 - piqScore/100) * circ).toFixed(1) : circ; // empty if no data

  container.innerHTML = `
    <div class="view-screen player-home">

      <!-- C5: header logo at 34px -->
      <div class="view-header">
        <div class="view-header-left">
          ${inline(34)}
          <div class="view-sport-badge">${sport}</div>
          <div class="season-phase-badge">${s.seasonPhase ? s.seasonPhase.toUpperCase() : ''}</div>
        </div>
        <button class="icon-btn" aria-label="Settings" id="settings-btn">⚙️</button>
      </div>

      <!-- PIQ Ring — id="piq-ring" for Fix 03 explainer anchor -->
      <div class="piq-ring-section">
        <div class="piq-ring-outer${hasData ? '' : ' piq-ring--empty'}"
             id="piq-ring"
             role="img"
             aria-label="${hasData ? `PIQ Score: ${piqScore} out of 100` : 'PIQ Score: not yet calculated'}">
          <svg width="148" height="148" viewBox="0 0 148 148">
            <!-- Track -->
            <circle cx="74" cy="74" r="${R}" fill="none"
              stroke="rgba(255,107,53,0.10)" stroke-width="10"
              ${!hasData ? 'stroke-dasharray="6 5"' : ''}/>
            <!-- Fill — only when data exists -->
            ${hasData ? `
            <circle cx="74" cy="74" r="${R}" fill="none"
              stroke="#FF6B35" stroke-width="10"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${offset}"
              stroke-linecap="round"
              transform="rotate(-90 74 74)"/>` : ''}
          </svg>
          <div class="piq-ring-center">
            <span class="piq-score-num" style="${!hasData ? 'font-size:36px;color:var(--piq-muted)' : ''}">
              ${hasData ? piqScore : '—'}
            </span>
            <span class="piq-score-label">PIQ</span>
          </div>
        </div>
        <div class="piq-ring-caption">
          ${hasData ? 'Today\'s Performance Index' : 'Log your wellness to unlock your score'}
        </div>

        <!-- C1: Unlock CTA when no data -->
        ${!hasData ? `
        <button class="piq-unlock-cta" data-route="${ROUTES.PLAYER_LOG}">
          + Log your first check-in
        </button>` : ''}
      </div>

      <!-- Readiness Banner — data-readiness-level for Fix 05 action copy -->
      <div class="readiness-banner card"
           data-readiness-level="${rlevel}"
           data-level="${rlevel}">
        <div class="readiness-level-label" style="color:${readiness.color};">
          ${readiness.emoji} ${readiness.label}
        </div>
        <div class="readiness-reason">${_reason(s.wellness, !hasData)}</div>
        <!-- Fix 05: action copy injected here by applyReadinessCopy() -->
      </div>

      <!-- Quick actions -->
      <div class="quick-actions">
        <button class="quick-btn" data-route="${ROUTES.PLAYER_LOG}">
          <span class="quick-icon">⚡</span><span>Log Session</span>
        </button>
        <button class="quick-btn" data-route="${ROUTES.PLAYER_SCORE}">
          <span class="quick-icon">📊</span><span>My Score</span>
        </button>
        <button class="quick-btn" data-route="${ROUTES.PLAYER_NUTRITION}">
          <span class="quick-icon">🥗</span><span>Nutrition</span>
        </button>
      </div>

      <!-- Session history — Fix 09 empty state -->
      <div class="section-header-row">
        <div class="section-label" style="padding:0;">RECENT SESSIONS</div>
        <button class="text-btn" data-route="${ROUTES.PLAYER_LOG}">See all</button>
      </div>
      <div id="session-list" class="session-list"></div>

    </div>`;

  // Render sessions or empty state
  const listEl = container.querySelector('#session-list');
  if (!sessions.length) {
    renderEmptyState(listEl, 'sessions', true);
  } else {
    listEl.innerHTML = sessions.slice(-5).reverse().map(s => `
      <div class="session-card">
        <div>
          <div class="session-card-sport">${s.sport || sport}</div>
          <div class="session-card-date">${formatDate(s.date)}</div>
        </div>
        <div class="session-card-right">
          <div class="session-card-rpe">RPE ${s.rpe || '—'}</div>
          <div class="session-card-status ${s.completed ? 'done' : 'missed'}">
            ${s.completed ? '✓' : '✗'}
          </div>
        </div>
      </div>`).join('');
  }

  // Route buttons
  container.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => router.navigate(btn.dataset.route));
  });

  container.querySelector('#settings-btn')?.addEventListener('click', () => {
    router.navigate('settings');
  });
}

function _reason(wellness = [], noData) {
  if (noData) return 'Log your wellness daily to get a personalised readiness explanation.';
  const w = wellness[wellness.length - 1];
  if (!w) return 'Log your wellness below to see today\'s readiness reasoning.';
  const parts = [];
  if (w.sleep >= 7)     parts.push('sleep was good');
  if (w.sleep <= 4)     parts.push('sleep was poor');
  if (w.soreness <= 3)  parts.push('soreness is low');
  if (w.soreness >= 7)  parts.push('soreness is high');
  if (w.stress <= 3)    parts.push('stress is low');
  if (w.stress >= 7)    parts.push('stress is elevated');
  if (!parts.length)    return 'Your readiness is based on today\'s wellness inputs.';
  const joined = parts.slice(0, 3).join(', ');
  return joined.charAt(0).toUpperCase() + joined.slice(1) + '.';
}
