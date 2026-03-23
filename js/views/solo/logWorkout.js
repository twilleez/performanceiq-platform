/**
 * PerformanceIQ — Player Log Workout v2
 * ─────────────────────────────────────────────────────────────
 * PHASE 1 UPGRADE: Captures session type so sRPE feeds the ACWR
 * engine correctly. The ACWR engine (engines.js) requires:
 *   sRPE = RPE × duration
 * Both are captured here. state.addWorkoutLog() computes sRPE
 * automatically, so no extra work is needed in this view.
 *
 * Form fields:
 *   name          — session label
 *   sessionType   — dropdown (Strength / Power / Speed /
 *                   Conditioning / Game / Recovery)
 *   duration      — minutes (required for sRPE)
 *   avgRPE        — perceived exertion 1–10 (required for sRPE)
 *   notes         — free text
 *   completed     — always true on submit
 */

import { buildSidebar }                 from '../../components/nav.js';
import { getCurrentRole }               from '../../core/auth.js';
import { getWorkoutLog, addWorkoutLog, addCheckIn } from '../../state/state.js';
import { getStreak, getWorkoutCount, getPIQScore,
         getReadinessScore }                        from '../../state/selectors.js';
import { navigate }                     from '../../router.js';
import { showToast }                    from '../../core/notifications.js';

const SESSION_TYPES = [
  { value:'strength',     label:'🏋️ Strength' },
  { value:'power',        label:'⚡ Power / Explosiveness' },
  { value:'speed',        label:'🏃 Speed / Agility' },
  { value:'conditioning', label:'🔥 Conditioning' },
  { value:'game',         label:'🏆 Game / Competition' },
  { value:'recovery',     label:'💚 Active Recovery' },
  { value:'general',      label:'📋 General Training' },
];

// RPE reference — Foster 2001 CR10 scale
const RPE_LABELS = {
  1:'Very light', 2:'Light', 3:'Moderate', 4:'Somewhat hard', 5:'Hard',
  6:'Hard+', 7:'Very hard', 8:'Very hard+', 9:'Near max', 10:'Max effort',
};

export function renderSoloLog() {
  const role = getCurrentRole() || 'player';
  const log  = getWorkoutLog();
  const streak = getStreak();
  const total  = getWorkoutCount();

  const entries = [...log]
    .sort((a, b) => (b.ts||0) - (a.ts||0))
    .slice(0, 12)
    .map(w => {
      const d = new Date(w.ts || w.date);
      const srpe = w.sRPE || ((w.avgRPE||5) * (w.duration||30));
      return `
      <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">
        <div style="width:38px;height:38px;border-radius:9px;background:var(--surface-2);
                    display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">
          ${_sessionIcon(w.sessionType)}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;color:var(--text-primary);
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${w.name || 'Workout Session'}
          </div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">
            ${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}
            &nbsp;·&nbsp; RPE ${w.avgRPE||'—'}
            &nbsp;·&nbsp; ${w.duration||'—'} min
            &nbsp;·&nbsp; <span style="color:var(--piq-green);font-weight:600">sRPE ${srpe}</span>
          </div>
        </div>
        <span style="font-size:10.5px;padding:3px 7px;border-radius:8px;white-space:nowrap;flex-shrink:0;
          background:${w.completed?'#22c95518':'var(--surface-2)'};
          color:${w.completed?'#22c955':'var(--text-muted)'};font-weight:600">
          ${w.completed ? 'Done' : 'Partial'}
        </span>
      </div>`;
    }).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role === 'solo' ? 'solo/log' : 'player/log')}
  <main class="page-main">

    <div class="page-header">
      <h1>Workout <span>Log</span></h1>
      <p>${total} session${total !== 1 ? 's' : ''} · ${streak}d streak · Logging powers your ACWR and PIQ score</p>
    </div>

    <div class="panels-2">

      <!-- ── Log Form ──────────────────────────────────────── -->
      <div class="panel">
        <div class="panel-title">Log a Session</div>
        <div style="font-size:12px;color:var(--text-muted);margin:6px 0 16px;line-height:1.5">
          Duration × RPE = session load. This feeds your ACWR and PIQ score immediately.
        </div>

        <div style="display:flex;flex-direction:column;gap:12px" id="log-form">

          <div class="b-field">
            <label>Session Name</label>
            <input id="log-name" type="text" placeholder="e.g. Morning Speed Work">
          </div>

          <div class="b-field">
            <label>Session Type</label>
            <select id="log-type">
              ${SESSION_TYPES.map(t =>
                `<option value="${t.value}">${t.label}</option>`
              ).join('')}
            </select>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="b-field">
              <label>Duration (min) <span style="color:var(--piq-green);font-size:10px">REQUIRED FOR ACWR</span></label>
              <input id="log-duration" type="number" min="5" max="180" placeholder="45"
                style="border-color:rgba(34,201,85,.3)">
            </div>
            <div class="b-field">
              <label>RPE (1–10) <span style="color:var(--piq-green);font-size:10px">REQUIRED FOR ACWR</span></label>
              <input id="log-rpe" type="number" min="1" max="10" step="0.5" placeholder="7"
                style="border-color:rgba(34,201,85,.3)">
            </div>
          </div>

          <!-- RPE reference chip — updates live -->
          <div id="rpe-ref" style="padding:8px 12px;background:var(--surface-2);border-radius:8px;
               font-size:12px;color:var(--text-muted);display:none">
            <span id="rpe-label">—</span>
            &nbsp;·&nbsp; Projected sRPE: <strong id="srpe-preview" style="color:var(--piq-green)">—</strong>
            <span style="font-size:10.5px"> (RPE × duration)</span>
          </div>

          <div class="b-field">
            <label>Notes (optional)</label>
            <textarea id="log-notes" rows="2" placeholder="How did it feel? Any issues?"></textarea>
          </div>

          <p id="log-error" style="color:#ef4444;font-size:12px;margin:0;display:none"></p>

          <button class="btn-primary" id="log-submit-btn" style="width:100%;font-size:13px;padding:12px">
            Log Session
          </button>

        </div>
      </div>

      <!-- ── Recent Sessions ───────────────────────────────── -->
      <div class="panel">
        <div class="panel-title">Recent Sessions</div>
        ${log.length === 0
          ? `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px">
               <div style="font-size:28px;margin-bottom:10px">📋</div>
               No sessions yet. Log your first workout to start building your ACWR.
             </div>`
          : entries}
        ${log.length > 12
          ? `<div style="text-align:center;padding-top:10px;font-size:12px;color:var(--text-muted)">
               Showing 12 of ${log.length} sessions
             </div>`
          : ''}
      </div>

    </div>
  </main>
</div>`;
}

function _sessionIcon(type) {
  const icons = {
    strength:'🏋️', power:'⚡', speed:'🏃', conditioning:'🔥',
    game:'🏆', recovery:'💚', general:'📋',
  };
  return icons[type] || '💪';
}

// ── EVENT WIRING ──────────────────────────────────────────────
document.addEventListener('piq:viewRendered', e => {
  const route = e.detail?.route || '';
  if (!route.endsWith('/log')) return;

  const errEl  = document.getElementById('log-error');
  const rpeRef = document.getElementById('rpe-ref');
  const form   = document.getElementById('log-form');
  const btn    = document.getElementById('log-submit-btn');
  if (!form || form.dataset.wired) return;
  form.dataset.wired = '1';

  // Live sRPE preview
  function updatePreview() {
    const rpe  = parseFloat(document.getElementById('log-rpe')?.value);
    const dur  = parseFloat(document.getElementById('log-duration')?.value);
    if (rpe && dur && rpeRef) {
      rpeRef.style.display = 'block';
      document.getElementById('rpe-label').textContent = RPE_LABELS[Math.round(rpe)] || '';
      document.getElementById('srpe-preview').textContent = Math.round(rpe * dur);
    } else if (rpeRef) {
      rpeRef.style.display = rpe ? 'block' : 'none';
      if (rpe) {
        document.getElementById('rpe-label').textContent = RPE_LABELS[Math.round(rpe)] || '';
        document.getElementById('srpe-preview').textContent = '— (add duration)';
      }
    }
  }

  document.getElementById('log-rpe')?.addEventListener('input', updatePreview);
  document.getElementById('log-duration')?.addEventListener('input', updatePreview);

  // Submit
  document.getElementById('log-submit-btn')?.addEventListener('click', () => {
    if (errEl) errEl.style.display = 'none';

    const name        = document.getElementById('log-name')?.value.trim() || 'Workout Session';
    const sessionType = document.getElementById('log-type')?.value || 'general';
    const duration    = parseFloat(document.getElementById('log-duration')?.value);
    const avgRPE      = parseFloat(document.getElementById('log-rpe')?.value);
    const notes       = document.getElementById('log-notes')?.value.trim() || '';

    if (!duration || duration < 5 || duration > 180) {
      if (errEl) { errEl.textContent = 'Duration is required (5–180 min). It\'s used to calculate your training load.'; errEl.style.display = 'block'; }
      return;
    }
    if (!avgRPE || avgRPE < 1 || avgRPE > 10) {
      if (errEl) { errEl.textContent = 'RPE is required (1–10). It\'s used to calculate your training load.'; errEl.style.display = 'block'; }
      return;
    }

    if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }

    // addWorkoutLog auto-computes sRPE = avgRPE × duration
    addWorkoutLog({ name, sessionType, duration, avgRPE, notes, completed: true, ts: Date.now() });

    // Snapshot current PIQ into history so progress charts have a data point
    // (addCheckIn without wellness fields just updates piqHistory)
    addCheckIn({}, {
      piqSnapshot: {
        piq:      getPIQScore(),
        readiness: getReadinessScore(),
        streak:   getStreak() + 1,  // +1 because addWorkoutLog extended streak
      }
    });

    showToast(`✅ Session logged! sRPE: ${Math.round(avgRPE * duration)}`, 'success');
    navigate(e.detail.route);
  });
});

