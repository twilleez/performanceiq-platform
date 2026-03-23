import { buildSidebar } from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getAthleteProfile, getWorkoutLog, getReadinessCheckIn } from '../../state/state.js';
import { getPIQScore, getReadinessScore, getReadinessColor, getStreak, getScoreBreakdown, getMacroTargets, getMindsetScore } from '../../state/selectors.js';
import { generateTodayWorkout } from '../../data/workoutEngine.js';
export function renderSoloHome() {
  const user = getCurrentUser()||{};
  const fname = user.name?.split(' ')[0]||'Athlete';
  const profile = getAthleteProfile();
  const piq = getPIQScore();
  const readiness = getReadinessScore();
  const rColor = getReadinessColor(readiness);
  const streak       = getStreak();
  const sb           = getScoreBreakdown();
  const mindsetScore = getMindsetScore();
  const log = getWorkoutLog();
  const checkin = getReadinessCheckIn();
  const today = new Date().toDateString();
  const hasCheckedIn = checkin.date===today && checkin.sleepQuality>0;
  const dow = new Date().getDay();
  const workout = generateTodayWorkout(profile.sport||'basketball',profile.compPhase||'off-season',profile.trainingLevel||'intermediate',readiness,dow);
  const macros = getMacroTargets();
  const hour = new Date().getHours();
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  return `
<div class="view-with-sidebar">
  ${buildSidebar('solo','solo/home')}
  <main class="page-main">
    <div class="page-header">
      <h1>${greeting}, <span>${fname}</span></h1>
      <p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · Solo Training</p>
    </div>
    ${!hasCheckedIn ? `
    <div style="background:#f59e0b14;border:1px solid #f59e0b40;border-radius:12px;padding:13px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px;cursor:pointer" data-route="solo/readiness">
      <span style="font-size:22px">⚡</span>
      <div style="flex:1"><div style="font-weight:700;font-size:13.5px;color:#f59e0b">Log your daily check-in for an accurate readiness score</div>
      <div style="font-size:12px;color:var(--text-muted)">Takes 5 seconds. Updates PIQ Score and workout intensity.</div></div>
      <span style="font-size:12px;color:#f59e0b;font-weight:600">Check in →</span>
    </div>` : ''}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      <div class="kpi-card"><div class="kpi-lbl">PIQ Score</div><div class="kpi-val g">${piq}</div><div class="kpi-chg">${sb.tier||'Developing'}</div></div>
      <div class="kpi-card" style="${!hasCheckedIn?'cursor:pointer;position:relative':''}" ${!hasCheckedIn?'data-route="solo/readiness"':''}>
        <div class="kpi-lbl">Readiness</div><div class="kpi-val" style="color:${rColor}">${readiness}</div>
        <div class="kpi-chg">${readiness>=80?'High':readiness>=60?'Moderate':'Low'}</div>
        ${!hasCheckedIn?'<div style="position:absolute;top:-7px;right:-7px;background:#f59e0b;color:#0d1b3e;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px">LOG CHECK-IN</div>':''}
      </div>
      <div class="kpi-card"><div class="kpi-lbl">Streak</div><div class="kpi-val">🔥 ${streak}d</div><div class="kpi-chg">${streak>=5?'On fire!':streak>=3?'Building':'Keep going'}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Sessions</div><div class="kpi-val b">${log.length}</div><div class="kpi-chg">Total logged</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px">
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="panel-title" style="margin:0">Today's Session</div>
          <button class="btn-draft" style="font-size:11px;padding:5px 10px" data-route="solo/today">Full plan →</button>
        </div>
        <div style="padding:12px;background:var(--surface-2);border-radius:10px;margin-bottom:12px">
          <div style="font-weight:700;font-size:15px;color:var(--text-primary);margin-bottom:4px">${workout?.title||'Active Recovery'}</div>
          <div style="font-size:12px;color:var(--text-muted)">Est. ${workout?.estimatedDuration||45} min · RPE ${workout?.rpeTarget||'6–8'}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${(workout?.exercises||[]).slice(0,4).map(ex=>`
          <div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:16px;flex-shrink:0">⚡</span>
            <div style="flex:1"><span style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${ex.name}</span>
            <span style="font-size:11.5px;color:var(--text-muted);margin-left:8px">${ex.sets?ex.sets+' × '+(ex.reps||''):ex.duration||''}</span></div>
          </div>`).join('')}
          ${(workout?.exercises||[]).length>4?`<div style="font-size:12px;color:var(--text-muted);text-align:center;padding-top:4px">+${workout.exercises.length-4} more</div>`:''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="panel">
          <div class="panel-title">Score Breakdown</div>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
            ${[['Consistency',sb.consistency?.raw,'#22c955'],['Readiness',sb.readiness?.raw,rColor],['Compliance',sb.compliance?.raw,'#3b82f6'],['Load Mgmt',sb.load?.raw,'#a78bfa']].map(([label,val,color])=>`
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-size:12px;color:var(--text-muted)">${label}</span><span style="font-size:12px;font-weight:600;color:${color}">${val||0}</span></div>
              <div style="height:4px;background:var(--surface-2);border-radius:2px;overflow:hidden"><div style="height:100%;width:${val||0}%;background:${color};border-radius:2px"></div></div>
            </div>`).join('')}
          </div>
          ${mindsetScore > 0 ? `
          <div style="margin-top:8px;padding:7px 10px;border-radius:8px;
                      background:rgba(163,139,250,.08);border:1px solid rgba(163,139,250,.25);
                      display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:12px;color:#a78bfa">🧠 Mindset</span>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:12px;font-weight:600;color:#a78bfa">${mindsetScore}/10</span>
              <button class="btn-draft" style="font-size:10px;padding:2px 8px" data-route="solo/mindset">Train →</button>
            </div>
          </div>` : `
          <div style="margin-top:8px;padding:7px 10px;border-radius:8px;background:var(--surface-2);cursor:pointer"
               data-route="solo/mindset">
            <span style="font-size:12px;color:var(--text-muted)">🧠 Mindset training →</span>
          </div>`}
        </div>
        <div class="panel">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px"><div class="panel-title" style="margin:0">Macros</div><button class="btn-draft" style="font-size:11px;padding:4px 8px" data-route="solo/nutrition">Track →</button></div>
          ${[['Calories',macros.cal,'kcal','#f59e0b'],['Protein',macros.pro,'g','#22c955'],['Carbs',macros.cho,'g','#3b82f6']].map(([l,v,u,c])=>`
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--text-muted)">${l}</span><span style="font-size:12px;font-weight:700;color:${c}">${v} ${u}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </main>
</div>`;
}