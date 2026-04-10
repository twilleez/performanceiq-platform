/**
 * Player Home Dashboard — UX Enhanced
 *
 * UX FIXES INTEGRATED:
 * [Fix-2]  Empty state when no workouts logged
 * [Fix-4]  KPI cards have data-route for hover lift (CSS handles it)
 * [Fix-5]  PIQ Score explainer panel
 * [Fix-6]  Readiness action directive
 * [Fix-11] Streak milestone celebration
 * [Fix-12] PIQ Score delta indicator
 */
import { buildSidebar }          from '../../components/nav.js';
import { getCurrentUser, getCurrentRole } from '../../core/auth.js';
import { getAthleteProfile, getWorkoutLog } from '../../state/state.js';
import { getPIQScore, getReadinessScore, getReadinessColor, getStreak, getScoreBreakdown } from '../../state/selectors.js';
import { generateTodayWorkout }  from '../../data/workoutEngine.js';
import { getMacroTargets }       from '../../state/selectors.js';
import {
  buildEmptyState, buildPIQExplainer, wirePIQExplainer,
  buildReadinessDirective, buildStreakDisplay, buildPIQDelta,
} from '../../components/ux-enhancements.js';

export function renderPlayerHome() {
  const user     = getCurrentUser() || {};
  const role     = getCurrentRole() || 'player';
  const fname    = user.name?.split(' ')[0] || 'Athlete';
  const profile  = getAthleteProfile();
  const piq      = getPIQScore();
  const readiness= getReadinessScore();
  const rColor   = getReadinessColor(readiness);
  const streak   = getStreak();
  const sb       = getScoreBreakdown();
  const log      = getWorkoutLog();
  const dow      = new Date().getDay();
  const workout  = generateTodayWorkout(
    profile.sport || 'basketball', profile.compPhase || 'in-season',
    profile.trainingLevel || 'intermediate', readiness, dow
  );
  const macros   = getMacroTargets();
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const profilePct = sb.profile?.raw || 0;

  // [Fix-11] Streak milestone banner (only shown for milestone days)
  const streakBanner = [3,7,14,21,30,60,90].includes(streak) ? buildStreakDisplay(streak) : '';

  // [Fix-2] Empty state check
  const hasWorkouts = log.length > 0;

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/home')}
  <main class="page-main">

    <div class="page-header">
      <h1>${greeting}, <span>${fname}</span></h1>
      <p>${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · ${profile.sport ? profile.sport.charAt(0).toUpperCase()+profile.sport.slice(1) : 'Athlete'}${profile.team ? ' · ' + profile.team : ''}</p>
    </div>

    ${streakBanner}

    ${profilePct < 50 ? `
    <div style="background:#f59e0b14;border:1px solid #f59e0b40;border-radius:12px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;gap:12px;cursor:pointer" data-route="${role}/settings">
      <span style="font-size:20px">⚠️</span>
      <div>
        <div style="font-weight:700;font-size:13px;color:#f59e0b">Complete your profile for a more accurate PIQ Score</div>
        <div style="font-size:12px;color:var(--text-muted)">Profile ${profilePct}% complete. Tap to finish.</div>
      </div>
    </div>` : ''}

    <!-- KPI Row — [Fix-4] data-route adds hover lift via global CSS -->
    <div class="kpi-row">
      <div class="kpi-card" data-route="${role}/score" style="cursor:pointer">
        <div class="kpi-lbl">PIQ Score</div>
        <div class="kpi-val g">${piq} ${buildPIQDelta(piq)}</div>
        <div class="kpi-chg">${sb.tier || 'Developing'}</div>
      </div>
      <div class="kpi-card" data-route="${role}/readiness" style="cursor:pointer">
        <div class="kpi-lbl">Readiness</div>
        <div class="kpi-val" style="color:${rColor}">${readiness}%</div>
        <div class="kpi-chg">${readiness>=80?'↑ High':readiness>=60?'→ Moderate':'↓ Low'}</div>
      </div>
      <div class="kpi-card" data-route="${role}/progress" style="cursor:pointer">
        <div class="kpi-lbl">Sessions</div>
        <div class="kpi-val b">${log.length}</div>
        <div class="kpi-chg">Total logged</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Streak</div>
        <div class="kpi-val">${buildStreakDisplay(streak)}</div>
        <div class="kpi-chg">${streak >= 7 ? 'Elite habit' : streak >= 3 ? 'Building momentum' : 'Days active'}</div>
      </div>
    </div>

    <!-- [Fix-6] Readiness directive -->
    ${buildReadinessDirective(readiness)}

    <div class="panels-2" style="margin-top:20px">
      <div>
        <!-- Today's workout -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Today's training plan</div>
          ${!hasWorkouts ? buildEmptyState('no-workouts') : `
          <div class="w-row"><div class="w-icon">🏀</div><div class="w-info"><div class="w-name">${workout.title || 'Explosive Footwork Drills'}</div><div class="w-meta">${workout.estimatedDuration || 40} min · ${workout.badge?.label || 'Full intensity'}</div></div><span class="w-badge">NEXT</span></div>
          <div class="w-row"><div class="w-icon">💪</div><div class="w-info"><div class="w-name">Lower Body Power</div><div class="w-meta">35 min · Moderate</div></div><span class="w-badge gray">LATER</span></div>
          <div class="w-row"><div class="w-icon">🧘</div><div class="w-info"><div class="w-name">Recovery Mobility</div><div class="w-meta">20 min · Low</div></div><span class="w-badge gray">PM</span></div>
          <div style="margin-top:14px;display:flex;gap:10px">
            <button class="btn-primary" style="font-size:12.5px;padding:10px 18px" data-route="${role}/today">Start workout</button>
            <button class="btn-draft"   style="font-size:12.5px;padding:10px 18px" data-route="${role}/log">Log session</button>
          </div>`}
        </div>

        <!-- Quick actions -->
        <div class="panel">
          <div class="panel-title">Quick actions</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
            ${[
              ['💚', 'Daily check-in', `${role}/readiness`],
              ['📈', 'View progress',  `${role}/progress`],
              ['🏅', 'PIQ Score',      `${role}/score`],
              ['🥗', 'Log nutrition',  `${role}/nutrition`],
              ['⚙️', 'Profile',        `${role}/settings`],
            ].map(([icon, label, route]) => `
            <button class="btn-draft" style="display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;font-size:13px" data-route="${route}">
              <span style="font-size:16px">${icon}</span> ${label}
            </button>`).join('')}
          </div>
        </div>
      </div>

      <div>
        <!-- [Fix-5] PIQ Score with explainer -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">PIQ Score</div>
          <div style="text-align:center;padding:20px 0 8px">
            <div style="font-size:52px;font-weight:900;color:var(--piq-green);line-height:1">${piq}</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:4px">${sb.tier || 'Developing'} · ${buildPIQDelta(piq)}</div>
          </div>
          ${buildPIQExplainer(piq, sb)}
        </div>

        <!-- Readiness ring panel -->
        <div class="panel">
          <div class="panel-title">Readiness today</div>
          <div style="display:flex;align-items:center;gap:16px;padding:12px 0">
            <div style="position:relative;width:72px;height:72px;flex-shrink:0">
              <svg viewBox="0 0 72 72" width="72" height="72">
                <circle cx="36" cy="36" r="28" fill="none" stroke="var(--surface-2)" stroke-width="6"/>
                <circle cx="36" cy="36" r="28" fill="none" stroke="${rColor}" stroke-width="6"
                  stroke-dasharray="176" stroke-dashoffset="${Math.round(176 - (readiness/100)*176)}"
                  stroke-linecap="round" transform="rotate(-90 36 36)" style="transition:stroke-dashoffset .6s ease"/>
              </svg>
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;color:${rColor}">${readiness}</div>
            </div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:4px">
                ${readiness>=80?'Ready to perform':readiness>=65?'Moderate readiness':readiness>=50?'Reduced capacity':'Recovery day'}
              </div>
              <div style="font-size:12px;color:var(--text-muted);line-height:1.5">
                ${readiness>=80?'Full intensity training is appropriate today.':readiness>=65?'Reduce volume slightly — quality over quantity.':readiness>=50?'Modified session recommended. Listen to your body.':'Active recovery only — mobility and pliability.'}
              </div>
              <button class="btn-draft" style="font-size:12px;padding:7px 12px;margin-top:8px" data-route="${role}/readiness">Update check-in</button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </main>
</div>`;
}

document.addEventListener('piq:viewRendered', () => {
  wirePIQExplainer();
});
