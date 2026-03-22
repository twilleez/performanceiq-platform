/**
 * PerformanceIQ — Solo Today's Workout v2
 */
import { buildSidebar }                                     from '../../components/nav.js';
import { getAthleteProfile, addWorkoutLog }                  from '../../state/state.js';
import { getReadinessScore, getReadinessColor }              from '../../state/selectors.js';
import { generateTodayWorkout, PLIABILITY_PROTOCOLS,
         WARMUP_PROTOCOLS }                                  from '../../data/workoutEngine.js';
import { showToast }                                         from '../../core/notifications.js';

export function renderSoloToday() {
  const profile   = getAthleteProfile();
  const readiness = getReadinessScore();
  const rColor    = getReadinessColor(readiness);
  const dow       = new Date().getDay();

  const workout = generateTodayWorkout(
    profile.sport || 'basketball',
    profile.compPhase || 'off-season',
    profile.trainingLevel || 'intermediate',
    readiness, dow,
    profile.primaryGoal || null,
    profile.secondaryGoals || profile.goals || []
  );

  const isRecovery   = workout.isRecoveryDay;
  const badge        = workout.badge || { label: 'Full Intensity', color: '#22c955' };
  const pliabilityPre  = workout.pliabilityProtocol;
  const warmup         = workout.warmupProtocol;
  const pliabilityPost = workout.cooldownProtocol;

  const rExplain = readiness >= 85 ? 'Train at full intensity today.'
    : readiness >= 70 ? 'Train hard. Minor adjustments may help.'
    : readiness >= 55 ? 'Reduce volume ~20%. Quality over quantity.'
    : 'Active recovery only. Rest is training too.';

  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo', 'solo/today')}
  <main class="page-main">

    <div class="page-header">
      <h1>Today's <span>Workout</span></h1>
      <p>${new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</p>
    </div>

    <!-- Status cards -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="panel" style="border-left:4px solid ${rColor}">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:28px;font-weight:900;color:${rColor}">${readiness}</div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em">READINESS SCORE</div>
            <div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-top:2px">${rExplain}</div>
          </div>
        </div>
      </div>
      <div class="panel" style="border-left:4px solid ${badge.color}">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:42px;height:42px;border-radius:10px;background:${badge.color}22;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${isRecovery?'💚':'⚡'}</div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em">TODAY'S INTENSITY</div>
            <div style="font-size:13px;font-weight:700;color:${badge.color};margin-top:2px">${badge.label}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${workout.intensityNote || ''}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Workout title card -->
    <div class="panel" style="background:linear-gradient(135deg,#0d1b3e 0%,#1a2f5e 100%);border:1px solid #22c95530;margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">
        ${(profile.sport||'basketball').toUpperCase()} · SOLO TRAINING
      </div>
      <h2 style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px">${workout.title}</h2>
      <div style="font-size:13px;color:#a0b4d0">Est. ${workout.estimatedDuration} min · RPE Target: ${workout.rpeTarget || '6–8'}</div>
      ${workout.mindsetNote ? `
      <div style="margin-top:14px;padding:12px 14px;background:#ffffff08;border-radius:8px;border-left:3px solid var(--piq-green)">
        <div style="font-size:11px;font-weight:700;color:var(--piq-green);margin-bottom:4px">MINDSET FOCUS</div>
        <div style="font-size:13px;color:#c8d8e8;font-style:italic">"${workout.mindsetNote}"</div>
      </div>` : ''}
    </div>

    ${isRecovery ? _renderRecoveryDay(pliabilityPre) : _renderFullWorkout(pliabilityPre, warmup, workout.exercises, pliabilityPost)}

    <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap">
      <button class="btn-primary" style="width:auto;padding:13px 28px;font-size:14px" id="log-workout-btn">
        Mark Workout Complete
      </button>
      <button class="btn-draft" style="padding:13px 20px" data-route="solo/readiness">Update Readiness</button>
    </div>
    <p id="workout-logged" style="color:var(--piq-green);font-size:13px;margin-top:10px;display:none">
      ✅ Workout logged! Your PIQ Score and streak have been updated.
    </p>

  </main>
</div>

<style>
.exercise-card{background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;transition:border-color 200ms}
.exercise-card:hover{border-color:var(--piq-green)}
.ex-sets-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;background:#22c95520;color:var(--piq-green);font-size:11px;font-weight:700;border:1px solid #22c95540}
.pliability-card{background:#22c95510;border:1px solid #22c95530;border-radius:10px;padding:14px 16px}
.section-label{font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.section-label::after{content:'';flex:1;height:1px;background:var(--border)}
</style>`;
}

function _renderRecoveryDay(pliabilityPre) {
  const proto = pliabilityPre || PLIABILITY_PROTOCOLS?.daily_maintenance;
  return `
<div class="panel" style="border:1px solid #22c95540;background:#22c95508">
  <div style="font-size:16px;font-weight:700;color:var(--piq-green);margin-bottom:6px">Recovery Day Protocol</div>
  <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Your readiness score indicates your body needs recovery today. Rest is training.</div>
  ${proto ? _renderPliabilitySection(proto) : '<div style="color:var(--text-muted);font-size:13px">Focus on light movement, stretching, and quality sleep tonight.</div>'}
</div>`;
}

function _renderFullWorkout(pliabilityPre, warmup, exercises, pliabilityPost) {
  return `
  ${pliabilityPre ? `
  <div style="margin-bottom:20px">
    <div class="section-label">Phase 1 — Pre-Workout Pliability (TB12)</div>
    ${_renderPliabilitySection(pliabilityPre)}
  </div>` : ''}
  ${warmup ? `
  <div style="margin-bottom:20px">
    <div class="section-label">Phase 2 — Warm-Up (${warmup.duration || '10 min'})</div>
    <div class="panel" style="padding:14px 16px">
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">${warmup.label || 'Dynamic warm-up'}</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${(warmup.exercises||[]).map(ex => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="width:28px;height:28px;border-radius:6px;background:#3b82f620;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">🏃</div>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${ex.name}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${ex.sets||ex.duration||''} · ${ex.cue||''}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>` : ''}
  <div style="margin-bottom:20px">
    <div class="section-label">Phase 3 — Main Training Block</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${(exercises||[]).map((ex, i) => `
      <div class="exercise-card">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="width:24px;height:24px;border-radius:50%;background:var(--piq-green);color:#0d1b3e;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</span>
              <span style="font-size:14px;font-weight:700;color:var(--text-primary)">${ex.name}</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-left:32px">
              <span class="ex-sets-badge">${ex.sets} × ${ex.reps}</span>
              ${ex.load ? `<span style="margin-left:8px">Load: ${ex.load}</span>` : ''}
            </div>
            ${ex.cue ? `<div style="font-size:12px;color:#60a5fa;margin-top:6px;margin-left:32px;font-style:italic">${ex.cue}</div>` : ''}
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>
  ${pliabilityPost ? `
  <div style="margin-bottom:20px">
    <div class="section-label">Phase 4 — Post-Workout Pliability (TB12)</div>
    ${_renderPliabilitySection(pliabilityPost)}
  </div>` : ''}`;
}

function _renderPliabilitySection(proto) {
  if (!proto) return '';
  return `
<div class="pliability-card">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
    <span style="font-size:18px">🌊</span>
    <div>
      <div style="font-size:13px;font-weight:700;color:var(--piq-green)">${proto.label}</div>
      <div style="font-size:11px;color:var(--text-muted)">${proto.duration} · ${proto.description}</div>
    </div>
  </div>
  ${proto.note ? `<div style="font-size:11px;color:var(--text-muted);font-style:italic;margin-bottom:10px;padding:8px;background:#22c95508;border-radius:6px">${proto.note}</div>` : ''}
  <div style="display:flex;flex-direction:column;gap:6px">
    ${(proto.exercises||[]).map(ex => `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #22c95520">
      <span style="color:var(--piq-green);font-size:12px;margin-top:1px;flex-shrink:0">●</span>
      <div>
        <span style="font-size:12px;font-weight:600;color:var(--text-primary)">${ex.name}</span>
        <span style="font-size:11px;color:var(--text-muted);margin-left:8px">${ex.sets ? ex.sets+' ×' : ''} ${ex.duration||ex.reps||''}</span>
        ${ex.cue ? `<div style="font-size:11px;color:var(--text-muted);font-style:italic;margin-top:2px">${ex.cue}</div>` : ''}
      </div>
    </div>`).join('')}
  </div>
</div>`;
}

document.addEventListener('piq:viewRendered', e => {
  if (e.detail?.route !== 'solo/today') return;
  document.getElementById('log-workout-btn')?.addEventListener('click', () => {
    const profile = getAthleteProfile();
    addWorkoutLog({ title:"Today's Session", sport:profile.sport||'basketball', completed:true, avgRPE:7, duration:45 });
    const msg = document.getElementById('workout-logged');
    if (msg) msg.style.display = 'block';
    const btn = document.getElementById('log-workout-btn');
    if (btn) { btn.textContent = '✅ Workout Logged'; btn.disabled = true; }
    showToast('✅ Session logged! PIQ Score updated.');
  });
});
