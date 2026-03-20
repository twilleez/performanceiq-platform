/**
 * Player Log View — workout logging
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getWorkoutLog, addWorkoutLog } from '../../state/state.js';

export function renderPlayerLog() {
  const user = getCurrentUser();
  const log  = getWorkoutLog();

  const logEntries = [...log].sort((a,b)=>b.ts-a.ts).slice(0,10).map(w => {
    const d = new Date(w.ts);
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="width:40px;height:40px;border-radius:10px;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">💪</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${w.name||'Workout Session'}</div>
        <div style="font-size:12px;color:var(--text-muted)">${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} · RPE ${w.avgRPE||'—'} · ${w.duration||'—'} min</div>
      </div>
      <span style="font-size:11px;padding:3px 8px;border-radius:10px;background:${w.completed?'#22c95522':'var(--surface-2)'};color:${w.completed?'#22c955':'var(--text-muted)'};font-weight:600">${w.completed?'Done':'Partial'}</span>
    </div>`;
  }).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player','player/log')}
  <main class="page-main">
    <div class="page-header">
      <h1>Workout Log</h1>
      <p>${log.length} sessions recorded</p>
    </div>
    <div class="panels-2">
      <div class="panel">
        <div class="panel-title">Log a Session</div>
        <form id="log-form" style="margin-top:12px">
          <div style="margin-bottom:12px">
            <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">SESSION NAME</label>
            <input id="log-name" type="text" placeholder="e.g. Morning Speed Work" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-primary);font-size:13px;box-sizing:border-box">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            <div>
              <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">DURATION (min)</label>
              <input id="log-duration" type="number" min="5" max="180" placeholder="45" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-primary);font-size:13px;box-sizing:border-box">
            </div>
            <div>
              <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">AVG RPE (1–10)</label>
              <input id="log-rpe" type="number" min="1" max="10" placeholder="7" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-primary);font-size:13px;box-sizing:border-box">
            </div>
          </div>
          <div style="margin-bottom:16px">
            <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px">NOTES (optional)</label>
            <textarea id="log-notes" placeholder="How did it feel? Any issues?" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-primary);font-size:13px;resize:vertical;box-sizing:border-box"></textarea>
          </div>
          <button type="submit" class="btn-primary" style="width:100%;font-size:13px;padding:12px">Log Session</button>
        </form>
      </div>
      <div class="panel">
        <div class="panel-title">Recent Sessions</div>
        ${log.length === 0
          ? `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px">No sessions logged yet.<br>Complete your first workout above.</div>`
          : logEntries}
      </div>
    </div>
  </main>
</div>`;
}

// Called by app.js after rendering
document.addEventListener('piq:viewRendered', (e) => {
  if (e.detail?.route !== 'player/log') return;
  const form = document.getElementById('log-form');
  if (!form) return;
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const name     = document.getElementById('log-name')?.value?.trim() || 'Workout Session';
    const duration = parseInt(document.getElementById('log-duration')?.value) || 30;
    const avgRPE   = parseFloat(document.getElementById('log-rpe')?.value) || 6;
    addWorkoutLog({ name, duration, avgRPE, completed: true, ts: Date.now() });
    // Re-render
    import { navigate } from '../../router.js';
// ...
navigate('player/log');
  });
});
