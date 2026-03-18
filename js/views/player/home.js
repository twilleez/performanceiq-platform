/**
 * Player Home Dashboard v2
 * Role-specific view: athlete-first design.
 * PIQ Score, readiness, today's workout, nutrition, and mindset.
 */
import { buildSidebar }          from '../../components/nav.js';
import { getCurrentUser, getCurrentRole } from '../../core/auth.js';
import { getAthleteProfile, getWorkoutLog } from '../../state/state.js';
import { getPIQScore, getReadinessScore, getReadinessColor, getStreak, getScoreBreakdown } from '../../state/selectors.js';
import { generateTodayWorkout }  from '../../data/workoutEngine.js';
import { getMacroTargets }       from '../../state/selectors.js';

export function renderPlayerHome() {
  const user     = getCurrentUser() || {};
  const role     = getCurrentRole() || 'player';
  const fname    = user.name?.split(' ')[0] || 'Athlete';
  const profile  = getAthleteProfile();
  const piq      = getPIQScore();
  const readiness = getReadinessScore();
  const rColor   = getReadinessColor(readiness);
  const streak   = getStreak();
  const sb       = getScoreBreakdown();
  const log      = getWorkoutLog();
  const dow      = new Date().getDay();
  const workout  = generateTodayWorkout(
    profile.sport || 'basketball',
    profile.compPhase || 'in-season',
    profile.trainingLevel || 'intermediate',
    readiness, dow
  );
  const macros   = getMacroTargets();
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const profilePct = sb.profile?.raw || 0;

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/home')}
  <main class="page-main">

    <!-- Header -->
    <div class="page-header">
      <h1>${greeting}, <span>${fname}</span></h1>
      <p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · ${profile.sport ? profile.sport.charAt(0).toUpperCase()+profile.sport.slice(1) : 'Athlete'} ${profile.position ? '· ' + profile.position : ''} ${profile.team ? '· ' + profile.team : ''}</p>
    </div>

    ${profilePct < 50 ? `
    <div style="background:#f59e0b14;border:1px solid #f59e0b40;border-radius:12px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px;cursor:pointer" data-route="${role}/settings">
      <span style="font-size:20px">⚠️</span>
      <div>
        <div style="font-weight:700;font-size:13px;color:#f59e0b">Complete your profile for an accurate PIQ Score</div>
        <div style="font-size:12px;color:var(--text-muted)">Profile is ${profilePct}% complete. Add your weight, height, and training details to unlock personalized programming.</div>
      </div>
      <span style="margin-left:auto;color:var(--text-muted);font-size:18px">→</span>
    </div>` : ''}

    <!-- Top KPI Row -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      ${_kpi('PIQ Score', piq, sb.tier, '#22c955', '🏅', `${role}/score`)}
      ${_kpi('Readiness', readiness, readiness>=80?'High':readiness>=60?'Moderate':'Low', rColor, '💚', `${role}/readiness`)}
      ${_kpi('Streak', streak + ' days', streak>=7?'On fire!':streak>=3?'Building':'Keep going', '#f59e0b', '🔥', `${role}/progress`)}
      ${_kpi('Sessions', log.length, 'Total logged', '#60a5fa', '📊', `${role}/progress`)}
    </div>

    <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px">
      <div>
        <!-- Today's Workout Preview -->
        <div class="panel" style="margin-bottom:20px;background:linear-gradient(135deg,#0d1b3e 0%,#1a2f5e 100%);border:1px solid #22c95530">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px">
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--piq-green);letter-spacing:.08em">TODAY'S WORKOUT</div>
              <div style="font-size:17px;font-weight:800;color:#fff;margin-top:4px">${workout.title}</div>
              <div style="font-size:12px;color:#a0b4d0;margin-top:2px">Est. ${workout.estimatedDuration} min · RPE ${workout.rpeTarget || '6-8'} · ${workout.badge?.label || 'Full Intensity'}</div>
            </div>
            <span style="padding:5px 12px;border-radius:20px;background:${workout.badge?.color || '#22c955'}22;color:${workout.badge?.color || '#22c955'};font-size:11px;font-weight:700;border:1px solid ${workout.badge?.color || '#22c955'}40;flex-shrink:0">${workout.badge?.label || 'Full Intensity'}</span>
          </div>
          ${workout.mindsetNote ? `
          <div style="padding:10px 12px;background:#ffffff08;border-radius:8px;border-left:3px solid var(--piq-green);margin-bottom:14px">
            <div style="font-size:11px;color:var(--piq-green);font-weight:700;margin-bottom:2px">MINDSET</div>
            <div style="font-size:12px;color:#c8d8e8;font-style:italic">"${workout.mindsetNote}"</div>
          </div>` : ''}
          <div style="display:flex;gap:8px">
            <button class="btn-primary" style="flex:1;font-size:13px;padding:11px" data-route="${role}/today">Start Workout</button>
            <button class="btn-draft" style="padding:11px 16px;font-size:13px" data-route="${role}/readiness">Check In</button>
          </div>
        </div>

        <!-- PIQ Score Breakdown -->
        <div class="panel" style="margin-bottom:20px">
          <div class="panel-title">PIQ Score Breakdown</div>
          <div style="font-size:12px;color:var(--text-muted);margin:6px 0 14px">Your ${piq} PIQ Score is calculated from 5 weighted pillars:</div>
          ${[
            [sb.consistency, '🏋️'],
            [sb.readiness,   '💚'],
            [sb.compliance,  '✅'],
            [sb.load,        '⚖️'],
            [sb.profile,     '👤'],
          ].map(([pillar, icon]) => pillar ? `
          <div style="margin-bottom:10px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:12px;font-weight:600;color:var(--text-primary)">${icon} ${pillar.label}</span>
              <span style="font-size:12px;font-weight:700;color:var(--piq-green)">${pillar.raw}/100 <span style="color:var(--text-muted);font-weight:400">(${Math.round(pillar.weight*100)}%)</span></span>
            </div>
            <div style="height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pillar.raw}%;background:${pillar.raw>=80?'#22c955':pillar.raw>=60?'#f59e0b':'#ef4444'};border-radius:3px;transition:width 600ms ease"></div>
            </div>
          </div>` : '').join('')}
          <button class="btn-draft" style="width:100%;margin-top:8px;font-size:12px" data-route="${role}/score">View Full Score Report</button>
        </div>
      </div>

      <div>
        <!-- Readiness Ring -->
        <div class="panel" style="margin-bottom:16px;text-align:center">
          <div class="panel-title">Readiness</div>
          <svg width="120" height="120" viewBox="0 0 120 120" style="margin:12px auto;display:block">
            <circle cx="60" cy="60" r="46" fill="none" stroke="var(--surface-2)" stroke-width="10"/>
            <circle cx="60" cy="60" r="46" fill="none" stroke="${rColor}" stroke-width="10"
              stroke-dasharray="289" stroke-dashoffset="${Math.round(289-(readiness/100)*289)}"
              stroke-linecap="round" transform="rotate(-90 60 60)" style="transition:stroke-dashoffset 800ms ease"/>
            <text x="60" y="56" text-anchor="middle" font-size="22" font-weight="900" fill="${rColor}">${readiness}</text>
            <text x="60" y="72" text-anchor="middle" font-size="10" fill="var(--text-muted)">READINESS</text>
          </svg>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${readiness>=80?'High — Train hard today':readiness>=60?'Moderate — Quality focus':'Low — Recovery day'}</div>
          <button class="btn-draft" style="width:100%;font-size:12px" data-route="${role}/readiness">Update Check-In</button>
        </div>

        <!-- Nutrition Targets -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Today's Nutrition Targets</div>
          <div style="font-size:11px;color:var(--text-muted);margin:4px 0 12px">Based on your body weight and training phase (ISSN guidelines)</div>
          ${[
            { label: 'Calories', val: macros.cal, unit: 'kcal', color: '#f59e0b' },
            { label: 'Protein',  val: macros.pro, unit: 'g',    color: '#22c955' },
            { label: 'Carbs',    val: macros.cho, unit: 'g',    color: '#60a5fa' },
            { label: 'Fat',      val: macros.fat, unit: 'g',    color: '#a78bfa' },
          ].map(m => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:12px;color:var(--text-muted)">${m.label}</span>
            <span style="font-size:13px;font-weight:700;color:${m.color}">${m.val} ${m.unit}</span>
          </div>`).join('')}
          ${profilePct < 50 ? `<div style="font-size:11px;color:#f59e0b;margin-top:8px">Complete your profile for personalized targets</div>` : ''}
        </div>

        <!-- Quick Actions -->
        <div class="panel">
          <div class="panel-title">Quick Actions</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
            ${[
              ['⚡', 'Start Today\'s Workout', `${role}/today`],
              ['💚', 'Daily Check-In', `${role}/readiness`],
              ['📈', 'View Progress', `${role}/progress`],
              ['🏅', 'PIQ Score Report', `${role}/score`],
              ['⚙️', 'Update Profile', `${role}/settings`],
            ].map(([icon, label, route]) => `
            <button class="btn-draft" style="display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;font-size:13px" data-route="${route}">
              <span style="font-size:16px">${icon}</span> ${label}
            </button>`).join('')}
          </div>
        </div>
      </div>
    </div>

  </main>
</div>`;
}

function _kpi(label, value, sub, color, icon, route) {
  return `
<div class="panel" style="cursor:pointer;border-bottom:3px solid ${color}" data-route="${route}">
  <div style="display:flex;align-items:flex-start;justify-content:space-between">
    <div>
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);letter-spacing:.06em;text-transform:uppercase">${label}</div>
      <div style="font-size:24px;font-weight:900;color:${color};margin:4px 0 2px">${value}</div>
      <div style="font-size:11px;color:var(--text-muted)">${sub}</div>
    </div>
    <span style="font-size:22px">${icon}</span>
  </div>
</div>`;
}
