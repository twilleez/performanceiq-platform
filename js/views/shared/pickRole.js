/**
 * PerformanceIQ — Onboarding Wizard v3.1
 * 5-step immersive flow: Role → Sport → Profile → Training → Goals
 *
 * Changes from v3:
 *   - ob2-finish handler is now async and calls upsertProfile() to Supabase
 *   - Navigation is blocked on upsert failure (error shown inline)
 *   - ob2-error element added to HTML for inline error display
 *   - suppressNextGuard() called before navigate to prevent router race
 *   - Demo users skip Supabase write (isDemo flag check)
 */
import { navigate, ROLE_HOME, ROUTES }                          from '../../router.js';
import { getCurrentUser, getCurrentRole,
         markOnboardingDone, setRole, needsOnboarding,
         getSession }                                           from '../../core/auth.js';
import { patchProfile }                                         from '../../state/state.js';
import { supabase, upsertProfile }                              from '../../core/supabase.js';
import { suppressNextGuard }                                    from '../../router.js';

// ── SPORT CARDS DATA ──────────────────────────────────────────
const SPORTS = [
  { id: 'basketball', emoji: '🏀', label: 'Basketball'    },
  { id: 'football',   emoji: '🏈', label: 'Football'      },
  { id: 'soccer',     emoji: '⚽', label: 'Soccer'        },
  { id: 'baseball',   emoji: '⚾', label: 'Baseball'      },
  { id: 'volleyball', emoji: '🏐', label: 'Volleyball'    },
  { id: 'track',      emoji: '🏃', label: 'Track & Field' },
];

const POSITIONS = {
  basketball: ['Point Guard','Shooting Guard','Small Forward','Power Forward','Center'],
  football:   ['QB','RB','WR','TE','OL','DL','LB','CB','S','K/P'],
  soccer:     ['Goalkeeper','Defender','Midfielder','Forward','Winger'],
  baseball:   ['Pitcher','Catcher','1B','2B','3B','SS','LF','CF','RF','DH'],
  volleyball: ['Setter','Outside Hitter','Middle Blocker','Opposite','Libero'],
  track:      ['Sprinter (100/200m)','Middle Distance (400/800m)','Long Distance','Jumper','Thrower','Hurdler'],
};

const GOALS = [
  { id: 'strength',    emoji: '💪', label: 'Strength'          },
  { id: 'speed',       emoji: '⚡', label: 'Speed'             },
  { id: 'endurance',   emoji: '🏃', label: 'Endurance'         },
  { id: 'flexibility', emoji: '🧘', label: 'Flexibility'       },
  { id: 'conditioning',emoji: '🔥', label: 'Conditioning'      },
  { id: 'recovery',    emoji: '💚', label: 'Recovery'          },
  { id: 'vertical',    emoji: '⬆️', label: 'Vertical Jump'     },
  { id: 'recruiting',  emoji: '🎓', label: 'Recruiting'        },
  { id: 'injury_prev', emoji: '🛡️', label: 'Injury Prevention' },
  { id: 'nutrition',   emoji: '🥗', label: 'Nutrition'         },
];

// ── RENDER ────────────────────────────────────────────────────
export function renderOnboarding() {
  const user         = getCurrentUser();
  const existingRole = getCurrentRole();
  const hasRole      = !!existingRole;
  const startStep    = hasRole ? 2 : 1;
  const totalSteps   = hasRole ? 4 : 5;
  const startPct     = hasRole ? 25 : 20;

  return `
<div class="ob2-wrap">
  <div class="ob2-card" id="ob2-card">

    <!-- Progress bar -->
    <div class="ob2-progress-bar">
      <div class="ob2-prog" id="ob2-prog" style="width:${startPct}%"></div>
    </div>

    <!-- Step indicators -->
    <div class="ob2-steps" id="ob2-steps" data-has-role="${hasRole}">
      ${(!hasRole ? `<div class="ob2-step ${startStep===1?'active':''}" data-s="1">
        <div class="ob2-step-pip"></div><span>Role</span>
      </div><div class="ob2-step-conn"></div>` : '')}
      <div class="ob2-step ${startStep<=2?'active':''}" data-s="2">
        <div class="ob2-step-pip"></div><span>Sport</span>
      </div>
      <div class="ob2-step-conn"></div>
      <div class="ob2-step" data-s="3">
        <div class="ob2-step-pip"></div><span>Profile</span>
      </div>
      <div class="ob2-step-conn"></div>
      <div class="ob2-step" data-s="4">
        <div class="ob2-step-pip"></div><span>Training</span>
      </div>
      <div class="ob2-step-conn"></div>
      <div class="ob2-step" data-s="5">
        <div class="ob2-step-pip"></div><span>Goals</span>
      </div>
    </div>

    <!-- ── STEP 1: ROLE ──────────────────────────────────────── -->
    <div class="ob2-panel ${startStep===1?'active':''}" id="ob2-s1" ${hasRole?'style="display:none"':''}>
      <h2>I am a…</h2>
      <p class="ob2-sub">Choose your role to personalise your experience.</p>
      <div class="ob2-role-grid">
        <button class="ob2-role-card ${existingRole==='player'||existingRole==='solo'?'sel':''}" data-role="player">
          <span class="ob2-role-icon">⚡</span>
          <span class="ob2-role-label">Athlete</span>
          <span class="ob2-role-sub">Track readiness & training</span>
        </button>
        <button class="ob2-role-card ${existingRole==='solo'?'sel':''}" data-role="solo">
          <span class="ob2-role-icon">🏅</span>
          <span class="ob2-role-label">Solo Athlete</span>
          <span class="ob2-role-sub">Train independently</span>
        </button>
        <button class="ob2-role-card ${existingRole==='coach'?'sel':''}" data-role="coach">
          <span class="ob2-role-icon">📋</span>
          <span class="ob2-role-label">Coach</span>
          <span class="ob2-role-sub">Manage your roster</span>
        </button>
        <button class="ob2-role-card ${existingRole==='parent'?'sel':''}" data-role="parent">
          <span class="ob2-role-icon">👨‍👩‍👧</span>
          <span class="ob2-role-label">Parent</span>
          <span class="ob2-role-sub">Monitor your child</span>
        </button>
      </div>
      <div class="ob2-nav">
        <div></div>
        <button class="ob2-btn-next" id="ob2-next1">Next <span>→</span></button>
      </div>
    </div>

    <!-- ── STEP 2: SPORT ─────────────────────────────────────── -->
    <div class="ob2-panel ${startStep===2?'active':''}" id="ob2-s2">
      <h2 id="ob2-s2-title">Your Sport</h2>
      <p class="ob2-sub" id="ob2-s2-sub">Select your primary sport to unlock sport-specific workouts.</p>

      <!-- Athlete / Solo sport cards -->
      <div id="ob2-sport-section">
        <div class="ob2-sport-grid" id="ob2-sport-grid">
          ${SPORTS.map(s => `
          <button class="ob2-sport-card" data-sport="${s.id}">
            <span class="ob2-sport-emoji">${s.emoji}</span>
            <span class="ob2-sport-label">${s.label}</span>
          </button>`).join('')}
        </div>
        <div class="ob2-field" id="ob2-position-wrap" style="display:none;margin-top:12px">
          <label>Position <span class="ob2-opt">(optional)</span></label>
          <select id="ob-position"><option value="">Select position…</option></select>
        </div>
        <div class="ob2-field">
          <label>Level</label>
          <select id="ob-level">
            <option value="youth">Youth (Under 13)</option>
            <option value="middle_school">Middle School</option>
            <option value="high_school" selected>High School</option>
            <option value="collegiate">Collegiate</option>
            <option value="professional">Professional / Elite</option>
          </select>
        </div>
        <div class="ob2-field">
          <label>Team / School <span class="ob2-opt">(optional)</span></label>
          <input type="text" id="ob-team" placeholder="e.g. Lincoln High Basketball">
        </div>
      </div>

      <!-- Coach section -->
      <div id="ob2-coach-section" style="display:none">
        <div class="ob2-field">
          <label>Team Name</label>
          <input type="text" id="ob-coach-team" placeholder="e.g. Westview Varsity Basketball">
        </div>
        <div class="ob2-sport-grid" id="ob2-coach-sport-grid" style="margin-top:12px">
          ${SPORTS.map(s => `
          <button class="ob2-sport-card" data-sport="${s.id}">
            <span class="ob2-sport-emoji">${s.emoji}</span>
            <span class="ob2-sport-label">${s.label}</span>
          </button>`).join('')}
        </div>
      </div>

      <div class="ob2-nav">
        ${!hasRole ? `<button class="ob2-btn-back" id="ob2-back2">← Back</button>` : '<div></div>'}
        <button class="ob2-btn-next" id="ob2-next2">Next <span>→</span></button>
      </div>
    </div>

    <!-- ── STEP 3: PROFILE ───────────────────────────────────── -->
    <div class="ob2-panel" id="ob2-s3">
      <h2>Your Profile</h2>
      <p class="ob2-sub">Helps calibrate your PIQ Score and training load targets.</p>
      <div class="ob2-field">
        <label>Name <span class="ob2-opt">(optional — update anytime)</span></label>
        <input type="text" id="ob-name" placeholder="${user?.name || 'Your name'}" value="${user?.name || ''}">
      </div>
      <div class="ob2-field-row">
        <div class="ob2-field">
          <label>Age</label>
          <input type="number" id="ob-age" placeholder="e.g. 17" min="8" max="80">
        </div>
        <div class="ob2-field">
          <label>Grad Year <span class="ob2-opt">(optional)</span></label>
          <input type="number" id="ob-gradyear" placeholder="e.g. 2026" min="2020" max="2035">
        </div>
      </div>
      <div class="ob2-field-row">
        <div class="ob2-field">
          <label>Weight</label>
          <input type="number" id="ob-weight" placeholder="e.g. 175" min="50" max="400">
        </div>
        <div class="ob2-field">
          <label>Unit</label>
          <select id="ob-weight-unit">
            <option value="lbs" selected>lbs</option>
            <option value="kg">kg</option>
          </select>
        </div>
      </div>
      <div class="ob2-field">
        <label>Height <span class="ob2-opt">(optional, e.g. 6'2")</span></label>
        <input type="text" id="ob-height" placeholder="e.g. 6'2&quot;">
      </div>
      <div class="ob2-field">
        <label>Injury History <span class="ob2-opt">(optional)</span></label>
        <input type="text" id="ob-injuries" placeholder="e.g. ACL 2023, none">
      </div>
      <div class="ob2-nav">
        <button class="ob2-btn-back" id="ob2-back3">← Back</button>
        <button class="ob2-btn-next" id="ob2-next3">Next <span>→</span></button>
      </div>
    </div>

    <!-- ── STEP 4: TRAINING ──────────────────────────────────── -->
    <div class="ob2-panel" id="ob2-s4">
      <h2>Training Setup</h2>
      <p class="ob2-sub">Used to calculate weekly load targets and ACWR.</p>

      <div class="ob2-field">
        <label>Current Season Phase</label>
        <div class="ob2-phase-grid">
          ${[
            { id:'pre_season',  label:'Pre-Season'  },
            { id:'in_season',   label:'In-Season'   },
            { id:'post_season', label:'Post-Season' },
            { id:'off_season',  label:'Off-Season'  },
          ].map(p => `
          <button class="ob2-phase-card ${p.id==='off_season'?'sel':''}" data-phase="${p.id}">
            ${p.label}
          </button>`).join('')}
        </div>
      </div>

      <div class="ob2-field">
        <label>Training Level</label>
        <select id="ob-training-level">
          <option value="beginner">Beginner</option>
          <option value="intermediate" selected>Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="elite">Elite / Collegiate+</option>
        </select>
      </div>

      <div class="ob2-field">
        <label>Days per week available to train</label>
        <div class="ob2-day-grid">
          ${[2,3,4,5,6].map(d => `
          <button class="ob2-day-btn ${d===4?'sel':''}" data-days="${d}">${d}</button>`).join('')}
        </div>
      </div>

      <div class="ob2-field">
        <label>Average sleep — <span id="ob-sleep-val">8 hrs</span></label>
        <input type="range" id="ob-sleep" min="4" max="12" step="0.5" value="8">
        <p class="ob2-sleep-note" id="ob2-sleep-note" style="font-size:11.5px;margin-top:4px;color:var(--piq-green)">
          ✅ Optimal recovery range (7–9 hrs recommended by NSCA)
        </p>
      </div>

      <div class="ob2-nav">
        <button class="ob2-btn-back" id="ob2-back4">← Back</button>
        <button class="ob2-btn-next" id="ob2-next4">Next <span>→</span></button>
      </div>
    </div>

    <!-- ── STEP 5: GOALS ─────────────────────────────────────── -->
    <div class="ob2-panel" id="ob2-s5">
      <h2>Your Goals</h2>
      <p class="ob2-sub">These shape your workouts and PIQ score priorities.</p>
      <div class="ob2-goals-grid">
        ${GOALS.map(g => `
        <button class="ob2-goal-card" data-g="${g.id}">
          <span class="ob2-goal-emoji">${g.emoji}</span>
          <span class="ob2-goal-label">${g.label}</span>
        </button>`).join('')}
      </div>

      <div class="ob2-piq-preview">
        <div class="ob2-piq-ring">
          <svg viewBox="0 0 80 80" width="80" height="80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(57,230,107,.15)" stroke-width="5"/>
            <circle cx="40" cy="40" r="32" fill="none" stroke="#39e66b" stroke-width="5"
              stroke-dasharray="201" stroke-dashoffset="201" stroke-linecap="round"
              id="ob2-piq-arc" transform="rotate(-90 40 40)" style="transition:stroke-dashoffset .6s ease"/>
          </svg>
          <div class="ob2-piq-score" id="ob2-piq-score">—</div>
        </div>
        <div class="ob2-piq-text">
          <div class="ob2-piq-label">Your Starting PIQ</div>
          <div class="ob2-piq-sub" id="ob2-piq-sub-text">Select goals to see your estimate</div>
        </div>
      </div>

      <!-- Inline error display for Supabase upsert failures -->
      <p id="ob2-error" style="color:#f87171;font-size:12.5px;margin:8px 0;display:none;text-align:center"></p>

      <div class="ob2-nav" style="margin-top:20px">
        <button class="ob2-btn-back" id="ob2-back5">← Back</button>
        <button class="ob2-btn-finish" id="ob2-finish">
          <span id="ob2-finish-text">Launch My Dashboard</span>
          <span class="ob2-finish-arrow">🚀</span>
        </button>
      </div>
    </div>

  </div><!-- /ob2-card -->
</div><!-- /ob2-wrap -->
`;
}

// ── WIRE EVENTS ───────────────────────────────────────────────
document.addEventListener('piq:authRendered', wireOnboarding);

function wireOnboarding() {
  // Support BOTH old onboarding (ob-finish) and new (ob2-finish)
  wireOldOnboardingFallback();

  if (!document.getElementById('ob2-s1') && !document.getElementById('ob2-s2')) return;

  const hasRoleAttr = document.getElementById('ob2-steps')?.dataset?.hasRole;
  const hasRole     = hasRoleAttr === 'true';

  // ── Mutable wizard state ─────────────────────────────────────
  let selectedRole  = getCurrentRole() || 'player';
  let selectedSport = '';
  let coachSport    = '';
  let selectedPhase = 'off_season';
  let daysPerWeek   = 4;
  let goals         = [];

  // ── Role card selection ──────────────────────────────────────
  document.querySelectorAll('.ob2-role-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.ob2-role-card').forEach(c => c.classList.remove('sel'));
      card.classList.add('sel');
      selectedRole = card.dataset.role;
      updateStep2ForRole(selectedRole);
    });
  });

  // ── Sport card selection (athlete/solo) ──────────────────────
  document.querySelectorAll('#ob2-sport-grid .ob2-sport-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#ob2-sport-grid .ob2-sport-card').forEach(c => c.classList.remove('sel'));
      card.classList.add('sel');
      selectedSport = card.dataset.sport;
      const posWrap = document.getElementById('ob2-position-wrap');
      const posSel  = document.getElementById('ob-position');
      const positions = POSITIONS[selectedSport] || [];
      if (positions.length && posSel) {
        posSel.innerHTML = '<option value="">Select position…</option>' +
          positions.map(p => `<option value="${p}">${p}</option>`).join('');
        if (posWrap) posWrap.style.display = 'block';
      }
    });
  });

  // ── Coach sport card selection ───────────────────────────────
  document.querySelectorAll('#ob2-coach-sport-grid .ob2-sport-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#ob2-coach-sport-grid .ob2-sport-card').forEach(c => c.classList.remove('sel'));
      card.classList.add('sel');
      coachSport = card.dataset.sport;
    });
  });

  // ── Phase card selection ─────────────────────────────────────
  document.querySelectorAll('.ob2-phase-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.ob2-phase-card').forEach(c => c.classList.remove('sel'));
      card.classList.add('sel');
      selectedPhase = card.dataset.phase;
    });
  });

  // ── Days per week ────────────────────────────────────────────
  document.querySelectorAll('.ob2-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ob2-day-btn').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      daysPerWeek = parseInt(btn.dataset.days);
    });
  });

  // ── Sleep slider ─────────────────────────────────────────────
  document.getElementById('ob-sleep')?.addEventListener('input', function () {
    const h      = parseFloat(this.value);
    const valEl  = document.getElementById('ob-sleep-val');
    const noteEl = document.getElementById('ob2-sleep-note');
    if (valEl) valEl.textContent = h + ' hrs';
    if (noteEl) {
      if (h >= 7 && h <= 9) {
        noteEl.textContent = '✅ Optimal recovery range (7–9 hrs recommended by NSCA)';
        noteEl.style.color = 'var(--piq-green)';
      } else if (h < 7) {
        noteEl.textContent = '⚠️ Below optimal — sleep deprivation reduces performance and recovery';
        noteEl.style.color = '#f59e0b';
      } else {
        noteEl.textContent = '💤 Excellent — extended sleep accelerates recovery and adaptation';
        noteEl.style.color = 'var(--piq-green)';
      }
    }
  });

  // ── Goal chips ───────────────────────────────────────────────
  document.querySelectorAll('.ob2-goal-card').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('sel');
      const g = btn.dataset.g;
      if (btn.classList.contains('sel')) { if (!goals.includes(g)) goals.push(g); }
      else goals = goals.filter(x => x !== g);
      updatePiqPreview();
    });
  });

  // ── Step 2 role-aware layout ─────────────────────────────────
  function updateStep2ForRole(role) {
    const isCoach  = role === 'coach';
    const sportSec = document.getElementById('ob2-sport-section');
    const coachSec = document.getElementById('ob2-coach-section');
    const title    = document.getElementById('ob2-s2-title');
    const sub      = document.getElementById('ob2-s2-sub');
    if (sportSec) sportSec.style.display = isCoach ? 'none' : 'block';
    if (coachSec) coachSec.style.display = isCoach ? 'block' : 'none';
    if (isCoach) {
      if (title) title.textContent = 'Your Team';
      if (sub)   sub.textContent   = 'Tell us about your team and the sport you coach.';
    } else {
      if (title) title.textContent = 'Your Sport';
      if (sub)   sub.textContent   = 'Select your primary sport to unlock sport-specific workouts.';
    }
  }

  updateStep2ForRole(selectedRole);

  // ── Navigation helpers ───────────────────────────────────────
  function goTo(step) {
    document.querySelectorAll('.ob2-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('ob2-s' + step);
    if (panel) { panel.style.display = ''; panel.classList.add('active'); }
    document.querySelectorAll('.ob2-step').forEach(s => {
      const n = parseInt(s.dataset.s);
      s.classList.toggle('active', n === step);
      s.classList.toggle('done',   n < step);
    });
    const steps = hasRole ? [2,3,4,5] : [1,2,3,4,5];
    const idx   = steps.indexOf(step);
    const pct   = ((idx + 1) / steps.length) * 100;
    const prog  = document.getElementById('ob2-prog');
    if (prog) prog.style.width = pct + '%';
    document.getElementById('ob2-card')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Step nav wiring
  document.getElementById('ob2-next1')?.addEventListener('click', () => { updateStep2ForRole(selectedRole); goTo(2); });
  document.getElementById('ob2-back2')?.addEventListener('click', () => goTo(1));
  document.getElementById('ob2-next2')?.addEventListener('click', () => goTo(3));
  document.getElementById('ob2-back3')?.addEventListener('click', () => goTo(2));
  document.getElementById('ob2-next3')?.addEventListener('click', () => goTo(4));
  document.getElementById('ob2-back4')?.addEventListener('click', () => goTo(3));
  document.getElementById('ob2-next4')?.addEventListener('click', () => { updatePiqPreview(); goTo(5); });
  document.getElementById('ob2-back5')?.addEventListener('click', () => goTo(4));

  // ── PIQ preview ──────────────────────────────────────────────
  function updatePiqPreview() {
    const arc     = document.getElementById('ob2-piq-arc');
    const scoreEl = document.getElementById('ob2-piq-score');
    const subText = document.getElementById('ob2-piq-sub-text');
    if (!arc || !scoreEl) return;
    let pct = 20;
    if (selectedSport || coachSport) pct += 15;
    if (selectedRole)                pct += 10;
    const age    = document.getElementById('ob-age')?.value;
    const weight = document.getElementById('ob-weight')?.value;
    const height = document.getElementById('ob-height')?.value;
    if (age)    pct += 10;
    if (weight) pct += 10;
    if (height) pct += 10;
    if (goals.length) pct += Math.min(goals.length * 5, 15);
    pct = Math.min(pct, 100);
    const piqEstimate = Math.round(pct * 0.55);
    scoreEl.textContent = piqEstimate;
    if (subText) {
      if (pct >= 80)      subText.textContent = 'Strong profile — your PIQ will be highly accurate';
      else if (pct >= 50) subText.textContent = 'Good start — add more data to improve accuracy';
      else                subText.textContent = 'Select goals to see your estimate';
    }
    const circumference = 201;
    arc.style.strokeDashoffset = circumference - (circumference * pct / 100);
  }

  // ── FINISH — async with Supabase upsert ──────────────────────
  document.getElementById('ob2-finish')?.addEventListener('click', async () => {
    const finishBtn  = document.getElementById('ob2-finish');
    const finishText = document.getElementById('ob2-finish-text');
    const errEl      = document.getElementById('ob2-error');

    if (finishBtn)  finishBtn.disabled = true;
    if (finishText) finishText.textContent = 'Building your dashboard…';
    if (errEl)      errEl.style.display = 'none';

    // ── Collect all form values ──────────────────────────────
    const role          = selectedRole;
    const sport         = selectedSport || coachSport || 'basketball';
    const team          = (document.getElementById('ob-team')?.value ||
                           document.getElementById('ob-coach-team')?.value || '').trim();
    const level         = document.getElementById('ob-level')?.value         || 'high_school';
    const position      = document.getElementById('ob-position')?.value      || '';
    const age           = parseInt(document.getElementById('ob-age')?.value)  || null;
    const weight        = parseFloat(document.getElementById('ob-weight')?.value) || null;
    const weightUnit    = document.getElementById('ob-weight-unit')?.value    || 'lbs';
    const height        = (document.getElementById('ob-height')?.value || '').trim();
    const gradYear      = parseInt(document.getElementById('ob-gradyear')?.value) || null;
    const sleep         = parseFloat(document.getElementById('ob-sleep')?.value)  || 8;
    const injuries      = (document.getElementById('ob-injuries')?.value || '').trim();
    const trainingLevel = document.getElementById('ob-training-level')?.value || 'intermediate';
    const nameVal       = (document.getElementById('ob-name')?.value || '').trim();

    const profileData = {
      sport, team, goals, role, level, position,
      age, weight, weightUnit, height, gradYear,
      sleepHours:    sleep,
      injuries,
      trainingLevel,
      compPhase:     selectedPhase,
      daysPerWeek,
      primaryGoal:   goals[0] || null,
      secondaryGoals: goals.slice(1),
      ...(nameVal ? { name: nameVal } : {}),
    };

    // 1. Update role in localStorage session
    setRole(role);

    // 2. Mark onboarding complete in localStorage
    markOnboardingDone(profileData);

    // 3. Save to app state (for immediate UI use)
    patchProfile({
      ...profileData,
      name: nameVal || getCurrentUser()?.name,
    });

    // 4. Persist to Supabase (skip for demo sessions)
    const session = getSession();
    if (!session?.isDemo) {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (sbUser) {
        const result = await upsertProfile(sbUser.id, {
          ...profileData,
          name:  nameVal || getCurrentUser()?.name,
          email: sbUser.email,
        });

        if (!result.ok) {
          // Show inline error — block navigation until resolved
          if (errEl) {
            errEl.textContent = `Could not save profile: ${result.error}`;
            errEl.style.display = 'block';
          }
          console.error('[PIQ] upsertProfile error:', result);
          if (finishBtn)  finishBtn.disabled = false;
          if (finishText) finishText.textContent = 'Launch My Dashboard';
          return; // ← do NOT navigate
        }
      }
    }

    // 5. Navigate — only reached on success (or demo mode)
    const destination = ROLE_HOME[role] || ROUTES.PLAYER_HOME;
    if (typeof suppressNextGuard === 'function') suppressNextGuard();
    setTimeout(() => navigate(destination), 400);
  });
}

// ── FALLBACK: wire the old 3-step onboarding if still in DOM ─
function wireOldOnboardingFallback() {
  const finishBtn = document.getElementById('ob-finish');
  if (!finishBtn) return;

  let goals = [];

  document.getElementById('ob-next1')?.addEventListener('click', () => {
    const role    = document.getElementById('ob-role')?.value || 'solo';
    const isCoach = role === 'coach';
    const s2a = document.getElementById('ob-s2-athlete');
    const s2c = document.getElementById('ob-s2-coach');
    if (s2a) s2a.style.display = isCoach ? 'none' : 'block';
    if (s2c) s2c.style.display = isCoach ? 'block' : 'none';
    document.getElementById('ob-s1').style.display = 'none';
    document.getElementById('ob-s2').style.display = 'block';
  });
  document.getElementById('ob-back2')?.addEventListener('click', () => {
    document.getElementById('ob-s2').style.display = 'none';
    document.getElementById('ob-s1').style.display = 'block';
  });
  document.getElementById('ob-next2')?.addEventListener('click', () => {
    document.getElementById('ob-s2').style.display = 'none';
    document.getElementById('ob-s3').style.display = 'block';
  });
  document.getElementById('ob-back3')?.addEventListener('click', () => {
    document.getElementById('ob-s3').style.display = 'none';
    document.getElementById('ob-s2').style.display = 'block';
  });
  document.querySelectorAll('.onboard-goal').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('sel');
      const g = btn.dataset.g;
      if (btn.classList.contains('sel')) { if (!goals.includes(g)) goals.push(g); }
      else goals = goals.filter(x => x !== g);
    });
  });
  finishBtn.addEventListener('click', () => {
    const role  = document.getElementById('ob-role')?.value || getCurrentRole() || 'solo';
    const sport = document.getElementById('ob-sport')?.value
               || document.getElementById('ob-coach-sport')?.value || 'basketball';
    const team  = (document.getElementById('ob-team')?.value
               || document.getElementById('ob-coach-team')?.value || '').trim();
    finishBtn.textContent = 'Loading…';
    finishBtn.disabled    = true;
    setRole(role);
    markOnboardingDone({ sport, team, goals, role });
    patchProfile({ sport, team, goals, primaryGoal: goals[0] || null, secondaryGoals: goals.slice(1) });
    setTimeout(() => navigate(ROLE_HOME[role] || ROUTES.PLAYER_HOME), 400);
  });
}
