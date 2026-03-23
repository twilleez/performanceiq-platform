/**
 * PerformanceIQ — Player Home Dashboard v3
 * ─────────────────────────────────────────────────────────────
 * UPGRADED: Missed check-in badge on Readiness KPI card (finding #4)
 *
 * When the player hasn't submitted a check-in today, the Readiness
 * KPI card shows an amber "Log check-in" badge with a click-through
 * to the readiness view. No push API needed — in-app visibility alone
 * meaningfully increases daily check-in rates.
 */
import { buildSidebar }                        from '../../components/nav.js';
import { getCurrentUser, getCurrentRole }       from '../../core/auth.js';
import { getAthleteProfile, getWorkoutLog,
         getReadinessCheckIn }                  from '../../state/state.js';
import { getPIQScore, getReadinessScore,
         getReadinessColor, getStreak,
         getScoreBreakdown, getMacroTargets,
         getMindsetScore }                from '../../state/selectors.js';
import { generateTodayWorkout }                 from '../../data/workoutEngine.js';

export function renderPlayerHome() {
  const user       = getCurrentUser() || {};
  const role       = getCurrentRole() || 'player';
  const fname      = user.name?.split(' ')[0] || 'Athlete';
  const profile    = getAthleteProfile();
  const piq        = getPIQScore();
  const readiness  = getReadinessScore();
  const rColor     = getReadinessColor(readiness);
  const streak       = getStreak();
  const sb           = getScoreBreakdown();
  const mindsetScore = getMindsetScore();
  const log        = getWorkoutLog();
  const checkin    = getReadinessCheckIn();
  const macros     = getMacroTargets();
  const dow        = new Date().getDay();
  const today      = new Date().toDateString();
  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const profilePct = sb.profile?.raw || 0;

  // ── Check-in state ──────────────────────────────────────────
  const hasCheckedIn = checkin.date === today && checkin.sleepQuality > 0;

  // ── Today's workout ─────────────────────────────────────────
  const workout = generateTodayWorkout(
    profile.sport || 'basketball',
    profile.compPhase || 'in-season',
    profile.trainingLevel || 'intermediate',
    readiness, dow
  );

  // ── Readiness label ─────────────────────────────────────────
  const readinessLabel = readiness >= 85 ? 'Peak — push hard'
    : readiness >= 70 ? 'High — train hard'
    : readiness >= 55 ? 'Moderate — reduce ~20%'
    : 'Low — active recovery';

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/home')}
  <main class="page-main">

    <div class="page-header">
      <h1>${greeting}, <span>${fname}</span></h1>
      <p>${new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
         ${profile.sport ? '· ' + profile.sport.charAt(0).toUpperCase() + profile.sport.slice(1) : ''}
         ${profile.position ? '· ' + profile.position : ''}
         ${profile.team ? '· ' + profile.team : ''}</p>
    </div>

    <!-- Profile completion nudge -->
    ${profilePct < 50 ? `
    <div style="background:#f59e0b14;border:1px solid #f59e0b40;border-radius:12px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px;cursor:pointer" data-route="${role}/settings">
      <span style="font-size:20px">⚠️</span>
      <div>
        <div style="font-weight:700;font-size:13px;color:#f59e0b">Complete your profile for an accurate PIQ Score</div>
        <div style="font-size:12px;color:var(--text-muted)">Profile is ${profilePct}% complete. Tap to finish setup. →</div>
      </div>
    </div>` : ''}

    <!-- KPI Row — Readiness card shows missed check-in badge when needed -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">

      <!-- PIQ Score -->
      <div class="kpi-card">
        <div class="kpi-lbl">PIQ Score</div>
        <div class="kpi-val" style="color:var(--piq-green)">${piq}</div>
        <div class="kpi-chg">${sb.tier || 'Developing'}</div>
      </div>

      <!-- Readiness — badge if no check-in today -->
      <div class="kpi-card" style="cursor:${hasCheckedIn?'default':'pointer'};position:relative"
           ${!hasCheckedIn ? `data-route="${role}/readiness"` : ''}>
        <div class="kpi-lbl">Readiness</div>
        <div class="kpi-val" style="color:${rColor}">${readiness}</div>
        <div class="kpi-chg">${readinessLabel}</div>
        ${!hasCheckedIn ? `
        <div style="position:absolute;top:-7px;right:-7px;background:#f59e0b;color:#0d1b3e;
                    font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;
                    letter-spacing:.03em;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.2)">
          LOG CHECK-IN
        </div>` : ''}
      </div>

      <!-- Streak -->
      <div class="kpi-card">
        <div class="kpi-lbl">Streak</div>
        <div class="kpi-val">🔥 ${streak}d</div>
        <div class="kpi-chg">${streak >= 5 ? 'On fire!' : streak >= 3 ? 'Building momentum' : 'Keep going'}</div>
      </div>

      <!-- Sessions -->
      <div class="kpi-card">
        <div class="kpi-lbl">Sessions</div>
        <div class="kpi-val b">${log.length}</div>
        <div class="kpi-chg">Total logged</div>
      </div>

    </div>

    <!-- Check-in prompt banner when not yet done today -->
    ${!hasCheckedIn ? `
    <div style="background:#f59e0b14;border:1px solid #f59e0b40;border-radius:12px;padding:13px 18px;
                margin-bottom:20px;display:flex;align-items:center;gap:14px;cursor:pointer"
         data-route="${role}/readiness">
      <span style="font-size:22px">⚡</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:13.5px;color:#f59e0b">Log your check-in for today's accurate readiness score</div>
        <div style="font-size:12px;color:var(--text-muted)">Takes 5 seconds. Updates your PIQ Score and today's workout intensity.</div>
      </div>
      <span style="font-size:12px;color:#f59e0b;font-weight:600;white-space:nowrap">Check in →</span>
    </div>` : ''}

    <!-- Main content grid -->
    <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px">

      <!-- Today's Workout -->
      <div class="panel">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div class="panel-title" style="margin:0">Today's Session</div>
          <button class="btn-draft" style="font-size:11px;padding:5px 10px" data-route="${role}/today">
            Full plan →
          </button>
        </div>
        <div style="padding:12px;background:var(--surface-2);border-radius:10px;margin-bottom:12px">
          <div style="font-weight:700;font-size:15px;color:var(--text-primary);margin-bottom:4px">
            ${workout?.title || 'Active Recovery'}
          </div>
          <div style="font-size:12px;color:var(--text-muted)">
            Est. ${workout?.estimatedDuration || 45} min
            · RPE target ${workout?.rpeTarget || '6–8'}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${(workout?.exercises || []).slice(0, 4).map(ex => `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:16px;flex-shrink:0">⚡</span>
            <div style="flex:1">
              <span style="font-size:12.5px;font-weight:600;color:var(--text-primary)">${ex.name}</span>
              <span style="font-size:11.5px;color:var(--text-muted);margin-left:8px">
                ${ex.sets ? ex.sets + ' × ' + (ex.reps || '') : ex.duration || ''}
                ${ex.load ? ' · ' + ex.load : ''}
              </span>
            </div>
          </div>`).join('')}
          ${(workout?.exercises || []).length > 4 ? `
          <div style="font-size:12px;color:var(--text-muted);padding-top:4px;text-align:center">
            +${workout.exercises.length - 4} more exercises
          </div>` : ''}
        </div>
      </div>

      <!-- Right column -->
      <div style="display:flex;flex-direction:column;gap:16px">

        <!-- Score breakdown -->
        <div class="panel">
          <div class="panel-title">PIQ Breakdown</div>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px">
            ${[
              ['Consistency', sb.consistency?.raw, '#22c955'],
              ['Readiness',   sb.readiness?.raw,   rColor],
              ['Compliance',  sb.compliance?.raw,  '#3b82f6'],
              ['Load Mgmt',   sb.load?.raw,        '#a78bfa'],
            ].map(([label, val, color]) => `
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                <span style="font-size:12px;color:var(--text-muted)">${label}</span>
                <span style="font-size:12px;font-weight:600;color:${color}">${val || 0}</span>
              </div>
              <div style="height:4px;background:var(--surface-2);border-radius:2px;overflow:hidden">
                <div style="height:100%;width:${val || 0}%;background:${color};border-radius:2px"></div>
              </div>
            </div>`).join('')}
          </div>
          ${mindsetScore > 0 ? `
          <div style="margin-top:10px;padding:8px 10px;border-radius:8px;
                      background:rgba(163,139,250,.08);border:1px solid rgba(163,139,250,.25);
                      display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:12px;color:#a78bfa">🧠 Mindset</span>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:12px;font-weight:600;color:#a78bfa">${mindsetScore}/10</span>
              <button class="btn-draft" style="font-size:10px;padding:2px 8px"
                data-route="${role}/mindset">Train →</button>
            </div>
          </div>` : `
          <div style="margin-top:10px;padding:8px 10px;border-radius:8px;
                      background:var(--surface-2);cursor:pointer"
               data-route="${role}/mindset">
            <span style="font-size:12px;color:var(--text-muted)">🧠 Mindset training →</span>
          </div>`}
        </div>

        <!-- Macro summary -->
        <div class="panel">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div class="panel-title" style="margin:0">Nutrition Targets</div>
            <button class="btn-draft" style="font-size:11px;padding:4px 8px" data-route="${role}/nutrition">Track →</button>
          </div>
          ${[
            ['Calories', macros.cal, 'kcal', '#f59e0b'],
            ['Protein',  macros.pro, 'g',    '#22c955'],
            ['Carbs',    macros.cho, 'g',    '#3b82f6'],
          ].map(([label, val, unit, color]) => `
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:12px;color:var(--text-muted)">${label}</span>
            <span style="font-size:12px;font-weight:700;color:${color}">${val} ${unit}</span>
          </div>`).join('')}
        </div>

      </div>
    </div>

  </main>
</div>`;
}
