/* ================================================================
   core.js — PerformanceIQ v7 Core Application
   Top-tier design with research-backed engagement
   ================================================================ */

(function() {
  'use strict';

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);
  const uid = (prefix = '') => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  let state = null;
  let todayActiveSession = null;
  let sessionTimerInterval = null;

  function getState() {
    if (state) return state;
    state = window.dataStore?.getState?.() || {};
    return state;
  }

  function persist(reason = '') {
    if (window.dataStore?.saveState) window.dataStore.saveState(reason);
    updateSavePill('saved');
  }

  // ─── TOP 6 SPORTS (Research-backed) ──────────────────────────────
  const SPORTS = [
    { id: 'basketball', icon: '🏀', label: 'Basketball' },
    { id: 'football',   icon: '🏈', label: 'Football' },
    { id: 'soccer',     icon: '⚽', label: 'Soccer' },
    { id: 'baseball',   icon: '⚾', label: 'Baseball' },
    { id: 'volleyball', icon: '🏐', label: 'Volleyball' },
    { id: 'track',      icon: '🏃', label: 'Track' },
  ];

  const POSITIONS = {
    basketball: [
      { id: 'pg', label: 'Point Guard' },
      { id: 'sg', label: 'Shooting Guard' },
      { id: 'sf', label: 'Small Forward' },
      { id: 'pf', label: 'Power Forward' },
      { id: 'c', label: 'Center' },
    ],
    football: [
      { id: 'qb', label: 'Quarterback' },
      { id: 'rb', label: 'Running Back' },
      { id: 'wr', label: 'Wide Receiver' },
      { id: 'ol', label: 'Offensive Line' },
      { id: 'dl', label: 'Defensive Line' },
      { id: 'lb', label: 'Linebacker' },
      { id: 'db', label: 'Defensive Back' },
    ],
    soccer: [
      { id: 'gk', label: 'Goalkeeper' },
      { id: 'def', label: 'Defender' },
      { id: 'mid', label: 'Midfielder' },
      { id: 'fwd', label: 'Forward' },
    ],
    baseball: [
      { id: 'p', label: 'Pitcher' },
      { id: 'c', label: 'Catcher' },
      { id: 'if', label: 'Infield' },
      { id: 'of', label: 'Outfield' },
    ],
    volleyball: [
      { id: 'setter', label: 'Setter' },
      { id: 'outside', label: 'Outside Hitter' },
      { id: 'middle', label: 'Middle Blocker' },
      { id: 'libero', label: 'Libero' },
    ],
    track: [],
  };

  // ─── EXERCISE LIBRARY ────────────────────────────────────────────
  const EXERCISE_LIB = {
    strength: {
      goblet_squat: { title: 'Goblet Squat', equipment: ['dumbbells'], beginner: { sets: 3, reps: '10-12' }, intermediate: { sets: 4, reps: '8-10' }, advanced: { sets: 4, reps: '6-8' }, cue: 'chest up, knees out' },
      rdl: { title: 'Romanian Deadlift', equipment: ['barbell', 'dumbbells'], beginner: { sets: 3, reps: '10' }, intermediate: { sets: 4, reps: '8' }, advanced: { sets: 4, reps: '6' }, cue: 'hinge at hips' },
      bench_press: { title: 'Bench Press', equipment: ['barbell'], beginner: { sets: 3, reps: '10' }, intermediate: { sets: 4, reps: '8' }, advanced: { sets: 5, reps: '5' }, cue: 'drive through feet' },
      row: { title: 'Bent Over Row', equipment: ['barbell', 'dumbbells'], beginner: { sets: 3, reps: '10' }, intermediate: { sets: 4, reps: '8' }, advanced: { sets: 4, reps: '6' }, cue: 'squeeze back' },
      pullup: { title: 'Pull-up', equipment: ['pullup_bar'], beginner: { sets: 3, reps: '5' }, intermediate: { sets: 4, reps: '8' }, advanced: { sets: 4, reps: '12' }, cue: 'full hang' },
      lunges: { title: 'Walking Lunges', equipment: ['bodyweight', 'dumbbells'], beginner: { sets: 2, reps: '8 each' }, intermediate: { sets: 3, reps: '10 each' }, advanced: { sets: 4, reps: '12 each' }, cue: 'knee tracks toe' },
    },
    plyo: {
      box_jump: { title: 'Box Jump', equipment: ['box'], beginner: { sets: 3, reps: '5' }, intermediate: { sets: 4, reps: '6' }, advanced: { sets: 5, reps: '5' }, cue: 'soft landing' },
      broad_jump: { title: 'Broad Jump', equipment: ['bodyweight'], beginner: { sets: 3, reps: '5' }, intermediate: { sets: 4, reps: '6' }, advanced: { sets: 5, reps: '5' }, cue: 'arm swing' },
    },
    conditioning: {
      shuttle_run: { title: 'Shuttle Run', equipment: ['field'], beginner: { sets: 4, reps: '20yd' }, intermediate: { sets: 6, reps: '20yd' }, advanced: { sets: 8, reps: '20yd' }, cue: 'low cuts' },
    },
    bodyweight: {
      pushup: { title: 'Push-up', equipment: ['bodyweight'], beginner: { sets: 3, reps: '10' }, intermediate: { sets: 4, reps: '15' }, advanced: { sets: 4, reps: '25' }, cue: 'full range' },
      squat: { title: 'Bodyweight Squat', equipment: ['bodyweight'], beginner: { sets: 3, reps: '15' }, intermediate: { sets: 4, reps: '20' }, advanced: { sets: 4, reps: '30' }, cue: 'below parallel' },
      plank: { title: 'Plank', equipment: ['bodyweight'], beginner: { sets: 3, reps: '20s' }, intermediate: { sets: 3, reps: '45s' }, advanced: { sets: 4, reps: '60s' }, cue: 'neutral spine' },
    },
  };

  // ─── SPORT SKILL MICROBLOCKS ─────────────────────────────────────
  const SPORT_MICROBLOCKS = {
    basketball: { shooting: [{ name: 'Form Shooting', reps: '20 makes', cue: 'elbow under' }, { name: 'Catch & Shoot', reps: '10 each spot', cue: 'quick release' }] },
    football: { agility: [{ name: 'Cone Drills', reps: '5 sets', cue: 'low hips' }] },
    soccer: { passing: [{ name: 'Wall Passes', reps: '50 each foot', cue: 'inside foot' }] },
    baseball: { hitting: [{ name: 'Tee Work', reps: '30 swings', cue: 'stay back' }] },
    volleyball: { hitting: [{ name: 'Approach Swings', reps: '15 reps', cue: 'arm path' }] },
    track: { sprint: [{ name: 'Acceleration 30m', reps: '6 reps', cue: 'drive phase' }] },
  };

  const SESSION_TEMPLATES = {
    practice: { mix: ['skill', 'strength', 'conditioning'], mins: 75 },
    strength: { mix: ['warmup', 'strength'], mins: 60 },
    speed: { mix: ['warmup', 'plyo'], mins: 50 },
    conditioning: { mix: ['warmup', 'conditioning'], mins: 45 },
    recovery: { mix: ['mobility'], mins: 35 },
  };

  const EXPERIENCE_MODIFIERS = {
    beginner: { volume: 0.7, sets: 2 },
    intermediate: { volume: 1.0, sets: 3 },
    advanced: { volume: 1.2, sets: 4 },
  };

  // ─── WORKOUT GENERATION ──────────────────────────────────────────
  function generateWorkoutFor(sport, sessionType, injuries, skipPrompts = false) {
    if (!skipPrompts && window.progressivePrompts?.beforeGenerate) {
      const canProceed = window.progressivePrompts.beforeGenerate(() => {
        const gen = generateWorkoutFor(sport, sessionType, injuries, true);
        state.ui.todaySession = gen;
        persist('Workout generated');
        renderTodayBlock();
        toast('Workout ready!');
      });
      if (!canProceed) return null;
    }

    const profile = state.profile || {};
    const equipment = new Set(profile.equipment || ['bodyweight']);
    const experience = profile.experience || 'intermediate';
    const expMod = EXPERIENCE_MODIFIERS[experience] || EXPERIENCE_MODIFIERS.intermediate;
    const template = SESSION_TEMPLATES[sessionType] || SESSION_TEMPLATES.practice;

    const blocks = [];

    // Warm-up
    blocks.push({
      id: uid('warmup'),
      type: 'warmup',
      title: 'Dynamic Warm-up',
      duration_min: 10,
      items: [
        { name: 'Mobility Flow', cue: '3 min' },
        { name: 'Activation', cue: '2 min' },
        { name: 'Movement Prep', cue: '5 min' },
      ],
    });

    // Skill block
    const sportMicro = SPORT_MICROBLOCKS[sport];
    if (sportMicro && template.mix.includes('skill')) {
      const skillType = Object.keys(sportMicro)[0];
      blocks.push({
        id: uid('skill'),
        type: 'skill',
        title: `${sport} Skills`,
        duration_min: 15,
        items: sportMicro[skillType].slice(0, 3),
      });
    }

    // Strength block
    if (template.mix.includes('strength')) {
      const exercises = [];
      const lib = { ...EXERCISE_LIB.strength, ...EXERCISE_LIB.bodyweight };
      
      for (const [key, ex] of Object.entries(lib)) {
        const hasEquip = (ex.equipment || ['bodyweight']).some(e => equipment.has(e) || e === 'bodyweight');
        if (hasEquip && exercises.length < expMod.sets + 1) {
          const tier = ex[experience] || ex.intermediate || {};
          exercises.push({
            id: uid('ex'),
            name: ex.title,
            sets: tier.sets || expMod.sets,
            reps: tier.reps || '8-10',
            cue: ex.cue,
          });
        }
      }

      blocks.push({
        id: uid('strength'),
        type: 'strength',
        title: 'Strength',
        duration_min: 25,
        items: exercises,
      });
    }

    // Conditioning
    if (template.mix.includes('conditioning')) {
      blocks.push({
        id: uid('cond'),
        type: 'conditioning',
        title: 'Conditioning',
        duration_min: 15,
        items: [{ name: 'Circuit', cue: '30s work / 15s rest', sets: 4 }],
      });
    }

    return {
      id: uid('session'),
      sport,
      sessionType,
      generated_at: new Date().toISOString(),
      duration_min: template.mins,
      blocks,
    };
  }

  // ─── UI HELPERS ──────────────────────────────────────────────────
  function toast(msg, duration = 3000) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, duration);
  }

  function updateSavePill(status) {
    const dot = $('saveDot');
    const text = $('saveText');
    if (dot) dot.className = `dot ${status}`;
    if (text) text.textContent = status === 'saved' ? 'Saved' : 'Saving...';
  }

  function showView(viewId) {
    $$('.view').forEach(v => { v.classList.remove('active'); v.hidden = true; });
    $$('.nav-tab').forEach(t => t.classList.remove('active'));

    const view = $(viewId + 'View');
    const tab = document.querySelector(`[data-view="${viewId}"]`);
    
    if (view) { view.classList.add('active'); view.hidden = false; }
    if (tab) tab.classList.add('active');

    state.ui = state.ui || {};
    state.ui.currentView = viewId;
  }

  // ─── RENDER FUNCTIONS ────────────────────────────────────────────
  function renderHome() {
    const role = state.profile?.role || 'coach';
    const sport = state.profile?.sport || 'basketball';
    const position = state.profile?.position;

    let subtitle = `${role} • ${sport}`;
    if (position) {
      const posData = POSITIONS[sport]?.find(p => p.id === position);
      if (posData) subtitle += ` (${posData.label})`;
    }

    const homeSub = $('homeSub');
    if (homeSub) homeSub.textContent = subtitle;

    renderTodayBlock();
    renderProgressMetrics();
    updateRoleVisibility();
  }

  function renderTodayBlock() {
    const block = $('todayBlock');
    if (!block) return;

    const session = state.ui?.todaySession;

    if (!session) {
      block.innerHTML = `
        <p class="muted">No session generated yet.</p>
        <button class="btn" id="btnGenerateToday">Generate Workout</button>
      `;
      $('btnGenerateToday')?.addEventListener('click', () => {
        const gen = generateWorkoutFor(state.profile?.sport || 'basketball', state.profile?.preferred_session_type || 'practice', state.profile?.injuries || []);
        if (gen) {
          state.ui.todaySession = gen;
          persist('Session generated');
          renderTodayBlock();
        }
      });
      return;
    }

    const blockList = session.blocks.map(b => `<li>${b.title} — ${b.duration_min} min</li>`).join('');
    
    block.innerHTML = `
      <div class="session-preview">
        <div class="session-title">${session.sessionType} • ${session.sport}</div>
        <ul class="session-blocks">${blockList}</ul>
        <div class="session-meta">${session.duration_min} min total</div>
      </div>
      <div class="row gap" style="margin-top:12px">
        <button class="btn" id="btnStartToday">Start Session</button>
        <button class="btn ghost" id="btnRegenerate">Regenerate</button>
      </div>
    `;

    $('btnStartToday')?.addEventListener('click', () => startSession(session));
    $('btnRegenerate')?.addEventListener('click', () => {
      const gen = generateWorkoutFor(state.profile?.sport || 'basketball', state.profile?.preferred_session_type || 'practice', state.profile?.injuries || [], true);
      state.ui.todaySession = gen;
      persist('Regenerated');
      renderTodayBlock();
      toast('New workout generated');
    });
  }

  function renderProgressMetrics() {
    const sessions = state.sessions || [];
    const streak = state.onboarding?.streak_count || 0;
    const weekSessions = sessions.filter(s => {
      const d = new Date(s.logged_at);
      return (Date.now() - d) < 7 * 86400000;
    });

    const volume = weekSessions.reduce((sum, s) => sum + ((s.rpe || 5) * (s.duration_min || 60)), 0);

    if ($('statVolume')) $('statVolume').textContent = volume.toLocaleString();
    if ($('statStreak')) $('statStreak').textContent = streak;
    if ($('statSessions')) $('statSessions').textContent = sessions.length;
  }

  function updateRoleVisibility() {
    const role = state.profile?.role || 'coach';
    const teamMode = state.profile?.team_mode || 'solo';

    document.body.setAttribute('data-role', role);
    $$('.coach-only').forEach(el => { el.hidden = role !== 'coach'; });
    $$('.team-only').forEach(el => { el.hidden = teamMode !== 'team'; });
  }

  function renderTrain() {
    const sportSelect = $('trainSportSelect');
    if (sportSelect) {
      sportSelect.innerHTML = SPORTS.map(s => 
        `<option value="${s.id}" ${s.id === state.profile?.sport ? 'selected' : ''}>${s.icon} ${s.label}</option>`
      ).join('');
    }

    const sessionSelect = $('trainSessionType');
    if (sessionSelect) sessionSelect.value = state.profile?.preferred_session_type || 'practice';
  }

  function renderSettings() {
    const sportSelect = $('sportSelect');
    if (sportSelect) {
      sportSelect.innerHTML = SPORTS.map(s => 
        `<option value="${s.id}" ${s.id === state.profile?.sport ? 'selected' : ''}>${s.icon} ${s.label}</option>`
      ).join('');
    }

    updatePositionSelect();

    if ($('roleSelect')) $('roleSelect').value = state.profile?.role || 'athlete';
    if ($('experienceSelect')) $('experienceSelect').value = state.profile?.experience || 'intermediate';
    if ($('goalSelect')) $('goalSelect').value = state.profile?.goal || '';

    const freq = state.profile?.frequency || 4;
    $$('#frequencyBtns button').forEach(btn => {
      btn.classList.toggle('ghost', parseInt(btn.dataset.freq) !== freq);
    });
  }

  function updatePositionSelect() {
    const sport = state.profile?.sport || 'basketball';
    const positions = POSITIONS[sport] || [];
    const posSelect = $('positionSelect');
    
    if (posSelect) {
      posSelect.innerHTML = '<option value="">No position</option>' + 
        positions.map(p => `<option value="${p.id}" ${p.id === state.profile?.position ? 'selected' : ''}>${p.label}</option>`).join('');
    }
  }

  // ─── SESSION MANAGEMENT ──────────────────────────────────────────
  function startSession(session) {
    todayActiveSession = { ...session, started_at: new Date().toISOString() };

    const bar = $('sessionBar');
    if (bar) {
      bar.hidden = false;
      $('sessionSport').textContent = session.sport;
    }

    const startTime = Date.now();
    sessionTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const secs = (elapsed % 60).toString().padStart(2, '0');
      if ($('sessionTimer')) $('sessionTimer').textContent = `${mins}:${secs}`;
    }, 1000);

    toast('Session started!');
  }

  function endSession() {
    if (!todayActiveSession) return;
    clearInterval(sessionTimerInterval);
    
    const endTime = new Date();
    const startTime = new Date(todayActiveSession.started_at);
    const duration_min = Math.round((endTime - startTime) / 60000);

    showRpeModal(duration_min);
  }

  function showRpeModal(duration_min) {
    const backdrop = $('rpeBackdrop');
    const modal = $('rpeModal');
    
    if (backdrop) backdrop.hidden = false;
    if (modal) modal.setAttribute('aria-hidden', 'false');

    const descriptions = {
      1: 'Very light', 2: 'Light', 3: 'Light', 4: 'Moderate', 5: 'Moderate',
      6: 'Somewhat hard', 7: 'Hard', 8: 'Very hard', 9: 'Extremely hard', 10: 'Max effort',
    };

    const rpeInput = $('rpeInput');
    if (rpeInput) {
      rpeInput.oninput = () => {
        const val = parseInt(rpeInput.value);
        if ($('rpeValue')) $('rpeValue').textContent = val;
        if ($('rpeDesc')) $('rpeDesc').textContent = descriptions[val] || '';
      };
    }

    $('btnSaveRpe')?.addEventListener('click', () => {
      const rpe = parseInt($('rpeInput')?.value || 7);
      logSession(duration_min, rpe);
      closeRpeModal();
    }, { once: true });

    $('btnCloseRpe')?.addEventListener('click', closeRpeModal);
  }

  function closeRpeModal() {
    const backdrop = $('rpeBackdrop');
    const modal = $('rpeModal');
    if (backdrop) backdrop.hidden = true;
    if (modal) modal.setAttribute('aria-hidden', 'true');
  }

  function logSession(duration_min, rpe) {
    const session = {
      ...todayActiveSession,
      duration_min,
      rpe,
      logged_at: new Date().toISOString(),
    };

    state.sessions = state.sessions || [];
    state.sessions.push(session);

    if (window.dataStore?.updateStreak) window.dataStore.updateStreak();

    state.ui.todaySession = null;
    todayActiveSession = null;

    const bar = $('sessionBar');
    if (bar) bar.hidden = true;

    persist('Session logged');
    renderTodayBlock();
    renderProgressMetrics();
    toast('Session logged! 💪');

    if (window.progressivePrompts?.afterLogSession) {
      setTimeout(() => window.progressivePrompts.afterLogSession(), 500);
    }
  }

  // ─── EVENT BINDING ───────────────────────────────────────────────
  function bindUI() {
    $$('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        if (view) showView(view);
      });
    });

    $('btnEndSession')?.addEventListener('click', endSession);
    $('btnLogSession')?.addEventListener('click', endSession);

    $('btnGenTrain')?.addEventListener('click', () => {
      const sport = $('trainSportSelect')?.value || state.profile?.sport || 'basketball';
      const type = $('trainSessionType')?.value || 'practice';
      const gen = generateWorkoutFor(sport, type, state.profile?.injuries || [], true);
      if (gen) {
        state.ui.todaySession = gen;
        persist('Session generated');
        showView('home');
        renderTodayBlock();
        toast('Session ready');
      }
    });

    $('roleSelect')?.addEventListener('change', e => {
      state.profile.role = e.target.value;
      persist('Role updated');
      updateRoleVisibility();
      renderHome();
    });

    $('sportSelect')?.addEventListener('change', e => {
      state.profile.sport = e.target.value;
      state.profile.position = null;
      persist('Sport updated');
      updatePositionSelect();
    });

    $('positionSelect')?.addEventListener('change', e => {
      state.profile.position = e.target.value || null;
      persist('Position updated');
    });

    $('experienceSelect')?.addEventListener('change', e => {
      state.profile.experience = e.target.value;
      state.profile.level = e.target.value;
      persist('Experience updated');
    });

    $('goalSelect')?.addEventListener('change', e => {
      state.profile.goal = e.target.value || null;
      persist('Goal updated');
    });

    $$('#frequencyBtns button').forEach(btn => {
      btn.addEventListener('click', () => {
        state.profile.frequency = parseInt(btn.dataset.freq);
        persist('Frequency updated');
        renderSettings();
      });
    });

    $('btnEditEquipment')?.addEventListener('click', () => {
      window.progressivePrompts?.showEquipmentModal?.();
    });

    $('fab')?.addEventListener('click', () => {
      const sheet = $('fabSheet');
      const backdrop = $('fabBackdrop');
      if (sheet) sheet.classList.toggle('open');
      if (backdrop) backdrop.hidden = !backdrop.hidden;
    });

    $('fabBackdrop')?.addEventListener('click', () => {
      $('fabSheet')?.classList.remove('open');
      $('fabBackdrop').hidden = true;
    });

    $('btnAccount')?.addEventListener('click', () => showView('account'));

    $('btnHelp')?.addEventListener('click', () => {
      $('helpDrawer')?.classList.add('open');
      $('helpBackdrop').hidden = false;
    });

    $('btnCloseHelp')?.addEventListener('click', () => {
      $('helpDrawer')?.classList.remove('open');
      $('helpBackdrop').hidden = true;
    });

    $$('#themeBtns button').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
        state.ui.theme = theme;
        persist('Theme updated');
        $$('#themeBtns button').forEach(b => b.classList.toggle('ghost', b !== btn));
      });
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        $('btnHelp')?.click();
      }
    });
  }

  // ─── INITIALIZATION ──────────────────────────────────────────────
  function initApp() {
    console.log('[core] Initializing app...');
    state = getState();
    renderHome();
    renderTrain();
    renderSettings();
    bindUI();
    hideSplash();
    console.log('[core] App ready');
  }

  function hideSplash() {
    const splash = $('splash');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => { splash.hidden = true; splash.style.display = 'none'; }, 300);
    }
  }

  function boot() {
    if (window.onboarding?.shouldShowOnboarding?.()) {
      console.log('[core] Onboarding active');
      hideSplash();
      return;
    }
    initApp();
  }

  window.initApp = initApp;
  window.showView = showView;
  window.toast = toast;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
