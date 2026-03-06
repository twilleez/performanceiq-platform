/* ================================================================
   onboarding.js — PerformanceIQ v8 Onboarding System
   Full multi-step onboarding aligned to wireframes
   ================================================================ */

(function() {
  'use strict';

  // ─── DATA ───────────────────────────────────────────────────────
  const SPORTS = [
    { id: 'basketball', icon: '🏀', label: 'Basketball' },
    { id: 'football',   icon: '🏈', label: 'Football' },
    { id: 'soccer',     icon: '⚽', label: 'Soccer' },
    { id: 'baseball',   icon: '⚾', label: 'Baseball' },
    { id: 'volleyball', icon: '🏐', label: 'Volleyball' },
    { id: 'track',      icon: '🏃', label: 'Track & Field' },
    { id: 'swimming',   icon: '🏊', label: 'Swimming' },
    { id: 'wrestling',  icon: '🤼', label: 'Wrestling' },
    { id: 'lacrosse',   icon: '🥍', label: 'Lacrosse' },
    { id: 'tennis',     icon: '🎾', label: 'Tennis' },
    { id: 'hockey',     icon: '🏒', label: 'Hockey' },
    { id: 'golf',       icon: '⛳', label: 'Golf' },
    { id: 'softball',   icon: '🥎', label: 'Softball' },
    { id: 'crossfit',   icon: '🏋️', label: 'CrossFit' },
    { id: 'mma',        icon: '🥊', label: 'MMA / Boxing' },
    { id: 'rowing',     icon: '🚣', label: 'Rowing' },
  ];

  const POSITIONS = {
    basketball: [
      { id: 'pg', label: 'Point Guard', abbrev: 'PG', desc: 'Primary ball handler and playmaker' },
      { id: 'sg', label: 'Shooting Guard', abbrev: 'SG', desc: 'Scoring and perimeter defense' },
      { id: 'sf', label: 'Small Forward', abbrev: 'SF', desc: 'Versatile wing; score and defend' },
      { id: 'pf', label: 'Power Forward', abbrev: 'PF', desc: 'Interior play, rebounding, physicality' },
      { id: 'c', label: 'Center', abbrev: 'C', desc: 'Paint presence and rim protection' },
      { id: 'utility', label: 'Multiple / Utility', abbrev: 'UTIL', desc: 'Plays multiple positions' },
    ],
    football: [
      { id: 'qb', label: 'Quarterback', abbrev: 'QB', desc: 'Field general and decision-maker' },
      { id: 'rb', label: 'Running Back', abbrev: 'RB', desc: 'Burst, cuts, and contact balance' },
      { id: 'wr', label: 'Wide Receiver', abbrev: 'WR', desc: 'Routes, speed, and hands' },
      { id: 'te', label: 'Tight End', abbrev: 'TE', desc: 'Hybrid blocker and receiver' },
      { id: 'ol', label: 'Offensive Line', abbrev: 'OL', desc: 'Strength, leverage, and footwork' },
      { id: 'dl', label: 'Defensive Line', abbrev: 'DL', desc: 'Power, get-off, and pursuit' },
      { id: 'lb', label: 'Linebacker', abbrev: 'LB', desc: 'Range, tackling, and reads' },
      { id: 'db', label: 'Defensive Back', abbrev: 'DB', desc: 'Coverage, speed, and COD' },
      { id: 'k', label: 'Kicker / Punter', abbrev: 'K', desc: 'Specialist' },
    ],
    soccer: [
      { id: 'gk', label: 'Goalkeeper', abbrev: 'GK', desc: 'Reactions, diving, and command' },
      { id: 'cb', label: 'Center Back', abbrev: 'CB', desc: 'Defending and aerial play' },
      { id: 'fb', label: 'Fullback', abbrev: 'FB', desc: 'Wide defending and overlap runs' },
      { id: 'cdm', label: 'Defensive Mid', abbrev: 'CDM', desc: 'Shielding and ball circulation' },
      { id: 'cm', label: 'Central Mid', abbrev: 'CM', desc: 'Engine and link play' },
      { id: 'cam', label: 'Attacking Mid', abbrev: 'CAM', desc: 'Creativity and final third play' },
      { id: 'w', label: 'Winger', abbrev: 'W', desc: 'Speed and 1v1 ability' },
      { id: 'st', label: 'Striker', abbrev: 'ST', desc: 'Finishing and movement' },
    ],
    baseball: [
      { id: 'p', label: 'Pitcher', abbrev: 'P', desc: 'Velocity, control, and durability' },
      { id: 'c', label: 'Catcher', abbrev: 'C', desc: 'Receiving, throwing, and leadership' },
      { id: '1b', label: 'First Base', abbrev: '1B', desc: 'Range and footwork' },
      { id: '2b', label: 'Second Base', abbrev: '2B', desc: 'Quickness and transfers' },
      { id: 'ss', label: 'Shortstop', abbrev: 'SS', desc: 'Agility and arm strength' },
      { id: '3b', label: 'Third Base', abbrev: '3B', desc: 'Reaction time and arm strength' },
      { id: 'of', label: 'Outfield', abbrev: 'OF', desc: 'Speed and tracking ability' },
      { id: 'dh', label: 'Designated Hitter', abbrev: 'DH', desc: 'Offensive production' },
    ],
    softball: [
      { id: 'p', label: 'Pitcher', abbrev: 'P', desc: 'Power and repeatability' },
      { id: 'c', label: 'Catcher', abbrev: 'C', desc: 'Receiving and control' },
      { id: 'if', label: 'Infield', abbrev: 'IF', desc: 'Quickness and reaction' },
      { id: 'of', label: 'Outfield', abbrev: 'OF', desc: 'Range and speed' },
      { id: 'utility', label: 'Utility', abbrev: 'UTIL', desc: 'Multiple position value' },
    ],
    volleyball: [
      { id: 'setter', label: 'Setter', abbrev: 'S', desc: 'Decision-making and consistency' },
      { id: 'outside', label: 'Outside Hitter', abbrev: 'OH', desc: 'Jumping and attacking volume' },
      { id: 'middle', label: 'Middle Blocker', abbrev: 'MB', desc: 'Explosiveness and timing' },
      { id: 'opposite', label: 'Opposite', abbrev: 'OPP', desc: 'Power and blocking' },
      { id: 'libero', label: 'Libero', abbrev: 'L', desc: 'Quickness and defense' },
    ],
    lacrosse: [
      { id: 'attack', label: 'Attack', abbrev: 'A', desc: 'Acceleration and finishing' },
      { id: 'midfield', label: 'Midfield', abbrev: 'M', desc: 'Endurance and two-way play' },
      { id: 'defense', label: 'Defense', abbrev: 'D', desc: 'Strength and lateral speed' },
      { id: 'goalie', label: 'Goalie', abbrev: 'G', desc: 'Reactions and mobility' },
    ],
    hockey: [
      { id: 'c', label: 'Center', abbrev: 'C', desc: 'Two-way responsibility' },
      { id: 'lw', label: 'Left Wing', abbrev: 'LW', desc: 'Speed and forecheck' },
      { id: 'rw', label: 'Right Wing', abbrev: 'RW', desc: 'Scoring and transition' },
      { id: 'd', label: 'Defense', abbrev: 'D', desc: 'Gap control and power' },
      { id: 'g', label: 'Goalie', abbrev: 'G', desc: 'Reflexes and mobility' },
    ],
    track: [],
    swimming: [],
    wrestling: [],
    tennis: [],
    golf: [],
    crossfit: [],
    mma: [],
    rowing: [],
  };

  const EQUIPMENT = [
    { id: 'bodyweight', icon: '🏃', label: 'Bodyweight', default: true },
    { id: 'dumbbells', icon: '🏋️', label: 'Dumbbells' },
    { id: 'barbell', icon: '🏋️', label: 'Barbell' },
    { id: 'bands', icon: '🔗', label: 'Bands' },
    { id: 'machines', icon: '⚙️', label: 'Machines' },
    { id: 'field', icon: '🏟️', label: 'Field / Court' },
    { id: 'pullup_bar', icon: '📊', label: 'Pull-up Bar' },
    { id: 'kettlebells', icon: '🔔', label: 'Kettlebells' },
  ];

  const EQUIP_PRESETS = {
    minimal: { label: 'Minimal', tags: ['bodyweight', 'bands'] },
    home: { label: 'Home Gym', tags: ['bodyweight', 'dumbbells', 'bands', 'pullup_bar'] },
    full: { label: 'Full Gym', tags: ['bodyweight', 'dumbbells', 'barbell', 'bands', 'machines', 'pullup_bar', 'kettlebells'] },
  };

  const EXPERIENCE_LEVELS = [
    { id: 'beginner', label: 'Beginner', desc: 'New to structured training or returning after a long break' },
    { id: 'intermediate', label: 'Intermediate', desc: 'Consistent training experience and basic exercise knowledge' },
    { id: 'advanced', label: 'Advanced', desc: 'High training age and comfortable with hard volume' },
  ];

  const GOALS = [
    { id: 'strength', icon: '💪', label: 'Strength', desc: 'Lift heavier and improve force output' },
    { id: 'speed', icon: '⚡', label: 'Speed', desc: 'Sprint faster and cut quicker' },
    { id: 'endurance', icon: '🫀', label: 'Endurance', desc: 'Sustain output and recover faster' },
    { id: 'muscle_gain', icon: '📈', label: 'Muscle Gain', desc: 'Build lean size and durability' },
    { id: 'athleticism', icon: '🏆', label: 'Overall Athleticism', desc: 'Balanced strength, speed, and conditioning' },
  ];

  const FREQ_DESC = {
    2: '2 days — minimum effective dose',
    3: '3 days — steady progress',
    4: '4 days — balanced strength + conditioning',
    5: '5 days — high performance build',
    6: '6 days — elite volume (advanced)',
  };

  const DIETARY_RESTRICTIONS = [
    { id: 'dairy_free', label: 'No Dairy' },
    { id: 'gluten_free', label: 'No Gluten' },
    { id: 'nut_free', label: 'Nut Allergy' },
    { id: 'halal', label: 'Halal' },
    { id: 'kosher', label: 'Kosher' },
  ];

  const MEAL_PREFS = [
    { id: 'high_protein', label: 'High Protein' },
    { id: 'budget_friendly', label: 'Budget Friendly' },
    { id: 'simple_meals', label: 'Simple Meals' },
    { id: 'low_sugar', label: 'Low Sugar' },
    { id: 'bulk', label: 'Athlete Bulk' },
  ];

  const SCREENS = [
    'welcome',
    'athleteType',
    'sport',
    'position',
    'frequency',
    'equipment',
    'experience',
    'goals',
    'mealPlan',
    'account',
    'preview',
  ];

  let currentScreen = 'welcome';
  let flow = null;

  // ─── HELPERS ─────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function getState() {
    try {
      return window.dataStore?.getState?.() || window.dataStore?.state || JSON.parse(localStorage.getItem('piq_state') || '{}');
    } catch {
      return {};
    }
  }

  function setState(nextState) {
    if (window.dataStore?.setState) {
      window.dataStore.setState(nextState);
    } else {
      localStorage.setItem('piq_state', JSON.stringify(nextState));
    }
    return nextState;
  }

  function persistProfile(profileUpdates) {
    const state = getState();
    state.profile = { ...state.profile, ...profileUpdates };
    setState(state);
    return state.profile;
  }

  function persistOnboarding(obUpdates) {
    const state = getState();
    state.onboarding = { ...state.onboarding, ...obUpdates };
    setState(state);
    return state.onboarding;
  }

  function buildFlow() {
    const sport = flow?.sport || getState().profile?.sport || 'basketball';
    const hasPositions = Array.isArray(POSITIONS[sport]) && POSITIONS[sport].length > 0;
    return SCREENS.filter(step => hasPositions || step !== 'position');
  }

  function getStepIndex() {
    return flow.indexOf(currentScreen);
  }

  function getProgress() {
    const idx = getStepIndex();
    return Math.round(((idx + 1) / flow.length) * 100);
  }

  function updateProgress() {
    const bar = $('obProgressBar');
    const text = $('obStepText');
    if (bar) bar.style.width = `${getProgress()}%`;
    if (text) text.textContent = `Step ${getStepIndex() + 1} of ${flow.length}`;
  }

  function getDraft() {
    const profile = getState().profile || {};
    return {
      athleteMode: profile.team_mode || 'solo',
      teamCode: profile.team_code || '',
      sport: profile.sport || null,
      position: profile.position || null,
      frequency: profile.frequency || null,
      equipment: Array.isArray(profile.equipment) && profile.equipment.length ? [...profile.equipment] : ['bodyweight'],
      experience: profile.experience || profile.level || null,
      goal: profile.goal || null,
      mealPlanEnabled: !!profile.meal_plan_enabled,
      dietary: [...(profile.dietary_restrictions || [])],
      preferences: [...(profile.meal_preferences || [])],
      email: profile.email || '',
      accountCreated: !!profile.account_created,
    };
  }

  let draft = getDraft();

  function ensureDefaultEquipment() {
    if (!Array.isArray(draft.equipment) || draft.equipment.length === 0) draft.equipment = ['bodyweight'];
  }

  function titleCaseGoal(goalId) {
    const found = GOALS.find(g => g.id === goalId);
    return found?.label || 'Overall Athleticism';
  }

  function getSessionLabel(goalId, idx) {
    const maps = {
      strength: ['Lower Body Strength', 'Upper Body Strength', 'Power + Posterior Chain', 'Strength Accessories', 'Mobility + Recovery', 'Conditioning'],
      speed: ['Acceleration', 'Change of Direction', 'Lower Body Power', 'Upper Body Strength', 'Tempo Conditioning', 'Mobility + Core'],
      endurance: ['Aerobic Capacity', 'Strength Support', 'Tempo Intervals', 'Recovery + Mobility', 'Mixed Conditioning', 'Core + Durability'],
      muscle_gain: ['Lower Hypertrophy', 'Upper Hypertrophy', 'Posterior Chain', 'Shoulders + Arms', 'Conditioning Support', 'Mobility + Core'],
      athleticism: ['Lower Body Strength', 'Speed + COD', 'Upper Body Strength', 'Jump / Power', 'Conditioning', 'Mobility + Core'],
    };
    const arr = maps[goalId] || maps.athleticism;
    return arr[idx] || arr[arr.length - 1];
  }

  function buildPreviewPlan() {
    const freq = Number(draft.frequency || 3);
    const goal = draft.goal || 'athleticism';
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, session: null }));
    const slotPattern = freq >= 5 ? [0,1,2,3,4,5] : freq === 4 ? [0,1,3,5] : freq === 3 ? [0,2,4] : [1,4];

    for (let i = 0; i < Math.min(freq, slotPattern.length); i++) {
      const idx = slotPattern[i];
      days[idx].session = {
        name: getSessionLabel(goal, i),
        duration: goal === 'endurance' ? 40 : 45 + (i % 2) * 10,
      };
    }

    return {
      goalFocus: titleCaseGoal(goal),
      days,
    };
  }

  function savePreviewPlanToState() {
    const state = getState();
    state.ui = state.ui || {};
    state.ui.program_preview = buildPreviewPlan();
    setState(state);
  }

  function updateContinueState() {
    const continueBtn = $('obContinueBtn');
    const backBtn = $('obBackBtn');
    if (!continueBtn || !backBtn) return;

    backBtn.hidden = getStepIndex() === 0;

    let enabled = true;
    let label = 'Continue';

    switch (currentScreen) {
      case 'welcome':
        label = 'Begin';
        break;
      case 'athleteType':
        enabled = !!draft.athleteMode && (draft.athleteMode !== 'team' || String(draft.teamCode || '').trim().length >= 4);
        break;
      case 'sport':
        enabled = !!draft.sport;
        break;
      case 'position':
        enabled = !!draft.position;
        break;
      case 'frequency':
        enabled = !!draft.frequency;
        break;
      case 'equipment':
        enabled = Array.isArray(draft.equipment) && draft.equipment.length > 0;
        break;
      case 'experience':
        enabled = !!draft.experience;
        break;
      case 'goals':
        enabled = !!draft.goal;
        break;
      case 'mealPlan':
        enabled = true;
        break;
      case 'account':
        label = draft.accountCreated || draft.email ? 'Continue' : 'Skip for now';
        enabled = true;
        break;
      case 'preview':
        label = 'Start Training';
        enabled = true;
        break;
      default:
        enabled = true;
    }

    continueBtn.disabled = !enabled;
    continueBtn.textContent = label;
  }

  function syncDraftToState() {
    ensureDefaultEquipment();
    persistProfile({
      role: 'athlete',
      team_mode: draft.athleteMode || 'solo',
      team_code: String(draft.teamCode || '').trim(),
      sport: draft.sport,
      position: draft.position,
      frequency: draft.frequency,
      equipment: draft.equipment,
      experience: draft.experience,
      level: draft.experience || 'intermediate',
      goal: draft.goal,
      meal_plan_enabled: !!draft.mealPlanEnabled,
      dietary_restrictions: draft.mealPlanEnabled ? draft.dietary : [],
      meal_preferences: draft.mealPlanEnabled ? draft.preferences : [],
      email: draft.email || '',
      account_created: !!(draft.accountCreated || draft.email),
    });

    persistOnboarding({
      current_step: currentScreen,
      progressive: {
        equipment_captured: Array.isArray(draft.equipment) && draft.equipment.length > 0,
        experience_captured: !!draft.experience,
        goal_captured: !!draft.goal,
        frequency_captured: !!draft.frequency,
      },
    });
  }

  // ─── RENDERERS ───────────────────────────────────────────────────
  function renderWelcome() {
    $('welcomeScreen').innerHTML = `
      <div class="ob-logo">
        <div class="ob-logo-dot" aria-hidden="true"></div>
        <div class="ob-logo-text">PerformanceIQ</div>
      </div>
      <h1 class="ob-headline">Your personalized athletic training starts here.</h1>
      <p class="ob-subtext">Built for your sport, schedule, and goals.</p>
    `;
  }

  function renderAthleteType() {
    const screen = $('athleteTypeScreen');
    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">How are you joining?</h2>
        <p class="ob-subtitle">Choose team training or solo development.</p>
      </div>
      <div class="ob-two-col">
        <button type="button" class="ob-feature-card ${draft.athleteMode === 'team' ? 'selected' : ''}" data-mode="team">
          <span class="ob-feature-icon">👥</span>
          <strong>Joining a Team</strong>
          <span>Enter a team code or link from your coach</span>
        </button>
        <button type="button" class="ob-feature-card ${draft.athleteMode === 'solo' ? 'selected' : ''}" data-mode="solo">
          <span class="ob-feature-icon">🎯</span>
          <strong>Training Solo</strong>
          <span>Build your own plan and track progress</span>
        </button>
      </div>
      <div class="ob-team-input ${draft.athleteMode === 'team' ? 'visible' : ''}" id="teamCodeWrap">
        <input id="obTeamCode" class="ob-input" type="text" placeholder="Enter team code or link" value="${esc(draft.teamCode)}" />
      </div>
    `;

    screen.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        draft.athleteMode = btn.dataset.mode;
        if (draft.athleteMode !== 'team') draft.teamCode = '';
        renderAthleteType();
        syncDraftToState();
        updateContinueState();
      });
    });

    const input = $('obTeamCode');
    if (input) {
      input.addEventListener('input', e => {
        draft.teamCode = e.target.value;
        syncDraftToState();
        updateContinueState();
      });
    }
  }

  function renderSport() {
    const screen = $('sportScreen');
    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">What sport do you play?</h2>
        <p class="ob-subtitle">Search or select your sport.</p>
      </div>
      <div class="ob-search">
        <span class="ob-search-icon">⌕</span>
        <input id="obSportSearch" class="ob-search-input" type="search" placeholder="Search sports" />
      </div>
      <div class="ob-popular-row" id="obPopularSports"></div>
      <div class="ob-sport-grid" id="obSportGrid"></div>
    `;

    const popular = SPORTS.slice(0, 4);
    $('obPopularSports').innerHTML = popular.map(s => `
      <button type="button" class="ob-chip ${draft.sport === s.id ? 'selected' : ''}" data-sport-chip="${s.id}">${s.icon} ${s.label}</button>
    `).join('');

    function drawGrid(filter = '') {
      const list = SPORTS.filter(s => s.label.toLowerCase().includes(filter.toLowerCase()));
      $('obSportGrid').innerHTML = list.map(s => `
        <button type="button" class="ob-sport-card ${draft.sport === s.id ? 'selected' : ''}" data-sport="${s.id}">
          <span class="ob-sport-icon">${s.icon}</span>
          <span class="ob-sport-label">${s.label}</span>
        </button>
      `).join('');

      screen.querySelectorAll('[data-sport]').forEach(card => {
        card.addEventListener('click', () => {
          draft.sport = card.dataset.sport;
          draft.position = null;
          flow = buildFlow();
          renderSport();
          syncDraftToState();
          updateProgress();
          updateContinueState();
        });
      });
    }

    screen.querySelectorAll('[data-sport-chip]').forEach(chip => {
      chip.addEventListener('click', () => {
        draft.sport = chip.dataset.sportChip;
        draft.position = null;
        flow = buildFlow();
        renderSport();
        syncDraftToState();
        updateProgress();
        updateContinueState();
      });
    });

    const search = $('obSportSearch');
    search?.addEventListener('input', e => drawGrid(e.target.value || ''));
    drawGrid('');
  }

  function renderPosition() {
    const screen = $('positionScreen');
    const positions = POSITIONS[draft.sport] || [];
    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">What’s your position?</h2>
        <p class="ob-subtitle">We use this to shape sport-specific training.</p>
      </div>
      <div class="ob-position-grid ob-position-grid-wide">
        ${positions.map(pos => `
          <button type="button" class="ob-position-card ${draft.position === pos.id ? 'selected' : ''}" data-position="${pos.id}">
            <div class="ob-position-abbrev">${pos.abbrev}</div>
            <div class="ob-position-label">${pos.label}</div>
            <div class="ob-position-desc">${pos.desc || ''}</div>
          </button>
        `).join('')}
      </div>
    `;

    screen.querySelectorAll('[data-position]').forEach(card => {
      card.addEventListener('click', () => {
        draft.position = card.dataset.position;
        renderPosition();
        syncDraftToState();
        updateContinueState();
      });
    });
  }

  function renderFrequency() {
    const screen = $('frequencyScreen');
    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">How many days per week can you train?</h2>
        <p class="ob-subtitle">Choose the schedule you can consistently maintain.</p>
      </div>
      <div class="ob-two-col ob-frequency-grid">
        ${Object.entries(FREQ_DESC).map(([n, desc]) => `
          <button type="button" class="ob-feature-card ${Number(draft.frequency) === Number(n) ? 'selected' : ''}" data-frequency="${n}">
            <strong>${n}</strong>
            <span>${desc}</span>
          </button>
        `).join('')}
      </div>
    `;

    screen.querySelectorAll('[data-frequency]').forEach(card => {
      card.addEventListener('click', () => {
        draft.frequency = Number(card.dataset.frequency);
        renderFrequency();
        syncDraftToState();
        updateContinueState();
      });
    });
  }

  function renderEquipment() {
    ensureDefaultEquipment();
    const screen = $('equipmentScreen');
    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">What equipment do you have access to?</h2>
        <p class="ob-subtitle">Select all that apply.</p>
      </div>
      <div class="ob-chip-row">
        ${Object.entries(EQUIP_PRESETS).map(([key, preset]) => `
          <button type="button" class="ob-chip" data-preset="${key}">${preset.label}</button>
        `).join('')}
      </div>
      <div class="ob-check-grid">
        ${EQUIPMENT.map(eq => `
          <button type="button" class="ob-check-card ${draft.equipment.includes(eq.id) ? 'selected' : ''}" data-equip="${eq.id}">
            <span class="ob-check-icon">${eq.icon}</span>
            <strong>${eq.label}</strong>
          </button>
        `).join('')}
      </div>
    `;

    screen.querySelectorAll('[data-equip]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.equip;
        const set = new Set(draft.equipment);
        if (set.has(id)) set.delete(id); else set.add(id);
        if (set.size === 0) set.add('bodyweight');
        draft.equipment = [...set];
        renderEquipment();
        syncDraftToState();
        updateContinueState();
      });
    });

    screen.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        draft.equipment = [...(EQUIP_PRESETS[btn.dataset.preset]?.tags || ['bodyweight'])];
        renderEquipment();
        syncDraftToState();
        updateContinueState();
      });
    });
  }

  function renderExperience() {
    const screen = $('experienceScreen');
    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">What’s your training experience?</h2>
        <p class="ob-subtitle">Choose the option that best matches your recent training background.</p>
      </div>
      <div class="ob-stack-grid">
        ${EXPERIENCE_LEVELS.map(level => `
          <button type="button" class="ob-select-row ${draft.experience === level.id ? 'selected' : ''}" data-experience="${level.id}">
            <strong>${level.label}</strong>
            <span>${level.desc}</span>
          </button>
        `).join('')}
      </div>
    `;

    screen.querySelectorAll('[data-experience]').forEach(card => {
      card.addEventListener('click', () => {
        draft.experience = card.dataset.experience;
        renderExperience();
        syncDraftToState();
        updateContinueState();
      });
    });
  }

  function renderGoals() {
    const screen = $('goalsScreen');
    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">What’s your primary goal?</h2>
        <p class="ob-subtitle">Your weekly plan will be built around this priority.</p>
      </div>
      <div class="ob-stack-grid">
        ${GOALS.map(goal => `
          <button type="button" class="ob-select-row ${draft.goal === goal.id ? 'selected' : ''}" data-goal="${goal.id}">
            <strong>${goal.icon} ${goal.label}</strong>
            <span>${goal.desc}</span>
          </button>
        `).join('')}
      </div>
    `;

    screen.querySelectorAll('[data-goal]').forEach(card => {
      card.addEventListener('click', () => {
        draft.goal = card.dataset.goal;
        renderGoals();
        syncDraftToState();
        updateContinueState();
      });
    });
  }

  function renderMealPlan() {
    const screen = $('mealPlanScreen');
    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">Add a performance meal plan?</h2>
        <p class="ob-subtitle">Optional nutrition guidance for your training goal.</p>
      </div>
      <button type="button" class="ob-toggle-card ${draft.mealPlanEnabled ? 'selected' : ''}" id="obMealToggle">
        <strong>${draft.mealPlanEnabled ? 'Meal plan: On' : 'Meal plan: Off'}</strong>
        <span>${draft.mealPlanEnabled ? 'Dietary preferences enabled below' : 'You can always add this later'}</span>
      </button>
      <div class="ob-conditional ${draft.mealPlanEnabled ? 'visible' : ''}" id="obMealFields">
        <div class="ob-field-label">Dietary restrictions</div>
        <div class="ob-chip-row">
          ${DIETARY_RESTRICTIONS.map(item => `
            <button type="button" class="ob-chip ${draft.dietary.includes(item.id) ? 'selected' : ''}" data-dietary="${item.id}">${item.label}</button>
          `).join('')}
        </div>
        <div class="ob-field-label">Preferences</div>
        <div class="ob-chip-row">
          ${MEAL_PREFS.map(item => `
            <button type="button" class="ob-chip ${draft.preferences.includes(item.id) ? 'selected' : ''}" data-pref="${item.id}">${item.label}</button>
          `).join('')}
        </div>
      </div>
    `;

    $('obMealToggle')?.addEventListener('click', () => {
      draft.mealPlanEnabled = !draft.mealPlanEnabled;
      if (!draft.mealPlanEnabled) {
        draft.dietary = [];
        draft.preferences = [];
      }
      renderMealPlan();
      syncDraftToState();
      updateContinueState();
    });

    screen.querySelectorAll('[data-dietary]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.dietary;
        const set = new Set(draft.dietary);
        if (set.has(id)) set.delete(id); else set.add(id);
        draft.dietary = [...set];
        renderMealPlan();
        syncDraftToState();
      });
    });

    screen.querySelectorAll('[data-pref]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.pref;
        const set = new Set(draft.preferences);
        if (set.has(id)) set.delete(id); else set.add(id);
        draft.preferences = [...set];
        renderMealPlan();
        syncDraftToState();
      });
    });
  }

  function renderAccount() {
    const screen = $('accountScreen');
    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">Create your account</h2>
        <p class="ob-subtitle">This saves your program and progress.</p>
      </div>
      <div class="ob-field">
        <label class="ob-field-label" for="obEmail">Email</label>
        <input id="obEmail" class="ob-input" type="email" placeholder="you@example.com" value="${esc(draft.email)}" />
      </div>
      <div class="ob-field">
        <label class="ob-field-label" for="obPassword">Password</label>
        <input id="obPassword" class="ob-input" type="password" placeholder="Create a password" />
      </div>
      <button type="button" class="ob-btn ob-btn-primary ob-inline-primary" id="obCreateAccount">Create Account</button>
      <div class="ob-social-row">
        <button type="button" class="ob-btn ob-btn-ghost" disabled aria-disabled="true">Google (coming soon)</button>
        <button type="button" class="ob-btn ob-btn-ghost" disabled aria-disabled="true">Apple (coming soon)</button>
      </div>
      <div class="ob-helper-text">Offline-first mode is active. Email is stored locally until cloud auth is connected.</div>
    `;

    $('obEmail')?.addEventListener('input', e => {
      draft.email = e.target.value;
      updateContinueState();
    });

    $('obCreateAccount')?.addEventListener('click', () => {
      const email = String($('obEmail')?.value || '').trim();
      draft.email = email;
      draft.accountCreated = !!email;
      syncDraftToState();
      updateContinueState();
      if (window.toast) window.toast(email ? 'Account saved locally.' : 'Enter an email to save locally.');
    });
  }

  function renderPreview() {
    savePreviewPlanToState();
    const preview = buildPreviewPlan();
    const screen = $('previewScreen');
    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">Your Weekly Training Plan</h2>
        <p class="ob-subtitle">Focus: ${preview.goalFocus}</p>
      </div>
      <div class="ob-day-scroll">
        ${preview.days.map(day => `
          <div class="ob-day-card ${day.session ? '' : 'rest'}">
            <div class="ob-day-name">${day.day}</div>
            <div class="ob-day-session">${day.session ? day.session.name : 'Rest / Recovery'}</div>
            <div class="ob-day-meta">${day.session ? `${day.session.duration} min` : 'Recovery'}</div>
          </div>
        `).join('')}
      </div>
      <div class="ob-summary-grid">
        <div class="ob-summary-card"><strong>${titleCaseGoal(draft.goal)}</strong><span>Primary goal</span></div>
        <div class="ob-summary-card"><strong>${draft.frequency || 0} days</strong><span>Weekly training</span></div>
        <div class="ob-summary-card"><strong>${draft.experience || '—'}</strong><span>Experience level</span></div>
      </div>
    `;
  }

  function renderCurrentScreen() {
    switch (currentScreen) {
      case 'welcome': renderWelcome(); break;
      case 'athleteType': renderAthleteType(); break;
      case 'sport': renderSport(); break;
      case 'position': renderPosition(); break;
      case 'frequency': renderFrequency(); break;
      case 'equipment': renderEquipment(); break;
      case 'experience': renderExperience(); break;
      case 'goals': renderGoals(); break;
      case 'mealPlan': renderMealPlan(); break;
      case 'account': renderAccount(); break;
      case 'preview': renderPreview(); break;
    }
  }

  function showScreen(screenId) {
    const currentEl = $(currentScreen + 'Screen');
    if (currentEl && currentEl !== $(screenId + 'Screen')) {
      currentEl.classList.remove('active');
      currentEl.classList.add('exit');
    }

    setTimeout(() => {
      currentScreen = screenId;
      persistOnboarding({ current_step: screenId });
      $$('.ob-screen').forEach(el => el.classList.remove('active', 'exit'));
      const newEl = $(screenId + 'Screen');
      if (newEl) newEl.classList.add('active');
      renderCurrentScreen();
      updateProgress();
      updateContinueState();
    }, currentEl && currentEl !== $(screenId + 'Screen') ? 120 : 0);
  }

  function completeOnboarding() {
    syncDraftToState();
    persistOnboarding({
      completed: true,
      current_step: 'dashboard',
    });

    const container = $('onboarding');
    if (container) {
      container.classList.add('exit');
      setTimeout(() => {
        container.classList.add('hidden');
        container.remove();
        if (window.initApp) window.initApp();
        if (window.showView) window.showView('home');
      }, 450);
    }
  }

  function handleContinue() {
    if (currentScreen === 'preview') {
      completeOnboarding();
      return;
    }

    syncDraftToState();

    const idx = getStepIndex();
    const next = flow[idx + 1];
    if (next) showScreen(next);
  }

  function handleBack() {
    const idx = getStepIndex();
    const prev = flow[idx - 1];
    if (prev) showScreen(prev);
  }

  function shouldShowOnboarding() {
    const state = getState();
    return !state.onboarding?.completed;
  }

  function injectOnboardingHTML() {
    if ($('onboarding')) return;

    const html = `
      <div id="onboarding" class="onboarding" role="dialog" aria-modal="true" aria-label="Onboarding">
        <div class="ob-progress"><div class="ob-progress-bar" id="obProgressBar" style="width:0%"></div></div>
        <div class="ob-step-text" id="obStepText">Step 1 of ${flow.length}</div>

        <div id="welcomeScreen" class="ob-screen ob-welcome active"></div>
        <div id="athleteTypeScreen" class="ob-screen"></div>
        <div id="sportScreen" class="ob-screen"></div>
        <div id="positionScreen" class="ob-screen"></div>
        <div id="frequencyScreen" class="ob-screen"></div>
        <div id="equipmentScreen" class="ob-screen"></div>
        <div id="experienceScreen" class="ob-screen"></div>
        <div id="goalsScreen" class="ob-screen"></div>
        <div id="mealPlanScreen" class="ob-screen"></div>
        <div id="accountScreen" class="ob-screen"></div>
        <div id="previewScreen" class="ob-screen"></div>

        <div class="ob-footer">
          <div class="ob-footer-inner ob-footer-split">
            <button type="button" class="ob-btn ob-btn-ghost" id="obBackBtn">Back</button>
            <button type="button" class="ob-btn ob-btn-primary" id="obContinueBtn">Continue</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', html);
  }

  function init() {
    if (!shouldShowOnboarding()) return false;

    draft = getDraft();
    flow = buildFlow();

    injectOnboardingHTML();
    renderCurrentScreen();
    updateProgress();
    updateContinueState();

    $('obContinueBtn')?.addEventListener('click', handleContinue);
    $('obBackBtn')?.addEventListener('click', handleBack);

    document.addEventListener('keydown', e => {
      if (!$('onboarding') || $('onboarding').classList.contains('hidden')) return;
      if (e.key === 'Enter' && !e.target.matches('input, textarea, select')) {
        if (!$('obContinueBtn')?.disabled) handleContinue();
      } else if (e.key === 'Escape' && getStepIndex() > 0) {
        handleBack();
      }
    });

    return true;
  }

  window.onboarding = {
    init,
    shouldShowOnboarding,
    completeOnboarding,
    SPORTS,
    POSITIONS,
    EQUIPMENT,
    EQUIP_PRESETS,
    EXPERIENCE_LEVELS,
    GOALS,
    FREQ_DESC,
    buildPreviewPlan,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
