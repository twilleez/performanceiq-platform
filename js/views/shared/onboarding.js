/**
 * PerformanceIQ — Onboarding Wizard v2
 * 5-step immersive flow: Role → Sport → Profile/Metrics → Training Phase → Goals
 * Saves all data to profile for accurate PIQ score calculation.
 */
import { navigate, ROLE_HOME, ROUTES }               from '../../router.js';
import { getCurrentUser, markOnboardingDone, setRole } from '../../core/auth.js';
import { patchProfile }                               from '../../state/state.js';

// ── SPORT CARDS DATA ──────────────────────────────────────────
const SPORTS = [
  { id: 'basketball', emoji: '🏀', label: 'Basketball'   },
  { id: 'football',   emoji: '🏈', label: 'Football'     },
  { id: 'soccer',     emoji: '⚽', label: 'Soccer'       },
  { id: 'baseball',   emoji: '⚾', label: 'Baseball'     },
  { id: 'volleyball', emoji: '🏐', label: 'Volleyball'   },
  { id: 'track',      emoji: '🏃', label: 'Track & Field'},
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
  const user = getCurrentUser();

  return `
<div class="ob2-wrap">
  <!-- Progress bar -->
  <div class="ob2-progress">
    <div class="ob2-progress-fill" id="ob2-prog" style="width:20%"></div>
  </div>

  <!-- Step indicator -->
  <div class="ob2-steps" id="ob2-steps">
    <div class="ob2-step active" data-s="1">Role</div>
    <div class="ob2-step" data-s="2">Sport</div>
    <div class="ob2-step" data-s="3">Profile</div>
    <div class="ob2-step" data-s="4">Training</div>
    <div class="ob2-step" data-s="5">Goals</div>
  </div>

  <div class="ob2-card" id="ob2-card">

    <!-- ── STEP 1: ROLE ─────────────────────────────────────── -->
    <div class="ob2-panel active" id="ob2-s1">
      <div class="ob2-welcome">
        <div class="ob2-welcome-icon">🏆</div>
        <h2>Welcome to Performance<span class="ob2-iq">IQ</span></h2>
        <p>Your elite training platform. Let's build your profile in 5 steps so we can calculate your accurate PIQ score.</p>
      </div>
      <div class="ob2-field">
        <label>Your Name</label>
        <input type="text" id="ob-name" value="${user?.name || ''}" placeholder="Full name" autocomplete="name">
      </div>
      <div class="ob2-field">
        <label>I am a…</label>
        <div class="ob2-role-grid" id="ob2-role-grid">
          <button class="ob2-role-card sel" data-role="player">
            <span class="ob2-role-icon">🏅</span>
            <span class="ob2-role-label">Player / Athlete</span>
            <span class="ob2-role-sub">Track your performance</span>
          </button>
          <button class="ob2-role-card" data-role="solo">
            <span class="ob2-role-icon">⚡</span>
            <span class="ob2-role-label">Solo Athlete</span>
            <span class="ob2-role-sub">Train independently</span>
          </button>
          <button class="ob2-role-card" data-role="coach">
            <span class="ob2-role-icon">📋</span>
            <span class="ob2-role-label">Coach</span>
            <span class="ob2-role-sub">Manage your roster</span>
          </button>
          <button class="ob2-role-card" data-role="parent">
            <span class="ob2-role-icon">👨‍👩‍👧</span>
            <span class="ob2-role-label">Parent</span>
            <span class="ob2-role-sub">Monitor your child</span>
          </button>
        </div>
      </div>
      <div class="ob2-nav">
        <div></div>
        <button class="ob2-btn-next" id="ob2-next1">Next <span>→</span></button>
      </div>
    </div>

    <!-- ── STEP 2: SPORT ─────────────────────────────────────── -->
    <div class="ob2-panel" id="ob2-s2">
      <h2 id="ob2-s2-title">Your Sport</h2>
      <p class="ob2-sub" id="ob2-s2-sub">Select your primary sport to unlock sport-specific workouts and programs.</p>

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
          <select id="ob-position">
            <option value="">Select position…</option>
          </select>
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
          <input type="text" id="ob-coach-team" placeholder="e.g. Westside Elite 17U">
        </div>
        <div class="ob2-field">
          <label>Primary Sport You Coach</label>
          <div class="ob2-sport-grid" id="ob2-coach-sport-grid">
            ${SPORTS.map(s => `
            <button class="ob2-sport-card" data-sport="${s.id}" data-coach="true">
              <span class="ob2-sport-emoji">${s.emoji}</span>
              <span class="ob2-sport-label">${s.label}</span>
            </button>`).join('')}
          </div>
        </div>
      </div>

      <div class="ob2-nav">
        <button class="ob2-btn-back" id="ob2-back2">← Back</button>
        <button class="ob2-btn-next" id="ob2-next2">Next <span>→</span></button>
      </div>
    </div>

    <!-- ── STEP 3: PROFILE / BODY METRICS ────────────────────── -->
    <div class="ob2-panel" id="ob2-s3">
      <h2>Your Profile</h2>
      <p class="ob2-sub">This data is used to calculate your accurate PIQ score and personalize your nutrition targets.</p>
      <div class="ob2-metrics-grid">
        <div class="ob2-field">
          <label>Age</label>
          <input type="number" id="ob-age" placeholder="e.g. 17" min="10" max="50">
        </div>
        <div class="ob2-field">
          <label>Weight</label>
          <div class="ob2-unit-row">
            <input type="number" id="ob-weight" placeholder="e.g. 175" min="50" max="400">
            <select id="ob-weight-unit" class="ob2-unit-sel">
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>
        <div class="ob2-field">
          <label>Height</label>
          <input type="text" id="ob-height" placeholder='e.g. 6&apos;2" or 188cm'>
        </div>
        <div class="ob2-field">
          <label>Graduation Year <span class="ob2-opt">(optional)</span></label>
          <input type="number" id="ob-gradyear" placeholder="e.g. 2026" min="2024" max="2032">
        </div>
      </div>
      <div class="ob2-field">
        <label>Sleep (avg hours/night)</label>
        <div class="ob2-slider-wrap">
          <input type="range" id="ob-sleep" min="4" max="12" step=".5" value="8" class="ob2-slider">
          <span class="ob2-slider-val" id="ob-sleep-val">8 hrs</span>
        </div>
        <div class="ob2-sleep-note" id="ob2-sleep-note">
          ✅ Optimal recovery range (7–9 hrs recommended by NSCA)
        </div>
      </div>
      <div class="ob2-field">
        <label>Any current injuries? <span class="ob2-opt">(optional)</span></label>
        <input type="text" id="ob-injuries" placeholder="e.g. left knee, right shoulder — or leave blank">
      </div>
      <div class="ob2-nav">
        <button class="ob2-btn-back" id="ob2-back3">← Back</button>
        <button class="ob2-btn-next" id="ob2-next3">Next <span>→</span></button>
      </div>
    </div>

    <!-- ── STEP 4: TRAINING PHASE ─────────────────────────────── -->
    <div class="ob2-panel" id="ob2-s4">
      <h2>Your Training Phase</h2>
      <p class="ob2-sub">This determines which program block you start in and how your workouts are periodized.</p>
      <div class="ob2-phase-grid" id="ob2-phase-grid">
        <button class="ob2-phase-card sel" data-phase="off_season">
          <span class="ob2-phase-icon">🏗️</span>
          <span class="ob2-phase-label">Off-Season</span>
          <span class="ob2-phase-desc">Build your foundation. Strength, power, and pliability development.</span>
        </button>
        <button class="ob2-phase-card" data-phase="pre_season">
          <span class="ob2-phase-icon">🔥</span>
          <span class="ob2-phase-label">Pre-Season</span>
          <span class="ob2-phase-desc">Sharpen your tools. Convert strength into sport-specific performance.</span>
        </button>
        <button class="ob2-phase-card" data-phase="in_season">
          <span class="ob2-phase-icon">🏆</span>
          <span class="ob2-phase-label">In-Season</span>
          <span class="ob2-phase-desc">Maintain and protect. Minimum effective dose during competition.</span>
        </button>
      </div>
      <div class="ob2-field" style="margin-top:16px">
        <label>Training Days Per Week</label>
        <div class="ob2-days-grid" id="ob2-days-grid">
          ${[2,3,4,5,6].map(d => `<button class="ob2-day-btn${d===4?' sel':''}" data-days="${d}">${d} days</button>`).join('')}
        </div>
      </div>
      <div class="ob2-field">
        <label>Training Level</label>
        <select id="ob-training-level">
          <option value="beginner">Beginner — New to structured training</option>
          <option value="intermediate" selected>Intermediate — 1–3 years of consistent training</option>
          <option value="advanced">Advanced — 3+ years, competitive athlete</option>
          <option value="elite">Elite — Collegiate / Professional level</option>
        </select>
      </div>
      <div class="ob2-nav">
        <button class="ob2-btn-back" id="ob2-back4">← Back</button>
        <button class="ob2-btn-next" id="ob2-next4">Next <span>→</span></button>
      </div>
    </div>

    <!-- ── STEP 5: GOALS ──────────────────────────────────────── -->
    <div class="ob2-panel" id="ob2-s5">
      <h2>Your Goals</h2>
      <p class="ob2-sub">Select all that apply. These shape your PIQ score priorities and workout recommendations.</p>
      <div class="ob2-goals-grid" id="ob2-goals-grid">
        ${GOALS.map(g => `
        <button class="ob2-goal-card" data-g="${g.id}">
          <span class="ob2-goal-emoji">${g.emoji}</span>
          <span class="ob2-goal-label">${g.label}</span>
        </button>`).join('')}
      </div>
      <div class="ob2-piq-preview" id="ob2-piq-preview">
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
          <div class="ob2-piq-sub" id="ob2-piq-sub-text">Complete your profile to unlock your full score</div>
        </div>
      </div>
      <div class="ob2-nav" style="margin-top:20px">
        <button class="ob2-btn-back" id="ob2-back5">← Back</button>
        <button class="ob2-btn-finish" id="ob2-finish">
          <span>Launch My Dashboard</span>
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
  if (!document.getElementById('ob2-s1')) return;

  // State
  let selectedRole  = 'player';
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
    });
  });

  // ── Sport card selection (athlete) ───────────────────────────
  document.querySelectorAll('#ob2-sport-grid .ob2-sport-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#ob2-sport-grid .ob2-sport-card').forEach(c => c.classList.remove('sel'));
      card.classList.add('sel');
      selectedSport = card.dataset.sport;
      // Update position dropdown
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

  // ── Days per week buttons ────────────────────────────────────
  document.querySelectorAll('.ob2-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ob2-day-btn').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      daysPerWeek = parseInt(btn.dataset.days);
    });
  });

  // ── Sleep slider ─────────────────────────────────────────────
  const sleepSlider = document.getElementById('ob-sleep');
  const sleepVal    = document.getElementById('ob-sleep-val');
  const sleepNote   = document.getElementById('ob2-sleep-note');
  sleepSlider?.addEventListener('input', () => {
    const h = parseFloat(sleepSlider.value);
    if (sleepVal) sleepVal.textContent = h + ' hrs';
    if (sleepNote) {
      if (h >= 7 && h <= 9) {
        sleepNote.textContent = '✅ Optimal recovery range (7–9 hrs recommended by NSCA)';
        sleepNote.style.color = 'var(--piq-green)';
      } else if (h < 7) {
        sleepNote.textContent = '⚠️ Below optimal — sleep deprivation reduces performance and recovery';
        sleepNote.style.color = '#f59e0b';
      } else {
        sleepNote.textContent = '💤 Excellent — extended sleep accelerates recovery and adaptation';
        sleepNote.style.color = 'var(--piq-green)';
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

  // ── PIQ preview calculation ──────────────────────────────────
  function updatePiqPreview() {
    const arc      = document.getElementById('ob2-piq-arc');
    const scoreEl  = document.getElementById('ob2-piq-score');
    const subText  = document.getElementById('ob2-piq-sub-text');
    if (!arc || !scoreEl) return;
    const name   = document.getElementById('ob-name')?.value.trim();
    const age    = document.getElementById('ob-age')?.value;
    const weight = document.getElementById('ob-weight')?.value;
    const height = document.getElementById('ob-height')?.value;
    let pct = 20;
    if (name)          pct += 10;
    if (selectedSport) pct += 15;
    if (selectedRole)  pct += 10;
    if (age)           pct += 10;
    if (weight)        pct += 10;
    if (height)        pct += 10;
    if (goals.length)  pct += Math.min(goals.length * 5, 15);
    pct = Math.min(pct, 100);
    const piqEstimate = Math.round(pct * 0.55);
    scoreEl.textContent = piqEstimate;
    if (subText) {
      if (pct >= 80) subText.textContent = 'Strong profile — your PIQ will be highly accurate';
      else if (pct >= 50) subText.textContent = 'Good start — add more data to improve accuracy';
      else subText.textContent = 'Complete your profile to unlock your full score';
    }
    const circumference = 201;
    arc.style.strokeDashoffset = circumference - (circumference * pct / 100);
  }

  // ── Navigation helpers ───────────────────────────────────────
  function goTo(step) {
    document.querySelectorAll('.ob2-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('ob2-s' + step)?.classList.add('active');
    document.querySelectorAll('.ob2-step').forEach(s => {
      const n = parseInt(s.dataset.s);
      s.classList.toggle('active', n === step);
      s.classList.toggle('done',   n < step);
    });
    const pct = (step / 5) * 100;
    const prog = document.getElementById('ob2-prog');
    if (prog) prog.style.width = pct + '%';
    document.getElementById('ob2-card')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showStep2() {
    const isCoach = selectedRole === 'coach';
    const sportSec = document.getElementById('ob2-sport-section');
    const coachSec = document.getElementById('ob2-coach-section');
    if (sportSec) sportSec.style.display = isCoach ? 'none' : 'block';
    if (coachSec) coachSec.style.display = isCoach ? 'block' : 'none';
    const title = document.getElementById('ob2-s2-title');
    const sub   = document.getElementById('ob2-s2-sub');
    if (isCoach) {
      if (title) title.textContent = 'Your Team';
      if (sub)   sub.textContent   = 'Tell us about your team and the sport you coach.';
    } else {
      if (title) title.textContent = 'Your Sport';
      if (sub)   sub.textContent   = 'Select your primary sport to unlock sport-specific workouts and programs.';
    }
    goTo(2);
  }

  // ── Step navigation ──────────────────────────────────────────
  document.getElementById('ob2-next1')?.addEventListener('click', () => showStep2());
  document.getElementById('ob2-back2')?.addEventListener('click', () => goTo(1));
  document.getElementById('ob2-next2')?.addEventListener('click', () => goTo(3));
  document.getElementById('ob2-back3')?.addEventListener('click', () => goTo(2));
  document.getElementById('ob2-next3')?.addEventListener('click', () => goTo(4));
  document.getElementById('ob2-back4')?.addEventListener('click', () => goTo(3));
  document.getElementById('ob2-next4')?.addEventListener('click', () => { updatePiqPreview(); goTo(5); });
  document.getElementById('ob2-back5')?.addEventListener('click', () => goTo(4));

  // ── Finish ───────────────────────────────────────────────────
  document.getElementById('ob2-finish')?.addEventListener('click', () => {
    const role         = selectedRole;
    const sport        = selectedSport || coachSport || 'basketball';
    const team         = document.getElementById('ob-team')?.value
                      || document.getElementById('ob-coach-team')?.value || '';
    const level        = document.getElementById('ob-level')?.value || 'high_school';
    const position     = document.getElementById('ob-position')?.value || '';
    const age          = parseInt(document.getElementById('ob-age')?.value) || null;
    const weight       = parseFloat(document.getElementById('ob-weight')?.value) || null;
    const weightUnit   = document.getElementById('ob-weight-unit')?.value || 'lbs';
    const height       = document.getElementById('ob-height')?.value || '';
    const gradYear     = parseInt(document.getElementById('ob-gradyear')?.value) || null;
    const sleep        = parseFloat(document.getElementById('ob-sleep')?.value) || 8;
    const injuries     = document.getElementById('ob-injuries')?.value || '';
    const trainingLevel= document.getElementById('ob-training-level')?.value || 'intermediate';
    const nameVal      = document.getElementById('ob-name')?.value.trim() || '';

    const finishBtn = document.getElementById('ob2-finish');
    if (finishBtn) {
      finishBtn.innerHTML = '<span>Building your dashboard…</span><span class="ob2-finish-arrow">⚙️</span>';
      finishBtn.disabled = true;
    }

    setRole(role);
    markOnboardingDone({ sport, team, goals, role });
    patchProfile({
      sport, team, goals, level, position, age, weight, weightUnit,
      height, gradYear, sleepHours: sleep, injuries, trainingLevel,
      compPhase: selectedPhase, daysPerWeek,
      ...(nameVal ? { name: nameVal } : {}),
    });

    setTimeout(() => navigate(ROLE_HOME[role] || ROUTES.PICK_ROLE), 600);
  });
}
