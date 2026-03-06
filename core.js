/* ================================================================
   core.js — PerformanceIQ v8 Core Application
   Elite Training Engine integration: exercise library, swap modal,
   rest timer, progress tracking, and PerformanceIQ scoring.
   ================================================================ */

(function() {
  'use strict';

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);
  const uid = (prefix = '') => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  let state = null;
  let elapsedTimerInterval = null;
  let restTimerInterval = null;

  function getState() {
    if (state) return state;
    state = window.dataStore?.getState?.() || {};
    return state;
  }

  function persist(reason = '') {
    if (window.dataStore?.saveState) window.dataStore.saveState(reason);
    updateSavePill('saved');
  }

  function toast(msg, duration = 2800) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, duration);
  }

  function updateSavePill(status) {
    const dot = $('saveDot');
    const text = $('saveText');
    if (dot) dot.className = `dot ${status}`;
    if (text) text.textContent = status === 'saved' ? 'Saved' : 'Saving...';
  }

  const SPORTS = [
    { id: 'basketball', icon: '🏀', label: 'Basketball' },
    { id: 'football', icon: '🏈', label: 'Football' },
    { id: 'soccer', icon: '⚽', label: 'Soccer' },
    { id: 'baseball', icon: '⚾', label: 'Baseball' },
    { id: 'volleyball', icon: '🏐', label: 'Volleyball' },
    { id: 'track', icon: '🏃', label: 'Track & Field' },
  ];

  const POSITIONS = {
    basketball: [{ id: 'pg', label: 'Point Guard' }, { id: 'sg', label: 'Shooting Guard' }, { id: 'sf', label: 'Small Forward' }, { id: 'pf', label: 'Power Forward' }, { id: 'c', label: 'Center' }],
    football: [{ id: 'qb', label: 'Quarterback' }, { id: 'rb', label: 'Running Back' }, { id: 'wr', label: 'Wide Receiver' }, { id: 'lb', label: 'Linebacker' }, { id: 'db', label: 'Defensive Back' }],
    soccer: [{ id: 'gk', label: 'Goalkeeper' }, { id: 'cm', label: 'Center Midfielder' }, { id: 'w', label: 'Winger' }, { id: 'st', label: 'Striker' }],
  };

  function showView(viewId) {
    $$('.view').forEach(v => {
      v.classList.remove('active');
      v.hidden = true;
    });
    $$('.nav-tab').forEach(t => t.classList.remove('active'));

    const view = $(viewId + 'View');
    const tab = document.querySelector(`[data-view="${viewId}"]`);
    if (view) {
      view.classList.add('active');
      view.hidden = false;
    }
    if (tab) tab.classList.add('active');

    state.ui = state.ui || {};
    state.ui.currentView = viewId;
  }

  function currentSubtitle() {
    const role = state.profile?.role || 'athlete';
    const sport = SPORTS.find(s => s.id === (state.profile?.sport || 'basketball'))?.label || (state.profile?.sport || 'Basketball');
    const position = state.profile?.position;
    const posLabel = POSITIONS[state.profile?.sport || 'basketball']?.find(p => p.id === position)?.label;
    return posLabel ? `${role} • ${sport} (${posLabel})` : `${role} • ${sport}`;
  }

  function exercisePresets(profile, sport, sessionType) {
    const eq = new Set((profile.equipment || ['bodyweight']).map(String));
    const lib = window.PIQExerciseLibrary?.getSportLibrary?.(sport) || [];
    const available = lib.filter(ex => (ex.equipment || []).some(e => eq.has(e)));

    const pick = (...ids) => ids
      .map(id => available.find(x => x.id === id) || lib.find(x => x.id === id))
      .filter(Boolean);

    const goal = profile.goal || 'athleticism';

    if (sport === 'basketball') {
      const templates = {
        practice: [
          { type: 'movement', title: 'Prep + Activation', items: pick('plank','dead_bug') },
          { type: 'speed', title: 'Speed + Jump', items: goal === 'speed' ? pick('accel_sprint','box_jump','broad_jump') : pick('broad_jump','shuttle_run','accel_sprint') },
          { type: 'strength', title: 'Strength Work', items: goal === 'strength' ? pick('front_squat','rdl','bench_press','row') : pick('goblet_squat','db_rdl','pushup','db_row') },
          { type: 'conditioning', title: 'Conditioning / Finish', items: pick('tempo_runs','bike_intervals') },
        ],
        strength: [
          { type: 'movement', title: 'Prep + Core', items: pick('plank','dead_bug') },
          { type: 'strength', title: 'Primary Lift', items: pick('front_squat','goblet_squat','rdl') },
          { type: 'strength', title: 'Upper Support', items: pick('bench_press','pushup','row','db_row') },
          { type: 'accessory', title: 'Single-Leg + Trunk', items: pick('split_squat','lunge','plank') },
        ],
        speed: [
          { type: 'movement', title: 'Prep + Core', items: pick('plank','dead_bug') },
          { type: 'speed', title: 'Acceleration', items: pick('accel_sprint','shuttle_run') },
          { type: 'power', title: 'Plyometrics', items: pick('box_jump','broad_jump','squat_jump') },
          { type: 'conditioning', title: 'Tempo Work', items: pick('tempo_runs') },
        ],
        conditioning: [
          { type: 'movement', title: 'Prep', items: pick('dead_bug','plank') },
          { type: 'conditioning', title: 'Intervals', items: pick('tempo_runs','bike_intervals','shuttle_run') },
        ],
        recovery: [
          { type: 'movement', title: 'Core + Reset', items: pick('dead_bug','plank') },
          { type: 'accessory', title: 'Light Movement', items: pick('split_squat','lunge','pushup') },
        ],
        competition_prep: [
          { type: 'movement', title: 'Prep', items: pick('dead_bug','plank') },
          { type: 'speed', title: 'Reactive Speed', items: pick('shuttle_run','accel_sprint') },
          { type: 'power', title: 'Freshness Jumps', items: pick('broad_jump','box_jump') },
          { type: 'strength', title: 'Primer', items: pick('goblet_squat','pushup','db_row') },
        ]
      };
      return templates[sessionType] || templates.practice;
    }

    return [
      { type: 'movement', title: 'Prep', items: pick('dead_bug','plank') },
      { type: 'strength', title: 'Strength', items: pick('goblet_squat','db_rdl','pushup','db_row') },
      { type: 'conditioning', title: 'Conditioning', items: pick('tempo_runs','bike_intervals') },
    ];
  }

  function materializeItem(ex, profile) {
    const exp = profile.experience || profile.level || 'intermediate';
    return {
      id: uid('ex_'),
      exercise_id: ex.id,
      name: ex.title,
      type: ex.type,
      sets: Number(ex.defaultSets || 3),
      reps: ex.defaultReps || '8-10',
      rest_sec: Number(ex.defaultRest || 60),
      cue: (ex.cues || ['Move well first']).join(' • '),
      equipment: ex.equipment || ['bodyweight'],
      difficulty: ex.difficulty || exp,
    };
  }

  function generateWorkoutFor(sport, sessionType, injuries, skipPrompts = false) {
    if (!skipPrompts && window.progressivePrompts?.beforeGenerate) {
      const canProceed = window.progressivePrompts.beforeGenerate(() => {
        const gen = generateWorkoutFor(sport, sessionType, injuries, true);
        state.ui.todaySession = gen;
        persist('Workout generated');
        renderHome();
        renderTrain();
        toast('Workout ready!');
      });
      if (!canProceed) return null;
    }

    const profile = state.profile || {};
    const blocks = exercisePresets(profile, sport, sessionType).map(block => ({
      id: uid('blk_'),
      type: block.type,
      title: block.title,
      duration_min: Math.max(8, (block.items || []).reduce((s, ex) => s + Math.max(2, (Number(ex.defaultSets || 3) * 2)), 0)),
      items: (block.items || []).map(ex => materializeItem(ex, profile))
    })).filter(block => block.items.length);

    const duration = blocks.reduce((s, b) => s + Number(b.duration_min || 0), 0) + 8;
    return {
      id: uid('sess_'),
      sport,
      sessionType,
      generated_at: new Date().toISOString(),
      duration_min: duration,
      blocks,
    };
  }

  function renderTodayBlock() {
    const block = $('todayBlock');
    if (!block) return;
    const session = state.ui?.todaySession;

    if (!session) {
      block.innerHTML = `
        <p class="muted">No session generated yet.</p>
        <div class="row gap">
          <button class="btn" id="btnGenerateToday">Generate Workout</button>
          <button class="btn ghost" id="btnOpenTrain">Open Train</button>
        </div>
      `;
      $('btnGenerateToday')?.addEventListener('click', () => {
        const gen = generateWorkoutFor(state.profile?.sport || 'basketball', state.profile?.preferred_session_type || 'practice', state.profile?.injuries || []);
        if (gen) {
          state.ui.todaySession = gen;
          persist('Today session generated');
          renderTodayBlock();
          renderTrain();
        }
      });
      $('btnOpenTrain')?.addEventListener('click', () => showView('train'));
      return;
    }

    const list = session.blocks.map(b => `<li>${b.title} — ${(b.items || []).length} exercises</li>`).join('');
    block.innerHTML = `
      <div class="session-preview">
        <div class="session-title">${session.sessionType} • ${session.sport}</div>
        <ul class="session-blocks">${list}</ul>
        <div class="session-meta">${session.duration_min} min total • ${(session.blocks || []).reduce((a,b)=>a+(b.items||[]).length,0)} exercises</div>
      </div>
      <div class="row gap" style="margin-top:12px">
        <button class="btn" id="btnStartToday">Start Session</button>
        <button class="btn ghost" id="btnOpenTrain2">Open in Train</button>
        <button class="btn ghost" id="btnRegenerate">Regenerate</button>
      </div>
    `;

    $('btnStartToday')?.addEventListener('click', () => startSession(session));
    $('btnOpenTrain2')?.addEventListener('click', () => showView('train'));
    $('btnRegenerate')?.addEventListener('click', () => {
      const gen = generateWorkoutFor(state.profile?.sport || 'basketball', state.profile?.preferred_session_type || 'practice', state.profile?.injuries || [], true);
      state.ui.todaySession = gen;
      persist('Session regenerated');
      renderTodayBlock();
      renderTrain();
      toast('New workout generated');
    });
  }

  function renderWeekOverview() {
    const wrap = $('weekOverview');
    if (!wrap) return;
    const recent = (state.sessions || []).slice(-7).reverse();
    if (!recent.length) {
      wrap.innerHTML = '<div class="muted">Your recent sessions will appear here.</div>';
      return;
    }
    wrap.innerHTML = recent.map(s => `
      <div class="metric-card" style="min-width:220px">
        <div class="metric-label">${new Date(s.logged_at || s.generated_at).toLocaleDateString()}</div>
        <div style="font-weight:800;margin-top:6px">${s.sessionType || 'session'} • ${s.sport || state.profile?.sport || 'basketball'}</div>
        <div class="metric-label">${s.duration_min || 0} min • ${s.completion_pct || 0}% complete • Score ${s.piq_score || 0}</div>
      </div>
    `).join('');
  }

  function renderProgressMetrics() {
    const sessions = state.sessions || [];
    const weekSessions = sessions.filter(s => (Date.now() - new Date(s.logged_at || Date.now()).getTime()) < 7 * 86400000);
    const weeklyVolume = weekSessions.reduce((sum, s) => sum + Number(s.volume_score || 0), 0);
    const streak = state.onboarding?.streak_count || 0;
    const score = window.PIQEliteTraining?.computeScore?.(state)?.score || 0;

    if ($('statVolume')) $('statVolume').textContent = weeklyVolume.toLocaleString();
    if ($('statStreak')) $('statStreak').textContent = streak;
    if ($('statSessions')) $('statSessions').textContent = sessions.length;
    if ($('statScore')) $('statScore').textContent = score;

    const teamPill = $('teamPill');
    if (teamPill) teamPill.textContent = `Team: ${state.profile?.team_mode === 'team' ? (state.profile?.team_code || 'Linked') : 'Solo'}`;
  }

  function renderHome() {
    const homeSub = $('homeSub');
    if (homeSub) homeSub.textContent = currentSubtitle();
    renderTodayBlock();
    renderWeekOverview();
    renderProgressMetrics();
    updateRoleVisibility();
  }

  function trainSessionTemplate(session) {
    const active = window.PIQEliteTraining?.ensureSessionState?.(state, session) || {};
    const completion = window.PIQEliteTraining?.computeCompletionPct?.(session, active) || 0;
    const totalPlanned = window.PIQEliteTraining?.totalPlannedSets?.(session) || 0;
    const totalDone = window.PIQEliteTraining?.totalCompletedSets?.(active) || 0;
    const currentScore = window.PIQEliteTraining?.computeScore?.(state)?.score || 0;

    return `
      <div class="card">
        <div class="train-progress">
          <div class="metric-card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
              <div>
                <div class="metric-value">${completion}%</div>
                <div class="metric-label">Session completion</div>
              </div>
              <div class="score-badge">PIQ ${currentScore}</div>
            </div>
            <div class="progress-bar" style="margin-top:12px"><div style="width:${completion}%"></div></div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${totalDone}</div>
            <div class="metric-label">Sets done</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${totalPlanned}</div>
            <div class="metric-label">Planned sets</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${session.duration_min}</div>
            <div class="metric-label">Est. minutes</div>
          </div>
        </div>
      </div>
      <div class="elite-session-wrap">
        ${(session.blocks || []).map(block => `
          <div class="block-card">
            <div class="block-head">
              <div>
                <div class="block-title">${block.title}</div>
                <div class="block-meta">${block.type} • ${(block.items || []).length} exercises • ${block.duration_min || 0} min</div>
              </div>
            </div>
            <div class="exercise-list">
              ${(block.items || []).map(item => {
                const done = Number(active.completed_sets?.[item.id] || 0);
                const complete = done >= Number(item.sets || 0);
                const dots = Array.from({ length: Number(item.sets || 0) }, (_, i) => `<span class="set-dot ${i < done ? 'done' : ''}"></span>`).join('');
                return `
                  <div class="exercise-card ${complete ? 'is-complete' : ''}" data-item-id="${item.id}">
                    <div class="exercise-top">
                      <div>
                        <div class="exercise-name">${item.name}</div>
                        <div class="exercise-prescription">${item.sets} sets • ${item.reps} • Rest ${item.rest_sec || 60}s</div>
                      </div>
                      <div class="exercise-chip">${item.type || 'work'}</div>
                    </div>
                    <div class="exercise-cue">${item.cue || 'Move with control and intent.'}</div>
                    <div class="exercise-progress">${dots}<span class="exercise-status">${done}/${item.sets} sets complete</span></div>
                    <div class="exercise-actions">
                      <button class="btn ghost btn-detail" data-item-id="${item.id}">Details</button>
                      <button class="btn ghost btn-swap" data-item-id="${item.id}">Swap</button>
                      <button class="btn btn-set" data-item-id="${item.id}" ${complete ? 'disabled' : ''}>Complete Set</button>
                      ${done ? `<button class="btn ghost btn-undo" data-item-id="${item.id}">Undo</button>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderTrain() {
    const sportSelect = $('trainSportSelect');
    if (sportSelect) {
      sportSelect.innerHTML = SPORTS.map(s => `<option value="${s.id}" ${s.id === state.profile?.sport ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('');
    }
    const sessionSelect = $('trainSessionType');
    if (sessionSelect) sessionSelect.value = state.profile?.preferred_session_type || 'practice';

    const body = $('trainCardArea');
    const actions = $('sessionActions');
    if (!body) return;

    const session = state.ui?.todaySession;
    if (!session) {
      body.innerHTML = `
        <div class="card">
          <div class="card-title">Elite Training Engine</div>
          <p class="muted">Generate a session to unlock the exercise library, swap modal, rest timer, progress tracking, and PerformanceIQ scoring.</p>
        </div>
      `;
      if (actions) actions.hidden = true;
      return;
    }

    body.innerHTML = trainSessionTemplate(session);
    if (actions) actions.hidden = false;
    bindTrainSessionEvents(session);
  }

  function findItem(session, itemId) {
    for (const block of (session.blocks || [])) {
      const item = (block.items || []).find(i => i.id === itemId);
      if (item) return { block, item };
    }
    return null;
  }

  function bindTrainSessionEvents(session) {
    document.querySelectorAll('.btn-detail').forEach(btn => {
      btn.onclick = () => {
        const found = findItem(session, btn.dataset.itemId);
        if (found) window.PIQEliteTraining?.openExerciseModal?.(found.item, session);
      };
    });

    document.querySelectorAll('.btn-swap').forEach(btn => {
      btn.onclick = () => {
        const found = findItem(session, btn.dataset.itemId);
        if (!found) return;
        window.PIQEliteTraining?.openSwapModal?.(state, session, found.item, (nextItem) => {
          Object.assign(found.item, nextItem);
          persist('Exercise swapped');
          renderTrain();
          renderHome();
          toast('Exercise swapped');
        });
      };
    });

    document.querySelectorAll('.btn-set').forEach(btn => {
      btn.onclick = () => {
        const found = findItem(session, btn.dataset.itemId);
        if (!found) return;
        const active = window.PIQEliteTraining?.ensureSessionState?.(state, session);
        active.completed_sets[found.item.id] = Math.min(Number(found.item.sets || 0), Number(active.completed_sets[found.item.id] || 0) + 1);
        window.PIQEliteTraining?.startRestTimer?.(state, found.item.rest_sec || 60, found.item.id);
        persist('Set completed');
        renderTrain();
        renderHome();
        syncSessionBar();
      };
    });

    document.querySelectorAll('.btn-undo').forEach(btn => {
      btn.onclick = () => {
        const found = findItem(session, btn.dataset.itemId);
        if (!found) return;
        const active = window.PIQEliteTraining?.ensureSessionState?.(state, session);
        active.completed_sets[found.item.id] = Math.max(0, Number(active.completed_sets[found.item.id] || 0) - 1);
        persist('Set undone');
        renderTrain();
        renderHome();
      };
    });
  }

  function renderSettings() {
    if ($('sportSelect')) $('sportSelect').innerHTML = SPORTS.map(s => `<option value="${s.id}" ${s.id === state.profile?.sport ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('');
    updatePositionSelect();
    if ($('roleSelect')) $('roleSelect').value = state.profile?.role || 'athlete';
    if ($('experienceSelect')) $('experienceSelect').value = state.profile?.experience || 'intermediate';
    if ($('goalSelect')) $('goalSelect').value = state.profile?.goal || 'athleticism';

    const freq = state.profile?.frequency || 4;
    $$('#frequencyBtns button').forEach(btn => btn.classList.toggle('ghost', parseInt(btn.dataset.freq, 10) !== freq));
  }

  function updatePositionSelect() {
    const sport = state.profile?.sport || 'basketball';
    const positions = POSITIONS[sport] || [];
    const posSelect = $('positionSelect');
    if (!posSelect) return;
    posSelect.innerHTML = '<option value="">No position</option>' + positions.map(p => `<option value="${p.id}" ${p.id === state.profile?.position ? 'selected' : ''}>${p.label}</option>`).join('');
  }

  function renderInsights() {
    const pr = $('prTracker');
    const hist = $('trainingHistory');
    const sessions = (state.sessions || []).slice().reverse();
    const score = window.PIQEliteTraining?.computeScore?.(state) || { score: 0 };

    if (pr) {
      pr.innerHTML = `
        <div class="summary-card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px">
            <div>
              <div style="font-weight:800">PerformanceIQ Score</div>
              <div class="muted small">Rolling score from completion, volume, attendance, and streak.</div>
            </div>
            <div class="score-badge">PIQ ${score.score}</div>
          </div>
          <div class="summary-grid">
            <div class="summary-stat"><strong>${score.consistency || 0}</strong><span>Consistency</span></div>
            <div class="summary-stat"><strong>${score.volume || 0}</strong><span>Volume</span></div>
            <div class="summary-stat"><strong>${score.attendance || 0}</strong><span>Attendance</span></div>
            <div class="summary-stat"><strong>${score.streak || 0}</strong><span>Streak</span></div>
          </div>
        </div>
      `;
    }

    if (hist) {
      hist.innerHTML = sessions.length ? sessions.map(s => `
        <div class="metric-card" style="margin-bottom:10px">
          <div style="font-weight:800">${s.sessionType || 'session'} • ${new Date(s.logged_at || s.generated_at).toLocaleString()}</div>
          <div class="metric-label">${s.duration_min || 0} min • ${s.completion_pct || 0}% complete • Volume ${s.volume_score || 0} • PIQ ${s.piq_score || 0}</div>
        </div>
      `).join('') : '<div class="muted">No completed sessions yet.</div>';
    }
  }

  function updateRoleVisibility() {
    const role = state.profile?.role || 'athlete';
    const teamMode = state.profile?.team_mode || 'solo';
    document.body.setAttribute('data-role', role);
    $$('.coach-only').forEach(el => { el.hidden = role !== 'coach'; });
    $$('.team-only').forEach(el => { el.hidden = teamMode !== 'team'; });
  }

  function syncSessionBar() {
    const bar = $('sessionBar');
    if (!bar) return;
    const session = state.ui?.todaySession;
    const active = state.ui?.activeSession;
    const live = !!(session && active && active.session_id === session.id);

    bar.hidden = !live;
    if (!live) return;

    $('sessionSport').textContent = `${session.sport} • ${session.sessionType}`;

    clearInterval(restTimerInterval);
    const restEl = $('sessionRest');
    const runRest = () => {
      const remain = window.PIQEliteTraining?.restRemaining?.(state) || 0;
      if (restEl) {
        restEl.classList.toggle('is-active', remain > 0);
        restEl.innerHTML = remain > 0 ? `<span>Rest</span><strong>${remain}s</strong>` : '<span>Rest</span><strong>Ready</strong>';
      }
      if (remain <= 0 && state?.ui?.activeSession) {
        state.ui.activeSession.rest_end_at = null;
        state.ui.activeSession.rest_exercise_id = null;
      }
    };
    runRest();
    restTimerInterval = setInterval(runRest, 1000);
  }

  function startSession(session) {
    state.ui = state.ui || {};
    const active = window.PIQEliteTraining?.ensureSessionState?.(state, session);
    active.started_at = active.started_at || new Date().toISOString();
    persist('Session started');

    clearInterval(elapsedTimerInterval);
    const started = new Date(active.started_at).getTime();
    const tick = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - started) / 1000));
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      if ($('sessionTimer')) $('sessionTimer').textContent = `${mins}:${secs}`;
    };
    tick();
    elapsedTimerInterval = setInterval(tick, 1000);
    syncSessionBar();
    renderTrain();
    showView('train');
    toast('Session started');
  }

  function endSession() {
    const active = state.ui?.activeSession;
    if (!active) return;
    clearInterval(elapsedTimerInterval);
    clearInterval(restTimerInterval);
    const endTime = Date.now();
    const durationMin = Math.max(1, Math.round((endTime - new Date(active.started_at).getTime()) / 60000));
    showRpeModal(durationMin);
  }

  function showRpeModal(duration_min) {
    const backdrop = $('rpeBackdrop');
    const modal = $('rpeModal');
    if (backdrop) backdrop.hidden = false;
    if (modal) modal.setAttribute('aria-hidden', 'false');

    const rpeInput = $('rpeInput');
    const rpeValue = $('rpeValue');
    const rpeDesc = $('rpeDesc');
    const descriptions = {
      1: 'Very light — barely any effort', 2: 'Light — easy conversation', 3: 'Light — comfortable pace',
      4: 'Moderate — slightly challenging', 5: 'Moderate — steady effort', 6: 'Somewhat hard — can talk briefly',
      7: 'Hard effort — good stimulus', 8: 'Very hard — pushing limits', 9: 'Extremely hard — near max', 10: 'Maximum effort — all out'
    };

    if (rpeInput) {
      rpeInput.oninput = () => {
        const val = parseInt(rpeInput.value, 10);
        if (rpeValue) rpeValue.textContent = val;
        if (rpeDesc) rpeDesc.textContent = descriptions[val] || '';
      };
      rpeInput.dispatchEvent(new Event('input'));
    }

    const saveBtn = $('btnSaveRpe');
    const handler = () => {
      const rpe = parseInt($('rpeInput')?.value || '7', 10);
      logSession(duration_min, rpe);
      closeRpeModal();
      saveBtn?.removeEventListener('click', handler);
    };
    saveBtn?.addEventListener('click', handler);
    $('btnCloseRpe') && ($('btnCloseRpe').onclick = closeRpeModal);
  }

  function closeRpeModal() {
    if ($('rpeBackdrop')) $('rpeBackdrop').hidden = true;
    if ($('rpeModal')) $('rpeModal').setAttribute('aria-hidden', 'true');
  }

  function logSession(duration_min, rpe) {
    const session = state.ui?.todaySession;
    const active = state.ui?.activeSession;
    if (!session || !active) return;

    const completionPct = window.PIQEliteTraining?.computeCompletionPct?.(session, active) || 0;
    const volumeScore = window.PIQEliteTraining?.computeSessionVolume?.(session, active) || 0;
    const projectedScore = window.PIQEliteTraining?.computeScore?.(state)?.score || 0;

    const entry = {
      id: uid('log_'),
      session_id: session.id,
      sport: session.sport,
      sessionType: session.sessionType,
      duration_min,
      rpe,
      completion_pct: completionPct,
      volume_score: volumeScore,
      total_sets: window.PIQEliteTraining?.totalPlannedSets?.(session) || 0,
      completed_sets: window.PIQEliteTraining?.totalCompletedSets?.(active) || 0,
      piq_score: projectedScore,
      logged_at: new Date().toISOString(),
    };

    state.sessions = state.sessions || [];
    state.sessions.push(entry);
    if (window.dataStore?.updateStreak) window.dataStore.updateStreak();

    const finalScore = window.PIQEliteTraining?.computeScore?.(state)?.score || projectedScore;
    entry.piq_score = finalScore;

    state.ui.todaySession = null;
    state.ui.activeSession = null;
    if ($('sessionBar')) $('sessionBar').hidden = true;

    persist('Session logged');
    renderHome();
    renderTrain();
    renderInsights();
    toast(`Session logged • ${completionPct}% complete • PIQ ${finalScore}`);

    if (window.progressivePrompts?.afterLogSession) {
      setTimeout(() => window.progressivePrompts.afterLogSession(), 400);
    }
  }

  function bindUI() {
    $$('.nav-tab').forEach(tab => tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      if (view) {
        showView(view);
        if (view === 'insights') renderInsights();
        if (view === 'train') renderTrain();
      }
    }));

    $('btnEndSession')?.addEventListener('click', endSession);
    $('btnLogSession')?.addEventListener('click', endSession);

    $('btnGenTrain')?.addEventListener('click', () => {
      const sport = $('trainSportSelect')?.value || state.profile?.sport || 'basketball';
      const type = $('trainSessionType')?.value || 'practice';
      state.profile.preferred_session_type = type;
      const gen = generateWorkoutFor(sport, type, state.profile?.injuries || [], true);
      if (gen) {
        state.ui.todaySession = gen;
        persist('Session generated from Train');
        renderTrain();
        renderHome();
        toast('Elite training session ready');
      }
    });

    $('btnStartSession')?.addEventListener('click', () => {
      if (state.ui?.todaySession) startSession(state.ui.todaySession);
    });
    $('btnPushToToday')?.addEventListener('click', () => {
      renderHome();
      showView('home');
      toast('Session is already set as Today’s workout');
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
      renderHome();
      renderTrain();
    });
    $('positionSelect')?.addEventListener('change', e => {
      state.profile.position = e.target.value || null;
      persist('Position updated');
      renderHome();
    });
    $('experienceSelect')?.addEventListener('change', e => {
      state.profile.experience = e.target.value;
      state.profile.level = e.target.value;
      persist('Experience updated');
    });
    $('goalSelect')?.addEventListener('change', e => {
      state.profile.goal = e.target.value || 'athleticism';
      persist('Goal updated');
    });
    $$('#frequencyBtns button').forEach(btn => btn.addEventListener('click', () => {
      state.profile.frequency = parseInt(btn.dataset.freq, 10);
      persist('Frequency updated');
      renderSettings();
    }));

    $('btnEditEquipment')?.addEventListener('click', () => {
      window.progressivePrompts?.showEquipmentModal?.();
    });
    $('btnSaveProfile')?.addEventListener('click', () => { persist('Profile saved'); toast('Profile saved'); });

    $('btnAccount')?.addEventListener('click', () => showView('account'));
    $('btnHelp')?.addEventListener('click', () => {
      if ($('helpDrawer')) $('helpDrawer').classList.add('open');
      if ($('helpBackdrop')) $('helpBackdrop').hidden = false;
    });
    $('btnCloseHelp')?.addEventListener('click', () => {
      if ($('helpDrawer')) $('helpDrawer').classList.remove('open');
      if ($('helpBackdrop')) $('helpBackdrop').hidden = true;
    });

    $('btnCloseExercise')?.addEventListener('click', () => window.PIQEliteTraining?.closeExerciseModal?.());
    $('exerciseDetailBackdrop')?.addEventListener('click', () => window.PIQEliteTraining?.closeExerciseModal?.());
    $('btnCloseSwap')?.addEventListener('click', () => window.PIQEliteTraining?.closeSwapModal?.());
    $('swapBackdrop')?.addEventListener('click', () => window.PIQEliteTraining?.closeSwapModal?.());

    document.addEventListener('keydown', e => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        $('btnHelp')?.click();
      }
      if (e.key === 'Escape') {
        window.PIQEliteTraining?.closeExerciseModal?.();
        window.PIQEliteTraining?.closeSwapModal?.();
      }
    });
  }

  function hideSplash() {
    const splash = $('splash');
    if (!splash) return;
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.hidden = true;
      splash.style.display = 'none';
    }, 300);
  }

  function initApp() {
    state = getState();
    state.ui = state.ui || {};
    state.sessions = state.sessions || [];
    renderHome();
    renderTrain();
    renderSettings();
    renderInsights();
    bindUI();
    showView(state.ui.currentView || 'home');
    hideSplash();
  }

  function boot() {
    if (window.onboarding?.shouldShowOnboarding?.()) {
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
