import { state }           from '../../state/state.js';
import { router }          from '../../core/router.js';
import { renderEmptyState } from '../../app.js';
import { getReadinessCopy } from '../../components/readiness-copy.js';
import { ROUTES }          from '../../app.js';

export function renderCoachHome(container) {
  const s        = state.getAll();
  const athletes = s.athletes || [];
  const sessions  = s.sessions || [];
  const sport     = s.sport || 'Basketball';

  const readyCnt   = athletes.filter(a=>a.readiness==='high'||a.readiness==='optimal').length;
  const cautionCnt = athletes.filter(a=>a.readiness==='moderate'||a.readiness==='caution').length;
  const sessions7d = sessions.filter(s=>Date.now()-new Date(s.date)<7*86400000).length;

  container.innerHTML = `
    <div class="piq-view">
      <div class="view-page-header">
        <div class="view-page-title">COACH <span class="highlight">HQ</span></div>
        <div class="view-page-subtitle">${athletes.length} athlete${athletes.length!==1?'s':''} tracked · ${sport}</div>
      </div>

      <div class="kpi-strip-desktop">
        <div class="kpi-card-desktop">
          <div class="kpi-card-label">ATHLETES</div>
          <div class="kpi-card-value kpi-green">${athletes.length}</div>
          <div class="kpi-card-sub kpi-sub-grey">In roster</div>
        </div>
        <div class="kpi-card-desktop">
          <div class="kpi-card-label">READY TODAY</div>
          <div class="kpi-card-value kpi-blue">${readyCnt}</div>
          <div class="kpi-card-sub kpi-sub-blue">↑ Full training</div>
        </div>
        <div class="kpi-card-desktop">
          <div class="kpi-card-label">CAUTION</div>
          <div class="kpi-card-value kpi-navy">${cautionCnt}</div>
          <div class="kpi-card-sub kpi-sub-grey">Reduced load</div>
        </div>
        <div class="kpi-card-desktop">
          <div class="kpi-card-label">SESSIONS 7D</div>
          <div class="kpi-card-value kpi-navy">${sessions7d}</div>
          <div class="kpi-card-sub kpi-sub-grey">Team total</div>
        </div>
      </div>

      <div class="content-two-col">
        <!-- Athlete roster -->
        <div class="panel-card">
          <div class="panel-card-header" style="display:flex;align-items:center;justify-content:space-between;">
            <div class="panel-card-title">ATHLETE ROSTER</div>
            <button class="btn-outline-green" id="add-athlete-btn"
                    style="width:auto;padding:7px 14px;font-size:12px;">
              + Add Athlete
            </button>
          </div>
          <div id="athlete-list"></div>
        </div>

        <!-- Right panel -->
        <div class="panel-card">
          <div class="right-panel-section">
            <div class="right-panel-title">QUICK ACTIONS</div>
            <div style="display:grid;gap:10px;">
              <button class="btn-outline-green" data-route="${ROUTES.COACH_PROGRAM}">📋 Build Program</button>
              <button class="btn-outline-green" data-route="${ROUTES.PLAYER_LOG}">⚡ Log Session</button>
              <button class="btn-outline-green" data-route="${ROUTES.COACH_ANALYTICS}">📊 View Analytics</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const listEl = container.querySelector('#athlete-list');
  if (!athletes.length) {
    renderEmptyState(listEl, 'roster');
  } else {
    const rc = getReadinessCopy;
    listEl.innerHTML = athletes.map(a => {
      const rd = rc(a.readiness||'moderate');
      return `<div class="session-row">
        <div class="session-icon" style="background:var(--nav-bg,#0D1B40);color:var(--accent-green,#24C054);
             font-family:'Oswald',sans-serif;font-size:12px;font-weight:700;">
          ${(a.name||'AT').slice(0,2).toUpperCase()}
        </div>
        <div class="session-info">
          <div class="session-name">${a.name||'Athlete'}</div>
          <div class="session-meta">${a.sport||sport} · PIQ ${a.piq||'—'}</div>
        </div>
        <span style="font-size:13px;font-weight:600;color:${rd.color};">${rd.emoji} ${rd.label}</span>
      </div>`;
    }).join('');
  }

  container.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => router.navigate(btn.dataset.route));
  });
  container.querySelector('#add-athlete-btn')?.addEventListener('click', () => {
    router.navigate(ROUTES.COACH_TEAM);
  });
}
