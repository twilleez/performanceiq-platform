/**
 * player/logWorkout.js — Phase 15C v2
 * Uses Engine 3 (workout generator) + Engine 4 (nutrition preview)
 * C4: Wellness sliders with directional hints
 * Shows generated workout from Engine 3
 */
import { state }           from '../../state/state.js';
import { router }          from '../../core/router.js';
import { showSessionReady } from '../../app.js';
import { ROUTES }          from '../../app.js';
import { Engines }         from '../../services/engines.js';

const WELLNESS_FIELDS = [
  { id:'sleep',    label:'Sleep Quality',   low:'Poor sleep',     high:'Excellent sleep',  invert:false },
  { id:'soreness', label:'Muscle Soreness', low:'No soreness',    high:'Very sore',        invert:true  },
  { id:'stress',   label:'Stress Level',    low:'Calm & focused', high:'High stress',       invert:true  },
  { id:'fatigue',  label:'Fatigue',         low:'Fresh',          high:'Exhausted',         invert:true  },
  { id:'mood',     label:'Mood',            low:'Low',            high:'Excellent',          invert:false },
];

function wellnessField(f, savedVal) {
  const defaultVal = f.invert ? 3 : 7;
  const v = savedVal || defaultVal;
  return `
  <div class="wellness-field" data-wellness-field="${f.id}">
    <div class="wellness-label-row">
      <label class="wellness-label" for="wf-${f.id}">${f.label}</label>
      <span class="slider-mid-val" id="wf-${f.id}-val" style="font-size:12px;font-weight:600;color:var(--piq-muted);">${v}/10</span>
    </div>
    <input type="range" id="wf-${f.id}" class="wellness-slider"
           min="1" max="10" value="${v}" aria-label="${f.label}">
    <div class="wellness-slider-hints">
      <span>${f.low}</span><span></span><span>${f.high}</span>
    </div>
  </div>`;
}

export function renderPlayerLog(container) {
  const s       = state.getAll();
  const sport   = s.sport || 'Basketball';
  const lastW   = (s.wellness || []).slice(-1)[0] || {};

  // Generate workout from Engine 3
  const workout = Engines.workout(s);

  container.innerHTML = `
    <div class="piq-view" style="max-width:820px;">

      <div class="view-page-header">
        <div class="view-page-title">LOG <span class="hl">SESSION</span></div>
        <div class="view-page-subtitle">${sport} · ${s.seasonPhase||'In-Season'} · ${workout.typeLabel||'Standard Session'}</div>
      </div>

      <div class="two-col" style="grid-template-columns:1fr 280px;">

        <!-- LEFT: Wellness + workout -->
        <div style="display:grid;gap:16px;">

          <!-- Wellness Check-in -->
          <div class="panel">
            <div class="panel-head"><div class="panel-title">WELLNESS CHECK-IN</div></div>
            <div style="padding:16px 20px;display:grid;gap:16px;">
              ${WELLNESS_FIELDS.map(f => wellnessField(f, lastW[f.id])).join('')}
            </div>
          </div>

          <!-- Generated Workout -->
          <div class="panel">
            <div class="panel-head" style="align-items:flex-start;flex-direction:column;gap:4px;">
              <div class="panel-title">TODAY'S SESSION — ${sport.toUpperCase()}</div>
              <div style="font-size:11.5px;color:var(--text-muted,#9CA3AF);font-family:inherit;">
                ${workout.rationale}
              </div>
            </div>

            <!-- Warm-up -->
            <div style="padding:10px 20px 6px;background:#F9FAFF;border-bottom:1px solid var(--card-border,#E8E9F0);">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:var(--text-muted,#9CA3AF);text-transform:uppercase;margin-bottom:6px;">WARM-UP</div>
              ${workout.warmup.map(ex => `
                <div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.04);">
                  <div style="width:6px;height:6px;background:var(--accent-green,#24C054);border-radius:50%;margin-top:5px;flex-shrink:0;"></div>
                  <div>
                    <div style="font-size:12.5px;font-weight:500;color:var(--text-primary,#1A1F36);">${ex.name}</div>
                    <div style="font-size:11px;color:var(--text-muted,#9CA3AF);">${ex.note}</div>
                  </div>
                </div>`).join('')}
            </div>

            <!-- Main exercises -->
            <div style="padding:0 20px;">
              ${workout.exercises.map((ex, i) => `
                <div class="session-row" style="padding:12px 0;cursor:default;">
                  <div style="width:28px;height:28px;border-radius:7px;background:var(--nav-bg,#0D1B40);
                       display:flex;align-items:center;justify-content:center;
                       font-family:'Oswald',sans-serif;font-size:12px;font-weight:700;
                       color:var(--accent-green,#24C054);flex-shrink:0;">
                    ${i+1}
                  </div>
                  <div style="flex:1;">
                    <div class="session-name">${ex.name}</div>
                    <div class="session-meta">${ex.sets} sets${ex.reps>1?' × '+ex.reps:''} · ${ex.note}</div>
                  </div>
                  <span style="font-size:10px;padding:3px 8px;border-radius:5px;font-weight:600;
                       background:var(--accent-green-dim,rgba(36,192,84,0.1));
                       color:var(--accent-green,#24C054);text-transform:uppercase;letter-spacing:0.05em;flex-shrink:0;">
                    ${ex.category}
                  </span>
                </div>`).join('')}
            </div>

            <!-- Cool-down -->
            <div style="padding:10px 20px 14px;background:#F9FAFF;border-top:1px solid var(--card-border,#E8E9F0);">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;color:var(--text-muted,#9CA3AF);text-transform:uppercase;margin-bottom:6px;">COOL-DOWN</div>
              ${workout.cooldown.map(ex => `
                <div style="display:flex;align-items:flex-start;gap:10px;padding:5px 0;">
                  <div style="width:6px;height:6px;background:var(--accent-blue,#3B82F6);border-radius:50%;margin-top:5px;flex-shrink:0;"></div>
                  <div style="font-size:12px;color:var(--text-secondary,#6B7280);">${ex.name} — ${ex.note}</div>
                </div>`).join('')}
            </div>
          </div>

          <!-- RPE -->
          <div class="panel">
            <div class="panel-head"><div class="panel-title">SESSION RPE</div></div>
            <div style="padding:16px 20px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:13px;color:var(--text-primary,#1A1F36);">How hard was this session?</span>
                <span id="rpe-display" style="font-family:'Oswald',sans-serif;font-size:26px;font-weight:700;color:var(--accent-green,#24C054);">6</span>
              </div>
              <input type="range" id="rpe-slider" min="1" max="10" value="6"
                     class="wellness-slider" aria-label="RPE 1 to 10">
              <div class="wellness-slider-hints"><span>Very easy</span><span></span><span>Maximum effort</span></div>
            </div>
          </div>

          <button class="btn-primary" id="log-submit">GENERATE &amp; LOG SESSION</button>
        </div>

        <!-- RIGHT: Engine outputs -->
        <div style="display:grid;gap:16px;">

          <!-- Readiness summary -->
          <div class="panel">
            <div class="panel-head"><div class="panel-title">READINESS</div></div>
            <div id="readiness-preview" style="padding:14px 18px;">
              <div style="font-size:12px;color:var(--text-muted,#9CA3AF);">Adjust wellness sliders to see your real-time readiness score.</div>
            </div>
          </div>

          <!-- Nutrition preview -->
          <div class="panel">
            <div class="panel-head"><div class="panel-title">NUTRITION TARGET</div></div>
            <div style="padding:14px 18px;">
              ${_nutritionPreview(s)}
            </div>
          </div>

          <!-- Session breakdown -->
          <div class="panel">
            <div class="panel-head"><div class="panel-title">SESSION DETAILS</div></div>
            <div style="padding:14px 18px;display:grid;gap:8px;">
              <div style="display:flex;justify-content:space-between;font-size:12.5px;">
                <span style="color:var(--text-muted,#9CA3AF);">Duration</span>
                <span style="font-weight:600;color:var(--text-primary,#1A1F36);">${workout.durationMins} min</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12.5px;">
                <span style="color:var(--text-muted,#9CA3AF);">Intensity</span>
                <span style="font-weight:600;color:var(--text-primary,#1A1F36);">${workout.intensity.toUpperCase()}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12.5px;">
                <span style="color:var(--text-muted,#9CA3AF);">Exercises</span>
                <span style="font-weight:600;color:var(--text-primary,#1A1F36);">${workout.exercises.length}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12.5px;">
                <span style="color:var(--text-muted,#9CA3AF);">Phase</span>
                <span style="font-weight:600;color:var(--text-primary,#1A1F36);">${workout.phase}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12.5px;">
                <span style="color:var(--text-muted,#9CA3AF);">ACWR Zone</span>
                <span style="font-weight:600;color:var(--accent-green,#24C054);">${workout.acwrZone.replace('-',' ')}</span>
              </div>
            </div>
          </div>

        </div>
      </div><!-- /two-col -->
    </div>`;

  // Wire wellness sliders
  WELLNESS_FIELDS.forEach(f => {
    const slider  = container.querySelector(`#wf-${f.id}`);
    const display = container.querySelector(`#wf-${f.id}-val`);
    if (!slider || !display) return;
    const update = () => {
      const v  = parseInt(slider.value);
      const bad = f.invert ? v >= 7 : v <= 3;
      const good= f.invert ? v <= 3 : v >= 7;
      display.textContent = `${v}/10`;
      display.style.color = bad ? '#EF4444' : good ? '#24C054' : '#9CA3AF';
    };
    slider.addEventListener('input', update);
    update();
  });

  const rpeSlider = container.querySelector('#rpe-slider');
  const rpeDisplay = container.querySelector('#rpe-display');
  rpeSlider?.addEventListener('input', () => {
    if (rpeDisplay) rpeDisplay.textContent = rpeSlider.value;
  });

  container.querySelector('#log-submit')?.addEventListener('click', () => {
    const getVal = id => parseInt(container.querySelector(`#wf-${id}`)?.value || 5);
    const wellness = {
      date: new Date().toISOString(),
      sleep: getVal('sleep'), soreness: getVal('soreness'),
      stress: getVal('stress'), fatigue: getVal('fatigue'), mood: getVal('mood'),
    };
    const rpe  = parseInt(rpeSlider?.value || 6);
    const load = rpe * (workout.durationMins || 40);
    const intensity = rpe >= 8 ? 'high' : rpe >= 5 ? 'moderate' : 'low';

    const wList = state.get('wellness') || [];
    wList.push(wellness);
    state.set('wellness', wList);

    showSessionReady({
      exerciseCount: workout.exercises.length,
      durationMins: workout.durationMins,
      intensity, sport,
      phase: s.seasonPhase || '',
      onStart: () => _save(workout, wellness, rpe, load, sport, true),
      onSave:  () => _save(workout, wellness, rpe, load, sport, false),
    });
  });

  container.querySelectorAll('[data-route]').forEach(el =>
    el.addEventListener('click', () => router.navigate(el.dataset.route)));
}

function _nutritionPreview(s) {
  try {
    const n = Engines.nutrition(s);
    return `
      <div style="display:grid;gap:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12.5px;">
          <span style="color:var(--text-muted,#9CA3AF);">Carbs</span>
          <span style="font-weight:700;color:var(--accent-green,#24C054);">${n.macros.carbs.g}g</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;">
          <span style="color:var(--text-muted,#9CA3AF);">Protein</span>
          <span style="font-weight:700;color:var(--accent-blue,#3B82F6);">${n.macros.protein.g}g</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;">
          <span style="color:var(--text-muted,#9CA3AF);">Fat</span>
          <span style="font-weight:600;color:var(--text-primary,#1A1F36);">${n.macros.fat.g}g</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12.5px;">
          <span style="color:var(--text-muted,#9CA3AF);">Total Cal</span>
          <span style="font-weight:600;color:var(--text-primary,#1A1F36);">${n.macros.total.kcal}</span>
        </div>
        <div style="font-size:10.5px;color:var(--text-muted,#9CA3AF);margin-top:4px;line-height:1.4;">
          ${n.typeLabel} · ${n.macros.carbs.gPerKg}g/kg CHO
        </div>
      </div>`;
  } catch { return '<div style="font-size:12px;color:#9CA3AF;">Set body weight in settings to see targets.</div>'; }
}

function _save(workout, wellness, rpe, load, sport, completed) {
  const sessions = state.get('sessions') || [];
  const logs     = state.get('logs')     || [];
  const session  = {
    id: Date.now(), date: new Date().toISOString(), sport,
    exercises: workout.exercises.map(e=>e.name),
    durationMins: workout.durationMins,
    rpe, load, completed, draft: !completed,
  };
  sessions.push(session);
  if (completed) logs.push({ date:session.date, load, completed:true, rpe, durationMins:session.durationMins });
  state.set('sessions', sessions);
  state.set('logs', logs);
  router.navigate('player-home');
}
