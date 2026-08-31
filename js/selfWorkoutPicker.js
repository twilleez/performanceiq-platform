import { SELF_WORKOUT_TYPES, getSelfWorkout } from './data/selfWorkoutCatalog.js';
import { createWorkout } from './services/workoutService.js';
import { getSession, getCurrentRole } from './core/auth.js';
import { getState, setState, addWorkoutLog } from './state/state.js';
import { navigate } from './router.js';

const SOLO_KEY = 'piq_solo_selected_workout';

function esc(v='') {
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function pickerHTML({ title='Choose your workout', subtitle='Pick the training focus you want today.' } = {}) {
  return `
  <section class="piq-self-picker" id="piq-self-picker" aria-labelledby="piq-self-title">
    <div class="piq-self-head">
      <div>
        <div class="piq-self-kicker">SELF-SERVICE TRAINING</div>
        <h2 id="piq-self-title">${esc(title)}</h2>
        <p>${esc(subtitle)}</p>
      </div>
    </div>
    <div class="piq-self-grid">
      ${SELF_WORKOUT_TYPES.map(t => `
        <button class="piq-self-type" data-self-type="${t.id}" type="button">
          <span class="piq-self-icon">${t.icon}</span>
          <span class="piq-self-copy"><strong>${t.label}</strong><small>${t.description}</small></span>
          <span class="piq-self-arrow">→</span>
        </button>`).join('')}
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
  status.textContent = `Loading ${workout.title}…`;
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
    status.textContent = `✓ ${workout.title} selected.`;
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
      ${pickerHTML({ title:'Choose today’s workout', subtitle:'You control the session. Switch training focus any time before you log it.' })}
      <section class="piq-self-selected">
        <div class="piq-self-selected-top">
          <div>
            <div class="piq-self-kicker">TODAY'S WORKOUT</div>
            <h1>${esc(workout.title)}</h1>
            <p>${esc((profile.sport || 'basketball').replace(/^./, c => c.toUpperCase()))} · ${workout.estimatedDuration} min · Target RPE ${workout.rpeTarget}</p>
          </div>
          <span class="piq-self-badge">${esc(workout.sessionType)}</span>
        </div>
        <div class="piq-self-exercises">
          ${workout.exercises.map((ex,i) => `
            <div class="piq-self-exercise">
              <span class="piq-self-num">${i+1}</span>
              <div><strong>${esc(ex.name)}</strong><small>${esc(ex.sets)} × ${esc(ex.reps)}${ex.rest ? ` · ${esc(ex.rest)}s rest` : ''}</small></div>
            </div>`).join('')}
        </div>
        <div class="piq-self-log-grid">
          <label>Duration (minutes)<input id="piq-self-duration" type="number" min="1" value="${workout.estimatedDuration}"></label>
          <label>RPE (1–10)<input id="piq-self-rpe" type="number" min="1" max="10" value="7"></label>
        </div>
        <label class="piq-self-notes">Notes<textarea id="piq-self-notes" rows="3" placeholder="How did the workout feel?"></textarea></label>
        <button class="btn primary piq-self-complete" id="piq-self-complete" type="button">Complete Workout</button>
        <div id="piq-self-complete-status" class="piq-self-status" role="status"></div>
      </section>
    </div>`;

  bindPicker('solo');
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
    if (status) status.textContent = '✓ Workout logged. Progress and streak data can now update.';
    const btn = document.getElementById('piq-self-complete');
    if (btn) { btn.disabled = true; btn.textContent = '✓ Workout Complete'; }
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
  if (!noWorkout) return; // Coach/self assignment takes priority.

  const view = main.querySelector('.piq-view') || main.firstElementChild || main;
  view.insertAdjacentHTML('afterbegin', pickerHTML({
    title:'No Coach workout today — choose your own',
    subtitle:'Pick a training focus and PerformanceIQ will load a complete session for today.'
  }));
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
