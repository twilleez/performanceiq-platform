/**
 * Settings — Profile Editor v2
 * Full athlete profile for accurate PIQ scoring.
 */
import { getCurrentUser, updateUser } from '../../core/auth.js';
import { getCurrentRole }             from '../../core/auth.js';
import { buildSidebar }               from '../../components/nav.js';
import { getAthleteProfile, patchProfile } from '../../state/state.js';
import { getScoreBreakdown }          from '../../state/selectors.js';

export function renderSettingsProfile() {
  const user    = getCurrentUser() || {};
  const role    = getCurrentRole() || 'solo';
  const profile = getAthleteProfile();
  const sb      = getScoreBreakdown();
  const profilePct = sb.profile?.raw || 0;
  const isCoach  = role === 'coach';
  const isParent = role === 'parent';
  const pColor   = profilePct >= 80 ? '#22c955' : '#f59e0b';
  const sportMap = {basketball:'🏀 Basketball',football:'🏈 Football',soccer:'⚽ Soccer',baseball:'⚾ Baseball',volleyball:'🏐 Volleyball',track:'🏃 Track & Field'};
  const goalIcons = {strength:'💪',speed:'⚡',endurance:'🏃',flexibility:'🧘',conditioning:'🔥',recovery:'💚',vertical:'⬆️',recruiting:'🎓',pliability:'🌊',mindset:'🧠'};

  return `
<div class="view-with-sidebar">
  ${buildSidebar(role, role + '/settings')}
  <main class="page-main">
    <div class="page-header">
      <h1>Profile <span>Settings</span></h1>
      <p>Keep your profile accurate — it directly powers your PIQ Score calculation.</p>
    </div>
    <div style="background:${pColor}18;border:1px solid ${pColor}40;border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
      <div style="width:48px;height:48px;border-radius:50%;border:3px solid ${pColor};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;color:${pColor};flex-shrink:0">${profilePct}%</div>
      <div>
        <div style="font-weight:700;font-size:13.5px;color:var(--text-primary)">Profile Completeness — ${profilePct>=80?'Great!':profilePct>=50?'Almost there':'Needs attention'}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Profile completeness contributes <strong>10%</strong> to your PIQ Score. Complete all fields for the most accurate score.</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:900px">
      <div class="panel">
        <div class="panel-title">Account Details</div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
          <div class="b-field"><label>Full Name</label><input type="text" id="prof-name" value="${user.name || ''}" placeholder="Full name"></div>
          <div class="b-field"><label>Email</label><input type="email" id="prof-email" value="${user.email || ''}" placeholder="Email"></div>
          ${!isCoach && !isParent ? `
          <div class="b-field"><label>Primary Sport</label><select id="prof-sport">
            ${Object.entries(sportMap).map(([v,l])=>`<option value="${v}" ${(profile.sport||user.sport)===v?'selected':''}>${l}</option>`).join('')}
          </select></div>
          <div class="b-field"><label>Position</label><input type="text" id="prof-position" value="${profile.position || ''}" placeholder="e.g. Point Guard, Quarterback"></div>
          <div class="b-field"><label>Team / School</label><input type="text" id="prof-team" value="${profile.team || ''}" placeholder="e.g. Lincoln High Basketball"></div>
          <div class="b-field"><label>Graduation Year</label><input type="text" id="prof-gradyear" value="${profile.gradYear || ''}" placeholder="e.g. 2026"></div>
          ` : ''}
        </div>
      </div>
      ${!isCoach && !isParent ? `
      <div class="panel">
        <div class="panel-title">Physical Metrics <span style="font-size:11px;color:var(--piq-green);font-weight:600;margin-left:6px">Impacts PIQ Score</span></div>
        <div style="font-size:12px;color:var(--text-muted);margin:6px 0 12px">Used to calculate your personalized macro targets based on ISSN nutrition science.</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="b-field"><label>Age</label><input type="number" id="prof-age" value="${profile.age || ''}" placeholder="e.g. 17" min="10" max="40"></div>
          <div class="b-field"><label>Weight (lbs)</label><input type="number" id="prof-weight" value="${profile.weightLbs || ''}" placeholder="e.g. 175" min="80" max="400"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="b-field"><label>Height (ft)</label><input type="number" id="prof-height-ft" value="${profile.heightFt || ''}" placeholder="5" min="4" max="8"></div>
            <div class="b-field"><label>Height (in)</label><input type="number" id="prof-height-in" value="${profile.heightIn || ''}" placeholder="11" min="0" max="11"></div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Training Context <span style="font-size:11px;color:var(--piq-green);font-weight:600;margin-left:6px">Impacts PIQ Score</span></div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
          <div class="b-field"><label>Training Level</label><select id="prof-level">
            <option value="beginner"     ${profile.trainingLevel==='beginner'?'selected':''}>Beginner (0-1 yr)</option>
            <option value="intermediate" ${profile.trainingLevel==='intermediate'?'selected':''}>Intermediate (1-3 yrs)</option>
            <option value="advanced"     ${profile.trainingLevel==='advanced'?'selected':''}>Advanced (3-5 yrs)</option>
            <option value="elite"        ${profile.trainingLevel==='elite'?'selected':''}>Elite (5+ yrs / College+)</option>
          </select></div>
          <div class="b-field"><label>Competition Phase</label><select id="prof-phase">
            <option value="off-season"  ${profile.compPhase==='off-season'?'selected':''}>Off-Season</option>
            <option value="pre-season"  ${profile.compPhase==='pre-season'?'selected':''}>Pre-Season</option>
            <option value="in-season"   ${profile.compPhase==='in-season'?'selected':''}>In-Season</option>
            <option value="post-season" ${profile.compPhase==='post-season'?'selected':''}>Post-Season / Recovery</option>
          </select></div>
          <div class="b-field"><label>Training Days / Week</label><select id="prof-days">
            ${[2,3,4,5,6].map(d=>`<option value="${d}" ${parseInt(profile.daysPerWeek)===d?'selected':''}>${d} days/week</option>`).join('')}
          </select></div>
          <div class="b-field"><label>Avg Sleep Hours / Night</label><select id="prof-sleep">
            ${[5,6,7,8,9,10].map(h=>`<option value="${h}" ${parseInt(profile.sleepHours)===h?'selected':''}>${h} hours</option>`).join('')}
          </select></div>
          <div class="b-field"><label>Injury History</label><select id="prof-injury">
            <option value="none"        ${profile.injuryHistory==='none'?'selected':''}>None</option>
            <option value="minor"       ${profile.injuryHistory==='minor'?'selected':''}>Minor (resolved)</option>
            <option value="moderate"    ${profile.injuryHistory==='moderate'?'selected':''}>Moderate (resolved)</option>
            <option value="significant" ${profile.injuryHistory==='significant'?'selected':''}>Significant / Chronic</option>
          </select></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Goals &amp; Mindset <span style="font-size:11px;color:var(--piq-green);font-weight:600;margin-left:6px">Impacts PIQ Score</span></div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
          <div class="b-field"><label>Primary Goal</label><select id="prof-primary-goal">
            <option value="" ${!profile.primaryGoal?'selected':''}>Select your #1 goal</option>
            <option value="speed"             ${profile.primaryGoal==='speed'?'selected':''}>Speed &amp; Explosiveness</option>
            <option value="strength"          ${profile.primaryGoal==='strength'?'selected':''}>Strength &amp; Power</option>
            <option value="size"              ${profile.primaryGoal==='size'?'selected':''}>Size &amp; Muscle Gain</option>
            <option value="endurance"         ${profile.primaryGoal==='endurance'?'selected':''}>Endurance &amp; Conditioning</option>
            <option value="sport-performance" ${profile.primaryGoal==='sport-performance'?'selected':''}>Sport-Specific Performance</option>
            <option value="recovery"          ${profile.primaryGoal==='recovery'?'selected':''}>Recovery &amp; Longevity</option>
            <option value="recruiting"        ${profile.primaryGoal==='recruiting'?'selected':''}>College Recruiting</option>
          </select></div>
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:8px">SECONDARY GOALS</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px" id="goals-chips">
              ${Object.entries(goalIcons).map(([g,icon])=>`
              <button class="goal-chip ${(profile.goals||[]).includes(g)?'sel':''}" data-g="${g}" type="button">
                ${icon} ${g.charAt(0).toUpperCase()+g.slice(1)}
              </button>`).join('')}
            </div>
          </div>
        </div>
      </div>
      ` : '<div></div><div></div>'}
    </div>
    <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;max-width:900px">
      <button class="btn-primary" style="width:auto;padding:12px 28px;font-size:14px" id="save-profile-btn">Save All Changes</button>
      <button class="btn-draft" style="padding:12px 22px" data-signout>Sign Out</button>
    </div>
    <p id="prof-saved" style="color:var(--piq-green-dark);font-size:13px;margin-top:10px;display:none">Profile saved — your PIQ Score has been updated.</p>
    <p id="prof-error" style="color:#ef4444;font-size:13px;margin-top:10px;display:none"></p>
  </main>
</div>
<style>
.goal-chip { padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-muted);font-size:12px;cursor:pointer;transition:all 150ms; }
.goal-chip.sel { background:var(--piq-green);color:#0d1b3e;border-color:var(--piq-green);font-weight:700; }
</style>`;
}

document.addEventListener('piq:viewRendered', () => {
  if (!document.getElementById('save-profile-btn')) return;
  let selectedGoals = [...(getAthleteProfile().goals || [])];
  document.querySelectorAll('.goal-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('sel');
      const g = btn.dataset.g;
      if (btn.classList.contains('sel')) { if (!selectedGoals.includes(g)) selectedGoals.push(g); }
      else selectedGoals = selectedGoals.filter(x => x !== g);
    });
  });
  document.getElementById('save-profile-btn')?.addEventListener('click', () => {
    const name  = document.getElementById('prof-name')?.value.trim();
    const email = document.getElementById('prof-email')?.value.trim();
    const sport = document.getElementById('prof-sport')?.value;
    if (!name) {
      const err = document.getElementById('prof-error');
      if (err) { err.textContent = 'Name is required.'; err.style.display = 'block'; }
      return;
    }
    updateUser({ name, email, sport });
    patchProfile({
      sport:         sport || getAthleteProfile().sport,
      position:      document.getElementById('prof-position')?.value.trim() || '',
      team:          document.getElementById('prof-team')?.value.trim() || '',
      gradYear:      document.getElementById('prof-gradyear')?.value.trim() || '',
      age:           document.getElementById('prof-age')?.value || '',
      weightLbs:     document.getElementById('prof-weight')?.value || '',
      heightFt:      document.getElementById('prof-height-ft')?.value || '',
      heightIn:      document.getElementById('prof-height-in')?.value || '',
      trainingLevel: document.getElementById('prof-level')?.value || 'intermediate',
      compPhase:     document.getElementById('prof-phase')?.value || 'in-season',
      daysPerWeek:   parseInt(document.getElementById('prof-days')?.value) || 4,
      sleepHours:    parseInt(document.getElementById('prof-sleep')?.value) || 7,
      injuryHistory: document.getElementById('prof-injury')?.value || 'none',
      primaryGoal:   document.getElementById('prof-primary-goal')?.value || '',
      goals:         selectedGoals,
    });
    const msg = document.getElementById('prof-saved');
    const err = document.getElementById('prof-error');
    if (err) err.style.display = 'none';
    if (msg) { msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 3500); }
  });
});
