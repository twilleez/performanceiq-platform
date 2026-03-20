/**
 * PerformanceIQ — Player Log Workout View
 * ─────────────────────────────────────────────────────────────
 * Displays the workout log form and recent session history.
 *
 * FIXES APPLIED (friction audit)
 *  Fix 2 — Post-submit re-render now calls navigate() directly
 *           instead of dispatching piq:navigate (which app.js
 *           never listened to). This means the session list
 *           actually updates after logging.
 *  Fix 1 (upstream) — The piq:viewRendered event now carries
 *           detail.route so the guard below actually passes.
 *           No change needed here beyond removing the old
 *           piq:navigate dispatch.
 *
 * ALSO FIXED
 *  • Input validation before save: warns if duration or RPE
 *    are out of range rather than silently clamping.
 *  • Button shows loading state during save then resets.
 *  • Toast confirms save so the athlete has clear feedback.
 */

import { buildSidebar }                   from '../../components/nav.js';
import { getCurrentUser }                  from '../../core/auth.js';
import { getWorkoutLog, addWorkoutLog }    from '../../state/state.js';
import { navigate }                        from '../../router.js';
import { showToast }                       from '../../core/notifications.js';

export function renderPlayerLog() {
  const user = getCurrentUser();
  const log  = getWorkoutLog();

  const logEntries = [...log]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 10)
    .map(w => {
      const d = new Date(w.ts);
      return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
        <div style="width:40px;height:40px;border-radius:10px;background:var(--surface-2);
                    display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">💪</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13.5px;color:var(--text-primary);
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${w.name || 'Workout Session'}
          </div>
          <div style="font-size:12px;color:var(--text-muted)">
            ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            &nbsp;·&nbsp;RPE&nbsp;${w.avgRPE || '—'}
            &nbsp;·&nbsp;${w.duration || '—'}&nbsp;min
          </div>
        </div>
        <span style="
          font-size:11px;padding:3px 8px;border-radius:10px;white-space:nowrap;flex-shrink:0;
          background:${w.completed ? '#22c95522' : 'var(--surface-2)'};
          color:${w.completed ? '#22c955' : 'var(--text-muted)'};
          font-weight:600
        ">${w.completed ? 'Done' : 'Partial'}</span>
      </div>`;
    })
    .join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player', 'player/log')}
  <main class="page-main">

    <div class="page-header">
      <h1>Workout Log</h1>
      <p>${log.length} session${log.length !== 1 ? 's' : ''} recorded</p>
    </div>

    <div class="panels-2">

      <!-- Log Form -->
      <div class="panel">
        <div class="panel-title">Log a Session</div>
        <form id="log-form" style="margin-top:12px" novalidate>

          <div style="margin-bottom:12px">
            <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">
              SESSION NAME
            </label>
            <input
              id="log-name"
              type="text"
              placeholder="e.g. Morning Speed Work"
              style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);
                     background:var(--surface-2);color:var(--text-primary);font-size:13px;box-sizing:border-box"
            >
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            <div>
              <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">
                DURATION (min)
              </label>
              <input
                id="log-duration"
                type="number"
                min="5" max="180"
                placeholder="45"
                style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);
                       background:var(--surface-2);color:var(--text-primary);font-size:13px;box-sizing:border-box"
              >
            </div>
            <div>
              <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">
                AVG RPE (1–10)
              </label>
              <input
                id="log-rpe"
                type="number"
                min="1" max="10" step="0.5"
                placeholder="7"
                style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);
                       background:var(--surface-2);color:var(--text-primary);font-size:13px;box-sizing:border-box"
              >
            </div>
          </div>

          <div style="margin-bottom:16px">
            <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">
              NOTES (optional)
            </label>
            <textarea
              id="log-notes"
              placeholder="How did it feel? Any issues?"
              rows="3"
              style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);
                     background:var(--surface-2);color:var(--text-primary);font-size:13px;
                     resize:vertical;box-sizing:border-box"
            ></textarea>
          </div>

          <p id="log-error" style="color:#ef4444;font-size:12px;margin-bottom:10px;display:none"></p>

          <button
            type="submit"
            id="log-submit-btn"
            class="btn-primary"
            style="width:100%;font-size:13px;padding:12px"
          >
            Log Session
          </button>

        </form>
      </div>

      <!-- Recent Sessions -->
      <div class="panel">
        <div class="panel-title">Recent Sessions</div>
        ${log.length === 0
          ? `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px">
               No sessions logged yet.<br>Complete your first workout above.
             </div>`
          : logEntries
        }
      </div>

    </div>
  </main>
</div>`;
}


// ── EVENT WIRING ──────────────────────────────────────────────
// Runs after app.js dispatches piq:viewRendered with detail.route.
// Fix 1 (upstream) ensures e.detail is now populated so this guard passes.

document.addEventListener('piq:viewRendered', e => {
  if (e.detail?.route !== 'player/log') return;

  const form      = document.getElementById('log-form');
  const errEl     = document.getElementById('log-error');
  const submitBtn = document.getElementById('log-submit-btn');
  if (!form) return;

  // Guard: only wire once even if the view somehow re-renders in place
  if (form.dataset.wired) return;
  form.dataset.wired = '1';

  form.addEventListener('submit', ev => {
    ev.preventDefault();

    const name     = document.getElementById('log-name')?.value.trim() || 'Workout Session';
    const duration = parseFloat(document.getElementById('log-duration')?.value);
    const avgRPE   = parseFloat(document.getElementById('log-rpe')?.value);
    const notes    = document.getElementById('log-notes')?.value.trim() || '';

    // ── Validation ───────────────────────────────────────────
    if (errEl) errEl.style.display = 'none';

    if (duration && (duration < 5 || duration > 180)) {
      if (errEl) { errEl.textContent = 'Duration must be between 5 and 180 minutes.'; errEl.style.display = 'block'; }
      return;
    }
    if (avgRPE && (avgRPE < 1 || avgRPE > 10)) {
      if (errEl) { errEl.textContent = 'RPE must be between 1 and 10.'; errEl.style.display = 'block'; }
      return;
    }

    // ── Save ─────────────────────────────────────────────────
    if (submitBtn) { submitBtn.textContent = 'Saving…'; submitBtn.disabled = true; }

    addWorkoutLog({
      name,
      duration:  duration || 30,
      avgRPE:    avgRPE   || 6,
      notes,
      completed: true,
      ts:        Date.now(),
    });

    showToast('✅ Session logged!', 'success');

    // Fix 2 — use navigate() directly; piq:navigate was never heard by app.js
    navigate('player/log');
  });
});
