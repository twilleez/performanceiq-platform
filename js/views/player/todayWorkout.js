import { buildSidebar } from '../../components/nav.js';
import { getCurrentRole } from '../../core/auth.js';
import { getAthleteProfile, addWorkoutLog } from '../../state/state.js';
import { getReadinessScore, getReadinessColor } from '../../state/selectors.js';
import { generateTodayWorkout, PLIABILITY_PROTOCOLS, WARMUP_PROTOCOLS } from '../../data/workoutEngine.js';
import { showToast } from '../../core/notifications.js';
import { navigate } from '../../router.js';

export function renderPlayerToday() {
  const role = getCurrentRole() || 'player';
  const profile = getAthleteProfile();
  const readiness = getReadinessScore();
  const rColor = getReadinessColor(readiness);
  const dow = new Date().getDay();
  const workout = generateTodayWorkout(
    profile.sport||'basketball', profile.compPhase||'in-season',
    profile.trainingLevel||'intermediate', readiness, dow,
    profile.primaryGoal||null, profile.secondaryGoals||[]
  );
  const isRecovery = workout.isRecoveryDay;
  const badge = workout.badge || {label:'Full Intensity',color:'#22c955'};
  const pliabilityPre = workout.pliabilityProtocol;
  const warmup = workout.warmupProtocol;
  const pliabilityPost = workout.cooldownProtocol;

  function section(title) { return `<div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.08em;text-transform:uppercase;margin:20px 0 12px;display:flex;align-items:center;gap:8px">${title}<div style="flex:1;height:1px;background:var(--border)"></div></div>`; }

  function pliabilityHtml(proto) {
    if (!proto) return '';
    return `<div style="background:#22c95510;border:1px solid #22c95530;border-radius:12px;padding:16px">
      <div style="font-weight:700;font-size:13px;color:var(--piq-green);margin-bottom:4px">${proto.label||'Pliability'}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${proto.description||''}</div>
      ${(proto.exercises||[]).map(ex=>`
      <div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #22c95520">
        <span style="font-size:16px">🤸</span>
        <div><div style="font-size:13px;font-weight:600;color:var(--text-primary)">${ex.name}</div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">${ex.sets||ex.duration||''} · ${ex.cue||''}</div></div>
      </div>`).join('')}
    </div>`;
  }

  function exercisesHtml(exercises) {
    return (exercises||[]).map((ex,i)=>`
    <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px 16px">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <span style="width:24px;height:24px;border-radius:50%;background:var(--piq-green);color:#0d1b3e;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:4px">${ex.name}</div>
          <div style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;background:#22c95520;color:var(--piq-green);font-size:11px;font-weight:700;border:1px solid #22c95540">${ex.sets} × ${ex.reps}${ex.load?' · '+ex.load:''}</div>
          ${ex.cue?`<div style="font-size:12px;color:#60a5fa;margin-top:6px;font-style:italic">${ex.cue}</div>`:''}
        </div>
      </div>
    </div>`).join('');
  }

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role+'/today')}
  <main class="page-main">
    <div class="page-header">
      <h1>Today's <span>Workout</span></h1>
      <p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="panel" style="border-left:4px solid ${rColor}">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;margin-bottom:6px">READINESS SCORE</div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:32px;font-weight:900;color:${rColor};line-height:1">${readiness}</div>
          <div style="font-size:12.5px;color:var(--text-muted);">${readiness>=80?'Full intensity recommended':readiness>=60?'Reduce volume ~20%':'Active recovery only'}</div>
        </div>
      </div>
      <div class="panel" style="border-left:4px solid ${badge.color}">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;margin-bottom:6px">TODAY'S INTENSITY</div>
        <div style="font-size:16px;font-weight:700;color:${badge.color}">${badge.label}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px">${workout.intensityNote||''}</div>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border:1px solid #22c95530;border-radius:14px;padding:18px;margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">${(profile.sport||'BASKETBALL').toUpperCase()}</div>
      <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px">${workout.title}</div>
      <div style="font-size:13px;color:#a0b4d0">Est. ${workout.estimatedDuration||45} min · RPE Target: ${workout.rpeTarget||'6–8'}</div>
    </div>
    ${isRecovery ? `
    <div style="background:#22c95508;border:1px solid #22c95540;border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="font-size:16px;font-weight:700;color:var(--piq-green);margin-bottom:6px">Recovery Day Protocol</div>
      <div style="font-size:13px;color:var(--text-muted)">Your readiness indicates your body needs recovery today. This is smart training.</div>
    </div>` : ''}
    ${pliabilityPre ? section('Phase 1 — Pre-Workout Pliability (TB12)') + pliabilityHtml(pliabilityPre) : ''}
    ${warmup ? section('Phase 2 — Warm-Up ('+warmup.duration+')') + `<div class="panel" style="padding:14px 16px">${(warmup.exercises||[]).map(ex=>`<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)"><span style="font-size:16px">🏃</span><div><div style="font-size:13px;font-weight:600;color:var(--text-primary)">${ex.name}</div><div style="font-size:11px;color:var(--text-muted);margin-top:1px">${ex.sets||ex.duration||''} · ${ex.cue}</div></div></div>`).join('')}</div>` : ''}
    ${!isRecovery ? section('Phase 3 — Main Training Block') + `<div style="display:flex;flex-direction:column;gap:10px">${exercisesHtml(workout.exercises)}</div>` : ''}
    ${pliabilityPost ? section('Phase 4 — Cool-Down') + pliabilityHtml(pliabilityPost) : ''}
    <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap">
      <button class="btn-primary" style="padding:13px 28px;font-size:14px" id="log-workout-btn">Mark Complete ✓</button>
      <button class="btn-draft" style="padding:13px 20px" data-route="${role}/readiness">Update Readiness</button>
    </div>
    <p id="workout-logged" style="color:var(--piq-green);font-size:13px;margin-top:10px;display:none">Workout logged! PIQ Score and streak updated.</p>
  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', e => {
  const role = e.detail?.route?.split('/')[0] || 'player';
  if (!['player','solo'].includes(role)) return;
  document.getElementById('log-workout-btn')?.addEventListener('click', () => {
    const profile = (window._piqGetProfile ? window._piqGetProfile() : {});
    addWorkoutLog({ title: 'Today's Session', completed: true, avgRPE: 7, ts: Date.now() });
    document.getElementById('log-workout-btn').textContent = '✅ Logged!';
    document.getElementById('workout-logged').style.display = 'block';
    showToast('✅ Workout logged!', 'success');
  });
});
