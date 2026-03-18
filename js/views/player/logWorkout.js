import { buildSidebar }    from '../../components/nav.js';
import { addWorkoutLog, getWorkoutLog, getState } from '../../state/state.js';
import { TRAINING_TEMPLATES, SPORT_EMOJI, EXERCISES } from '../../data/exerciseLibrary.js';
import { getCurrentUser }  from '../../core/auth.js';
import { navigate }        from '../../router.js';
import { showToast }       from '../../core/notifications.js';

export function renderPlayerLog() {
  const user  = getCurrentUser();
  const sport = user?.sport || 'basketball';
  const log   = getWorkoutLog().slice(-5).reverse();

  const recentRows = log.length ? log.map(w => `
    <div class="w-row">
      <div class="w-icon">${SPORT_EMOJI[w.sport] || '🏋️'}</div>
      <div class="w-info">
        <div class="w-name">${w.title || 'Workout'}</div>
        <div class="w-meta">${w.date || ''} · ${w.exercises || 0} exercises · RPE ${w.avgRPE || '—'}</div>
      </div>
      <span class="w-badge ${w.completed ? '' : 'gray'}">${w.completed ? 'DONE' : 'PARTIAL'}</span>
    </div>`).join('')
  : '<p style="color:var(--text-muted);font-size:13px">No sessions logged yet. Log your first workout below.</p>';

  const sportExercises = EXERCISES.filter(e => e.sports.includes(sport)).slice(0, 12);

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player','player/log')}
  <main class="page-main">
    <div class="page-header">
      <h1>Log <span>Session</span></h1>
      <p>Record your workout · data drives your PIQ score</p>
    </div>

    <div class="panels-2">
      <!-- Log form -->
      <div class="panel">
        <div class="panel-title">New Session</div>

        <div class="b-field-row">
          <div class="b-field">
            <label>Workout Name</label>
            <input type="text" id="log-title" placeholder="e.g. Morning Speed Work" value="">
          </div>
          <div class="b-field">
            <label>Date</label>
            <input type="date" id="log-date" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>

        <div class="b-field-row">
          <div class="b-field">
            <label>Sport</label>
            <select id="log-sport">
              ${['basketball','football','soccer','baseball','volleyball','track'].map(s =>
                `<option value="${s}" ${sport===s?'selected':''}>${SPORT_EMOJI[s]} ${s[0].toUpperCase()+s.slice(1)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="b-field">
            <label>Duration (min)</label>
            <input type="number" id="log-duration" value="45" min="5" max="300">
          </div>
        </div>

        <!-- RPE Slider -->
        <div class="b-field" style="margin-bottom:20px">
          <label>Session RPE (Rate of Perceived Exertion) — <strong id="rpe-display" style="color:var(--piq-green-dark)">6</strong>/10</label>
          <input type="range" id="log-rpe" min="1" max="10" value="6" style="width:100%;margin-top:8px;accent-color:var(--piq-green)">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:4px">
            <span>1 Very Easy</span><span>5 Moderate</span><span>10 Max Effort</span>
          </div>
        </div>

        <!-- Exercises logged -->
        <div class="panel-title" style="margin-top:4px">Exercises Completed</div>
        <div id="log-ex-list" style="margin-bottom:10px">
          <div class="ex-row" id="log-ex-0">
            <input type="text" class="ex-name" placeholder="Exercise name" list="ex-suggestions" data-idx="0">
            <input type="number" class="ex-sets" value="3" min="1" max="20" placeholder="Sets" data-idx="0">
            <input type="number" class="ex-reps" value="8" min="1" max="100" placeholder="Reps" data-idx="0">
            <input type="number" class="ex-rest" value="60" min="0" max="600" placeholder="Rest" data-idx="0">
            <button class="ex-del" data-idx="0">×</button>
          </div>
        </div>
        <datalist id="ex-suggestions">
          ${sportExercises.map(e => `<option value="${e.name}">`).join('')}
        </datalist>
        <button class="btn-add-ex" id="log-add-ex">+ Add Exercise</button>

        <!-- Notes -->
        <div class="b-field" style="margin-top:16px">
          <label>Notes (optional)</label>
          <textarea id="log-notes" placeholder="How did it feel? Any PRs?" rows="2"
            style="width:100%;padding:10px 13px;border:1.5px solid var(--border);border-radius:var(--r-sm);background:var(--bg-input);color:var(--text-primary);font-family:inherit;font-size:13.5px;resize:vertical;outline:none"></textarea>
        </div>

        <!-- Status -->
        <div style="display:flex;align-items:center;gap:12px;margin:16px 0">
          <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;cursor:pointer">
            <input type="checkbox" id="log-completed" checked style="width:16px;height:16px;accent-color:var(--piq-green)">
            Mark as completed
          </label>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn-assign" id="log-submit-btn">✅ Save Session</button>
          <button class="btn-draft" data-route="player/home">Cancel</button>
        </div>
        <p id="log-error" style="color:#f87171;font-size:12.5px;margin-top:10px;display:none"></p>
      </div>

      <!-- Recent sessions -->
      <div>
        <div class="panel">
          <div class="panel-title">Recent Sessions</div>
          ${recentRows}
        </div>
        <div class="panel" style="margin-top:16px">
          <div class="panel-title">Quick Tips</div>
          <div class="w-row"><div class="w-icon">📊</div><div class="w-info"><div class="w-name">RPE drives your score</div><div class="w-meta">Target RPE 6–7 for best load management rating</div></div></div>
          <div class="w-row"><div class="w-icon">🔥</div><div class="w-info"><div class="w-name">Build your streak</div><div class="w-meta">Log every day to boost your consistency score</div></div></div>
          <div class="w-row"><div class="w-icon">✅</div><div class="w-info"><div class="w-name">Mark completed</div><div class="w-meta">Compliance score = % of sessions marked done</div></div></div>
        </div>
      </div>
    </div>
  </main>
</div>`;
}

// ── WIRE UP ───────────────────────────────────────────────────
document.addEventListener('piq:viewRendered', wireLogWorkout);

function wireLogWorkout() {
  const submitBtn = document.getElementById('log-submit-btn');
  if (!submitBtn) return;

  // RPE live display
  document.getElementById('log-rpe')?.addEventListener('input', e => {
    document.getElementById('rpe-display').textContent = e.target.value;
    const val = +e.target.value;
    document.getElementById('rpe-display').style.color =
      val >= 9 ? '#ef4444' : val >= 7 ? '#f59e0b' : 'var(--piq-green-dark)';
  });

  // Add exercise row
  document.getElementById('log-add-ex')?.addEventListener('click', () => {
    const list = document.getElementById('log-ex-list');
    const idx  = list.querySelectorAll('.ex-row').length;
    const div  = document.createElement('div');
    div.innerHTML = `<div class="ex-row" id="log-ex-${idx}">
      <input type="text" class="ex-name" placeholder="Exercise name" list="ex-suggestions" data-idx="${idx}">
      <input type="number" class="ex-sets" value="3" min="1" max="20" data-idx="${idx}">
      <input type="number" class="ex-reps" value="8" min="1" max="100" data-idx="${idx}">
      <input type="number" class="ex-rest" value="60" min="0" max="600" data-idx="${idx}">
      <button class="ex-del" data-idx="${idx}">×</button>
    </div>`;
    list.appendChild(div.firstElementChild);
    list.querySelector(`#log-ex-${idx} .ex-del`).addEventListener('click', e => {
      document.getElementById(`log-ex-${e.target.dataset.idx}`)?.remove();
    });
  });

  // Delete first row
  document.querySelector('#log-ex-0 .ex-del')?.addEventListener('click', e => {
    document.getElementById(`log-ex-${e.target.dataset.idx}`)?.remove();
  });

  // Submit
  submitBtn.addEventListener('click', () => {
    const title     = document.getElementById('log-title')?.value.trim();
    const errEl     = document.getElementById('log-error');
    if (!title) {
      errEl.textContent = 'Please add a workout name.';
      errEl.style.display = 'block';
      document.getElementById('log-title')?.focus();
      return;
    }
    errEl.style.display = 'none';

    const exercises = Array.from(document.querySelectorAll('#log-ex-list .ex-row'))
      .map(row => ({
        name: row.querySelector('.ex-name')?.value.trim(),
        sets: +(row.querySelector('.ex-sets')?.value || 3),
        reps: +(row.querySelector('.ex-reps')?.value || 8),
      })).filter(e => e.name);

    addWorkoutLog({
      title,
      date:      document.getElementById('log-date')?.value,
      sport:     document.getElementById('log-sport')?.value,
      duration:  +(document.getElementById('log-duration')?.value || 45),
      avgRPE:    +(document.getElementById('log-rpe')?.value || 6),
      exercises: exercises.length,
      exerciseList: exercises,
      notes:     document.getElementById('log-notes')?.value.trim(),
      completed: document.getElementById('log-completed')?.checked ?? true,
    });

    showToast(`✅ "${title}" logged! PIQ score updated.`);
    navigate('player/score');
  });
}
