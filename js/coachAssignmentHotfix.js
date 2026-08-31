import { getAssignableAthletes, assignWorkoutToAthlete } from './services/workoutService.js';
import { getSession } from './core/auth.js';
import { getRoster, getState, patchBuilder, setState } from './state/state.js';

function esc(v='') {
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function collectExercises() {
  return Array.from(document.querySelectorAll('#ex-list .ex-row')).map(row => ({
    name: row.querySelector('.ex-name')?.value?.trim() || '',
    category: row.querySelector('.piq-cat-tag')?.textContent?.trim() || 'strength',
    sets: Number(row.querySelector('.ex-sets')?.value || 3),
    reps: row.querySelector('.ex-reps')?.value || '8',
    rest: Number(row.querySelector('.ex-rest')?.value || 90),
    note: row.querySelector('.ex-note')?.value || '',
  })).filter(ex => ex.name);
}

function ensureWorkoutTypes() {
  const select = document.getElementById('b-day-type');
  if (!select) return;
  const current = select.value;
  const options = ['Strength','Power','Speed','Agility','Conditioning','Mobility','Recovery'];
  select.innerHTML = options.map(v => `<option value="${v}" ${v===current?'selected':''}>${v}</option>`).join('');
  const field = select.closest('.b-field');
  const label = field?.querySelector('label');
  if (label) label.textContent = 'Workout type';
}

function localAssign({ athlete, draft, date }) {
  const assigned = getState().assignedWorkouts || [];
  const record = {
    id: `demo_assign_${Date.now()}`,
    athleteId: athlete.id,
    athleteName: athlete.name,
    title: draft.title,
    sport: draft.sport,
    sessionType: draft.day_type,
    scheduledDate: date,
    exercises: draft.exercises,
    completed: false,
    status: 'planned',
  };
  setState({ assignedWorkouts: [...assigned, record] });
  return record;
}

async function loadAthletes(select, status) {
  select.innerHTML = '<option value="">Loading linked athletes…</option>';
  try {
    let athletes;
    if (getSession()?.isDemo) {
      athletes = getRoster().map(a => ({ id:a.id, name:a.name, position:a.position || '' }));
    } else {
      athletes = await getAssignableAthletes();
    }
    if (!athletes.length) {
      select.innerHTML = '<option value="">No linked Players available</option>';
      status.textContent = 'Link a Player to this Coach account before assigning a workout.';
      return [];
    }
    select.innerHTML = '<option value="">Select athlete…</option>' + athletes.map(a =>
      `<option value="${esc(a.id)}">${esc(a.name || a.email || 'Player')}${a.position ? ` · ${esc(a.position)}` : ''}</option>`
    ).join('');
    select._piqAthletes = athletes;
    status.textContent = `${athletes.length} linked athlete${athletes.length===1?'':'s'} available.`;
    return athletes;
  } catch (err) {
    console.error('[PIQ] Failed loading assignable athletes:', err);
    select.innerHTML = '<option value="">Unable to load athletes</option>';
    status.textContent = err?.message || 'Unable to load linked athletes.';
    return [];
  }
}

function installAssignmentPanel() {
  const btn = document.getElementById('btn-assign');
  if (!btn || document.getElementById('piq-live-assign-panel')) return;

  ensureWorkoutTypes();
  btn.textContent = '📋 Assign Workout';

  const actions = btn.parentElement;
  const panel = document.createElement('div');
  panel.id = 'piq-live-assign-panel';
  panel.style.cssText = 'margin-top:16px;padding:18px;border:1px solid rgba(111,217,79,.25);border-radius:12px;background:rgba(111,217,79,.055);max-width:760px';
  panel.innerHTML = `
    <div style="font-family:Oswald,sans-serif;font-size:17px;font-weight:700;margin-bottom:12px">Assign this workout</div>
    <div style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(150px,.6fr);gap:12px;align-items:end" class="piq-assignment-grid">
      <div>
        <label for="piq-assign-athlete" style="display:block;font-weight:700;margin-bottom:6px">Athlete</label>
        <select id="piq-assign-athlete" style="width:100%;min-height:44px;padding:9px 10px;border-radius:8px"></select>
      </div>
      <div>
        <label for="piq-assign-date" style="display:block;font-weight:700;margin-bottom:6px">Workout date</label>
        <input id="piq-assign-date" type="date" style="width:100%;min-height:44px;padding:9px 10px;border-radius:8px" />
      </div>
    </div>
    <div id="piq-assign-status" role="status" style="margin-top:9px;font-size:12px;color:var(--text-secondary,#8fb0ba)"></div>`;
  actions?.insertAdjacentElement('beforebegin', panel);

  const athleteSelect = panel.querySelector('#piq-assign-athlete');
  const dateInput = panel.querySelector('#piq-assign-date');
  const status = panel.querySelector('#piq-assign-status');
  dateInput.value = document.getElementById('b-date')?.value || new Date().toISOString().slice(0,10);
  loadAthletes(athleteSelect, status);

  btn.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const athleteId = athleteSelect.value;
    const athlete = athleteSelect._piqAthletes?.find(a => String(a.id) === String(athleteId));
    const title = document.getElementById('b-title')?.value?.trim() || '';
    const sport = document.getElementById('b-sport')?.value || 'basketball';
    const dayType = document.getElementById('b-day-type')?.value || 'Strength';
    const scheduledDate = dateInput.value || new Date().toISOString().slice(0,10);
    const exercises = collectExercises();

    if (!title) { status.textContent = 'Enter a workout name.'; return; }
    if (!athleteId || !athlete) { status.textContent = 'Select an athlete.'; return; }
    if (!exercises.length) { status.textContent = 'Add at least one exercise.'; return; }

    const draft = { ...getState().builder.draft, title, sport, day_type:dayType, exercises };
    patchBuilder({ draft });
    btn.disabled = true;
    btn.textContent = 'Assigning…';
    status.textContent = 'Saving workout assignment…';

    try {
      if (getSession()?.isDemo) {
        localAssign({ athlete, draft, date:scheduledDate });
      } else {
        await assignWorkoutToAthlete({
          athleteId, title, sport, dayType, scheduledDate, exercises,
          // Built-in browser templates use string IDs; the live DB template_id is UUID-backed.
          // Store the exercises directly and leave template_id null unless a DB template is used.
          templateId: null,
        });
      }
      status.textContent = `✓ ${title} assigned to ${athlete.name} for ${scheduledDate}.`;
      btn.textContent = '✓ Assigned';
      setTimeout(() => { btn.disabled = false; btn.textContent = '📋 Assign Workout'; }, 1400);
    } catch (err) {
      console.error('[PIQ] Workout assignment failed:', err);
      status.textContent = `Assignment failed: ${err?.message || 'Unknown error'}`;
      btn.disabled = false;
      btn.textContent = '📋 Assign Workout';
    }
  }, true);
}

document.addEventListener('piq:viewRendered', (event) => {
  if (event.detail?.route === 'coach/program') installAssignmentPanel();
});
