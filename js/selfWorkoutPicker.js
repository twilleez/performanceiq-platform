import { SELF_WORKOUT_TYPES, getSelfWorkout } from './data/selfWorkoutCatalog.js';
import { createWorkout } from './services/workoutService.js';
import { getSession, getCurrentRole } from './core/auth.js';
import { getState, setState, addWorkoutLog } from './state/state.js';
import { navigate } from './router.js';

const SOLO_KEY = 'piq_solo_selected_workout';

function esc(v='') {
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function workoutMeta(type) {
  const sport = getState().athleteProfile?.sport || 'basketball';
  return getSelfWorkout(type, sport);
}

function pickerHTML({ title='Choose your workout', subtitle='Pick the training focus you want today.', activeType='' } = {}) {
  return `
  <section class="piq-self-picker" id="piq-self-picker" aria-labelledby="piq-self-title">
    <div class="piq-self-head">
      <div>
        <div class="piq-self-kicker">CHOOSE YOUR TRAINING</div>
        <h2 id="piq-self-title">${esc(title)}</h2>
        <p>${esc(subtitle)}</p>
      </div>
      <span class="piq-self-head-badge">7 workout options</span>
    </div>

    <div class="piq-self-grid" role="list" aria-label="Workout types">
      ${SELF_WORKOUT_TYPES.map(t => {
        const w = workoutMeta(t.id);
        const active = t.id === activeType;
        return `
        <button class="piq-self-type ${active ? 'active' : ''}" data-self-type="${t.id}" type="button" role="listitem" aria-pressed="${active}">
          <span class="piq-self-card-top">
            <span class="piq-self-icon">${t.icon}</span>
            ${active ? '<span class="piq-self-current">Selected</span>' : ''}
          </span>
          <span class="piq-self-copy">
            <strong>${esc(t.label)}</strong>
            <small>${esc(t.description)}</small>
          </span>
          <span class="piq-self-meta">
            <span>⏱ ${w.estimatedDuration} min</span>
            <span>RPE ${esc(w.rpeTarget)}</span>
            <span>${w.exercises.length} exercises</span>
          </span>
          <span class="piq-self-card-action">${active ? 'Current workout' : 'Choose workout'} <span>→</span></span>
        </button>`;
      }).join('')}
    </div>
    <div class="piq-self-status" id="piq-self-status" role="status"></div>
  </section>`;
}

function localPlayerWorkout(workout) {
  const state = getState();
  const record = {
    id: `self_${Date.now()}`,
    title: workout.title,
    sport: workout.sport,
    sessionType: workout.sessionType,
    scheduledDate: new Date().toISOString().slice(0,10),
    exercises: workout.exercises,
    completed: false,
    status: 'planned',
    selfSelected: true,
  };
  setState({ assignedWorkouts: [...(state.assignedWorkouts || []), record] });
  return record;
}

async function chooseForPlayer(type, status) {
  const sport = getState().athleteProfile?.sport || 'basketball';
  const workout = getSelfWorkout(type, sport);
  status.textContent = `Preparing ${workout.title}…`;
  try {
    if (getSession()?.isDemo) {
      localPlayerWorkout(workout);
    } else {
      await createWorkout({
        title: workout.title,
        sport,
        dayType: workout.dayType,
        scheduledDate: new Date().toISOString().slice(0,10),
        exercises: workout.exercises,
        notes: 'Self-selected workout',
      });
    }
    status.textContent = `✓ ${workout.title} is ready.`;
    navigate('player/today');
  } catch (err) {
    console.error('[PIQ] self-select workout failed:', err);
    status.textContent = `Could not select workout: ${err?.message || 'Unknown error'}`;
  }
}

function renderSoloSelected(type) {
  const profile = getState().athleteProfile || {};
  const workout = getSelfWorkout(type, profile.sport || 'basketball');
  const main = document.getElementById('piq-main');
  if (!main) return;

  main.innerHTML = `
    <div class="piq-view piq-self-workout-view">
      <div class="piq-self-page-head">
        <div>
          <span class="piq-self-kicker">TODAY · SELF-SERVICE TRAINING</span>
          <h1>Ready to train?</h1>
          <p>Choose a focus, follow the session, and log how it went.</p>
        </div>
      </div>

      ${pickerHTML({ title:'Choose today’s workout', subtitle:'Choose the session that fits what you need today. You can switch before completing the workout.', activeType:type })}

      <section class="piq-self-selected" aria-labelledby="piq-current-workout-title">
        <div class="piq-self-selected-top">
          <div class="piq-self-selected-title-wrap">
            <span class="piq-self-selected-icon">${SELF_WORKOUT_TYPES.find(t => t.id === type)?.icon || '🏋️'}</span>
            <div>
              <div class="piq-self-kicker">YOUR WORKOUT</div>
              <h2 id="piq-current-workout-title">${esc(workout.title)}</h2>
              <p>${esc((profile.sport || 'basketball').replace(/^./, c => c.toUpperCase()))} training session</p>
            </div>
          </div>
          <span class="piq-self-badge">${esc(workout.sessionType)}</span>
        </div>

        <div class="piq-self-summary" aria-label="Workout summary">
          <div><span>⏱</span><strong>${workout.estimatedDuration}</strong><small>minutes</small></div>
          <div><span>🔥</span><strong>${esc(workout.rpeTarget)}</strong><small>target RPE</small></div>
          <div><span>📋</span><strong>${workout.exercises.length}</strong><small>exercises</small></div>
        </div>

        <div class="piq-self-section-head">
          <div><span>Workout plan</span><small>Tap each exercise when finished</small></div>
          <span id="piq-self-progress">0 / ${workout.exercises.length} done</span>
        </div>

        <div class="piq-self-exercises">
          ${workout.exercises.map((ex,i) => `
            <button class="piq-self-exercise" type="button" data-exercise-check="${i}" aria-pressed="false">
              <span class="piq-self-num">${i+1}</span>
              <span class="piq-self-ex-body">
                <strong>${esc(ex.name)}</strong>
                <small>${esc(ex.sets)} sets × ${esc(ex.reps)}${ex.rest ? ` · ${esc(ex.rest)} sec rest` : ''}</small>
              </span>
              <span class="piq-self-check" aria-hidden="true">○</span>
            </button>`).join('')}
        </div>

        <section class="piq-self-log-card" aria-labelledby="piq-log-title">
          <div class="piq-self-section-head piq-self-log-head">
            <div>
              <span id="piq-log-title">Finish & log workout</span>
              <small>Record the session so Progress and streaks stay accurate.</small>
            </div>
          </div>

          <div class="piq-self-log-grid">
            <label><span>Duration</span><div class="piq-input-unit"><input id="piq-self-duration" type="number" min="1" value="${workout.estimatedDuration}"><em>min</em></div></label>
            <label><span>Session effort</span><div class="piq-input-unit"><input id="piq-self-rpe" type="number" min="1" max="10" value="7"><em>RPE / 10</em></div></label>
          </div>
          <label class="piq-self-notes"><span>Workout notes <small>optional</small></span><textarea id="piq-self-notes" rows="3" placeholder="PRs, weights used, how you felt, anything to remember…"></textarea></label>
          <button class="piq-self-complete" id="piq-self-complete" type="button" aria-label="Complete Workout"><span>✓</span> Complete & Save Workout</button>
          <div id="piq-self-complete-status" class="piq-self-status" role="status"></div>
        </section>
      </section>
    </div>`;

  bindPicker('solo');
  bindExerciseChecks(workout.exercises.length);

  document.getElementById('piq-self-complete')?.addEventListener('click', () => {
    const duration = Number(document.getElementById('piq-self-duration')?.value || workout.estimatedDuration);
    const avgRPE = Number(document.getElementById('piq-self-rpe')?.value || 7);
    const notes = document.getElementById('piq-self-notes')?.value || '';
    addWorkoutLog({
      name: workout.title,
      title: workout.title,
      sport: workout.sport,
      sessionType: workout.sessionType,
      exercises: workout.exercises,
      duration,
      avgRPE,
      notes,
      completed:true,
      selfSelected:true,
      ts:Date.now(),
    });
    const status = document.getElementById('piq-self-complete-status');
    if (status) status.textContent = '✓ Workout logged and saved. Your Progress and streak can now update.';
    const btn = document.getElementById('piq-self-complete');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span>✓</span> Workout Complete'; }
  });
}

function bindExerciseChecks(total) {
  const update = () => {
    const done = document.querySelectorAll('.piq-self-exercise.done').length;
    const progress = document.getElementById('piq-self-progress');
    if (progress) progress.textContent = `${done} / ${total} done`;
  };

  document.querySelectorAll('[data-exercise-check]').forEach(btn => {
    btn.addEventListener('click', () => {
      const done = !btn.classList.contains('done');
      btn.classList.toggle('done', done);
      btn.setAttribute('aria-pressed', String(done));
      const check = btn.querySelector('.piq-self-check');
      if (check) check.textContent = done ? '✓' : '○';
      update();
    });
  });
}

function bindPicker(role) {
  const status = document.getElementById('piq-self-status');
  document.querySelectorAll('[data-self-type]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.selfType;
      if (role === 'solo') {
        localStorage.setItem(SOLO_KEY, type);
        renderSoloSelected(type);
      } else {
        document.querySelectorAll('[data-self-type]').forEach(b => b.disabled = true);
        await chooseForPlayer(type, status);
        document.querySelectorAll('[data-self-type]').forEach(b => b.disabled = false);
      }
    });
  });
}

function installPlayerPicker() {
  if (document.getElementById('piq-self-picker')) return;
  const main = document.getElementById('piq-main');
  if (!main) return;
  const noWorkout = /No workout assigned|No workout scheduled/i.test(main.textContent || '');
  if (!noWorkout) return;

  const view = main.querySelector('.piq-view') || main.firstElementChild || main;
  view.innerHTML = `
    <div class="piq-self-page-head">
      <div>
        <span class="piq-self-kicker">TODAY · TRAIN ON YOUR OWN</span>
        <h1>No Coach workout today</h1>
        <p>You can still train. Pick a focus and PerformanceIQ will build your session.</p>
      </div>
    </div>
    ${pickerHTML({
      title:'Choose today’s workout',
      subtitle:'Pick the training focus that matches what you need today.'
    })}`;
  bindPicker('player');
}

function installSoloPicker() {
  const selected = localStorage.getItem(SOLO_KEY) || 'strength';
  renderSoloSelected(selected);
}

document.addEventListener('piq:viewRendered', e => {
  const route = e.detail?.route;
  const role = getCurrentRole();
  if (route === 'player/today' && role === 'player') installPlayerPicker();
  if (route === 'solo/today' && role === 'solo') installSoloPicker();
});
