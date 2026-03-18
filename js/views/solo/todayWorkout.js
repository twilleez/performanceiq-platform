import { buildSidebar }    from '../../components/nav.js';
import { getState, addWorkoutLog } from '../../state/state.js';
import { getCurrentUser }  from '../../core/auth.js';
import { navigate }        from '../../router.js';
import { showToast }       from '../../core/notifications.js';
import { TRAINING_TEMPLATES, SPORT_EMOJI } from '../../data/exerciseLibrary.js';

export function renderPlayerToday() {
  const user   = getCurrentUser();
  const sport  = user?.sport || 'basketball';
  const log    = getState().workoutLog;
  const todayStr = new Date().toISOString().split('T')[0];
  const doneTodayCount = log.filter(w => w.date === todayStr).length;

  // Pick a template matching sport, or fallback
  const tmpl = TRAINING_TEMPLATES.find(t => t.sport === sport && t.popular)
            || TRAINING_TEMPLATES[0];
  const exercises = tmpl.exercises;

  const exRows = exercises.map((name, i) => `
  <div class="ex-check-row" id="ecr-${i}" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer" data-idx="${i}">
    <div class="ex-check-box" id="ecb-${i}" style="width:22px;height:22px;border-radius:5px;border:2px solid var(--border-strong);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all .2s"></div>
    <div style="flex:1">
      <div style="font-weight:600;font-size:13.5px;color:var(--text-primary)">${name}</div>
      <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">3 sets × 8 reps · 60s rest</div>
    </div>
    <span class="w-badge gray ex-status-badge" id="esb-${i}">TODO</span>
  </div>`).join('');

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player','player/today')}
  <main class="page-main">
    <div class="page-header">
      <h1>Today's <span>Workout</span></h1>
      <p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · ${tmpl.focus}</p>
    </div>

    ${doneTodayCount > 0 ? `
    <div style="background:rgba(57,230,107,.1);border:1.5px solid rgba(57,230,107,.3);border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
      <span style="font-size:20px">🎉</span>
      <span style="font-size:13.5px;color:var(--piq-green-dark);font-weight:600">You logged ${doneTodayCount} session${doneTodayCount>1?'s':''} today! Great work.</span>
    </div>` : ''}

    <div class="panels-2">
      <div class="panel">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px">
          <div>
            <div class="panel-title" style="margin-bottom:4px">${SPORT_EMOJI[sport]} ${tmpl.title}</div>
            <div style="font-size:12.5px;color:var(--text-muted)">${tmpl.duration}wk program · ${tmpl.sessions_per_week}x/wk · <span class="tag tag-green">${tmpl.level}</span></div>
          </div>
          <span class="w-badge blue">IN PROGRESS</span>
        </div>

        <!-- Phase bar -->
        <div style="display:flex;gap:3px;height:6px;border-radius:4px;overflow:hidden;margin-bottom:20px">
          ${tmpl.phases.map(ph => `<div style="flex:${ph.weeks};background:${ph.color}" title="${ph.label}"></div>`).join('')}
        </div>

        <div id="ex-checklist">${exRows}</div>

        <div id="workout-complete-banner" style="display:none;margin-top:12px;background:rgba(57,230,107,.08);border:1.5px solid rgba(57,230,107,.25);border-radius:10px;padding:12px 14px;font-size:13px;color:var(--piq-green-dark);font-weight:600">
          ✅ All exercises checked! Log your RPE to save.
        </div>

        <!-- RPE + submit -->
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
          <label style="font-size:12.5px;font-weight:600;color:var(--text-secondary)">
            Session RPE — <strong id="today-rpe-val" style="color:var(--piq-green-dark)">6</strong>/10
          </label>
          <input type="range" id="today-rpe" min="1" max="10" value="6" style="width:100%;margin-top:8px;accent-color:var(--piq-green)">
          <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
            <button class="btn-assign" id="today-complete-btn">💪 Complete Workout</button>
            <button class="btn-draft" data-route="player/log">Log Different Session</button>
          </div>
        </div>
      </div>

      <!-- Info panel -->
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Session Notes</div>
          <textarea id="today-notes" placeholder="How are you feeling? Any modifications?" rows="3"
            style="width:100%;padding:10px 13px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--bg-input);color:var(--text-primary);font-family:inherit;font-size:13px;resize:vertical;outline:none"></textarea>
        </div>
        <div class="panel">
          <div class="panel-title">Program Phases</div>
          ${tmpl.phases.map(ph => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="width:12px;height:12px;border-radius:2px;background:${ph.color};flex-shrink:0"></div>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${ph.label}</div>
              <div style="font-size:11.5px;color:var(--text-muted)">${ph.weeks} week${ph.weeks>1?'s':''}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', wireTodayWorkout);

function wireTodayWorkout() {
  if (!document.getElementById('today-complete-btn')) return;
  const completed = new Set();
  const total = document.querySelectorAll('.ex-check-row').length;

  // Toggle exercises
  document.querySelectorAll('.ex-check-row').forEach(row => {
    row.addEventListener('click', () => {
      const idx  = +row.dataset.idx;
      const box  = document.getElementById('ecb-' + idx);
      const badge= document.getElementById('esb-' + idx);
      if (completed.has(idx)) {
        completed.delete(idx);
        box.textContent = '';
        box.style.background = 'transparent';
        box.style.borderColor = 'var(--border-strong)';
        badge.textContent = 'TODO';
        badge.className = 'w-badge gray ex-status-badge';
      } else {
        completed.add(idx);
        box.textContent = '✓';
        box.style.background = 'var(--piq-green)';
        box.style.borderColor = 'var(--piq-green)';
        box.style.color = 'var(--piq-navy)';
        badge.textContent = 'DONE';
        badge.className = 'w-badge ex-status-badge';
      }
      document.getElementById('workout-complete-banner').style.display =
        completed.size === total ? 'block' : 'none';
    });
  });

  // RPE display
  document.getElementById('today-rpe')?.addEventListener('input', e => {
    const v = +e.target.value;
    const el = document.getElementById('today-rpe-val');
    el.textContent = v;
    el.style.color = v >= 9 ? '#ef4444' : v >= 7 ? '#f59e0b' : 'var(--piq-green-dark)';
  });

  // Complete
  document.getElementById('today-complete-btn')?.addEventListener('click', () => {
    const user  = getCurrentUser();
    const sport = user?.sport || 'basketball';
    const tmpl  = TRAINING_TEMPLATES.find(t => t.sport === sport && t.popular) || TRAINING_TEMPLATES[0];
    const rpe   = +(document.getElementById('today-rpe')?.value || 6);

    addWorkoutLog({
      title:     tmpl.title,
      date:      new Date().toISOString().split('T')[0],
      sport,
      duration:  45,
      avgRPE:    rpe,
      exercises: tmpl.exercises.length,
      exerciseList: tmpl.exercises.map(name => ({ name, sets: 3, reps: 8 })),
      notes:     document.getElementById('today-notes')?.value.trim(),
      completed: completed.size === document.querySelectorAll('.ex-check-row').length,
      checkedCount: completed.size,
    });

    showToast(`🏆 Workout logged! RPE ${rpe} — great session.`);
    navigate('player/progress');
  });
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('piq_session_v2') || '{}')?.user || {};
}
