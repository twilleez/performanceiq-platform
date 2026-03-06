/* ================================================================
   onboarding.js — PerformanceIQ v7 TOP-TIER Onboarding
   Streamlined to top 6 most-played sports (research-backed)
   
   SPORTS SELECTION (2024 participation data):
   1. Basketball - 41.9% (most popular)
   2. Soccer - 26.5%
   3. Baseball/Softball - 24.1%
   4. Football - 26.9% (tackle + flag combined)
   5. Volleyball - popular team sport
   6. Track & Field - 300,000+ youth
   ================================================================ */

(function() {
  'use strict';

  // ─── TOP 6 SPORTS (Research-backed popularity) ───────────────────
  const SPORTS = [
    { id: 'basketball', icon: '🏀', label: 'Basketball', color: '#FF6B35' },
    { id: 'football',   icon: '🏈', label: 'Football',   color: '#00D4FF' },
    { id: 'soccer',     icon: '⚽', label: 'Soccer',     color: '#00FF94' },
    { id: 'baseball',   icon: '⚾', label: 'Baseball',   color: '#FF3366' },
    { id: 'volleyball', icon: '🏐', label: 'Volleyball', color: '#7B61FF' },
    { id: 'track',      icon: '🏃', label: 'Track',      color: '#FFB800' },
  ];

  // ─── POSITIONS BY SPORT ──────────────────────────────────────────
  const POSITIONS = {
    basketball: [
      { id: 'pg', label: 'Point Guard', abbrev: 'PG' },
      { id: 'sg', label: 'Shooting Guard', abbrev: 'SG' },
      { id: 'sf', label: 'Small Forward', abbrev: 'SF' },
      { id: 'pf', label: 'Power Forward', abbrev: 'PF' },
      { id: 'c', label: 'Center', abbrev: 'C' },
    ],
    football: [
      { id: 'qb', label: 'Quarterback', abbrev: 'QB' },
      { id: 'rb', label: 'Running Back', abbrev: 'RB' },
      { id: 'wr', label: 'Wide Receiver', abbrev: 'WR' },
      { id: 'ol', label: 'Offensive Line', abbrev: 'OL' },
      { id: 'dl', label: 'Defensive Line', abbrev: 'DL' },
      { id: 'lb', label: 'Linebacker', abbrev: 'LB' },
      { id: 'db', label: 'Defensive Back', abbrev: 'DB' },
    ],
    soccer: [
      { id: 'gk', label: 'Goalkeeper', abbrev: 'GK' },
      { id: 'def', label: 'Defender', abbrev: 'DEF' },
      { id: 'mid', label: 'Midfielder', abbrev: 'MID' },
      { id: 'fwd', label: 'Forward', abbrev: 'FWD' },
    ],
    baseball: [
      { id: 'p', label: 'Pitcher', abbrev: 'P' },
      { id: 'c', label: 'Catcher', abbrev: 'C' },
      { id: 'if', label: 'Infield', abbrev: 'IF' },
      { id: 'of', label: 'Outfield', abbrev: 'OF' },
    ],
    volleyball: [
      { id: 'setter', label: 'Setter', abbrev: 'S' },
      { id: 'outside', label: 'Outside Hitter', abbrev: 'OH' },
      { id: 'middle', label: 'Middle Blocker', abbrev: 'MB' },
      { id: 'libero', label: 'Libero', abbrev: 'L' },
    ],
    track: [], // No positions
  };

  // ─── EQUIPMENT OPTIONS ───────────────────────────────────────────
  const EQUIPMENT = [
    { id: 'bodyweight', icon: '🏃', label: 'Bodyweight', default: true },
    { id: 'dumbbells', icon: '🏋️', label: 'Dumbbells' },
    { id: 'barbell', icon: '🏋️', label: 'Barbell' },
    { id: 'bands', icon: '🔗', label: 'Bands' },
    { id: 'machines', icon: '⚙️', label: 'Machines' },
    { id: 'kettlebells', icon: '🔔', label: 'Kettlebells' },
  ];

  const EQUIP_PRESETS = {
    minimal: { label: 'Minimal', tags: ['bodyweight', 'bands'] },
    home: { label: 'Home Gym', tags: ['bodyweight', 'dumbbells', 'bands'] },
    full: { label: 'Full Gym', tags: ['bodyweight', 'dumbbells', 'barbell', 'bands', 'machines', 'kettlebells'] },
  };

  // ─── EXPERIENCE LEVELS ───────────────────────────────────────────
  const EXPERIENCE_LEVELS = [
    { id: 'beginner', label: 'Beginner', desc: 'New to training or returning after 6+ months' },
    { id: 'intermediate', label: 'Intermediate', desc: '1-3 years consistent training' },
    { id: 'advanced', label: 'Advanced', desc: '3+ years, familiar with programming' },
  ];

  // ─── GOALS ───────────────────────────────────────────────────────
  const GOALS = [
    { id: 'strength', icon: '💪', label: 'Strength', desc: 'Get stronger, lift heavier' },
    { id: 'speed', icon: '⚡', label: 'Speed', desc: 'Faster, more explosive' },
    { id: 'endurance', icon: '🫀', label: 'Endurance', desc: 'Last longer, recover faster' },
    { id: 'athleticism', icon: '🏆', label: 'Athleticism', desc: 'Well-rounded performance' },
  ];

  // ─── FREQUENCY DESCRIPTIONS ──────────────────────────────────────
  const FREQ_DESC = {
    2: 'Maintenance — ideal for in-season',
    3: 'Foundation — strength with recovery',
    4: 'Balanced — optimal for most athletes',
    5: 'Intensive — serious off-season',
    6: 'High volume — advanced only',
  };

  // ─── STATE ───────────────────────────────────────────────────────
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
      return window.dataStore?.getState?.() || JSON.parse(localStorage.getItem('piq_state') || '{}');
    } catch { return {}; }
  }

  function setState(updates) {
    const state = getState();
    Object.assign(state, updates);
    if (window.dataStore?.setState) window.dataStore.setState(state);
    else localStorage.setItem('piq_state', JSON.stringify(state));
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

  // ─── PROGRESS ────────────────────────────────────────────────────
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
    const currentEl = $(currentScreen + 'Screen');
    if (currentEl) {
      currentEl.classList.remove('active');
      currentEl.classList.add('exit');
    }

    setTimeout(() => {
      currentScreen = screenId;
      $$('.ob-screen').forEach(el => el.classList.remove('active', 'exit'));
      const newEl = $(screenId + 'Screen');
      if (newEl) newEl.classList.add('active');
      updateProgress();
    }, 150);
  }

  // ─── COMPLETE ONBOARDING ─────────────────────────────────────────
  function completeOnboarding() {
    persistProfile({
      role: selectedRole,
      team_mode: selectedTeamMode,
      team_code: selectedTeamCode,
      sport: selectedSport,
      position: selectedPosition,
    });
    
    persistOnboarding({ completed: true, current_step: 'dashboard' });

    const container = $('onboarding');
    if (container) {
      container.classList.add('exit');
      setTimeout(() => {
        container.classList.add('hidden');
        container.remove();
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
        <div class="ob-logo-mark"></div>
        <span class="ob-logo-text">PerformanceIQ</span>
      </div>
      <h1 class="ob-headline">Train <span class="ob-headline-accent">Smarter.</span><br>Perform Better.</h1>
      <p class="ob-subtext">Personalized training built for your sport, schedule, and goals.</p>
    `;
  }

  // ─── RENDER: ROLE ────────────────────────────────────────────────
  function renderRole() {
    const screen = $('roleScreen');
    if (!screen) return;

    const roles = [
      { id: 'coach', icon: '🏋️', label: 'Coach', desc: 'Manage athletes & teams' },
      { id: 'athlete', icon: '🏃', label: 'Athlete', desc: 'Track your training' },
      { id: 'parent', icon: '👨‍👩‍👧', label: 'Parent', desc: 'Follow your athlete' },
      { id: 'viewer', icon: '👁️', label: 'Viewer', desc: 'View-only access' },
    ];

    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">How Are You Joining?</h2>
        <p class="ob-subtitle">Select your role to personalize your experience</p>
      </div>
      
      <div class="ob-role-grid">
        ${roles.map(r => `
          <div class="ob-role-card ${selectedRole === r.id ? 'selected' : ''}" data-role="${r.id}" tabindex="0">
            <span class="ob-role-icon">${r.icon}</span>
            <div class="ob-role-label">${r.label}</div>
            <div class="ob-role-desc">${r.desc}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="ob-toggle-row">
        <label class="ob-toggle-option ${selectedTeamMode === 'solo' ? 'active' : ''}" data-mode="solo">
          Training Solo
        </label>
        <label class="ob-toggle-option ${selectedTeamMode === 'team' ? 'active' : ''}" data-mode="team">
          Joining Team
        </label>
      </div>
      
      <div class="ob-team-input ${selectedTeamMode === 'team' ? 'visible' : ''}">
        <input type="text" class="ob-input" id="teamCodeInput" placeholder="Enter team code..." value="${selectedTeamCode}" />
      </div>
    `;

    // Bind events
    screen.querySelectorAll('.ob-role-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedRole = card.dataset.role;
        renderRole();
        updateContinueState();
      });
    });

    screen.querySelectorAll('.ob-toggle-option').forEach(opt => {
      opt.addEventListener('click', () => {
        selectedTeamMode = opt.dataset.mode;
        renderRole();
      });
    });

    const codeInput = $('teamCodeInput');
    if (codeInput) codeInput.addEventListener('input', e => { selectedTeamCode = e.target.value; });
  }

  // ─── RENDER: SPORT (Top 6 Only) ──────────────────────────────────
  function renderSport() {
    const screen = $('sportScreen');
    if (!screen) return;

    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">Select Your Sport</h2>
        <p class="ob-subtitle">We'll customize training for your needs</p>
      </div>
      
      <div class="ob-sport-grid">
        ${SPORTS.map(s => `
          <div class="ob-sport-card ${selectedSport === s.id ? 'selected' : ''}" data-sport="${s.id}" tabindex="0">
            <span class="ob-sport-icon">${s.icon}</span>
            <span class="ob-sport-label">${s.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    screen.querySelectorAll('.ob-sport-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedSport = card.dataset.sport;
        renderSport();
        updateContinueState();
      });
    });
  }

  // ─── RENDER: POSITION ────────────────────────────────────────────
  function renderPosition() {
    const screen = $('positionScreen');
    if (!screen) return;

    const positions = POSITIONS[selectedSport] || [];
    
    if (positions.length === 0) {
      completeOnboarding();
      return;
    }

    const sportLabel = SPORTS.find(s => s.id === selectedSport)?.label || selectedSport;

    screen.innerHTML = `
      <div class="ob-header">
        <h2 class="ob-title">Your Position</h2>
        <p class="ob-subtitle">${sportLabel}</p>
      </div>
      
      <div class="ob-position-grid">
        ${positions.map((p, i) => `
          <div class="ob-position-card ${selectedPosition === p.id ? 'selected' : ''} ${i === positions.length - 1 && positions.length % 2 === 1 ? 'full-width' : ''}" data-position="${p.id}" tabindex="0">
            <div class="ob-position-abbrev">${p.abbrev}</div>
            <div class="ob-position-label">${p.label}</div>
          </div>
        `).join('')}
      </div>
    `;

    screen.querySelectorAll('.ob-position-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedPosition = card.dataset.position;
        renderPosition();
        updateContinueState();
      });
    });
  }

  // ─── UPDATE CONTINUE STATE ───────────────────────────────────────
  function updateContinueState() {
    const btn = $('obContinueBtn');
    if (!btn) return;

    let canContinue = false;
    switch (currentScreen) {
      case 'welcome': canContinue = true; break;
      case 'role': canContinue = selectedRole !== null; break;
      case 'sport': canContinue = selectedSport !== null; break;
      case 'position': canContinue = selectedPosition !== null; break;
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

  // ─── CHECK IF ONBOARDING NEEDED ──────────────────────────────────
  function shouldShowOnboarding() {
    const state = getState();
    return !state.onboarding?.completed;
  }

  // ─── INJECT HTML ─────────────────────────────────────────────────
  function injectOnboardingHTML() {
    if ($('onboarding')) return;

    const html = `
      <div id="onboarding" class="onboarding" role="dialog" aria-modal="true">
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
      console.log('[onboarding] Already completed');
      return false;
    }

    console.log('[onboarding] Initializing...');
    injectOnboardingHTML();
    renderWelcome();
    updateProgress();
    updateContinueState();

    $('obContinueBtn')?.addEventListener('click', handleContinue);

    document.addEventListener('keydown', e => {
      if (!$('onboarding') || $('onboarding').classList.contains('hidden')) return;
      if (e.key === 'Enter' && !e.target.matches('input')) handleContinue();
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

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
