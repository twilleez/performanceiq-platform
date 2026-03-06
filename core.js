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

    if (viewId === 'home') renderHome();
    if (viewId === 'train') renderTrain();
    if (viewId === 'wellness') renderWellness();
    if (viewId === 'nutrition') renderNutrition();
    if (viewId === 'team') renderTeam();
    if (viewId === 'insights') renderInsights();
    if (viewId === 'account') renderSettings();
  }

  function currentSubtitle() {
    const role = state.profile?.role || 'athlete';
    const sport = SPORTS.find(s => s.id === (state.profile?.sport || 'basketball'))?.label || (state.profile?.sport || 'Basketball');
    const position = state.profile?.position;
    const posLabel = POSITIONS[state.profile?.sport || 'basketball']?.find(p => p.id === position)?.label;
    return posLabel ? `${role} • ${sport} (${posLabel})` : `${role} • ${sport}`;
  }

  function titleCase(value = '') {
    return String(value || '').replace(/_/g, ' ').replace(/\w/g, m => m.toUpperCase());
  }

  function safeNum(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function average(list = []) {
    if (!list.length) return 0;
    return list.reduce((sum, item) => sum + Number(item || 0), 0) / list.length;
  }

  function formatShortDate(iso) {
    const d = iso ? new Date(iso) : new Date();
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function getRecentSessions(days = 7) {
    const cutoff = Date.now() - days * 86400000;
    return (state.sessions || []).filter(s => new Date(s.logged_at || s.generated_at || Date.now()).getTime() >= cutoff);
  }

  function getLatestWellness() {
    const arr = state.wellness?.checkins || [];
    return arr.length ? arr[arr.length - 1] : null;
  }

  function computeReadiness(checkin = null) {
    const c = checkin || getLatestWellness();
    const sleep = safeNum(c?.sleep, 7);
    const energy = safeNum(c?.energy, 7);
    const soreness = safeNum(c?.soreness, 3);
    const stress = safeNum(c?.stress, 4);
    const score = Math.round(clamp(((sleep * 10) + (energy * 11) + ((11 - soreness) * 10) + ((11 - stress) * 9)) / 4, 35, 99));
    let label = 'Moderate readiness';
    if (score >= 85) label = 'Ready to attack';
    else if (score >= 72) label = 'Solid training day';
    else if (score >= 60) label = 'Train with control';
    else label = 'Prioritize recovery';
    return { score, label, sleep, energy, soreness, stress };
  }

  function computeConsistencyWindow(days = 14) {
    const sessions = getRecentSessions(days);
    return Math.round((sessions.length / Math.max(1, days)) * 100);
  }

  function getWeeklyVolume() {
    return getRecentSessions(7).reduce((sum, s) => sum + safeNum(s.volume_score), 0);
  }

  function getAvgCompletion(days = 14) {
    const sessions = getRecentSessions(days);
    return sessions.length ? Math.round(average(sessions.map(s => safeNum(s.completion_pct)))) : 0;
  }

  function getAvgRpe(days = 14) {
    const sessions = getRecentSessions(days);
    return sessions.length ? average(sessions.map(s => safeNum(s.rpe))).toFixed(1) : '—';
  }

  function getMacroTargets() {
    const weight = safeNum(state.profile?.weight_lbs, 160);
    const protein = Math.round(weight * 0.85);
    const carbs = Math.round(weight * 1.9);
    const fats = Math.round(weight * 0.35);
    const calories = protein * 4 + carbs * 4 + fats * 9;
    return { protein, carbs, fats, calories };
  }

  function getTeamSnapshot() {
    const mode = state.profile?.team_mode || 'solo';
    const teamCode = state.profile?.team_code || 'PIQ-TEAM';
    const sessions = getRecentSessions(7);
    const attendance = sessions.length ? Math.min(100, 65 + sessions.length * 6) : 68;
    return {
      mode,
      teamCode,
      attendance,
      announcements: (state.team?.announcements || []).length || 2,
      athletes: (state.team?.teams?.[0]?.members?.length) || (mode === 'team' ? 14 : 1)
    };
  }

  function trainingFocusLine() {
    const goal = titleCase(state.profile?.goal || 'overall athleticism');
    const exp = titleCase(state.profile?.experience || state.profile?.level || 'intermediate');
    return `${goal} focus • ${exp} profile`;
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

  function renderDashboardRecent() {
    const wrap = $('dashboardRecent');
    if (!wrap) return;
    const sessions = (state.sessions || []).slice().reverse().slice(0, 4);
    wrap.innerHTML = sessions.length ? sessions.map(s => `
      <div class="activity-row">
        <div class="activity-icon">${s.completion_pct >= 85 ? '✓' : '•'}</div>
        <div>
          <div class="activity-title">${titleCase(s.sessionType || 'session')} • ${formatShortDate(s.logged_at || s.generated_at)}</div>
          <div class="activity-sub">${s.duration_min || 0} min • ${s.completion_pct || 0}% complete • RPE ${s.rpe || '—'}</div>
        </div>
        <div class="activity-score">PIQ ${s.piq_score || 0}</div>
      </div>
    `).join('') : '<div class="empty-state compact">Complete a session to start building your activity feed.</div>';
  }

  function renderHomeRail() {
    const readiness = computeReadiness();
    if ($('homeReadiness')) {
      $('homeReadiness').innerHTML = `
        <div class="rail-meter" style="--meter:${readiness.score}">
          <div class="ring-value">${readiness.score}</div>
          <div class="ring-label">${readiness.label}</div>
        </div>
        <div class="mini-grid">
          <div class="mini-stat"><strong>${readiness.sleep}/10</strong><span>Sleep</span></div>
          <div class="mini-stat"><strong>${readiness.energy}/10</strong><span>Energy</span></div>
          <div class="mini-stat"><strong>${readiness.soreness}/10</strong><span>Soreness</span></div>
          <div class="mini-stat"><strong>${readiness.stress}/10</strong><span>Stress</span></div>
        </div>
      `;
    }

    const score = window.PIQEliteTraining?.computeScore?.(state) || { score: 0, consistency: 0, volume: 0, attendance: 0, streak: 0 };
    if ($('homeScore')) {
      $('homeScore').innerHTML = `
        <div class="score-panel">
          <div>
            <div class="eyebrow">PerformanceIQ score</div>
            <div class="score-panel-value">${score.score}</div>
          </div>
          <div class="score-breakdown">
            <div><span>Consistency</span><strong>${score.consistency || 0}</strong></div>
            <div><span>Volume</span><strong>${score.volume || 0}</strong></div>
            <div><span>Attendance</span><strong>${score.attendance || 0}</strong></div>
            <div><span>Streak</span><strong>${score.streak || 0}</strong></div>
          </div>
        </div>
      `;
    }

    const snap = getTeamSnapshot();
    if ($('teamDashboard')) {
      $('teamDashboard').innerHTML = snap.mode === 'team' ? `
        <div class="team-stack">
          <div class="mini-stat wide"><strong>${snap.teamCode}</strong><span>Team code</span></div>
          <div class="mini-grid">
            <div class="mini-stat"><strong>${snap.athletes}</strong><span>Athletes</span></div>
            <div class="mini-stat"><strong>${snap.attendance}%</strong><span>Attendance</span></div>
            <div class="mini-stat"><strong>${snap.announcements}</strong><span>Updates</span></div>
            <div class="mini-stat"><strong>2</strong><span>Coach notes</span></div>
          </div>
          <div class="bullet-list">
            <div>Strength block posted for Thursday</div>
            <div>Coach note: emphasize landing quality and low stance</div>
          </div>
        </div>
      ` : `
        <div class="empty-state compact">
          <div class="empty-title">Solo mode</div>
          <div class="empty-copy">You are in solo training mode. Team calendar, coach notes, and announcements will appear here when you join a team.</div>
        </div>
      `;
    }
  }

  function renderTodayBlock() {
    const block = $('todayBlock');
    if (!block) return;
    const session = state.ui?.todaySession;

    if (!session) {
      block.innerHTML = `
        <div class="today-empty">
          <div>
            <div class="eyebrow">Today's training</div>
            <div class="today-empty-title">No session queued yet</div>
            <p class="muted">Generate an elite training session based on your sport, equipment, and goal profile.</p>
          </div>
          <div class="row gap wrap">
            <button class="btn" id="btnGenerateToday">Generate Workout</button>
            <button class="btn ghost" id="btnOpenTrain">Open Train</button>
          </div>
        </div>
      `;
      $('btnGenerateToday')?.addEventListener('click', () => {
        const gen = generateWorkoutFor(state.profile?.sport || 'basketball', state.profile?.preferred_session_type || 'practice', state.profile?.injuries || []);
        if (gen) {
          state.ui.todaySession = gen;
          persist('Today session generated');
          renderHome();
          renderTrain();
          toast('Workout ready');
        }
      });
      $('btnOpenTrain')?.addEventListener('click', () => showView('train'));
      return;
    }

    const blockBadges = (session.blocks || []).map(b => `<span class="chip">${titleCase(b.type)}</span>`).join('');
    const list = session.blocks.map(b => `<div class="agenda-row"><strong>${b.title}</strong><span>${(b.items || []).length} exercises • ${b.duration_min || 0} min</span></div>`).join('');
    block.innerHTML = `
      <div class="today-session-shell">
        <div class="today-session-main">
          <div class="eyebrow">Today's session</div>
          <div class="today-session-title">${titleCase(session.sessionType)} • ${titleCase(session.sport)}</div>
          <div class="today-session-meta">${session.duration_min || 0} min estimated • ${trainingFocusLine()}</div>
          <div class="chip-row">${blockBadges}</div>
          <div class="agenda-list">${list}</div>
        </div>
        <div class="today-session-side">
          <div class="focus-card">
            <span>Primary focus</span>
            <strong>${session.blocks?.[0]?.title || 'Movement quality'}</strong>
          </div>
          <div class="row gap wrap">
            <button class="btn" id="btnStartToday">Start Session</button>
            <button class="btn ghost" id="btnOpenTrain2">Open in Train</button>
            <button class="btn ghost" id="btnRegenerate">Refresh</button>
          </div>
        </div>
      </div>
    `;

    $('btnStartToday')?.addEventListener('click', () => startSession(session));
    $('btnOpenTrain2')?.addEventListener('click', () => showView('train'));
    $('btnRegenerate')?.addEventListener('click', () => {
      const gen = generateWorkoutFor(state.profile?.sport || 'basketball', state.profile?.preferred_session_type || 'practice', state.profile?.injuries || [], true);
      state.ui.todaySession = gen;
      persist('Session regenerated');
      renderHome();
      renderTrain();
      toast('New workout generated');
    });
  }

  function renderWeekOverview() {
    const wrap = $('weekOverview');
    if (!wrap) return;
    const recentMap = new Map((state.sessions || []).slice(-14).map(s => [formatShortDate(s.logged_at || s.generated_at), s]));
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const cards = Array.from({ length: 7 }, (_, offset) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - offset));
      const key = formatShortDate(d.toISOString());
      const hit = recentMap.get(key);
      return `
        <div class="day-tile ${hit ? 'is-hit' : ''}">
          <div class="day-tile-top">
            <span>${dayNames[d.getDay()]}</span>
            <strong>${d.getDate()}</strong>
          </div>
          <div class="day-tile-body">${hit ? titleCase(hit.sessionType || 'session') : 'Recovery / Off'}</div>
          <div class="day-tile-foot">${hit ? `PIQ ${hit.piq_score || 0}` : '—'}</div>
        </div>
      `;
    }).join('');
    wrap.innerHTML = `<div class="day-strip">${cards}</div>`;
  }

  function renderProgressMetrics() {
    const sessions = state.sessions || [];
    const weeklyVolume = getWeeklyVolume();
    const streak = state.onboarding?.streak_count || 0;
    const score = window.PIQEliteTraining?.computeScore?.(state)?.score || 0;
    const consistency = computeConsistencyWindow(14);
    const completion = getAvgCompletion(14);

    const host = $('progressMetrics');
    if (host) {
      host.innerHTML = `
        <div class="stat-card gradient-a">
          <div class="stat-label">Weekly volume</div>
          <div class="stat-value" id="statVolume">${weeklyVolume.toLocaleString()}</div>
          <div class="stat-foot">Last 7 days</div>
        </div>
        <div class="stat-card gradient-b">
          <div class="stat-label">Streak</div>
          <div class="stat-value" id="statStreak">${streak}</div>
          <div class="stat-foot">Consecutive active days</div>
        </div>
        <div class="stat-card gradient-c">
          <div class="stat-label">Sessions</div>
          <div class="stat-value" id="statSessions">${sessions.length}</div>
          <div class="stat-foot">Total logged</div>
        </div>
        <div class="stat-card gradient-d score">
          <div class="stat-label">PerformanceIQ</div>
          <div class="stat-value" id="statScore">${score}</div>
          <div class="stat-foot">Consistency ${consistency}% • Avg completion ${completion}%</div>
        </div>
      `;
    }

    const teamPill = $('teamPill');
    if (teamPill) teamPill.textContent = `Team: ${state.profile?.team_mode === 'team' ? (state.profile?.team_code || 'Linked') : 'Solo'}`;
  }

  function renderHome() {
    const homeSub = $('homeSub');
    if (homeSub) homeSub.textContent = currentSubtitle();

    const body = $('homeBody');
    if (body) {
      const now = new Date();
      body.innerHTML = `
        <div class="dashboard-shell">
          <section class="hero-panel card glass">
            <div>
              <div class="eyebrow">Athlete command center</div>
              <h2 class="hero-title">${now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
              <p class="hero-copy">${trainingFocusLine()} • ${currentSubtitle()}</p>
            </div>
            <div class="hero-actions row gap wrap">
              <button class="btn" id="heroGenerateBtn">Generate Session</button>
              <button class="btn ghost" id="heroInsightsBtn">View Insights</button>
            </div>
          </section>

          <div class="dashboard-grid">
            <div class="dashboard-main stack-16">
              <section class="card glass"><div id="todayBlock"></div></section>
              <section class="card glass">
                <div class="section-head"><div><div class="card-title">Performance snapshot</div><div class="section-sub">Your momentum over the last two weeks</div></div></div>
                <div class="grid4" id="progressMetrics"></div>
              </section>
              <section class="card glass">
                <div class="section-head"><div><div class="card-title">Week at a glance</div><div class="section-sub">Training rhythm and recovery spacing</div></div></div>
                <div id="weekOverview"></div>
              </section>
              <section class="card glass">
                <div class="section-head"><div><div class="card-title">Recent activity</div><div class="section-sub">Latest completed sessions and scores</div></div></div>
                <div id="dashboardRecent"></div>
              </section>
            </div>

            <aside class="dashboard-rail stack-16">
              <section class="card glass">
                <div class="section-head"><div><div class="card-title">Readiness</div><div class="section-sub">How prepared you look today</div></div></div>
                <div id="homeReadiness"></div>
              </section>
              <section class="card glass">
                <div class="section-head"><div><div class="card-title">Score breakdown</div><div class="section-sub">What is driving your PIQ score</div></div></div>
                <div id="homeScore"></div>
              </section>
              <section class="card glass team-only" id="teamSection">
                <div class="section-head"><div><div class="card-title">Team pulse</div><div class="section-sub">Coach layer and group signals</div></div></div>
                <div id="teamDashboard"></div>
              </section>
            </aside>
          </div>
        </div>
      `;
    }

    renderTodayBlock();
    renderWeekOverview();
    renderProgressMetrics();
    renderDashboardRecent();
    renderHomeRail();
    updateRoleVisibility();

    $('heroGenerateBtn')?.addEventListener('click', () => {
      const gen = generateWorkoutFor(state.profile?.sport || 'basketball', state.profile?.preferred_session_type || 'practice', state.profile?.injuries || [], true);
      if (gen) {
        state.ui.todaySession = gen;
        persist('Hero generated workout');
        renderHome();
        renderTrain();
      }
    });
    $('heroInsightsBtn')?.addEventListener('click', () => showView('insights'));
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
    const body = $('trainBody');
    if (!body) return;
    const session = state.ui?.todaySession;
    const score = window.PIQEliteTraining?.computeScore?.(state)?.score || 0;

    body.innerHTML = `
      <div class="stack-16">
        <section class="card glass builder-shell">
          <div class="builder-head">
            <div>
              <div class="eyebrow">Elite builder</div>
              <h2 class="builder-title">Design today's session</h2>
              <p class="builder-copy">Generate an adaptive session from your sport, equipment, and goal profile. Swaps, timers, and scoring stay active in the live workout.</p>
            </div>
            <div class="builder-score">PIQ ${score}</div>
          </div>
          <div class="builder-grid">
            <div class="field">
              <label for="trainSportSelect">Sport</label>
              <select id="trainSportSelect"></select>
            </div>
            <div class="field">
              <label for="trainSessionType">Session Type</label>
              <select id="trainSessionType">
                <option value="practice">Practice</option>
                <option value="strength">Strength</option>
                <option value="speed">Speed</option>
                <option value="conditioning">Conditioning</option>
                <option value="recovery">Recovery</option>
                <option value="competition_prep">Competition Prep</option>
              </select>
            </div>
            <div class="builder-actions row gap wrap">
              <button class="btn" id="btnGenTrain">Generate Session</button>
              ${session ? '<button class="btn ghost" id="btnStartSession">Start Session</button>' : ''}
              ${session ? '<button class="btn ghost" id="btnPushToToday">Pin to Dashboard</button>' : ''}
            </div>
          </div>
        </section>

        <section id="trainCardArea"></section>

        <section class="card glass ${session ? '' : 'is-empty'}" id="sessionActions" ${session ? '' : 'hidden'}>
          <div class="session-actions-bar">
            <div>
              <div class="card-title">Live controls</div>
              <div class="section-sub">Session timer, rest timer, swap options, and set tracking update in real time.</div>
            </div>
            <div class="row gap wrap">
              <button class="btn" id="btnStartSessionAlt">Start Session</button>
              <button class="btn ghost" id="btnPushToTodayAlt">Dashboard Focus</button>
            </div>
          </div>
        </section>
      </div>
    `;

    const sportSelect = $('trainSportSelect');
    if (sportSelect) sportSelect.innerHTML = SPORTS.map(s => `<option value="${s.id}" ${s.id === state.profile?.sport ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('');
    const sessionSelect = $('trainSessionType');
    if (sessionSelect) sessionSelect.value = state.profile?.preferred_session_type || 'practice';

    const cardArea = $('trainCardArea');
    if (!session) {
      cardArea.innerHTML = `
        <div class="card glass empty-state-panel">
          <div class="empty-state">
            <div class="empty-title">No elite session generated yet</div>
            <div class="empty-copy">Generate a session to unlock the exercise library, premium workout cards, swap modal, rest timer, progress tracking, and PerformanceIQ scoring.</div>
          </div>
        </div>
      `;
    } else {
      cardArea.innerHTML = trainSessionTemplate(session);
      bindTrainSessionEvents(session);
    }

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

    const start = () => { if (state.ui?.todaySession) startSession(state.ui.todaySession); };
    const pin = () => { showView('home'); toast('Pinned to your dashboard'); };
    $('btnStartSession')?.addEventListener('click', start);
    $('btnStartSessionAlt')?.addEventListener('click', start);
    $('btnPushToToday')?.addEventListener('click', pin);
    $('btnPushToTodayAlt')?.addEventListener('click', pin);
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

  function renderWellness() {
    const sub = $('wellnessSub');
    if (sub) sub.textContent = 'Recovery, workload, and readiness';
    const body = $('wellnessBody');
    if (!body) return;
    const latest = getLatestWellness();
    const ready = computeReadiness(latest);
    const avg7 = average((state.wellness?.checkins || []).slice(-7).map(c => computeReadiness(c).score));
    const acute = getWeeklyVolume();
    const chronic = Math.max(1, Math.round((getRecentSessions(28).reduce((sum, s) => sum + safeNum(s.volume_score), 0) / 4) || acute || 1));
    const acwr = (acute / chronic).toFixed(2);
    body.innerHTML = `
      <div class="wellness-grid">
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Today's readiness</div><div class="section-sub">Recovery-informed training guidance</div></div></div>
          <div class="readiness-hero">
            <div class="rail-meter large" style="--meter:${ready.score}"><div class="ring-value">${ready.score}</div><div class="ring-label">${ready.label}</div></div>
            <div class="wellness-copy">
              <div class="insight-banner">7-day average readiness: <strong>${Math.round(avg7 || ready.score)}</strong></div>
              <p class="muted">Use today's score to scale intensity, volume, and recovery. Lower readiness days should emphasize technical quality and cleaner movement patterns.</p>
              <div class="mini-grid">
                <div class="mini-stat"><strong>${ready.sleep}/10</strong><span>Sleep</span></div>
                <div class="mini-stat"><strong>${ready.energy}/10</strong><span>Energy</span></div>
                <div class="mini-stat"><strong>${ready.soreness}/10</strong><span>Soreness</span></div>
                <div class="mini-stat"><strong>${ready.stress}/10</strong><span>Stress</span></div>
              </div>
            </div>
          </div>
        </section>
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Daily check-in</div><div class="section-sub">Capture the inputs that drive readiness</div></div></div>
          <div class="wellness-inputs">
            <div class="field"><label>Sleep Quality <span id="sleepValue">${ready.sleep}</span></label><input type="range" min="1" max="10" value="${ready.sleep}" id="sleepInput" /></div>
            <div class="field"><label>Energy Level <span id="energyValue">${ready.energy}</span></label><input type="range" min="1" max="10" value="${ready.energy}" id="energyInput" /></div>
            <div class="field"><label>Muscle Soreness <span id="sorenessValue">${ready.soreness}</span></label><input type="range" min="1" max="10" value="${ready.soreness}" id="sorenessInput" /></div>
            <div class="field"><label>Stress Level <span id="stressValue">${ready.stress}</span></label><input type="range" min="1" max="10" value="${ready.stress}" id="stressInput" /></div>
          </div>
          <div class="row gap wrap" style="margin-top:12px"><button class="btn" id="btnSaveWellness">Save Check-in</button><span class="section-sub">Your newest check-in updates readiness immediately.</span></div>
        </section>
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Training load</div><div class="section-sub">Acute-to-chronic workload ratio</div></div></div>
          <div class="acwr-card">
            <div class="acwr-value">${acwr}</div>
            <div class="progress-bar"><div style="width:${clamp(Number(acwr) * 45, 10, 100)}%"></div></div>
            <div class="section-sub">Acute load: ${acute.toLocaleString()} • Chronic load baseline: ${chronic.toLocaleString()}</div>
          </div>
        </section>
      </div>
    `;

    [['sleepInput','sleepValue'],['energyInput','energyValue'],['sorenessInput','sorenessValue'],['stressInput','stressValue']].forEach(([inputId, valueId]) => {
      $(inputId)?.addEventListener('input', e => { if ($(valueId)) $(valueId).textContent = e.target.value; });
    });
    $('btnSaveWellness')?.addEventListener('click', () => {
      state.wellness = state.wellness || { checkins: [] };
      state.wellness.checkins.push({
        sleep: safeNum($('sleepInput')?.value, 7),
        energy: safeNum($('energyInput')?.value, 7),
        soreness: safeNum($('sorenessInput')?.value, 3),
        stress: safeNum($('stressInput')?.value, 4),
        created_at: new Date().toISOString()
      });
      persist('Wellness check-in saved');
      renderWellness();
      renderHome();
      toast('Wellness check-in saved');
    });
  }

  function renderNutrition() {
    const sub = $('nutritionSub');
    if (sub) sub.textContent = 'Fuel targets, hydration, and meal guidance';
    const body = $('nutritionBody');
    if (!body) return;
    const m = getMacroTargets();
    const mealEnabled = !!state.profile?.meal_plan_enabled;
    body.innerHTML = `
      <div class="nutrition-grid">
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Today's targets</div><div class="section-sub">Built from your saved bodyweight and athlete profile</div></div></div>
          <div id="macroTargets" class="macro-grid">
            <div class="summary-stat"><strong>${m.calories}</strong><span>Calories</span></div>
            <div class="summary-stat"><strong>${m.protein}g</strong><span>Protein</span></div>
            <div class="summary-stat"><strong>${m.carbs}g</strong><span>Carbs</span></div>
            <div class="summary-stat"><strong>${m.fats}g</strong><span>Fats</span></div>
          </div>
          <div class="section-sub" style="margin-top:12px">Hydration target: <strong>${Math.max(80, Math.round(safeNum(state.profile?.weight_lbs, 160) * 0.55))} oz</strong></div>
        </section>
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Performance plate</div><div class="section-sub">Simple meal composition for training days</div></div></div>
          <div class="plate-grid">
            <div class="plate-card"><strong>Pre-workout</strong><span>Easy carbs + lean protein 60–90 min before training.</span></div>
            <div class="plate-card"><strong>Post-workout</strong><span>Protein anchor + carbs + fluids to recover faster.</span></div>
            <div class="plate-card"><strong>All day</strong><span>Build around protein, fruit, vegetables, and steady hydration.</span></div>
          </div>
        </section>
        <section class="card glass" id="mealPlanSection" ${mealEnabled ? '' : 'hidden'}>
          <div class="section-head"><div><div class="card-title">Meal plan profile</div><div class="section-sub">Captured from onboarding</div></div></div>
          <div id="mealPlanContent" class="bullet-list">
            <div>Dietary restrictions: ${state.profile?.dietary_restrictions?.join(', ') || 'None saved'}</div>
            <div>Preferences: ${state.profile?.meal_preferences?.join(', ') || 'General performance meals'}</div>
            <div>Goal emphasis: ${titleCase(state.profile?.goal || 'overall athleticism')}</div>
          </div>
        </section>
        <section class="card glass ${mealEnabled ? 'is-hidden' : ''}" ${mealEnabled ? 'hidden' : ''}>
          <div class="empty-state compact"><div class="empty-title">Meal plan not enabled</div><div class="empty-copy">Your onboarding is preserved as-is. Turn meal plans on later when you want more detailed food structure.</div></div>
        </section>
      </div>
    `;
  }

  function renderTeam() {
    const sub = $('teamSub');
    if (sub) sub.textContent = state.profile?.team_mode === 'team' ? 'Team operations and coaching view' : 'Team features unlock after joining a team';
    const body = $('teamBody');
    if (!body) return;
    const snap = getTeamSnapshot();
    if (snap.mode !== 'team' && state.profile?.role !== 'coach') {
      body.innerHTML = `<div class="card glass empty-state-panel"><div class="empty-state"><div class="empty-title">No team connected</div><div class="empty-copy">You are in solo mode. When you join a team, this space becomes your calendar, announcements feed, coach notes hub, and shared workout center.</div></div></div>`;
      return;
    }
    body.innerHTML = `
      <div class="team-grid">
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Team overview</div><div class="section-sub">${snap.teamCode} • live snapshot</div></div></div>
          <div class="grid4">
            <div class="summary-stat"><strong>${snap.athletes}</strong><span>Athletes</span></div>
            <div class="summary-stat"><strong>${snap.attendance}%</strong><span>Attendance</span></div>
            <div class="summary-stat"><strong>${snap.announcements}</strong><span>Announcements</span></div>
            <div class="summary-stat"><strong>${getRecentSessions(7).length}</strong><span>Sessions this week</span></div>
          </div>
        </section>
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Coach notes</div><div class="section-sub">High-visibility communication</div></div></div>
          <div class="bullet-list"><div>Keep landing mechanics clean during power blocks.</div><div>Friday speed day is reduced volume before weekend competition.</div><div>Emphasize shoulder stability before every upper-body lift.</div></div>
        </section>
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Announcements</div><div class="section-sub">Group updates and reminders</div></div></div>
          <div class="activity-row"><div class="activity-icon">📢</div><div><div class="activity-title">Testing block opens Monday</div><div class="activity-sub">Vertical jump, sprint, and COD metrics will be updated.</div></div></div>
          <div class="activity-row"><div class="activity-icon">🗓</div><div><div class="activity-title">Thursday lift starts 30 minutes earlier</div><div class="activity-sub">Team warm-up begins promptly.</div></div></div>
        </section>
      </div>
    `;
  }

  function renderSettings() {
    const body = $('accountBody');
    if (!body) return;
    body.innerHTML = `
      <div class="settings-grid">
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Profile</div><div class="section-sub">Identity, role, and sport context</div></div></div>
          <div class="grid2">
            <div class="field"><label for="roleSelect">Role</label><select id="roleSelect"><option value="coach">Coach</option><option value="athlete">Athlete</option><option value="parent">Parent</option><option value="viewer">Viewer</option></select></div>
            <div class="field"><label for="sportSelect">Sport</label><select id="sportSelect"></select></div>
          </div>
          <div class="field" style="margin-top:12px"><label for="positionSelect">Position</label><select id="positionSelect"><option value="">No position</option></select></div>
          <div class="row gap wrap" style="margin-top:14px"><button class="btn" id="btnSaveProfile">Save Profile</button><button class="btn ghost" id="btnRunTour">Tour</button></div>
        </section>
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Training profile</div><div class="section-sub">Experience, goal, frequency, and equipment</div></div></div>
          <div class="grid2">
            <div class="field"><label for="experienceSelect">Experience</label><select id="experienceSelect"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
            <div class="field"><label for="goalSelect">Primary Goal</label><select id="goalSelect"><option value="">Select goal...</option><option value="strength">Strength</option><option value="speed">Speed</option><option value="endurance">Endurance</option><option value="muscle_gain">Muscle Gain</option><option value="athleticism">Overall Athleticism</option></select></div>
          </div>
          <div class="field" style="margin-top:12px"><label>Training Days / Week</label><div class="btn-group" id="frequencyBtns"><button class="btn ghost" data-freq="2">2</button><button class="btn ghost" data-freq="3">3</button><button class="btn ghost" data-freq="4">4</button><button class="btn ghost" data-freq="5">5</button><button class="btn ghost" data-freq="6">6</button></div></div>
          <div class="field" style="margin-top:12px"><label>Equipment Access</label><button class="btn ghost" id="btnEditEquipment">Edit Equipment</button></div>
        </section>
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Appearance</div><div class="section-sub">Theme and interface feel</div></div></div>
          <div class="field"><label>Theme</label><div class="btn-group" id="themeBtns"><button class="btn" data-theme="dark">Dark</button><button class="btn ghost" data-theme="light">Light</button><button class="btn ghost" data-theme="auto">Auto</button></div></div>
        </section>
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Data</div><div class="section-sub">Move or reset your local-first profile</div></div></div>
          <div class="row gap wrap"><button class="btn ghost" id="btnExport">Export</button><button class="btn ghost" id="btnImport">Import</button><button class="btn ghost danger" id="btnReset">Reset All</button></div>
        </section>
      </div>
    `;

    if ($('sportSelect')) $('sportSelect').innerHTML = SPORTS.map(s => `<option value="${s.id}" ${s.id === state.profile?.sport ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('');
    updatePositionSelect();
    if ($('roleSelect')) $('roleSelect').value = state.profile?.role || 'athlete';
    if ($('experienceSelect')) $('experienceSelect').value = state.profile?.experience || 'intermediate';
    if ($('goalSelect')) $('goalSelect').value = state.profile?.goal || 'athleticism';
    const freq = state.profile?.frequency || 4;
    $$('#frequencyBtns button').forEach(btn => btn.classList.toggle('ghost', parseInt(btn.dataset.freq, 10) !== freq));

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
      renderHome();
    });
    $$('#frequencyBtns button').forEach(btn => btn.addEventListener('click', () => {
      state.profile.frequency = parseInt(btn.dataset.freq, 10);
      persist('Frequency updated');
      renderSettings();
    }));
    $('btnEditEquipment')?.addEventListener('click', () => { window.progressivePrompts?.showEquipmentModal?.(); });
    $('btnSaveProfile')?.addEventListener('click', () => { persist('Profile saved'); toast('Profile saved'); });
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
    const score = window.PIQEliteTraining?.computeScore?.(state) || { score: 0, consistency: 0, volume: 0, attendance: 0, streak: 0 };
    const body = $('insightsBody');
    if (body) {
      body.innerHTML = `
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">PerformanceIQ score</div><div class="section-sub">Rolling score from completion, volume, attendance, and streak</div></div></div>
          <div id="prTracker"></div>
        </section>
        <section class="card glass">
          <div class="section-head"><div><div class="card-title">Training history</div><div class="section-sub">Recent sessions and execution quality</div></div></div>
          <div id="trainingHistory"></div>
        </section>
      `;
    }
    const prNow = $('prTracker');
    const histNow = $('trainingHistory');

    if (prNow) {
      prNow.innerHTML = `
        <div class="summary-card">
          <div class="summary-hero">
            <div><div class="eyebrow">Current score</div><div class="score-panel-value">${score.score}</div></div>
            <div class="summary-mini">Avg completion <strong>${getAvgCompletion(14)}%</strong></div>
            <div class="summary-mini">Avg RPE <strong>${getAvgRpe(14)}</strong></div>
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

    if (histNow) {
      histNow.innerHTML = sessions.length ? sessions.map(s => `
        <div class="activity-row history-row">
          <div class="activity-icon">${s.completion_pct >= 85 ? '▲' : '•'}</div>
          <div>
            <div class="activity-title">${titleCase(s.sessionType || 'session')} • ${new Date(s.logged_at || s.generated_at).toLocaleString()}</div>
            <div class="activity-sub">${s.duration_min || 0} min • ${s.completion_pct || 0}% complete • Volume ${s.volume_score || 0} • RPE ${s.rpe || '—'}</div>
          </div>
          <div class="activity-score">PIQ ${s.piq_score || 0}</div>
        </div>
      `).join('') : '<div class="empty-state compact">No completed sessions yet. Log sessions to build your trend line.</div>';
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
      if (view) showView(view);
    }));

    $('btnEndSession')?.addEventListener('click', endSession);
    $('btnLogSession')?.addEventListener('click', endSession);

    $('btnAccount')?.addEventListener('click', () => showView('account'));
    $('todayButton')?.addEventListener('click', () => showView('home'));
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
    renderWellness();
    renderNutrition();
    renderTeam();
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
