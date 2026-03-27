/**
 * Player Recruiting View — upgraded v2
 * Editable profile fields, athleteProfile integration, recruiting guidance.
 * Profile strength drives by actual profile completeness, not guesswork.
 */
import { buildSidebar }          from '../../components/nav.js';
import { getCurrentUser }        from '../../core/auth.js';
import { getAthleteProfile,
         patchProfile }          from '../../state/state.js';
import { getPIQScore, getStreak,
         getWorkoutCount,
         getScoreBreakdown }     from '../../state/selectors.js';

export function renderPlayerRecruiting() {
  const user    = getCurrentUser() || {};
  const fname   = user.name || 'Athlete';
  const profile = getAthleteProfile();
  const piq     = getPIQScore();
  const streak  = getStreak();
  const sessions = getWorkoutCount();
  const sb      = getScoreBreakdown();

  const sport    = profile.sport    || user.sport    || 'basketball';
  const position = profile.position || '';
  const gradYear = profile.gradYear || '';
  const team     = profile.team     || '';
  const level    = profile.trainingLevel || profile.level || 'intermediate';
  const age      = profile.age      || '';
  const height   = profile.heightFt ? `${profile.heightFt}'${profile.heightIn || '0'}"` : '';
  const weight   = profile.weightLbs ? `${profile.weightLbs} lbs` : '';
  const goals    = profile.goals?.join(', ') || profile.primaryGoal || '';

  // Profile strength — based on actual field completion
  let strength = 0;
  if (piq > 0)       strength += 20;
  if (sessions >= 5) strength += 15;
  else               strength += sessions * 3;
  if (streak >= 7)   strength += 15;
  else               strength += Math.min(12, streak * 1.7);
  if (gradYear)      strength += 12;
  if (position)      strength += 10;
  if (height)        strength += 8;
  if (weight)        strength += 8;
  if (team)          strength += 7;
  if (goals)         strength += 5;
  strength = Math.min(100, Math.round(strength));

  const strengthColor =
    strength >= 80 ? '#22c955' :
    strength >= 50 ? '#f59e0b' : '#ef4444';

  const missingFields = [];
  if (!gradYear)  missingFields.push('Graduation year');
  if (!position)  missingFields.push('Position');
  if (!height)    missingFields.push('Height');
  if (!weight)    missingFields.push('Weight');
  if (!team)      missingFields.push('Current team');
  if (!goals)     missingFields.push('Training goals');

  // Sport-specific positions
  const POSITIONS = {
    basketball: ['Point Guard','Shooting Guard','Small Forward','Power Forward','Center'],
    football:   ['QB','RB','WR','TE','OL','DL','LB','CB','S','K/P'],
    soccer:     ['Goalkeeper','Defender','Midfielder','Forward','Winger'],
    baseball:   ['Pitcher','Catcher','1B','2B','3B','SS','LF','CF','RF','DH'],
    volleyball: ['Setter','Outside Hitter','Middle Blocker','Opposite','Libero'],
    track:      ['Sprinter','Middle Distance','Long Distance','Jumper','Thrower','Hurdler'],
  };
  const positions = POSITIONS[sport] || POSITIONS.basketball;

  const gradYears = [];
  const curYear = new Date().getFullYear();
  for (let y = curYear; y <= curYear + 6; y++) gradYears.push(y);

  return `
<div class="view-with-sidebar">
  ${buildSidebar('player', 'player/recruiting')}
  <main class="page-main">

    <div class="page-header">
      <h1>Recruiting <span>Profile</span></h1>
      <p>Build your profile to get noticed by college programs</p>
    </div>

    <!-- Profile Strength Banner -->
    <div style="background:var(--surface-2);border-radius:14px;padding:18px 20px;margin-bottom:20px;display:flex;align-items:center;gap:20px">
      <div style="width:68px;height:68px;border-radius:50%;border:5px solid ${strengthColor};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <span style="font-size:20px;font-weight:900;color:${strengthColor}">${strength}%</span>
      </div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:4px">Profile Strength</div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;margin-bottom:8px">
          <div style="height:100%;width:${strength}%;background:${strengthColor};border-radius:4px;transition:width .5s"></div>
        </div>
        ${missingFields.length > 0
          ? `<div style="font-size:12px;color:var(--text-muted)">Add: ${missingFields.slice(0,3).join(', ')}${missingFields.length > 3 ? ` +${missingFields.length-3} more` : ''}</div>`
          : `<div style="font-size:12px;color:var(--piq-green);font-weight:600">Profile complete — you're visible to recruiters</div>`}
      </div>
    </div>

    <div class="panels-2">

      <!-- ── LEFT: Editable Profile ──────────────────────────── -->
      <div>
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Profile Information</div>
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:12px">

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="b-field">
                <label>Full Name</label>
                <input type="text" id="rec-name" value="${fname}" placeholder="Your name">
              </div>
              <div class="b-field">
                <label>Sport</label>
                <select id="rec-sport">
                  ${['basketball','football','soccer','baseball','volleyball','track'].map(s =>
                    `<option value="${s}" ${sport===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
                  ).join('')}
                </select>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="b-field">
                <label>Position</label>
                <select id="rec-position">
                  <option value="">Select position</option>
                  ${positions.map(p => `<option value="${p}" ${position===p?'selected':''}>${p}</option>`).join('')}
                </select>
              </div>
              <div class="b-field">
                <label>Graduation Year</label>
                <select id="rec-gradyear">
                  <option value="">Select year</option>
                  ${gradYears.map(y => `<option value="${y}" ${gradYear==y?'selected':''}>${y}</option>`).join('')}
                </select>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
              <div class="b-field">
                <label>Age</label>
                <input type="number" id="rec-age" value="${age}" placeholder="e.g. 17" min="12" max="25">
              </div>
              <div class="b-field">
                <label>Height (ft)</label>
                <input type="number" id="rec-height-ft" value="${profile.heightFt||''}" placeholder="6" min="4" max="8">
              </div>
              <div class="b-field">
                <label>Height (in)</label>
                <input type="number" id="rec-height-in" value="${profile.heightIn||''}" placeholder="2" min="0" max="11">
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="b-field">
                <label>Weight (lbs)</label>
                <input type="number" id="rec-weight" value="${profile.weightLbs||''}" placeholder="185" min="80" max="400">
              </div>
              <div class="b-field">
                <label>Current Team / School</label>
                <input type="text" id="rec-team" value="${team}" placeholder="e.g. Lincoln High">
              </div>
            </div>

            <div class="b-field">
              <label>Training Goals</label>
              <input type="text" id="rec-goals" value="${goals}" placeholder="e.g. Strength, Speed, Recruiting exposure">
            </div>

          </div>
          <button class="btn-primary" style="width:100%;margin-top:16px" id="save-profile-btn">Save Profile</button>
          <p id="profile-saved" style="color:var(--piq-green-dark);font-size:12.5px;margin-top:8px;display:none">Profile saved successfully.</p>
        </div>
      </div>

      <!-- ── RIGHT: Stats + Recruiting Tips ──────────────────── -->
      <div>
        <!-- Performance Stats -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">Performance Highlights</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
            ${[
              ['PIQ Score', piq, '#22c955'],
              ['Streak', `🔥 ${streak}d`, 'var(--text-primary)'],
              ['Sessions', sessions, '#3b82f6'],
              ['Compliance', `${sb.compliance?.raw||0}%`, '#a78bfa'],
            ].map(([label, val, color]) => `
            <div style="padding:12px;background:var(--surface-2);border-radius:10px;text-align:center">
              <div style="font-size:22px;font-weight:700;color:${color}">${val}</div>
              <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px">${label}</div>
            </div>`).join('')}
          </div>
        </div>

        <!-- Recruiting Tips -->
        <div class="panel" style="margin-bottom:16px">
          <div class="panel-title">What College Coaches Look For</div>
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:12px">
            ${[
              ['🔥', 'Consistency over highlights', 'Coaches want athletes who show up every day. Your PIQ streak matters more than a single standout session.'],
              ['📊', 'Data tells your story', 'A complete profile with real training data — RPE, compliance, readiness — demonstrates self-awareness and professionalism.'],
              ['💪', 'Physical development', 'Height, weight, and position data help coaches assess fit before scheduling a visit. Keep it accurate.'],
              ['🎓', 'Graduation year timing', 'Contact coaches 18–24 months before your grad year. Early engagement shows initiative.'],
              ['📱', 'PIQ Score as a signal', 'A PIQ Score above 75 shows high-level training discipline — something coaches actively look for.'],
            ].map(([icon, title, desc]) => `
            <div style="display:flex;gap:10px">
              <span style="font-size:18px;flex-shrink:0;margin-top:1px">${icon}</span>
              <div>
                <div style="font-size:12.5px;font-weight:700;color:var(--text-primary);margin-bottom:2px">${title}</div>
                <div style="font-size:12px;color:var(--text-muted);line-height:1.55">${desc}</div>
              </div>
            </div>`).join('')}
          </div>
        </div>

        <!-- CTA -->
        <div class="panel" style="background:linear-gradient(135deg,#0d1b3e,#1a2f5e);border:1px solid #22c95530">
          <div style="font-size:13.5px;font-weight:700;color:#fff;margin-bottom:6px">Ready to get noticed?</div>
          <div style="font-size:12px;color:#a0b4d0;margin-bottom:14px;line-height:1.55">Keep your training consistent, log every session, and maintain a readiness score above 70. That's the profile that gets calls.</div>
          <button class="btn-primary" style="font-size:12.5px;padding:10px 18px" data-route="player/today">Train Today</button>
        </div>
      </div>

    </div>
  </main>
</div>`;
}

// ── WIRE SAVE ────────────────────────────────────────────────────────────────
document.addEventListener('piq:viewRendered', () => {
  const saveBtn = document.getElementById('save-profile-btn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    const heightFt = parseInt(document.getElementById('rec-height-ft')?.value) || null;
    const heightIn = parseInt(document.getElementById('rec-height-in')?.value) || 0;

    patchProfile({
      sport:         document.getElementById('rec-sport')?.value    || undefined,
      position:      document.getElementById('rec-position')?.value || undefined,
      gradYear:      document.getElementById('rec-gradyear')?.value || undefined,
      age:           document.getElementById('rec-age')?.value      || undefined,
      heightFt,
      heightIn,
      weightLbs:     document.getElementById('rec-weight')?.value   || undefined,
      team:          document.getElementById('rec-team')?.value     || undefined,
      primaryGoal:   document.getElementById('rec-goals')?.value    || undefined,
    });

    const msg = document.getElementById('profile-saved');
    if (msg) msg.style.display = 'block';
    saveBtn.textContent = 'Saved ✓';
    saveBtn.disabled = true;
    setTimeout(() => {
      if (msg) msg.style.display = 'none';
      saveBtn.textContent = 'Save Profile';
      saveBtn.disabled = false;
    }, 2500);
  });
});
