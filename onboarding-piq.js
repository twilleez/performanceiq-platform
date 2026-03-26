/* ============================================================
   PerformanceIQ — Marketing Onboarding System
   onboarding-piq.js  v2.0
   Vanilla JS · no framework · integrates with PIQ app shell
   ============================================================ */
(function () {
  'use strict';
  if (window.PIQOnboarding) return;

  /* ── storage ──────────────────────────────────────────── */
  const STORAGE_KEY = 'piq_onboarding_v1';

  const defaultState = {
    role:           'Athlete',
    track:          'solo',
    teamCode:       '',
    sport:          '',
    position:       '',
    goals:          [],
    experience:     '',
    phase:          '',
    daysPerWeek:    4,
    sessionMinutes: 60,
    height:         '',
    weight:         '',
    energy:         4,
    sleep:          4,
    soreness:       2,
    displayName:    ''
  };

  /* ── step manifest ────────────────────────────────────── */
  const steps = [
    { id: 'welcome',   label: 'Welcome',  sub: 'Why PerformanceIQ' },
    { id: 'role',      label: 'Profile',  sub: 'Role + training path' },
    { id: 'sport',     label: 'Sport',    sub: 'Sport + position' },
    { id: 'goals',     label: 'Goals',    sub: 'Priority outcomes' },
    { id: 'phase',     label: 'Season',   sub: 'Level + phase' },
    { id: 'schedule',  label: 'Schedule', sub: 'Time constraints' },
    { id: 'readiness', label: 'Baseline', sub: 'Body + readiness' },
    { id: 'summary',   label: 'Launch',   sub: 'Preview + activate' }
  ];

  /* ── data tables ──────────────────────────────────────── */
  const roleOptions = [
    { value: 'Athlete', icon: '🏃', title: 'Athlete',
      copy: 'Daily training, readiness tracking, session scores, and personal progress.' },
    { value: 'Coach',   icon: '📋', title: 'Coach',
      copy: 'Team visibility, roster status, session planning, and athlete tracking.' },
    { value: 'Parent',  icon: '👨‍👩‍👧', title: 'Parent',
      copy: 'Clear oversight, schedule awareness, readiness trends, and support tools.' },
    { value: 'Admin',   icon: '🏫', title: 'Admin',
      copy: 'Program oversight, compliance, staff coordination, and reporting.' },
    { value: 'Solo',    icon: '🎯', title: 'Solo',
      copy: 'Independent athlete flow with no team setup required.' }
  ];

  const trackOptions = [
    { value: 'team', icon: '👥', title: 'Join or manage a team',
      copy: 'Best for coach-led training groups, school programs, and shared schedules.' },
    { value: 'solo', icon: '⚡', title: 'Train solo',
      copy: 'Fastest setup for independent athletes, offseason work, and personal use.' }
  ];

  const sportOptions = [
    'Basketball','Football','Soccer','Track & Field',
    'Baseball','Softball','Volleyball','Tennis','Wrestling','General Performance'
  ];

  const positionMap = {
    'Basketball':         ['Point Guard','Shooting Guard','Wing','Forward','Center'],
    'Football':           ['QB','RB','WR','TE','LB','DB','OL','DL'],
    'Soccer':             ['Forward','Midfielder','Defender','Goalkeeper'],
    'Track & Field':      ['Sprint','Jump','Distance','Throw'],
    'Baseball':           ['Pitcher','Catcher','Infield','Outfield'],
    'Softball':           ['Pitcher','Catcher','Infield','Outfield'],
    'Volleyball':         ['Setter','Libero','Outside','Middle','Opposite'],
    'Tennis':             ['Singles','Doubles'],
    'Wrestling':          ['Lower Weight','Middle Weight','Upper Weight'],
    'General Performance':['Speed','Strength','Conditioning','Return to play']
  };

  const goalOptions = [
    'Strength','Speed','Power','Muscle Gain',
    'Conditioning','Mobility','Injury Reduction','Skill Support'
  ];

  const experienceOptions = ['Beginner','Intermediate','Advanced'];
  const phaseOptions      = ['Offseason','Preseason','In Season','Postseason'];

  /* role-specific marketing copy for callouts */
  const roleCallouts = {
    Athlete: { icon: '⚡', text: '<strong>Athlete view</strong> — your dashboard shows readiness ring, daily sessions, and a personal PIQ score that adapts as your training data grows.' },
    Coach:   { icon: '📊', text: '<strong>Coach view</strong> — roster-level readiness tiles, session builder, ACWR trends, and instant athlete flag alerts land on your main screen.' },
    Parent:  { icon: '🛡️', text: '<strong>Parent view</strong> — simplified readiness summary, schedule at a glance, and safe long-term development context built in.' },
    Admin:   { icon: '🏫', text: '<strong>Admin view</strong> — program reporting, multi-team oversight, staff access controls, and compliance summaries in one place.' },
    Solo:    { icon: '🎯', text: '<strong>Solo athlete view</strong> — same powerful tracking, no team overhead. Set your own schedule and go at your pace.' }
  };

  /* social proof chips displayed in the sidebar */
  const proofChips = [
    { icon: '📈', text: '<strong>ACWR-based</strong> load management built in from day one.' },
    { icon: '🔒', text: '<strong>All data stays local</strong> — nothing leaves the device without your consent.' },
    { icon: '⚙️', text: '<strong>No framework required</strong> — drops into any HTML app in two lines.' }
  ];

  /* ── runtime state ────────────────────────────────────── */
  let state       = loadState();
  let currentStep = 0;
  let root, panelEl, stepsEl, progressFill, progressText, progressCount, errorEl;

  /* ── persistence ─────────────────────────────────────── */
  function loadState() {
    try {
      return { ...defaultState, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
    } catch (_) { return { ...defaultState }; }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function completed() {
    return !!localStorage.getItem(STORAGE_KEY);
  }

  /* ── DOM mount ────────────────────────────────────────── */
  function mount() {
    if (document.getElementById('piqOnboardingRoot')) return;
    root = document.createElement('div');
    root.id = 'piqOnboardingRoot';
    root.className = 'piq-onboarding-root';
    root.innerHTML = `
      <div class="piq-onboarding-shell">

        <!-- ── sidebar ── -->
        <aside class="piq-onboarding-side">
          <div class="piq-onboarding-brand">
            <div class="piq-onboarding-brand-mark">PIQ</div>
            <div class="piq-onboarding-brand-copy">
              <h2>PerformanceIQ</h2>
              <p>Elite readiness tracking for athletes, coaches, and teams.</p>
            </div>
          </div>

          <div class="piq-onboarding-progress">
            <div class="piq-onboarding-progress-bar">
              <div class="piq-onboarding-progress-fill" id="piqProgressFill"></div>
            </div>
            <div class="piq-onboarding-progress-meta">
              <span id="piqProgressText">Setup</span>
              <span id="piqProgressCount">1 / ${steps.length}</span>
            </div>
          </div>

          <div class="piq-onboarding-step-list" id="piqStepList"></div>

          <div class="piq-onboarding-proof">
            <div class="piq-onboarding-proof-label">Why PIQ</div>
            <div class="piq-onboarding-proof-chips">
              ${proofChips.map(c => `
                <div class="piq-onboarding-proof-chip">
                  <span class="piq-onboarding-proof-chip-icon">${c.icon}</span>
                  <span class="piq-onboarding-proof-chip-text">${c.text}</span>
                </div>`).join('')}
            </div>
          </div>
        </aside>

        <!-- ── main ── -->
        <section class="piq-onboarding-main">
          <div class="piq-onboarding-hero">
            <div class="piq-onboarding-kicker" id="piqKicker">Performance setup</div>
            <button class="piq-onboarding-skip" type="button" id="piqSkipBtn">Skip for now</button>
          </div>
          <div class="piq-onboarding-scroll">
            <div class="piq-onboarding-panel" id="piqPanel"></div>
          </div>
          <div class="piq-onboarding-footer">
            <div>
              <div class="piq-onboarding-footer-copy">Your settings are stored locally and can be changed any time from the dashboard.</div>
              <div class="piq-onboarding-error" id="piqError"></div>
            </div>
            <div class="piq-onboarding-actions">
              <button class="piq-onboarding-btn secondary" type="button" id="piqBackBtn">Back</button>
              <button class="piq-onboarding-btn primary"   type="button" id="piqNextBtn">Next</button>
            </div>
          </div>
        </section>

      </div>`;

    document.body.appendChild(root);

    panelEl       = root.querySelector('#piqPanel');
    stepsEl       = root.querySelector('#piqStepList');
    progressFill  = root.querySelector('#piqProgressFill');
    progressText  = root.querySelector('#piqProgressText');
    progressCount = root.querySelector('#piqProgressCount');
    errorEl       = root.querySelector('#piqError');

    root.querySelector('#piqSkipBtn').addEventListener('click', skip);
    root.querySelector('#piqBackBtn').addEventListener('click', prevStep);
    root.querySelector('#piqNextBtn').addEventListener('click', nextStep);
    root.addEventListener('click', onRootClick);
    root.addEventListener('input', onRootInput);

    render();
  }

  /* ── delegated event handlers ─────────────────────────── */
  function onRootClick(e) {
    const roleCard  = e.target.closest('[data-role-value]');
    if (roleCard) {
      state.role  = roleCard.dataset.roleValue;
      if (state.role === 'Solo') state.track = 'solo';
      syncRoleTheme();
      render(); return;
    }

    const trackCard = e.target.closest('[data-track-value]');
    if (trackCard) { state.track = trackCard.dataset.trackValue; render(); return; }

    const pill = e.target.closest('[data-goal-value]');
    if (pill) {
      const v = pill.dataset.goalValue;
      state.goals = state.goals.includes(v)
        ? state.goals.filter(x => x !== v)
        : [...state.goals, v];
      render(); return;
    }

    const exp = e.target.closest('[data-exp-value]');
    if (exp) { state.experience = exp.dataset.expValue; render(); return; }

    const phase = e.target.closest('[data-phase-value]');
    if (phase) { state.phase = phase.dataset.phaseValue; render(); return; }
  }

  function onRootInput(e) {
    const t = e.target;
    if (!t.name) return;

    if (t.type === 'range') {
      state[t.name] = Number(t.value);
      /* update live readout */
      const out = t.closest('.piq-onboarding-range')?.querySelector('[data-range-output]');
      if (out) out.textContent = t.value;
      /* refresh stat tiles for schedule step without full re-render */
      if (t.name === 'daysPerWeek' || t.name === 'sessionMinutes') {
        const vol = root.querySelector('[data-weekly-vol]');
        if (vol) vol.textContent = state.daysPerWeek * state.sessionMinutes + ' min';
        const blk = root.querySelector('[data-rec-block]');
        if (blk) blk.textContent = recommendBlock();
      }
      return;
    }

    state[t.name] = t.value;
    if (t.name === 'sport' && !positionMap[t.value]?.includes(state.position)) {
      state.position = '';
    }
    /* re-render sport step to unlock position dropdown */
    if (t.name === 'sport') render();
  }

  /* ── theme sync ───────────────────────────────────────── */
  function syncRoleTheme() {
    if (root) root.dataset.role = state.role;
  }

  /* ── render engine ────────────────────────────────────── */
  function render() {
    syncRoleTheme();
    renderSteps();
    renderProgress();
    renderPanel();
    const backBtn = root.querySelector('#piqBackBtn');
    const nextBtn = root.querySelector('#piqNextBtn');
    if (backBtn) backBtn.disabled = currentStep === 0;
    if (nextBtn) nextBtn.textContent = currentStep === steps.length - 1 ? 'Launch Dashboard' : 'Continue';
    if (errorEl) errorEl.textContent = '';
  }

  function renderSteps() {
    if (!stepsEl) return;
    stepsEl.innerHTML = steps.map((step, i) => {
      const cls = [
        'piq-onboarding-step-chip',
        i === currentStep ? 'is-active' : '',
        i < currentStep  ? 'is-done'   : ''
      ].filter(Boolean).join(' ');
      const num = i < currentStep ? '✓' : String(i + 1);
      return `<div class="${cls}">
        <div class="piq-onboarding-step-num">${num}</div>
        <div class="piq-onboarding-step-copy">
          <strong>${escH(step.label)}</strong>
          <span>${escH(step.sub)}</span>
        </div>
      </div>`;
    }).join('');
  }

  function renderProgress() {
    if (!progressFill) return;
    progressFill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    progressText.textContent  = steps[currentStep].label;
    progressCount.textContent = `${currentStep + 1} / ${steps.length}`;
  }

  function renderPanel() {
    const id = steps[currentStep].id;
    const map = {
      welcome:   renderWelcome,
      role:      renderRole,
      sport:     renderSport,
      goals:     renderGoals,
      phase:     renderPhase,
      schedule:  renderSchedule,
      readiness: renderReadiness,
      summary:   renderSummary
    };
    (map[id] || renderSummary)();
  }

  /* ── step renderers ───────────────────────────────────── */

  /* STEP 0 — Welcome / marketing intro */
  function renderWelcome() {
    panelEl.innerHTML = `
      <div class="piq-onboarding-welcome-hero">
        <div class="piq-onboarding-welcome-eyebrow">Athlete readiness platform</div>
        <h1 class="piq-onboarding-welcome-title">
          Train smarter.<br><em>Perform better.</em>
        </h1>
      </div>
      <p class="piq-onboarding-subtitle">
        PerformanceIQ tracks daily readiness, session load, and recovery trends so athletes and
        coaches can make confident decisions — not guesses — about training intensity every day.
      </p>

      <div class="piq-onboarding-value-row">
        <div class="piq-onboarding-value-item">
          <span class="piq-onboarding-value-item-icon">🔋</span>
          <span class="piq-onboarding-value-item-title">Readiness Scoring</span>
          <p class="piq-onboarding-value-item-copy">Daily wellness inputs translated into a single actionable readiness number before each session.</p>
        </div>
        <div class="piq-onboarding-value-item">
          <span class="piq-onboarding-value-item-icon">📊</span>
          <span class="piq-onboarding-value-item-title">Load Management</span>
          <p class="piq-onboarding-value-item-copy">ACWR-based workload tracking flags over-training risk before it becomes an injury.</p>
        </div>
        <div class="piq-onboarding-value-item">
          <span class="piq-onboarding-value-item-icon">🏆</span>
          <span class="piq-onboarding-value-item-title">PIQ Score</span>
          <p class="piq-onboarding-value-item-copy">A composite performance intelligence score that grows with consistent training and recovery habits.</p>
        </div>
      </div>

      <div class="piq-onboarding-testimonial">
        <blockquote>"PerformanceIQ gave our staff real data to back up gut-feel decisions. Athlete buy-in
        went up immediately once they could see their own readiness scores."</blockquote>
        <cite>— Strength &amp; Conditioning Coach, Division I program</cite>
      </div>

      <div class="piq-onboarding-callout">
        <span class="piq-onboarding-callout-icon">⏱️</span>
        <span class="piq-onboarding-callout-text">
          <strong>Setup takes about 3 minutes.</strong> Your answers personalise the dashboard and
          establish a readiness baseline. Everything can be changed later from the settings panel.
        </span>
      </div>`;
  }

  /* STEP 1 — Role + track */
  function renderRole() {
    const callout = roleCallouts[state.role] || roleCallouts['Athlete'];
    panelEl.innerHTML = `
      <h1 class="piq-onboarding-title">Who is setting up this profile?</h1>
      <p class="piq-onboarding-subtitle">
        Choose the role that best matches how you will use PerformanceIQ. This controls initial
        dashboard emphasis, terminology, and the types of data shown most prominently.
      </p>

      <div class="piq-onboarding-grid cols-3">
        ${roleOptions.map(o => optionCard('role-value', state.role)(o)).join('')}
      </div>

      <div class="piq-onboarding-callout">
        <span class="piq-onboarding-callout-icon">${callout.icon}</span>
        <span class="piq-onboarding-callout-text">${callout.text}</span>
      </div>

      ${state.role !== 'Solo' ? `
      <div>
        <div class="piq-onboarding-helper" style="margin-bottom:10px;">Training context</div>
        <div class="piq-onboarding-grid">
          ${trackOptions.map(trackCard).join('')}
        </div>
      </div>

      ${state.track === 'team' ? `
        <div class="piq-onboarding-field" style="max-width:400px;">
          <label for="piqTeamCode">Team code or invite link <span style="font-weight:400;opacity:.6">(optional)</span></label>
          <input id="piqTeamCode" name="teamCode" value="${escH(state.teamCode)}"
                 placeholder="Paste your team code — or skip and add later" />
        </div>` : ''}` : ''}`;
  }

  /* STEP 2 — Sport + position */
  function renderSport() {
    const positions = positionMap[state.sport] || [];
    panelEl.innerHTML = `
      <h1 class="piq-onboarding-title">Match the program to your sport.</h1>
      <p class="piq-onboarding-subtitle">
        Sport selection improves training emphasis language, session naming, and dashboard relevance
        from the very first workout. Position refines load norms and drill categorisation.
      </p>

      <div class="piq-onboarding-grid">
        <div class="piq-onboarding-field">
          <label for="piqSport">Primary sport</label>
          <select id="piqSport" name="sport">
            <option value="">Select sport…</option>
            ${sportOptions.map(s =>
              `<option value="${escA(s)}" ${state.sport === s ? 'selected' : ''}>${escH(s)}</option>`
            ).join('')}
          </select>
        </div>

        <div class="piq-onboarding-field">
          <label for="piqPosition">Position or event group</label>
          <select id="piqPosition" name="position" ${!positions.length ? 'disabled' : ''}>
            <option value="">${positions.length ? 'Select position…' : 'Choose sport first'}</option>
            ${positions.map(p =>
              `<option value="${escA(p)}" ${state.position === p ? 'selected' : ''}>${escH(p)}</option>`
            ).join('')}
          </select>
        </div>
      </div>

      <div class="piq-onboarding-callout">
        <span class="piq-onboarding-callout-icon">📍</span>
        <span class="piq-onboarding-callout-text">
          <strong>Not listed?</strong> Choose <em>General Performance</em> — it covers speed,
          strength, conditioning, and return-to-play templates applicable to any sport.
        </span>
      </div>`;
  }

  /* STEP 3 — Goals */
  function renderGoals() {
    const remaining = Math.max(0, 4 - state.goals.length);
    panelEl.innerHTML = `
      <h1 class="piq-onboarding-title">Set the outcomes that matter most right now.</h1>
      <p class="piq-onboarding-subtitle">
        Up to four focus areas drive training emphasis, session language, and future
        recommendations. You can update these at the start of any new training block.
      </p>

      <div class="piq-onboarding-pill-row">
        ${goalOptions.map(goal =>
          `<button class="piq-onboarding-pill ${state.goals.includes(goal) ? 'is-selected' : ''}"
                  type="button" data-goal-value="${escA(goal)}">${escH(goal)}</button>`
        ).join('')}
      </div>

      <div class="piq-onboarding-helper ${state.goals.length > 0 ? 'accent' : ''}">
        ${state.goals.length === 0
          ? 'Select at least one goal to continue.'
          : state.goals.length >= 4
            ? '✓ 4 goals set — your dashboard focus is locked in.'
            : `${state.goals.length} selected · ${remaining} more recommended`}
      </div>

      ${state.goals.length > 0 ? `
      <div class="piq-onboarding-callout">
        <span class="piq-onboarding-callout-icon">🎯</span>
        <span class="piq-onboarding-callout-text">
          Leading goal: <strong>${escH(state.goals[0])}</strong> — this will anchor session naming
          and the primary PIQ improvement axis in the dashboard.
        </span>
      </div>` : ''}`;
  }

  /* STEP 4 — Experience + phase */
  function renderPhase() {
    panelEl.innerHTML = `
      <h1 class="piq-onboarding-title">Align the plan with training age and season.</h1>
      <p class="piq-onboarding-subtitle">
        These two selections give the app the context it needs to calibrate whether opening
        recommendations should be aggressive, moderate, or conservative — protecting athletes
        who are newer to structured load tracking.
      </p>

      <div class="piq-onboarding-grid">
        <div>
          <div class="piq-onboarding-helper" style="margin-bottom:10px;">Training experience</div>
          <div class="piq-onboarding-grid cols-3">
            ${experienceOptions.map(v => selectCard('exp-value', v, state.experience)).join('')}
          </div>
        </div>
        <div>
          <div class="piq-onboarding-helper" style="margin-bottom:10px;">Current season phase</div>
          <div class="piq-onboarding-grid cols-3">
            ${phaseOptions.map(v => selectCard('phase-value', v, state.phase)).join('')}
          </div>
        </div>
      </div>

      ${state.experience === 'Beginner' ? `
      <div class="piq-onboarding-callout">
        <span class="piq-onboarding-callout-icon">🛡️</span>
        <span class="piq-onboarding-callout-text">
          <strong>Beginner mode active.</strong> Opening recommendations will apply conservative
          volume caps and longer adaptation windows — aligned with youth and novice safety guidelines
          from the NSCA and ACSM.
        </span>
      </div>` : ''}

      ${state.phase === 'In Season' ? `
      <div class="piq-onboarding-callout">
        <span class="piq-onboarding-callout-icon">⚠️</span>
        <span class="piq-onboarding-callout-text">
          <strong>In-Season flag set.</strong> PIQ will weight recovery and readiness signals more
          heavily than training load accumulation — prioritising availability and competition readiness.
        </span>
      </div>` : ''}`;
  }

  /* STEP 5 — Schedule */
  function renderSchedule() {
    const vol = state.daysPerWeek * state.sessionMinutes;
    panelEl.innerHTML = `
      <h1 class="piq-onboarding-title">Build around the time the athlete actually has.</h1>
      <p class="piq-onboarding-subtitle">
        Realistic constraints prevent over-prescription. Enter the schedule that is genuinely
        sustainable — the system adapts recommendations to fit the window, not the other way around.
      </p>

      <div class="piq-onboarding-grid">
        ${rangeCard('Training days per week', 'days', 'daysPerWeek', state.daysPerWeek, 2, 7)}
        ${rangeCard('Minutes per session', 'min', 'sessionMinutes', state.sessionMinutes, 30, 120, 5)}
      </div>

      <div class="piq-onboarding-summary">
        <div class="piq-onboarding-stat">
          <strong>Weekly training volume</strong>
          <span data-weekly-vol>${vol} min</span>
        </div>
        <div class="piq-onboarding-stat">
          <strong>Recommended opening block</strong>
          <span data-rec-block>${recommendBlock()}</span>
        </div>
      </div>

      <div class="piq-onboarding-callout">
        <span class="piq-onboarding-callout-icon">📐</span>
        <span class="piq-onboarding-callout-text">
          <strong>${vol >= 300 ? 'High-structure block recommended.' : vol >= 180 ? 'Balanced block recommended.' : 'Compressed essentials block recommended.'}</strong>
          ${vol < 180
            ? 'Under 180 min/week: PIQ will focus on session quality over volume accumulation.'
            : vol >= 300
              ? 'Above 300 min/week: ACWR monitoring and recovery flags are enabled by default.'
              : 'A balanced block covers strength, conditioning, and skill work within your window.'}
        </span>
      </div>`;
  }

  /* STEP 6 — Baseline readiness */
  function renderReadiness() {
    panelEl.innerHTML = `
      <h1 class="piq-onboarding-title">Capture a simple baseline before the first dashboard.</h1>
      <p class="piq-onboarding-subtitle">
        These self-reported inputs provide an opening readiness estimate only. They do not replace
        medical or clinical evaluation and are never used to make health decisions.
      </p>

      <div class="piq-onboarding-grid">
        <div class="piq-onboarding-field">
          <label for="piqDisplayName">Display name</label>
          <input id="piqDisplayName" name="displayName"
                 value="${escH(state.displayName)}"
                 placeholder="How should the dashboard greet you?" />
        </div>
        <div class="piq-onboarding-grid">
          <div class="piq-onboarding-field">
            <label for="piqHeight">Height</label>
            <input id="piqHeight" name="height"
                   value="${escH(state.height)}" placeholder="5′10 or 178 cm" />
          </div>
          <div class="piq-onboarding-field">
            <label for="piqWeight">Weight</label>
            <input id="piqWeight" name="weight"
                   value="${escH(state.weight)}" placeholder="165 lb or 75 kg" />
          </div>
        </div>
      </div>

      ${rangeCard('Energy level today', 'out of 5', 'energy',   state.energy,   1, 5, 1)}
      ${rangeCard('Sleep quality',      'out of 5', 'sleep',    state.sleep,    1, 5, 1)}
      ${rangeCard('Soreness level',     'out of 5 (higher = more sore)', 'soreness', state.soreness, 1, 5, 1)}

      <div class="piq-onboarding-callout">
        <span class="piq-onboarding-callout-icon">ℹ️</span>
        <span class="piq-onboarding-callout-text">
          <strong>Readiness calculation preview:</strong> these three sliders feed into a weighted
          composite. Energy and sleep are positive contributors; soreness is inverted.
          The formula is: <code>((energy + sleep + (6 − soreness)) / 15) × 100</code>.
          Your current estimate: <strong>${calcReadiness()}%</strong>.
        </span>
      </div>`;
  }

  /* STEP 7 — Summary / launch */
  function renderSummary() {
    const readiness = calcReadiness();
    const piq       = calcPIQBaseline();
    const pct       = `${piq}%`;

    panelEl.innerHTML = `
      <h1 class="piq-onboarding-title">Your profile is ready. Let's launch.</h1>
      <p class="piq-onboarding-subtitle">
        Review the setup below. Everything saved here will be visible on your dashboard immediately —
        and can be edited any time from the settings panel.
      </p>

      <div class="piq-onboarding-launch-score" style="--piq-ring-pct:${piq * 3.6}deg">
        <div class="piq-onboarding-launch-ring">
          <span class="piq-onboarding-launch-ring-val">${piq}</span>
        </div>
        <div class="piq-onboarding-launch-copy">
          <h4>PIQ Baseline Score: ${piq}</h4>
          <p>Calculated from your readiness inputs (45%), schedule commitment (35%), and
          goal breadth (20%). This score updates every day you log a session.</p>
        </div>
      </div>

      <div class="piq-onboarding-summary">
        <div class="piq-onboarding-stat">
          <strong>Role</strong>
          <span>${escH(labelRole())}</span>
        </div>
        <div class="piq-onboarding-stat">
          <strong>Sport profile</strong>
          <span>${escH(state.sport || 'Not set')}${state.position ? ` · ${escH(state.position)}` : ''}</span>
        </div>
        <div class="piq-onboarding-stat">
          <strong>Schedule</strong>
          <span>${state.daysPerWeek}d × ${state.sessionMinutes}min</span>
        </div>
        <div class="piq-onboarding-stat">
          <strong>Weekly volume</strong>
          <span>${state.daysPerWeek * state.sessionMinutes} min</span>
        </div>
        <div class="piq-onboarding-stat">
          <strong>Readiness baseline</strong>
          <span class="highlight">${readiness}%</span>
        </div>
        <div class="piq-onboarding-stat">
          <strong>Season phase</strong>
          <span>${escH(state.phase || 'Not set')}</span>
        </div>
      </div>

      <div class="piq-onboarding-grid">
        <div class="piq-onboarding-summary-card">
          <h3>First dashboard changes</h3>
          <ul>
            <li><strong>Role badge</strong> → ${escH(labelRole())}</li>
            <li><strong>Greeting</strong> → ${escH(state.displayName || 'login name')}</li>
            <li><strong>Training emphasis</strong> → ${escH((state.goals[0] || 'general performance').toLowerCase())}</li>
            <li><strong>Readiness ring</strong> → ${readiness}%</li>
          </ul>
        </div>
        <div class="piq-onboarding-summary-card">
          <h3>Stored locally</h3>
          <ul>
            <li>Role, sport, position, goals, schedule, phase</li>
            <li>Readiness baseline (energy · sleep · soreness)</li>
            <li>Key: <strong>${STORAGE_KEY}</strong> in localStorage</li>
            <li>No framework required to read or extend</li>
          </ul>
        </div>
      </div>`;
  }

  /* ── card / component helpers ─────────────────────────── */

  function optionCard(attr, selected) {
    return function (item) {
      const sel = selected === item.value;
      return `<button type="button"
        class="piq-onboarding-option ${sel ? 'is-selected' : ''}"
        data-${attr}="${escA(item.value)}">
        <span class="piq-onboarding-option-icon">${item.icon}</span>
        <span class="piq-onboarding-option-title">${escH(item.title)}</span>
        <span class="piq-onboarding-option-copy">${escH(item.copy)}</span>
      </button>`;
    };
  }

  function trackCard(item) {
    const sel = state.track === item.value;
    return `<button type="button"
      class="piq-onboarding-card ${sel ? 'is-selected' : ''}"
      data-track-value="${escA(item.value)}">
      <span class="piq-onboarding-option-icon">${item.icon}</span>
      <span class="piq-onboarding-option-title">${escH(item.title)}</span>
      <span class="piq-onboarding-option-copy">${escH(item.copy)}</span>
    </button>`;
  }

  function selectCard(attr, value, selected) {
    const sel = selected === value;
    return `<button type="button"
      class="piq-onboarding-card ${sel ? 'is-selected' : ''}"
      data-${attr}="${escA(value)}">
      <span class="piq-onboarding-option-title">${escH(value)}</span>
    </button>`;
  }

  function rangeCard(title, unit, name, value, min, max, step = 1) {
    return `<div class="piq-onboarding-range">
      <div class="piq-onboarding-range-top">
        <strong>${escH(title)}</strong>
        <span>${escH(unit)} · <em data-range-output>${value}</em> / ${max}</span>
      </div>
      <input type="range" min="${min}" max="${max}" step="${step}" name="${name}" value="${value}" />
    </div>`;
  }

  /* ── calculations ─────────────────────────────────────── */

  function calcReadiness() {
    return Math.round(((state.energy + state.sleep + (6 - state.soreness)) / 15) * 100);
  }

  function calcPIQBaseline() {
    const r = calcReadiness();
    const s = Math.min(100, Math.round((state.daysPerWeek / 5) * 100));
    const g = Math.min(100, 50 + state.goals.length * 10);
    return Math.round(r * 0.45 + s * 0.35 + g * 0.20);
  }

  function recommendBlock() {
    const m = state.daysPerWeek * state.sessionMinutes;
    if (m >= 300) return 'High-structure block';
    if (m >= 180) return 'Balanced block';
    return 'Compressed essentials';
  }

  function labelRole() {
    return state.role === 'Solo' ? 'Solo Athlete' : state.role;
  }

  /* ── validation ───────────────────────────────────────── */
  function validateStep() {
    const id = steps[currentStep].id;
    if (id === 'sport'  && !state.sport)                        return 'Choose a sport before continuing.';
    if (id === 'goals'  && state.goals.length === 0)            return 'Select at least one goal.';
    if (id === 'phase'  && (!state.experience || !state.phase)) return 'Choose both experience level and season phase.';
    return '';
  }

  /* ── navigation ───────────────────────────────────────── */
  function nextStep() {
    const err = validateStep();
    if (err) { errorEl.textContent = err; return; }
    if (currentStep < steps.length - 1) { currentStep++; render(); return; }
    finish();
  }

  function prevStep() {
    if (currentStep === 0) return;
    currentStep--;
    render();
  }

  function skip() {
    root.classList.remove('is-open');
  }

  function finish() {
    saveState();
    applyStateToCurrentApp();
    root.classList.remove('is-open');
  }

  /* ── app integration bridge ───────────────────────────── */
  function applyStateToCurrentApp() {
    try {
      /* role badge */
      const navRole = document.getElementById('navRole');
      if (navRole) navRole.textContent = labelRole();

      /* dashboard greeting */
      const headerName = document.querySelector('#v-dashboard .page-header h1 span');
      if (headerName && state.displayName) headerName.textContent = state.displayName;

      /* dashboard subtitle bar */
      const headerMeta = document.querySelector('#v-dashboard .page-header p');
      if (headerMeta) {
        const parts = [];
        if (state.sport)          parts.push(state.sport);
        if (state.phase)          parts.push(state.phase);
        if (state.position)       parts.push(state.position);
        if (state.daysPerWeek && state.sessionMinutes)
          parts.push(`${state.daysPerWeek}d · ${state.sessionMinutes}min`);
        if (parts.length) headerMeta.textContent = parts.join(' · ');
      }

      /* readiness ring */
      const ringNum = document.querySelector('.ring-num');
      if (ringNum) ringNum.textContent = String(calcReadiness());

      /* PIQ score tile */
      const piqScore = document.querySelector('.kpi-card .kpi-val.g');
      if (piqScore) piqScore.textContent = String(calcPIQBaseline());
    } catch (_) {}
  }

  /* auto-fill display name from login email if blank */
  function autoFillFromSplash() {
    const email = document.getElementById('loginEmail')?.value || '';
    const clean = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
    if (!state.displayName && clean) {
      state.displayName = clean.replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  /* ── public API ───────────────────────────────────────── */
  function open(force) {
    mount();
    state = loadState();
    autoFillFromSplash();
    currentStep = 0;
    render();
    root.classList.add('is-open');
    if (force) return;
  }

  function boot() {
    mount();
    applyStateToCurrentApp();

    /* hook login button — open onboarding on first entry */
    const enterBtn = document.querySelector('.btn-primary');
    if (enterBtn && !enterBtn.dataset.piqBound) {
      enterBtn.dataset.piqBound = '1';
      enterBtn.addEventListener('click', function () {
        setTimeout(function () {
          if (!completed()) open(true);
          else applyStateToCurrentApp();
        }, 50);
      }, true);
    }

    /* add Guided setup link on splash screen */
    const splash = document.getElementById('splash');
    if (splash && !completed()) {
      const createLink = splash.querySelector('.splash-foot a');
      if (createLink && !document.getElementById('piqLaunchOnboarding')) {
        const btn = document.createElement('a');
        btn.href = '#';
        btn.id   = 'piqLaunchOnboarding';
        btn.textContent = 'Guided setup';
        btn.style.cssText = 'margin-left:10px;color:var(--green,#39e66b);font-weight:600;';
        btn.addEventListener('click', function (e) { e.preventDefault(); open(true); });
        createLink.parentNode.appendChild(btn);
      }
    }
  }

  /* ── escape helpers (XSS prevention) ─────────────────── */
  function escH(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function escA(v) { return escH(v); }

  /* ── export ───────────────────────────────────────────── */
  window.PIQOnboarding = {
    open,
    boot,
    getState: function () { return { ...loadState() }; },
    reset:    function () { localStorage.removeItem(STORAGE_KEY); state = { ...defaultState }; }
  };

  /* auto-boot */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
