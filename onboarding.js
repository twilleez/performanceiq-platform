/* ================================================================
   onboarding.js — PerformanceIQ v7 Onboarding System
   Progressive disclosure onboarding with state machine
   ================================================================ */

(function() {
  'use strict';

  // ─── SPORTS DATA ─────────────────────────────────────────────────
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

  // ─── POSITIONS BY SPORT ──────────────────────────────────────────
  const POSITIONS = {
    basketball: [
      { id: 'pg', label: 'Point Guard', abbrev: 'PG' },
      { id: 'sg', label: 'Shooting Guard', abbrev: 'SG' },
      { id: 'sf', label: 'Small Forward', abbrev: 'SF' },
      { id: 'pf', label: 'Power Forward', abbrev: 'PF' },
      { id: 'c', label: 'Center', abbrev: 'C' },
      { id: 'utility', label: 'Multiple / Utility', abbrev: 'UTIL' },
    ],
    football: [
      { id: 'qb', label: 'Quarterback', abbrev: 'QB' },
      { id: 'rb', label: 'Running Back', abbrev: 'RB' },
      { id: 'wr', label: 'Wide Receiver', abbrev: 'WR' },
      { id: 'te', label: 'Tight End', abbrev: 'TE' },
      { id: 'ol', label: 'Offensive Line', abbrev: 'OL' },
      { id: 'dl', label: 'Defensive Line', abbrev: 'DL' },
      { id: 'lb', label: 'Linebacker', abbrev: 'LB' },
      { id: 'db', label: 'Defensive Back', abbrev: 'DB' },
      { id: 'k', label: 'Kicker / Punter', abbrev: 'K' },
    ],
    soccer: [
      { id: 'gk', label: 'Goalkeeper', abbrev: 'GK' },
      { id: 'cb', label: 'Center Back', abbrev: 'CB' },
      { id: 'fb', label: 'Fullback', abbrev: 'FB' },
      { id: 'cdm', label: 'Defensive Mid', abbrev: 'CDM' },
      { id: 'cm', label: 'Central Mid', abbrev: 'CM' },
      { id: 'cam', label: 'Attacking Mid', abbrev: 'CAM' },
      { id: 'w', label: 'Winger', abbrev: 'W' },
      { id: 'st', label: 'Striker', abbrev: 'ST' },
    ],
    baseball: [
      { id: 'p', label: 'Pitcher', abbrev: 'P' },
      { id: 'c', label: 'Catcher', abbrev: 'C' },
      { id: '1b', label: 'First Base', abbrev: '1B' },
      { id: '2b', label: 'Second Base', abbrev: '2B' },
      { id: 'ss', label: 'Shortstop', abbrev: 'SS' },
      { id: '3b', label: 'Third Base', abbrev: '3B' },
      { id: 'of', label: 'Outfield', abbrev: 'OF' },
      { id: 'dh', label: 'Designated Hitter', abbrev: 'DH' },
    ],
    softball: [
      { id: 'p', label: 'Pitcher', abbrev: 'P' },
      { id: 'c', label: 'Catcher', abbrev: 'C' },
      { id: 'if', label: 'Infield', abbrev: 'IF' },
      { id: 'of', label: 'Outfield', abbrev: 'OF' },
      { id: 'utility', label: 'Utility', abbrev: 'UTIL' },
    ],
    volleyball: [
      { id: 'setter', label: 'Setter', abbrev: 'S' },
      { id: 'outside', label: 'Outside Hitter', abbrev: 'OH' },
      { id: 'middle', label: 'Middle Blocker', abbrev: 'MB' },
      { id: 'opposite', label: 'Opposite', abbrev: 'OPP' },
      { id: 'libero', label: 'Libero', abbrev: 'L' },
    ],
    lacrosse: [
      { id: 'attack', label: 'Attack', abbrev: 'A' },
      { id: 'midfield', label: 'Midfield', abbrev: 'M' },
      { id: 'defense', label: 'Defense', abbrev: 'D' },
      { id: 'goalie', label: 'Goalie', abbrev: 'G' },
    ],
    hockey: [
      { id: 'c', label: 'Center', abbrev: 'C' },
      { id: 'lw', label: 'Left Wing', abbrev: 'LW' },
      { id: 'rw', label: 'Right Wing', abbrev: 'RW' },
      { id: 'd', label: 'Defense', abbrev: 'D' },
      { id: 'g', label: 'Goalie', abbrev: 'G' },
    ],
    // Sports without positions
    track: [],
    swimming: [],
    wrestling: [],
    tennis: [],
    golf: [],
    crossfit: [],
    mma: [],
    rowing: [],
  };

  // ─── EQUIPMENT OPTIONS ───────────────────────────────────────────
  const EQUIPMENT = [
    { id: 'bodyweight', icon: '🏃', label: 'Bodyweight', default: true },
    { id: 'dumbbells', icon: '🏋️', label: 'Dumbbells' },
    { id: 'barbell', icon: '🏋️', label: 'Barbell + Plates' },
    { id: 'bands', icon: '🔗', label: 'Resistance Bands' },
    { id: 'machines', icon: '⚙️', label: 'Machines (gym)' },
    { id: 'field', icon: '🏟️', label: 'Field / Court' },
    { id: 'pullup_bar', icon: '📊', label: 'Pull-up Bar' },
    { id: 'kettlebells', icon: '🔔', label: 'Kettlebells' },
  ];

  const EQUIP_PRESETS = {
    minimal: { label: 'Minimal', tags: ['bodyweight', 'bands'] },
    home: { label: 'Home Gym', tags: ['bodyweight', 'dumbbells', 'bands', 'pullup_bar'] },
    full: { label: 'Full Gym', tags: ['bodyweight', 'dumbbells', 'barbell', 'bands', 'machines', 'pullup_bar', 'kettlebells'] },
  };

  // ─── EXPERIENCE LEVELS ───────────────────────────────────────────
  const EXPERIENCE_LEVELS = [
    { id: 'beginner', label: 'Beginner', desc: 'New to structured training or returning after 6+ months' },
    { id: 'intermediate', label: 'Intermediate', desc: '1–3 years of consistent strength & conditioning' },
    { id: 'advanced', label: 'Advanced', desc: '3+ years, familiar with periodization & programming' },
  ];

  // ─── GOALS ───────────────────────────────────────────────────────
  const GOALS = [
    { id: 'strength', icon: '💪', label: 'Strength', desc: 'Lift heavier, get stronger' },
    { id: 'speed', icon: '⚡', label: 'Speed', desc: 'Faster sprints, quicker cuts' },
    { id: 'endurance', icon: '🫀', label: 'Endurance', desc: 'Last longer, recover faster' },
    { id: 'muscle_gain', icon: '📈', label: 'Muscle Gain', desc: 'Build size and definition' },
    { id: 'athleticism', icon: '🏆', label: 'Overall Athleticism', desc: 'Balanced across all areas' },
  ];

  // ─── FREQUENCY DESCRIPTIONS ──────────────────────────────────────
  const FREQ_DESC = {
    2: 'Maintenance — ideal for in-season athletes',
    3: 'Foundation — builds strength with recovery',
    4: 'Balanced — strength + conditioning + rest',
    5: 'Intensive — serious off-season training',
    6: 'High volume — advanced athletes only',
  };

  // ─── STATE MACHINE ───────────────────────────────────────────────
  const SCREENS = ['welcome', 'role', 'sport', 'position', 'complete'];
  
  let currentScreen = 'welcome';
  let selectedRole = null;
  let selectedTeamMode = 'solo';
  let selectedTeamCode = '';
  let selectedSport = null;
  let selectedPosition = null;

  // ─── HELPERS ─────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  function getState() {
    try {
      return window.dataStore?.state || JSON.parse(localStorage.getItem('piq_state') || '{}');
    } catch {
      return {};
    }
  }

  function setState(updates) {
    const state = getState();
    Object.assign(state, updates);
    if (window.dataStore?.setState) {
      window.dataStore.setState(state);
    } else {
      localStorage.setItem('piq_state', JSON.stringify(state));
    }
    return state;
  }

  function persistProfile(profileUpdates) {
    const state = getState();
    state.profile = { ...state.profile, ...profileUpdates };
    setState(state);
    return state;
  }

  function persistOnboarding(obUpdates) {
    const state = getState();
    state.onboarding = { ...state.onboarding, ...obUpdates };
    setState(state);
    return state;
  }

  // ─── PROGRESS CALCULATION ────────────────────────────────────────
  function getProgress() {
    const idx = SCREENS.indexOf(currentScreen);
    return Math.round((idx / (SCREENS.length - 1)) * 100);
  }

  function updateProgress() {
    const bar = $('obProgressBar');
    if (bar) bar.style.width = `${getProgress()}%`;
  }

  // ─── SCREEN TRANSITIONS ──────────────────────────────────────────
  function showScreen(screenId) {
    // Exit current
    const currentEl = $(currentScreen + 'Screen');
    if (currentEl) {
      currentEl.classList.remove('active');
      currentEl.classList.add('exit');
    }

    // Enter new
    setTimeout(() => {
      currentScreen = screenId;
      $$('.ob-screen').forEach(el => {
        el.classList.remove('active', 'exit');
      });
      const newEl = $(screenId + 'Screen');
      if (newEl) {
        newEl.classList.add('active');
      }
      updateProgress();
    }, 150);
  }

  // ─── COMPLETE ONBOARDING ─────────────────────────────────────────
  function completeOnboarding() {
    // Persist all selections
    persistProfile({
      role: selectedRole,
      team_mode: selectedTeamMode,
      team_code: selectedTeamCode,
      sport: selectedSport,
      position: selectedPosition,
    });
    
    persistOnboarding({
      completed: true,
      current_step: 'dashboard',
    });

    // Animate out
    const container = $('onboarding');
    if (container) {
      container.classList.add('exit');
      setTimeout(() => {
        container.classList.add('hidden');
        container.remove();
        // Trigger app init if available
        if (window.initApp) window.initApp();
        if (window.showView) window.showView('home');
      }, 500);
    }
  }

  // ─── RENDER: WELCOME ─────────────────────────────────────────────
  function renderWelcome() {
    const screen = $('welcomeScreen');
    if (!screen) return;

    screen.innerHTML = `
      <div class="ob-logo">
        <div class="ob-logo-dot"></div>
        <span class="ob-logo-text">PerformanceIQ</span>
      </div>
      <h1 class="ob-headline">Your personalized athletic training starts here.</h1>
      <p class="ob-subtext">Built for your sport, schedule, and goals.</p>
    `;
  }

  // ─── RENDER: ROLE ────────────────────────────────────────────────
  function renderRole() {
    const screen = $('roleScreen');
    if (!screen) return;

    const roles = [
      { id: 'coach', icon: '🏋️', label: 'Coach', desc: 'Manage team & athletes' },
      { id: 'athlete', icon: '🏃', label: 'Athlete', desc: 'Track your training' },
      { id: 'parent', icon: '👨‍👩‍👧', label: 'Parent', desc: 'Follow your athlete' },
      { id: 'viewer', icon: '👁️', label: 'Viewer', desc: 'View-only access' },
    ];

    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">How are you joining?</h2>
      </div>
      
      <div class="ob-role-grid">
        ${roles.map(r => `
          <div class="ob-role-card ${selectedRole === r.id ? 'selected' : ''}" data-role="${r.id}" tabindex="0" role="button" aria-pressed="${selectedRole === r.id}">
            <span class="ob-role-icon">${r.icon}</span>
            <div class="ob-role-label">${r.label}</div>
            <div class="ob-role-desc">${r.desc}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="ob-toggle-row">
        <label class="ob-toggle-option ${selectedTeamMode === 'solo' ? 'active' : ''}" data-mode="solo">
          <span class="ob-toggle-radio"></span>
          <span>Training Solo</span>
        </label>
        <label class="ob-toggle-option ${selectedTeamMode === 'team' ? 'active' : ''}" data-mode="team">
          <span class="ob-toggle-radio"></span>
          <span>Joining Team</span>
        </label>
      </div>
      
      <div class="ob-team-input ${selectedTeamMode === 'team' ? 'visible' : ''}">
        <input type="text" class="ob-input" id="teamCodeInput" placeholder="Enter team code or link..." value="${selectedTeamCode}" />
      </div>
    `;

    // Bind role cards
    screen.querySelectorAll('.ob-role-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedRole = card.dataset.role;
        renderRole();
        updateContinueState();
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });

    // Bind toggle
    screen.querySelectorAll('.ob-toggle-option').forEach(opt => {
      opt.addEventListener('click', () => {
        selectedTeamMode = opt.dataset.mode;
        renderRole();
      });
    });

    // Bind team code input
    const codeInput = $('teamCodeInput');
    if (codeInput) {
      codeInput.addEventListener('input', e => {
        selectedTeamCode = e.target.value;
      });
    }
  }

  // ─── RENDER: SPORT ───────────────────────────────────────────────
  function renderSport() {
    const screen = $('sportScreen');
    if (!screen) return;

    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">What sport do you play?</h2>
      </div>
      
      <div class="ob-search">
        <span class="ob-search-icon">🔍</span>
        <input type="text" class="ob-search-input" id="sportSearch" placeholder="Search sports..." />
      </div>
      
      <div class="ob-sport-grid" id="sportGrid">
        ${SPORTS.map(s => `
          <div class="ob-sport-card ${selectedSport === s.id ? 'selected' : ''}" data-sport="${s.id}" tabindex="0" role="button" aria-pressed="${selectedSport === s.id}">
            <span class="ob-sport-icon">${s.icon}</span>
            <span class="ob-sport-label">${s.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Bind sport cards
    screen.querySelectorAll('.ob-sport-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedSport = card.dataset.sport;
        renderSport();
        updateContinueState();
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });

    // Bind search
    const searchInput = $('sportSearch');
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        screen.querySelectorAll('.ob-sport-card').forEach(card => {
          const label = card.querySelector('.ob-sport-label').textContent.toLowerCase();
          card.classList.toggle('hidden', !label.includes(q));
        });
      });
    }
  }

  // ─── RENDER: POSITION ────────────────────────────────────────────
  function renderPosition() {
    const screen = $('positionScreen');
    if (!screen) return;

    const positions = POSITIONS[selectedSport] || [];
    
    // Skip if no positions for this sport
    if (positions.length === 0) {
      completeOnboarding();
      return;
    }

    const sportLabel = SPORTS.find(s => s.id === selectedSport)?.label || selectedSport;

    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">What's your position?</h2>
        <p class="ob-subtitle">${sportLabel}</p>
      </div>
      
      <div class="ob-position-grid">
        ${positions.map((p, i) => `
          <div class="ob-position-card ${selectedPosition === p.id ? 'selected' : ''} ${i === positions.length - 1 && positions.length % 2 === 1 ? 'full-width' : ''}" data-position="${p.id}" tabindex="0" role="button" aria-pressed="${selectedPosition === p.id}">
            <div class="ob-position-abbrev">${p.abbrev}</div>
            <div class="ob-position-label">${p.label}</div>
          </div>
        `).join('')}
      </div>
    `;

    // Bind position cards
    screen.querySelectorAll('.ob-position-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedPosition = card.dataset.position;
        renderPosition();
        updateContinueState();
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });
  }

  // ─── UPDATE CONTINUE BUTTON STATE ────────────────────────────────
  function updateContinueState() {
    const btn = $('obContinueBtn');
    if (!btn) return;

    let canContinue = false;
    
    switch (currentScreen) {
      case 'welcome':
        canContinue = true;
        break;
      case 'role':
        canContinue = selectedRole !== null;
        break;
      case 'sport':
        canContinue = selectedSport !== null;
        break;
      case 'position':
        canContinue = selectedPosition !== null;
        break;
    }

    btn.disabled = !canContinue;
  }

  // ─── HANDLE CONTINUE ─────────────────────────────────────────────
  function handleContinue() {
    switch (currentScreen) {
      case 'welcome':
        showScreen('role');
        renderRole();
        break;
      case 'role':
        if (selectedRole) {
          showScreen('sport');
          renderSport();
        }
        break;
      case 'sport':
        if (selectedSport) {
          const positions = POSITIONS[selectedSport] || [];
          if (positions.length > 0) {
            showScreen('position');
            renderPosition();
          } else {
            completeOnboarding();
          }
        }
        break;
      case 'position':
        completeOnboarding();
        break;
    }
    updateContinueState();
  }

  // ─── HANDLE BACK ─────────────────────────────────────────────────
  function handleBack() {
    switch (currentScreen) {
      case 'role':
        showScreen('welcome');
        renderWelcome();
        break;
      case 'sport':
        showScreen('role');
        renderRole();
        break;
      case 'position':
        showScreen('sport');
        renderSport();
        break;
    }
    updateContinueState();
  }

  // ─── CHECK IF ONBOARDING NEEDED ──────────────────────────────────
  function shouldShowOnboarding() {
    const state = getState();
    return !state.onboarding?.completed;
  }

  // ─── INJECT ONBOARDING HTML ──────────────────────────────────────
  function injectOnboardingHTML() {
    // Check if already injected
    if ($('onboarding')) return;

    const html = `
      <div id="onboarding" class="onboarding" role="dialog" aria-modal="true" aria-label="Onboarding">
        <a href="#main-content" class="ob-skip-link">Skip to main content</a>
        
        <div class="ob-progress">
          <div class="ob-progress-bar" id="obProgressBar" style="width: 0%"></div>
        </div>
        
        <div id="welcomeScreen" class="ob-screen ob-welcome active"></div>
        <div id="roleScreen" class="ob-screen"></div>
        <div id="sportScreen" class="ob-screen"></div>
        <div id="positionScreen" class="ob-screen"></div>
        
        <div class="ob-footer">
          <div class="ob-footer-inner">
            <button type="button" class="ob-btn ob-btn-primary" id="obContinueBtn">Continue</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', html);
  }

  // ─── INIT ────────────────────────────────────────────────────────
  function init() {
    if (!shouldShowOnboarding()) {
      console.log('[onboarding] Already completed, skipping');
      return false;
    }

    console.log('[onboarding] Initializing...');
    
    // Inject HTML
    injectOnboardingHTML();

    // Render first screen
    renderWelcome();
    updateProgress();
    updateContinueState();

    // Bind continue button
    const continueBtn = $('obContinueBtn');
    if (continueBtn) {
      continueBtn.addEventListener('click', handleContinue);
    }

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      if (!$('onboarding') || $('onboarding').classList.contains('hidden')) return;
      
      if (e.key === 'Enter' && !e.target.matches('input')) {
        handleContinue();
      } else if (e.key === 'Escape' && currentScreen !== 'welcome') {
        handleBack();
      }
    });

    return true;
  }

  // ─── EXPOSE API ──────────────────────────────────────────────────
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
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
