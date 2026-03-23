/**
 * PerformanceIQ — Coach Program Builder v2
 * ─────────────────────────────────────────────────────────────
 * PHASE 3: Real workout assignment that writes to state.
 *
 * Workflow:
 *   1. Coach selects a template or builds a custom session
 *   2. Selects athletes from roster checkboxes
 *   3. Sets due date and optional notes
 *   4. Clicks Assign → assignWorkout() creates records per athlete
 *   5. Compliance panel shows assigned vs completed per athlete
 *
 * Compliance feeds directly into the PIQ score's compliance pillar
 * because completeAssignment() also calls addWorkoutLog(), which
 * means the ACWR engine sees the session.
 */
import { buildSidebar }                           from '../../components/nav.js';
import { getCurrentUser }                         from '../../core/auth.js';
import { getRoster, getAssignedWorkouts,
         assignWorkout }                          from '../../state/state.js';
import { showToast }                              from '../../core/notifications.js';
import { navigate }                               from '../../router.js';

const TEMPLATES = [
  {
    id:'bball-inseason', sport:'🏀', name:'Basketball In-Season Maintenance',
    sessionType:'strength', sessions:4, duration:'8 wk', level:'Intermediate',
    exercises:[
      { name:'Trap Bar Deadlift', sets:4, reps:'5', load:'75–80%', cue:'Explosive ascent' },
      { name:'Box Jump', sets:3, reps:'6', load:'BW', cue:'Max height, full reset' },
      { name:'Nordic Curl', sets:3, reps:'5', load:'BW', cue:'4-sec descent — hamstring protection' },
      { name:'Single-Leg RDL', sets:3, reps:'8 ea', load:'DBs', cue:'Hip hinge, flat back' },
      { name:'Lateral Band Walk', sets:3, reps:'20 ea', load:'Band', cue:'Athletic stance throughout' },
    ],
  },
  {
    id:'speed-power', sport:'⚡', name:'Speed & Power Block',
    sessionType:'power', sessions:3, duration:'4 wk', level:'Advanced',
    exercises:[
      { name:'Power Clean', sets:4, reps:'3', load:'70%', cue:'Triple extension, max velocity' },
      { name:'Broad Jump', sets:4, reps:'5', load:'BW', cue:'Stick landing, full hip lock' },
      { name:'10m Sprint (Acc)', sets:6, reps:'1', load:'Max', cue:'Drive phase — stay low first 5m' },
      { name:'Med Ball Slam', sets:3, reps:'8', load:'8–10kg', cue:'Full hip extension at top' },
    ],
  },
  {
    id:'conditioning', sport:'🔥', name:'Conditioning Circuit',
    sessionType:'conditioning', sessions:3, duration:'3 wk', level:'All Levels',
    exercises:[
      { name:'Basketball Sprint Intervals', sets:6, reps:'Full court', load:'Max', cue:'30s rest between' },
      { name:'Defensive Slide × 20m', sets:4, reps:'2 ea', load:'BW', cue:'Stay low, push not drag' },
      { name:'Pro Agility Shuttle', sets:5, reps:'1', load:'Max', cue:'Drive off outside foot on cuts' },
    ],
  },
  {
    id:'recovery', sport:'💚', name:'Active Recovery Day',
    sessionType:'recovery', sessions:1, duration:'1 day', level:'All Levels',
    exercises:[
      { name:'Foam Roll — Full Body', sets:1, reps:'8 min', load:'BW', cue:'Light pressure, continuous movement' },
      { name:'Hip Flexor Stretch', sets:2, reps:'60s ea', load:'BW', cue:'Posterior pelvic tilt' },
      { name:'Diaphragmatic Breathing', sets:1, reps:'3 min', load:'None', cue:'4-4-6 breath pattern' },
    ],
  },
];

const SESSION_ICONS = {
  strength:'🏋️', power:'⚡', speed:'🏃', conditioning:'🔥',
  game:'🏆', recovery:'💚', general:'📋',
};

export function renderCoachProgram() {
  const roster    = getRoster();
  const assigned  = getAssignedWorkouts();
  const user      = getCurrentUser();
  const tomorrow  = new Date(Date.now() + 86400000).toISOString().slice(0,10);

  // Compliance summary per athlete
  const compliance = roster.map(a => {
    const mine    = assigned.filter(w => w.athleteId === a.id);
    const done    = mine.filter(w => w.completed).length;
    const pct     = mine.length ? Math.round((done / mine.length) * 100) : null;
    const pending = mine.filter(w => !w.completed);
    return { ...a, assigned: mine.length, done, pct, pending };
  });

  const totalAssigned  = assigned.length;
  const totalCompleted = assigned.filter(w => w.completed).length;
  const teamCompliance = totalAssigned ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return `
<div class="view-with-sidebar">
  ${buildSidebar('coach','coach/program')}
  <main class="page-main">

    <div class="page-header">
      <h1>Program <span>Builder</span></h1>
      <p>Create and assign sessions · Compliance tracks the PIQ score</p>
    </div>

    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-lbl">Assigned</div><div class="kpi-val b">${totalAssigned}</div><div class="kpi-chg">Total sessions</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Completed</div><div class="kpi-val g">${totalCompleted}</div><div class="kpi-chg">By athletes</div></div>
      <div class="kpi-card">
        <div class="kpi-lbl">Team Compliance</div>
        <div class="kpi-val" style="color:${teamCompliance>=80?'var(--piq-green)':teamCompliance>=60?'#f59e0b':'#ef4444'}">
          ${totalAssigned ? teamCompliance + '%' : '—'}
        </div>
        <div class="kpi-chg">Completion rate</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

      <!-- ── Assignment Builder ──────────────────────────── -->
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Build Assignment</div>

          <!-- Template picker -->
          <div style="margin-top:12px;margin-bottom:14px">
            <label style="font-size:12.5px;font-weight:600;color:var(--text-muted);
                          display:block;margin-bottom:6px">SESSION TEMPLATE</label>
            <select id="prog-template"
              style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;
                     background:var(--surface-2);color:var(--text-primary);font-size:13px">
              <option value="">— Custom session —</option>
              ${TEMPLATES.map(t =>
                `<option value="${t.id}">${t.sport} ${t.name}</option>`
              ).join('')}
            </select>
          </div>

          <!-- Session details -->
          <div style="display:flex;flex-direction:column;gap:10px">
            <div class="b-field">
              <label>Session Title</label>
              <input id="prog-title" type="text" placeholder="e.g. Monday Strength Block">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="b-field">
                <label>Session Type</label>
                <select id="prog-type">
                  ${Object.entries(SESSION_ICONS).map(([v,i]) =>
                    `<option value="${v}">${i} ${v.charAt(0).toUpperCase()+v.slice(1)}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="b-field">
                <label>Due Date</label>
                <input id="prog-due" type="date" value="${tomorrow}">
              </div>
            </div>
            <div class="b-field">
              <label>Coach Notes (optional)</label>
              <input id="prog-notes" type="text" placeholder="e.g. Focus on hip hinge mechanics today">
            </div>
          </div>

          <!-- Exercises preview (populated when template chosen) -->
          <div id="prog-exercises" style="margin-top:12px;display:none">
            <div style="font-size:12.5px;font-weight:600;color:var(--text-muted);
                        margin-bottom:8px;letter-spacing:.04em">EXERCISES</div>
            <div id="prog-ex-list" style="display:flex;flex-direction:column;gap:6px"></div>
          </div>

          <!-- Roster selection -->
          <div style="margin-top:16px">
            <div style="font-size:12.5px;font-weight:600;color:var(--text-muted);
                        margin-bottom:8px;letter-spacing:.04em">
              ASSIGN TO
              <button type="button" id="select-all-btn"
                style="float:right;font-size:11px;background:none;border:none;
                       color:var(--piq-green);cursor:pointer;font-weight:600">
                Select all
              </button>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;max-height:240px;overflow-y:auto">
              ${roster.map(a => `
              <label style="display:flex;align-items:center;gap:10px;padding:8px;
                            border-radius:8px;cursor:pointer;transition:background .15s"
                     onmouseover="this.style.background='var(--surface-2)'"
                     onmouseout="this.style.background='transparent'">
                <input type="checkbox" class="ath-check" value="${a.id}"
                  style="accent-color:var(--piq-green);width:16px;height:16px">
                <span style="flex:1;font-size:13px;color:var(--text-primary)">${a.name}</span>
                <span style="font-size:11.5px;color:var(--text-muted)">${a.position||'—'}</span>
                <span style="font-size:11px;padding:2px 7px;border-radius:6px;
                      background:${a.readiness>=80?'#22c95520':a.readiness<60?'#ef444420':'#f59e0b20'};
                      color:${a.readiness>=80?'#22c955':a.readiness<60?'#ef4444':'#f59e0b'};
                      font-weight:600">${a.readiness}%</span>
              </label>`).join('')}
            </div>
          </div>

          <p id="prog-error" style="color:#ef4444;font-size:12px;margin:8px 0 0;display:none"></p>
          <button class="btn-primary" id="prog-assign-btn"
            style="width:100%;margin-top:14px;font-size:13.5px;padding:13px">
            Assign to Selected Athletes →
          </button>
        </div>
      </div>

      <!-- ── Compliance Panel ────────────────────────────── -->
      <div class="panel">
        <div class="panel-title">Athlete Compliance</div>
        <div style="font-size:12px;color:var(--text-muted);margin:6px 0 14px">
          Assigned sessions completed · Feeds the PIQ compliance pillar
        </div>

        ${compliance.map(a => {
          const bar  = a.pct !== null ? a.pct : 0;
          const col  = bar >= 80 ? '#22c955' : bar >= 60 ? '#f59e0b' : '#ef4444';
          const pend = a.pending.length;
          return `
          <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
              <span style="font-size:13px;font-weight:600;color:var(--text-primary)">${a.name}</span>
              <div style="display:flex;align-items:center;gap:8px">
                ${pend > 0 ? `<span style="font-size:11px;padding:2px 7px;border-radius:7px;
                  background:#f59e0b18;color:#f59e0b;font-weight:600">${pend} pending</span>` : ''}
                <span style="font-size:12px;font-weight:700;color:${a.assigned ? col : 'var(--text-muted)'}">
                  ${a.assigned ? a.done + '/' + a.assigned : 'None assigned'}
                </span>
              </div>
            </div>
            ${a.assigned ? `
            <div style="height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${bar}%;background:${col};border-radius:3px;transition:width .5s"></div>
            </div>` : `
            <div style="font-size:11.5px;color:var(--text-muted)">No sessions assigned yet</div>`}
          </div>`;
        }).join('')}

        ${totalAssigned === 0 ? `
        <div style="text-align:center;padding:20px;color:var(--text-muted)">
          <div style="font-size:28px;margin-bottom:8px">📋</div>
          <div style="font-size:13px">Assign a session to see compliance tracking</div>
        </div>` : ''}
      </div>

    </div>
  </main>
</div>`;
}

// ── EVENT WIRING ──────────────────────────────────────────────
document.addEventListener('piq:viewRendered', e => {
  if (e.detail?.route !== 'coach/program') return;

  const errEl = document.getElementById('prog-error');

  // Template selection — populate exercises preview
  document.getElementById('prog-template')?.addEventListener('change', ev => {
    const tmpl  = TEMPLATES.find(t => t.id === ev.target.value);
    const block = document.getElementById('prog-exercises');
    const list  = document.getElementById('prog-ex-list');
    if (!tmpl) { block.style.display = 'none'; return; }
    document.getElementById('prog-title').value = tmpl.name;
    document.getElementById('prog-type').value  = tmpl.sessionType;
    block.style.display = 'block';
    list.innerHTML = tmpl.exercises.map(ex => `
    <div style="display:flex;gap:10px;padding:7px 10px;background:var(--surface-2);
                border-radius:8px;align-items:flex-start">
      <span style="font-size:15px;flex-shrink:0">${SESSION_ICONS[tmpl.sessionType]||'💪'}</span>
      <div>
        <div style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${ex.name}</div>
        <div style="font-size:11.5px;color:var(--text-muted)">${ex.sets} × ${ex.reps}${ex.load?' · '+ex.load:''}</div>
      </div>
    </div>`).join('');
  });

  // Select all toggle
  let allSelected = false;
  document.getElementById('select-all-btn')?.addEventListener('click', () => {
    allSelected = !allSelected;
    document.querySelectorAll('.ath-check').forEach(cb => { cb.checked = allSelected; });
    document.getElementById('select-all-btn').textContent = allSelected ? 'Deselect all' : 'Select all';
  });

  // Assign button
  document.getElementById('prog-assign-btn')?.addEventListener('click', () => {
    if (errEl) errEl.style.display = 'none';

    const title       = document.getElementById('prog-title')?.value.trim();
    const sessionType = document.getElementById('prog-type')?.value || 'general';
    const dueDate     = document.getElementById('prog-due')?.value;
    const notes       = document.getElementById('prog-notes')?.value.trim();
    const tmplId      = document.getElementById('prog-template')?.value;
    const tmpl        = TEMPLATES.find(t => t.id === tmplId);

    const athleteIds  = [...document.querySelectorAll('.ath-check:checked')]
      .map(cb => parseInt(cb.value));

    if (!title) {
      if (errEl) { errEl.textContent = 'Session title is required.'; errEl.style.display = 'block'; }
      return;
    }
    if (!athleteIds.length) {
      if (errEl) { errEl.textContent = 'Select at least one athlete.'; errEl.style.display = 'block'; }
      return;
    }

    const btn = document.getElementById('prog-assign-btn');
    btn.textContent = 'Assigning…'; btn.disabled = true;

    assignWorkout({
      athleteIds,
      title,
      sessionType,
      exercises: tmpl?.exercises || [],
      dueDate,
      notes,
      coachName: 'Coach',
    });

    showToast(`✅ Assigned "${title}" to ${athleteIds.length} athlete${athleteIds.length>1?'s':''}`, 'success');
    navigate('coach/program');
  });
});
