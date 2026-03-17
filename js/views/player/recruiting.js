/**
 * Player Recruiting View — recruiting profile and exposure
 */
import { buildSidebar }   from '../../components/nav.js';
import { getCurrentUser } from '../../core/auth.js';
import { getPIQScore, getStreak, getWorkoutCount } from '../../state/selectors.js';

export function renderPlayerRecruiting() {
  const user     = getCurrentUser();
  const fname    = user?.name || 'Athlete';
  const sport    = user?.sport || 'basketball';
  const piq      = getPIQScore();
  const streak   = getStreak();
  const sessions = getWorkoutCount();

  const profileStrength = Math.min(100, Math.round(
    (piq > 0 ? 30 : 0) +
    (sessions >= 5 ? 20 : sessions * 4) +
    (streak >= 7 ? 20 : streak * 2.8) +
    (user?.athleteProfile?.gradYear ? 15 : 0) +
    (user?.athleteProfile?.position ? 15 : 0)
  ));

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player','player/recruiting')}
  <main class="page-main">
    <div class="page-header">
      <h1>Recruiting Profile</h1>
      <p>Build your profile to get noticed by college programs</p>
    </div>
    <div class="panels-2">
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Profile Strength</div>
          <div style="margin-top:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:13px;color:var(--text-primary)">Completion</span>
              <span style="font-size:13px;font-weight:700;color:var(--piq-green)">${profileStrength}%</span>
            </div>
            <div style="height:10px;background:var(--surface-2);border-radius:5px;overflow:hidden">
              <div style="height:100%;width:${profileStrength}%;background:var(--piq-green);border-radius:5px;transition:width .4s"></div>
            </div>
          </div>
          <div style="margin-top:14px;font-size:12.5px;color:var(--text-muted)">
            Complete your profile to improve visibility with college coaches.
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">Performance Highlights</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
            <div style="padding:12px;background:var(--surface-2);border-radius:10px;text-align:center">
              <div style="font-size:24px;font-weight:700;color:var(--piq-green)">${piq}</div>
              <div style="font-size:11.5px;color:var(--text-muted)">PIQ Score</div>
            </div>
            <div style="padding:12px;background:var(--surface-2);border-radius:10px;text-align:center">
              <div style="font-size:24px;font-weight:700;color:var(--text-primary)">🔥 ${streak}d</div>
              <div style="font-size:11.5px;color:var(--text-muted)">Training Streak</div>
            </div>
            <div style="padding:12px;background:var(--surface-2);border-radius:10px;text-align:center">
              <div style="font-size:24px;font-weight:700;color:var(--text-primary)">${sessions}</div>
              <div style="font-size:11.5px;color:var(--text-muted)">Sessions Logged</div>
            </div>
            <div style="padding:12px;background:var(--surface-2);border-radius:10px;text-align:center">
              <div style="font-size:24px">🏀</div>
              <div style="font-size:11.5px;color:var(--text-muted)">${sport.charAt(0).toUpperCase()+sport.slice(1)}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Profile Details</div>
        <div style="margin-top:12px">
          ${[
            ['Full Name', fname],
            ['Sport', sport.charAt(0).toUpperCase()+sport.slice(1)],
            ['Position', user?.athleteProfile?.position || 'Not set'],
            ['Grad Year', user?.athleteProfile?.gradYear || 'Not set'],
            ['Level', user?.athleteProfile?.level || 'Not set'],
            ['Team', user?.athleteProfile?.team || 'Not set'],
          ].map(([label, value]) => `
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:12.5px;color:var(--text-muted)">${label}</span>
            <span style="font-size:13px;font-weight:600;color:${value==='Not set'?'var(--text-muted)':'var(--text-primary)'}">${value}</span>
          </div>`).join('')}
        </div>
        <button class="btn-primary" style="width:100%;margin-top:16px;font-size:13px;padding:12px" data-route="settings/profile">Complete Profile</button>
      </div>
    </div>
  </main>
</div>`;
}
