// core.js — v3.0.0 (Phase 3.1 — full production block)
// Features:
// - Sport picker fixed (readable dropdowns assumed styled in CSS)
// - Today one-button workflow: Generate → Start timer → Log → Done
// - Session types + session-based workout generation
// - Sport-specific microblocks (skills) + strength exercises + substitutions
// - Injury-friendly program templates (explicit substitutions and reduced load)
// - Periodization wizard (12-week generator) + push current day's sessions to Today
// - Data Management hooks: export/import/reset + QA grade
// - Insights rollups (simple weekly minutes + load, streaks)
// - Persist via window.dataStore (offline-first)
// - No cloud/supabase blocking — cloud code lives elsewhere and will be reintroduced later
(function () {
  "use strict";
  if (window.__PIQ_CORE_V3__) return;
  window.__PIQ_CORE_V3__ = true;

  // ---------- Short aliases ----------
  const $ = (id) => document.getElementById(id);
  const nowISO = () => new Date().toISOString();

  // ---------- Constants ----------
  const VIEWS  = ["home", "team", "train", "profile"];
  const SPORTS = ["basketball", "football", "soccer", "baseball", "volleyball", "track"];

  // ---------- Load state ----------
  let state = (window.dataStore?.load) ? window.dataStore.load() : null;
  if (!state) {
    state = {
      meta: { version: "3.0.0", updated_at: nowISO() },
      profile: {
        role: "coach",
        sport: "basketball",
        preferred_session_type: "strength",
        injuries: [],
        weight_lbs: 160,
        goal: "maintain",
        activity: "med"
      },
      team: { teams: [], active_team_id: null },
      sessions: [],
      periodization: { plan: null, updated_at: null },
      insights: { weekly: [], updated_at: null },
      ui: { view: "home" }
    };
    window.dataStore?.save?.(state);
  }

  // ---------- Utilities ----------
  function persist(msg) {
    try {
      if (window.dataStore?.save) {
        window.dataStore.save(state);
        state.meta = state.meta || {};
        state.meta.updated_at = nowISO();
      }
      if (msg) toast(msg);
    } catch (e) {
      console.error("Persist failed", e);
      toast("Save failed");
    }
    applyStatusFromMeta();
  }

  // Debounced persist — avoids redundant writes on rapid state changes (e.g. showView)
  let _persistTimer = null;
  function persistDebounced(msg, ms = 300) {
    clearTimeout(_persistTimer);
    _persistTimer = setTimeout(() => persist(msg), ms);
  }

  let _toastTimer = null;
  function toast(msg, ms = 2200) {
    const t = $("toast");
    if (!t) { console.log("toast:", msg); return; }
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const MIN = 60_000, HR = 3_600_000, DAY = 86_400_000;
    if (diff < MIN)  return "just now";
    if (diff < HR)   return Math.round(diff / MIN)  + "m ago";
    if (diff < DAY)  return Math.round(diff / HR)   + "h ago";
    return Math.round(diff / DAY) + "d ago";
  }

  /** Compact random ID with optional prefix */
  function uid(prefix = "") {
    return (prefix ? prefix + "_" : "") + Math.random().toString(36).slice(2, 9);
  }

  // ---------- Status pill ----------
  function setDataStatusLabel(text, color) {
    const dot = $("saveDot");
    const txt = $("saveText");
    if (!dot || !txt) return;
    dot.style.background = color || "var(--ok)";
    txt.textContent = text || "Saved";
  }

  function applyStatusFromMeta() {
    setDataStatusLabel("Local saved", "var(--ok)");
  }

  // ---------- Exercise / microblock data ----------
  const EXERCISE_LIB = {
    strength: {
      split_squat:         { title: "Split Squat",          cue: "3x6-8 per leg", load: "moderate",  subs: { knee: "reverse_lunge",            hamstring: "single_leg_deadlift" } },
      rdl:                 { title: "Romanian Deadlift",    cue: "3x6-8",         load: "moderate",  subs: { back: "good_mornings",             hamstring: "bridge" } },
      push_press:          { title: "Push Press",           cue: "3x5",           load: "high",      subs: { shoulder: "seated_dumbbell_press", injury: "band_press" } },
      trap_bar_deadlift:   { title: "Trap Bar Deadlift",    cue: "3x4-6",         load: "high",      subs: { back: "kb_deadlift" } },
      goblet_squat:        { title: "Goblet Squat",         cue: "3x8-10",        load: "moderate",  subs: { knee: "box_squat" } },
      single_leg_deadlift: { title: "Single-Leg RDL",       cue: "3x6 per leg",   load: "moderate",  subs: { balance: "rack_step_down" } },
      bench:               { title: "Bench Press",          cue: "3x5-8",         load: "high",      subs: { shoulder: "dumbbell_press" } },
      row:                 { title: "Bent-Over Row",        cue: "3x8",           load: "moderate",  subs: { back: "band_row" } }
    },
    plyo: {
      approach_jumps: { title: "Approach Jumps", cue: "6x",  load: "explosive", subs: { knee: "box_jumps_low" } },
      lateral_bounds: { title: "Lateral Bounds", cue: "4x6", load: "explosive", subs: { ankle: "lateral_step_ups" } }
    },
    conditioning: {
      suicides:   { title: "Court Suicides", cue: "5 repeats", load: "high",     subs: { injury: "bike_intervals" } },
      tempo_runs: { title: "Tempo Runs",     cue: "6x200m",    load: "moderate", subs: { ankle: "rower" } }
    }
  };

  const SPORT_MICROBLOCKS = {
    basketball: {
      shooting: [
        { name: "Catch & Shoot",       reps: "5 sets x 10", cue: "Pocket, quick release",  load: "skill" },
        { name: "Pull-up 3s",          reps: "4 sets x 8",  cue: "create space, set feet", load: "skill" }
      ],
      ball_handling: [
        { name: "Two-Ball Stationary", reps: "6 min",  cue: "soft hands", load: "skill" },
        { name: "Cone Weaves",         reps: "6 reps", cue: "low stance", load: "skill" }
      ]
    },
    football: {
      route_running: [
        { name: "Cone Route Tree", reps: "5 trees",    cue: "explosive release", load: "skill" },
        { name: "Hands Drill",     reps: "4 sets x 8", cue: "catch focus",       load: "skill" }
      ],
      blocking: [
        { name: "Sled Drive", reps: "5 x 10m", cue: "hip drive", load: "skill" }
      ]
    },
    soccer: {
      dribbling: [
        { name: "1v1 Close Control", reps: "8 reps", cue: "soft touches",   load: "skill" },
        { name: "Passing Circuit",   reps: "10 min", cue: "weight & timing", load: "skill" }
      ]
    },
    baseball: {
      throwing: [
        { name: "Long Toss",          reps: "10-15 min", cue: "accelerate through release", load: "skill" },
        { name: "Band Throw Pattern", reps: "3 sets",    cue: "wrist & scap",               load: "skill" }
      ]
    },
    volleyball: {
      hitting: [
        { name: "Approach & Arm Swing", reps: "5 sets x 6", cue: "arm path", load: "skill" },
        { name: "Block Footwork",       reps: "6 reps",      cue: "timing",   load: "skill" }
      ]
    },
    track: {
      sprint: [
        { name: "Acceleration 30m", reps: "6 reps",  cue: "drive phase",     load: "skill" },
        { name: "A-Skips",          reps: "3 x 30s", cue: "ankle stiffness", load: "skill" }
      ]
    }
  };

  const SESSION_TEMPLATES = {
    practice:         { mix: ["skill", "strength", "plyo", "conditioning"], mins: 75 },
    competition_prep: { mix: ["skill", "speed", "light_strength"],           mins: 60 },
    recovery:         { mix: ["mobility", "light_skill"],                    mins: 35 },
    strength:         { mix: ["warmup", "strength", "accessory"],            mins: 60 },
    speed:            { mix: ["warmup", "speed", "plyo"],                    mins: 50 }
  };

  // Per-sport preferred strength exercise order (extracted from inline object literals)
  const SPORT_STRENGTH_PREFS = {
    basketball: ["goblet_squat", "rdl", "push_press"],
    football:   ["trap_bar_deadlift", "bench", "row"],
    soccer:     ["goblet_squat", "single_leg_deadlift", "row"],
    baseball:   ["trap_bar_deadlift", "bench", "row"],
    volleyball: ["goblet_squat", "rdl", "push_press"],
    track:      ["goblet_squat", "rdl", "single_leg_deadlift"]
  };

  // ---------- Injury helpers ----------
  function hasInjury(tag) {
    return Array.isArray(state.profile?.injuries) && state.profile.injuries.includes(tag);
  }

  function applyInjuryAdjustments(exercise, injuries) {
    const def = EXERCISE_LIB.strength[exercise];
    if (!def) return null;
    const res = Object.assign({}, def);
    if (!injuries?.length) return res;

    // First matching injury-specific sub wins
    for (const inj of injuries) {
      if (def.subs?.[inj]) { res.substitution = def.subs[inj]; break; }
    }
    // Generic fallbacks
    if (!res.substitution) {
      if (injuries.includes("knee"))     res.substitution = "goblet_squat";
      else if (injuries.includes("shoulder")) res.substitution = "band_press";
    }
    if (res.substitution) {
      res.cue = (res.cue || "") + " — reduce load / higher reps for injury";
    }
    return res;
  }

  // ---------- Workout generation ----------
  function generateWorkoutFor(sport = "basketball", sessionType = "practice", injuries = []) {
    const template = SESSION_TEMPLATES[sessionType] || SESSION_TEMPLATES.practice;
    const blocks = [];

    // Warm-up
    blocks.push({
      id: uid("warmup"),
      type: "warmup",
      title: "Dynamic Warm-up",
      duration_min: 10,
      items: [
        { name: "Ankle/hip mobility",                  cue: "3 min total" },
        { name: "Band activation (glutes/shoulders)",  cue: "2 min" },
        { name: "Movement prep (A skips, leg swings)", cue: "5 min" }
      ]
    });

    // Skill microblocks
    const micro = SPORT_MICROBLOCKS[sport] || {};
    const skillKeys = Object.keys(micro);
    if (skillKeys.length) {
      const skillBlock = { id: uid("skill"), type: "skill", title: "Skill Microblocks", duration_min: 15, items: [] };
      skillKeys.slice(0, 2).forEach(k => {
        (micro[k] || []).slice(0, 2).forEach(it => skillBlock.items.push(it));
      });
      blocks.push(skillBlock);
    }

    // Strength block
    if (template.mix.includes("strength") || template.mix.includes("light_strength") || sessionType === "strength") {
      const strengthBlock = { id: uid("strength"), type: "strength", title: "Strength", duration_min: 20, items: [] };
      const preferred = SPORT_STRENGTH_PREFS[sport] || ["goblet_squat", "rdl", "row"];
      preferred.slice(0, 3).forEach(key => {
        const ex = applyInjuryAdjustments(key, injuries) || EXERCISE_LIB.strength[key];
        if (!ex) return;
        strengthBlock.items.push({ key, name: ex.title, cue: ex.cue, substitution: ex.substitution || null });
      });
      blocks.push(strengthBlock);
    }

    // Plyo / power block
    if (template.mix.includes("plyo") || template.mix.includes("speed") || sessionType === "speed") {
      const plyoBlock = { id: uid("plyo"), type: "plyo", title: "Power & Plyo", duration_min: 10, items: [] };
      Object.keys(EXERCISE_LIB.plyo).slice(0, 2).forEach(k => {
        const def = EXERCISE_LIB.plyo[k];
        plyoBlock.items.push({ key: k, name: def.title, cue: def.cue });
      });
      blocks.push(plyoBlock);
    }

    // Conditioning block
    if (template.mix.includes("conditioning") || sessionType === "practice") {
      const cond = { id: uid("cond"), type: "conditioning", title: "Conditioning", duration_min: 8, items: [] };
      Object.keys(EXERCISE_LIB.conditioning).slice(0, 1).forEach(k => {
        const def = EXERCISE_LIB.conditioning[k];
        cond.items.push({ key: k, name: def.title, cue: def.cue, substitution: injuries.includes("ankle") ? "bike_intervals" : null });
      });
      blocks.push(cond);
    }

    // Cool-down
    blocks.push({ id: uid("cd"), type: "cooldown", title: "Cool-down", duration_min: 5, items: [{ name: "Breathing & calves/hips", cue: "5 min easy" }] });

    return {
      id: uid("sess"),
      sport,
      sessionType,
      injuries: injuries || [],
      generated_at: nowISO(),
      blocks,
      total_min: blocks.reduce((sum, b) => sum + (b.duration_min || 0), 0)
    };
  }

  // ---------- Periodization wizard (12-week) ----------
  function generate12WeekPlan({
    sport = "basketball",
    startDate = null,
    sessionsPerWeek = 3,
    sessionDistribution = { practice: 0.6, strength: 0.3, recovery: 0.1 },
    injuries = []
  } = {}) {
    const phases = [
      { name: "Accumulation",    weeks: 3, volumeMultiplier: 1.00 },
      { name: "Intensification", weeks: 3, volumeMultiplier: 1.15 },
      { name: "Deload",          weeks: 1, volumeMultiplier: 0.60 },
      { name: "Build",           weeks: 3, volumeMultiplier: 1.10 },
      { name: "Peak",            weeks: 1, volumeMultiplier: 0.80 },
      { name: "Taper",           weeks: 1, volumeMultiplier: 0.60 }
    ];

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(6, 0, 0, 0);

    const distTypes = Object.keys(sessionDistribution);
    const weeks = [];
    let weekIndex = 0;

    phases.forEach(phase => {
      for (let w = 0; w < phase.weeks; w++) {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + weekIndex * 7);

        const sessions = [];
        for (let s = 0; s < sessionsPerWeek; s++) {
          // Weighted random session type selection
          let chosen = distTypes[0];
          const r = Math.random();
          let acc = 0;
          for (const t of distTypes) {
            acc += sessionDistribution[t];
            if (r <= acc) { chosen = t; break; }
          }
          const gen = generateWorkoutFor(sport, chosen, injuries);
          gen.total_min = Math.round(gen.total_min * phase.volumeMultiplier);
          sessions.push(gen);
        }

        weeks.push({
          weekNumber: weekIndex + 1,
          phase: phase.name,
          startDate: weekStart.toISOString().slice(0, 10),
          sessions,
          volumeMultiplier: phase.volumeMultiplier
        });
        weekIndex++;
      }
    });

    return { created_at: nowISO(), sport, sessionsPerWeek, weeks };
  }

  // ---------- Today workflow (Generate → Start → Log → Done) ----------
  let todayTimer = null;
  let todayTimerStart = null;
  let todayActiveSession = null;

  function renderTodayBlock() {
    const container = $("todayBlock");
    if (!container) return;

    let todaySession = null;
    try {
      if (state.ui?.todaySession) todaySession = state.ui.todaySession;
    } catch (e) { console.error(e); }

    // Running session
    if (todayActiveSession) {
      container.innerHTML = `
        <div class="minihead">In progress: ${todayActiveSession.sessionType} • ${todayActiveSession.sport}</div>
        <div class="minibody mono" id="todayRunning">Started ${timeAgo(todayTimerStart)}</div>
        <div style="margin-top:8px">
          <button class="btn danger" id="btnStopNow">Stop &amp; Log</button>
          <button class="btn ghost"  id="btnCancelNow">Cancel</button>
        </div>
      `;
      $("btnStopNow")?.addEventListener("click", stopAndLogToday);
      $("btnCancelNow")?.addEventListener("click", cancelToday);
      return;
    }

    // Planned session — ready to start
    if (todaySession) {
      const blocksHTML = (todaySession.blocks || [])
        .map(b => `<div style="margin-bottom:6px"><b>${b.title}</b> — ${b.duration_min} min</div>`)
        .join("");
      container.innerHTML = `
        <div class="minihead">${todaySession.sessionType} • ${todaySession.sport}</div>
        <div class="minibody">${blocksHTML}</div>
        <div style="margin-top:8px">
          <button class="btn"       id="btnStartToday">Start</button>
          <button class="btn ghost" id="btnGenerateNew">Generate new</button>
        </div>
      `;
      $("btnStartToday")?.addEventListener("click",  () => startToday(todaySession));
      $("btnGenerateNew")?.addEventListener("click", () => {
        state.ui.todaySession = _generateTodaySession();
        persist("New session generated");
        renderTodayBlock();
      });
      return;
    }

    // No session yet
    container.innerHTML = `
      <div class="minihead">No session generated</div>
      <div class="minibody">Press Generate to create a tailored session for today.</div>
      <div style="margin-top:8px">
        <button class="btn"       id="btnGenerateOnly">Generate</button>
        <button class="btn ghost" id="btnOpenTrain">Open Train</button>
      </div>
    `;
    $("btnGenerateOnly")?.addEventListener("click", () => {
      state.ui.todaySession = _generateTodaySession();
      persist("Session generated");
      renderTodayBlock();
    });
    $("btnOpenTrain")?.addEventListener("click", () => showView("train"));
  }

  /** Generate from current profile defaults */
  function _generateTodaySession() {
    return generateWorkoutFor(
      state.profile.sport || "basketball",
      state.profile.preferred_session_type || "practice",
      state.profile.injuries || []
    );
  }

  function startToday(session) {
    if (!session) session = state.ui.todaySession;
    if (!session) { toast("No session to start"); return; }
    todayActiveSession = session;
    todayTimerStart    = Date.now();
    renderTodayBlock();
    const timerEl = $("todayTimer");
    if (timerEl) timerEl.textContent = "Running…";
    todayTimer = setInterval(() => {
      const el = $("todayRunning");
      if (el) el.textContent = "Started " + timeAgo(todayTimerStart);
    }, 1500);
  }

  function stopAndLogToday() {
    if (!todayActiveSession) return;
    const durationMin = Math.max(1, Math.round((Date.now() - todayTimerStart) / 60000));
    const sRPE = 6;
    const load = Math.round(durationMin * sRPE);

    const record = {
      id: uid("log"),
      created_at: nowISO(),
      sport:       todayActiveSession.sport,
      sessionType: todayActiveSession.sessionType,
      duration_min: durationMin,
      sRPE,
      load,
      blocks: todayActiveSession.blocks
    };

    state.sessions = state.sessions || [];
    state.sessions.push(record);
    state.ui.todaySession = null;
    persist(`Logged ${durationMin} min • load ${load}`);

    _clearTodayTimer();
    renderTodayBlock();
    renderInsights();
  }

  function cancelToday() {
    _clearTodayTimer();
    renderTodayBlock();
    toast("Session cancelled");
  }

  /** Shared cleanup for timer state — prevents duplication in stop + cancel */
  function _clearTodayTimer() {
    if (todayTimer) clearInterval(todayTimer);
    todayTimer         = null;
    todayTimerStart    = null;
    todayActiveSession = null;
    const timerEl = $("todayTimer");
    if (timerEl) timerEl.textContent = "No timer running";
  }

  // ---------- Train tab ----------
  function sportWorkoutCard(sport, sessionType, injuries) {
    const gen = generateWorkoutFor(
      sport,
      sessionType || state.profile.preferred_session_type || "practice",
      injuries    || state.profile.injuries || []
    );
    return {
      title: `${(gen.sessionType || "Session").replace("_", " ").toUpperCase()} • ${sport}`,
      list:  gen.blocks.map(b => `${b.title} — ${b.duration_min} min`),
      full:  gen
    };
  }

  function renderTrain() {
    const sport = state.profile?.sport || "basketball";
    const role  = state.profile?.role  || "coach";
    const card  = sportWorkoutCard(sport, state.profile.preferred_session_type, state.profile.injuries);

    const trainSub = $("trainSub");
    if (trainSub) trainSub.textContent = `${role} • ${sport} • ${state.profile.preferred_session_type || "practice"}`;

    const body = $("trainBody");
    if (!body) return;

    const sportOptions = SPORTS
      .map(s => `<option value="${s}" ${s === sport ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`)
      .join("");

    body.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
        <div class="field" style="flex:1;min-width:120px">
          <label>Sport</label>
          <select id="trainSportSelect">${sportOptions}</select>
        </div>
        <div class="field" style="width:160px">
          <label>Session type</label>
          <select id="trainSessionType">
            <option value="practice">Practice</option>
            <option value="strength">Strength</option>
            <option value="speed">Speed</option>
            <option value="recovery">Recovery</option>
            <option value="competition_prep">Competition Prep</option>
          </select>
        </div>
        <div style="align-self:flex-end;padding-bottom:2px">
          <button class="btn" id="btnGenTrain">Generate</button>
        </div>
      </div>

      <div id="trainCardArea">
        <div class="mini">
          <div class="minihead">${card.title}</div>
          <div class="minibody">
            <ol style="margin:0;padding-left:18px">
              ${card.list.map(x => `<li style="margin:8px 0">${x}</li>`).join("")}
            </ol>
            <div style="margin-top:10px">
              <button class="btn"       id="btnPushToday">Push to Today</button>
              <button class="btn ghost" id="btnOpenFull">Open full</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const trainSessionTypeEl = $("trainSessionType");
    if (trainSessionTypeEl) trainSessionTypeEl.value = state.profile.preferred_session_type || "practice";

    $("trainSportSelect")?.addEventListener("change", (e) => {
      state.profile.sport = e.target.value;
      persist("Sport updated");
      renderTrain();
    });

    $("btnGenTrain")?.addEventListener("click", () => {
      const s   = $("trainSportSelect")?.value  || sport;
      const t   = $("trainSessionType")?.value  || state.profile.preferred_session_type || "practice";
      state.profile.sport                  = s;
      state.profile.preferred_session_type = t;
      const gen = generateWorkoutFor(s, t, state.profile.injuries || []);
      const trainCardArea = $("trainCardArea");
      if (!trainCardArea) return;
      trainCardArea.innerHTML = `
        <div class="mini">
          <div class="minihead">${gen.sessionType} • ${gen.sport} • ${gen.total_min} min</div>
          <div class="minibody">
            <ol style="margin:0;padding-left:18px">
              ${gen.blocks.map(b => `
                <li style="margin:8px 0">
                  <b>${b.title}</b> — ${b.duration_min} min<br/>
                  <small class="muted">${b.items.map(it => it.name || it.title || it.key).join(", ")}</small>
                </li>
              `).join("")}
            </ol>
            <div style="margin-top:10px">
              <button class="btn"       id="btnPushToday2">Push to Today</button>
              <button class="btn ghost" id="btnStartNow">Start Now</button>
            </div>
          </div>
        </div>
      `;
      $("btnPushToday2")?.addEventListener("click", () => {
        state.ui.todaySession = gen;
        persist("Pushed to Today");
        showView("home");
        renderTodayBlock();
      });
      $("btnStartNow")?.addEventListener("click", () => {
        state.ui.todaySession = gen;
        persist("Pushed to Today and starting");
        showView("home");
        startToday(gen);
      });
    });

    $("btnPushToday")?.addEventListener("click", () => {
      state.ui.todaySession = card.full;
      persist("Pushed to Today");
      showView("home");
      renderTodayBlock();
    });

    $("btnOpenFull")?.addEventListener("click", () => {
      state.ui.todaySession = card.full;
      persist("Full session stored in Today");
      showView("home");
      renderTodayBlock();
    });
  }

  // ---------- Periodization UI ----------
  function renderPeriodizationUI() {
    const profileBody = $("profileBody");
    if (!profileBody) return;

    const plan      = state.periodization?.plan;
    const todayISO  = new Date().toISOString().slice(0, 10);
    const sportOptions = SPORTS
      .map(s => `<option value="${s}" ${s === state.profile.sport ? "selected" : ""}>${s}</option>`)
      .join("");

    profileBody.innerHTML = `
      <div class="mini">
        <div class="minihead">Periodization Wizard</div>
        <div class="minibody">
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <div class="field" style="width:240px">
              <label>Sport</label>
              <select id="wizSport">${sportOptions}</select>
            </div>
            <div class="field" style="width:180px">
              <label>Start date</label>
              <input id="wizStart" type="date" value="${todayISO}" />
            </div>
            <div class="field" style="width:180px">
              <label>Sessions / week</label>
              <select id="wizFreq">
                <option value="2" ${state.periodization?.plan?.sessionsPerWeek === 2 ? "selected" : ""}>2</option>
                <option value="3" ${state.periodization?.plan?.sessionsPerWeek === 3 ? "selected" : ""}>3</option>
                <option value="4" ${state.periodization?.plan?.sessionsPerWeek === 4 ? "selected" : ""}>4</option>
              </select>
            </div>
            <div style="display:flex;align-items:flex-end;gap:8px">
              <button class="btn"       id="btnGenPlan">Generate 12-week Plan</button>
              <button class="btn ghost" id="btnClearPlan">Clear</button>
            </div>
          </div>
          <div style="margin-top:12px" id="planPreview">
            ${plan ? renderPlanPreviewHTML(plan) : `<div class="small muted">No plan yet. Generate a sport-specific 12-week plan.</div>`}
          </div>
        </div>
      </div>
    `;

    $("btnGenPlan")?.addEventListener("click", () => {
      const sport   = $("wizSport")?.value  || state.profile.sport || "basketball";
      const start   = $("wizStart")?.value  || todayISO;
      const freq    = parseInt($("wizFreq")?.value || "3", 10);
      const newPlan = generate12WeekPlan({
        sport, startDate: start, sessionsPerWeek: freq,
        sessionDistribution: { practice: 0.6, strength: 0.3, recovery: 0.1 },
        injuries: state.profile.injuries || []
      });
      state.periodization.plan       = newPlan;
      state.periodization.updated_at = nowISO();
      persist("Periodization plan generated");
      renderPeriodizationUI();
    });

    $("btnClearPlan")?.addEventListener("click", () => {
      state.periodization.plan = null;
      persist("Plan cleared");
      renderPeriodizationUI();
    });

    // Event delegation replaces the setTimeout hack — no timing dependency
    $("planPreview")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-push-week]");
      if (!btn) return;
      const idx  = parseInt(btn.getAttribute("data-push-week"), 10);
      const plan = state.periodization?.plan;
      if (!plan?.weeks?.[idx])           { toast("Plan not found"); return; }
      const sess = plan.weeks[idx].sessions[0];
      if (!sess)                         { toast("No session in selected week"); return; }
      state.ui.todaySession = sess;
      persist("Pushed plan session to Today");
      showView("home");
      renderTodayBlock();
    });
  }

  function renderPlanPreviewHTML(plan) {
    if (!plan?.weeks) return `<div class="small muted">Invalid plan</div>`;
    return `<div>${plan.weeks.map((w, i) => `
      <div style="padding:10px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">Week ${w.weekNumber} — ${w.phase}</div>
          <div class="small muted">${w.sessions.length} sessions — start ${w.startDate} • vol x${w.volumeMultiplier}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn ghost" data-push-week="${i}" title="Push first session to Today">Push →</button>
          <div class="small muted">${w.sessions[0]?.sessionType ?? "—"}</div>
        </div>
      </div>
    `).join("")}</div>`;
  }

  // ---------- Insights ----------
  function computeInsights() {
    const sessions = state.sessions || [];
    const byWeek   = {};

    sessions.forEach(s => {
      const d      = new Date(s.created_at || s.generated_at || nowISO());
      const y      = d.getUTCFullYear();
      const onejan = new Date(Date.UTC(y, 0, 1));
      const weekNo = Math.ceil((((d - onejan) / 86400000) + onejan.getUTCDay() + 1) / 7);
      const key    = `${y}-W${String(weekNo).padStart(2, "0")}`;
      byWeek[key]  = byWeek[key] || { minutes: 0, load: 0, sessions: 0 };
      byWeek[key].minutes  += (s.duration_min || 0);
      byWeek[key].load     += (s.load || 0);
      byWeek[key].sessions += 1;
    });

    const weekly = Object.entries(byWeek)
      .map(([k, v]) => ({ week: k, minutes: v.minutes, load: v.load, sessions: v.sessions }))
      .sort((a, b) => b.week.localeCompare(a.week))
      .slice(0, 12);

    state.insights.weekly     = weekly;
    state.insights.updated_at = nowISO();
    persistDebounced(); // non-blocking; avoids redundant full persist on every render
    return state.insights;
  }

  function renderInsights() {
    computeInsights();
    const profileBody = $("profileBody");
    if (!profileBody) return;

    const weekly = state.insights?.weekly || [];
    const rows   = weekly.map(w =>
      `<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)">
        <div>${w.week}</div>
        <div>${w.minutes}m • load ${w.load}</div>
      </div>`
    ).join("");
    const streak = computeStreak();

    // Remove stale block before appending; use stable class instead of .mini.insights (avoids selector clash)
    profileBody.querySelector(".piq-insights-block")?.remove();
    const el    = document.createElement("div");
    el.className = "piq-insights-block";
    el.style.marginTop = "12px";
    el.innerHTML = `
      <div class="mini">
        <div class="minihead">Insights</div>
        <div class="minibody">
          <div><b>Recent weeks</b></div>
          <div style="margin-top:8px">${rows || '<div class="small muted">No sessions logged yet</div>'}</div>
          <div style="margin-top:8px"><b>Current streak</b> — ${streak} days</div>
        </div>
      </div>
    `;
    profileBody.appendChild(el);
  }

  function computeStreak() {
    const sessions = (state.sessions || [])
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (!sessions.length) return 0;

    // De-duplicate to unique date strings in descending order, then count consecutive days
    const uniqueDates = [...new Set(sessions.map(s => new Date(s.created_at).toISOString().slice(0, 10)))];

    let streak = 0;
    let cursor = uniqueDates[0];
    for (const date of uniqueDates) {
      if (date !== cursor) break;
      streak++;
      const prev = new Date(cursor);
      prev.setDate(prev.getDate() - 1);
      cursor = prev.toISOString().slice(0, 10);
    }
    return streak;
  }

  // ---------- Data Management ----------
  function exportJSON() {
    if (!window.dataStore?.exportJSON) { toast("Export not available"); return; }
    const json = window.dataStore.exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `piq_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Export started");
  }

  function importJSONFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onerror = () => toast("Could not read file");
    r.onload  = (e) => {
      try {
        if (!window.dataStore?.importJSON) { toast("Import not available"); return; }
        window.dataStore.importJSON(e.target.result);
        state = window.dataStore.load();
        toast("Import complete");
        persist("Imported data");
        renderAll();
      } catch (err) {
        console.error(err);
        toast("Import failed: " + (err.message || "unknown error"));
      }
    };
    r.readAsText(file);
  }

  function resetLocalState() {
    const ok = confirm("Reset local state? This will remove all local data. Type RESET to continue.");
    if (!ok) return;
    const typed = prompt("Type RESET to confirm");
    if (typed !== "RESET") { toast("Reset aborted"); return; }
    localStorage.removeItem("piq_local_state_v2");
    toast("Local state reset — reloading");
    setTimeout(() => location.reload(), 700);
  }

  function runQAGrade() {
    const issues = [];
    if (!state.periodization?.plan)                                              issues.push("No periodization plan generated");
    if (!state.sessions?.length && state.profile.role !== "coach")               issues.push("No sessions logged yet");
    if (!state.profile?.sport)                                                   issues.push("Profile sport not set");

    const grade  = issues.length === 0 ? "A" : issues.length === 1 ? "B" : "C";
    const report = `QA Grade: ${grade}\n\nIssues found:\n${issues.length
      ? issues.map((item, idx) => `${idx + 1}. ${item}`).join("\n")
      : "None"}`;
    const gradeEl = $("gradeReport");
    if (gradeEl) gradeEl.textContent = report;
    toast("QA grade complete");
  }

  // ---------- Navigation ----------
  function setActiveNav(view) {
    document.querySelectorAll(".navbtn, .bottomnav .tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
  }

  function showView(view) {
    state.ui.view = view;
    persistDebounced(null);
    VIEWS.forEach(v => {
      const el = $(`view-${v}`);
      if (el) el.hidden = (v !== view);
    });
    setActiveNav(view);
    renderAll();
  }

  function renderTeam() {
    const body  = $("teamBody");
    if (!body) return;
    const teams = state.team.teams || [];
    if (!teams.length) {
      body.innerHTML = `<div class="mini"><div class="minihead">No teams</div><div class="minibody">Create or join a team when cloud is enabled, or test locally.</div></div>`;
      return;
    }
    body.innerHTML = `
      <div class="mini">
        <div class="minihead">Teams</div>
        <div class="minibody">
          ${teams.map(t => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid var(--line)">
              <div><b>${t.name}</b><div class="small muted">${t.sport || ""}</div></div>
              <button class="btn ghost" data-setteam="${t.id}">Set Active</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
    body.querySelectorAll("[data-setteam]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.team.active_team_id = btn.getAttribute("data-setteam");
        persist("Active team updated");
        setTeamPill();
      });
    });
  }

  function setTeamPill() {
    const pill = $("teamPill");
    if (!pill) return;
    const teamName = (state.team.teams || []).find(t => t.id === state.team.active_team_id)?.name;
    pill.textContent = `Team: ${teamName || "—"}`;
  }

  // ---------- Drawers ----------
  function openDrawer() {
    const b = $("drawerBackdrop");
    const d = $("accountDrawer");
    if (!b || !d) return;
    b.hidden = false;
    d.classList.add("open");
    d.setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    const b = $("drawerBackdrop");
    const d = $("accountDrawer");
    if (!b || !d) return;
    b.hidden = true;
    d.classList.remove("open");
    d.setAttribute("aria-hidden", "true");
  }

  function openHelp() {
    const b = $("helpBackdrop");
    const d = $("helpDrawer");
    if (!b || !d) return;
    b.hidden = false;
    d.classList.add("open");
    d.setAttribute("aria-hidden", "false");
    const searchEl = $("helpSearch");
    if (searchEl) searchEl.value = "";
    const rEl = $("helpResults");
    if (rEl) rEl.innerHTML = _helpListHTML(defaultHelpList());
  }

  function closeHelp() {
    const b = $("helpBackdrop");
    const d = $("helpDrawer");
    if (!b || !d) return;
    b.hidden = true;
    d.classList.remove("open");
    d.setAttribute("aria-hidden", "true");
  }

  // ---------- Help content ----------
  function defaultHelpList() {
    return [
      { title: "Today workflow",       snippet: "Generate a session, Start the timer, Stop to log. Use the top 'Generate → Start → Log' button." },
      { title: "Periodization Wizard", snippet: "Profile → Periodization Wizard: create a 12-week plan and push sessions to Today." },
      { title: "Injury settings",      snippet: "Add injuries in Account → Role & Sport; generated sessions will include substitutions and reduced load." },
      { title: "Data Management",      snippet: "Export / Import your data from Account → Data Management. Reset requires typing RESET." }
    ];
  }

  function searchHelp(q) {
    if (!q) return defaultHelpList();
    return defaultHelpList().filter(item =>
      (item.title + " " + item.snippet).toLowerCase().includes(q)
    );
  }

  function _helpListHTML(list) {
    return list.map(r =>
      `<div style="padding:8px;border-bottom:1px solid var(--line)"><b>${r.title}</b><div class="small muted">${r.snippet}</div></div>`
    ).join("");
  }

  // ---------- Render orchestration ----------
  function renderAll() {
    try {
      renderHome();
      renderTeam();
      renderTrain();
      renderProfile();
      renderTodayBlock();
      renderPeriodizationUI();
      renderInsights();
      setTeamPill();
      applyStatusFromMeta();
    } catch (e) {
      console.error("Render error", e);
    }
  }

  function renderHome() {
    const homeSub = $("homeSub");
    if (homeSub) homeSub.textContent = `${state.profile.role || "coach"} • ${state.profile.sport || "basketball"}`;
    renderTodayBlock();
  }

  function renderProfile() {
    renderPeriodizationUI();
    // Profile overview is populated by renderPeriodizationUI + renderInsights
  }

  // ---------- Boot ----------
  function bindUI() {
    // Nav buttons
    document.querySelectorAll("[data-view]").forEach(btn => {
      if (btn.classList.contains("navbtn") || btn.classList.contains("tab")) {
        btn.addEventListener("click", () => showView(btn.dataset.view));
      }
    });

    // Topbar
    $("btnAccount")?.addEventListener("click", openDrawer);
    $("btnCloseDrawer")?.addEventListener("click", closeDrawer);

    // Keyboard shortcuts — consolidated in one listener
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeDrawer(); closeHelp(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        openHelp();
        $("helpSearch")?.focus();
        e.preventDefault();
      }
    });

    // Today button (three-state flow)
    $("todayButton")?.addEventListener("click", () => {
      if (!state.ui.todaySession) {
        state.ui.todaySession = _generateTodaySession();
        persist("Generated Today session");
        renderTodayBlock();
        toast("Session generated — press Start");
        return;
      }
      if (!todayActiveSession) { startToday(state.ui.todaySession); return; }
      stopAndLogToday();
    });

    // FAB sheet
    $("fab")?.addEventListener("click", () => {
      $("sheetBackdrop") && ($("sheetBackdrop").hidden = false);
      $("fabSheet")      && ($("fabSheet").hidden      = false);
    });
    $("btnCloseSheet")?.addEventListener("click", () => {
      $("sheetBackdrop") && ($("sheetBackdrop").hidden = true);
      $("fabSheet")      && ($("fabSheet").hidden      = true);
    });

    // Help
    $("btnHelp")?.addEventListener("click", openHelp);
    $("btnCloseHelp")?.addEventListener("click", closeHelp);
    $("helpSearch")?.addEventListener("input", (e) => {
      const q   = e.target.value.trim().toLowerCase();
      const rEl = $("helpResults");
      if (rEl) rEl.innerHTML = _helpListHTML(searchHelp(q));
    });

    // Data management
    $("btnExport")?.addEventListener("click", exportJSON);
    $("fileImport")?.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) importJSONFile(f);
    });
    $("btnResetLocal")?.addEventListener("click", resetLocalState);
    $("btnRunGrade")?.addEventListener("click", runQAGrade);

    // Profile save
    $("btnSaveProfile")?.addEventListener("click", () => {
      state.profile.role                   = $("roleSelect")?.value             || state.profile.role;
      state.profile.sport                  = $("sportSelect")?.value            || state.profile.sport;
      state.profile.preferred_session_type = $("preferredSessionSelect")?.value || state.profile.preferred_session_type;
      persist("Profile preferences saved");
      renderAll();
    });

    // Theme save
    $("btnSaveTheme")?.addEventListener("click", () => {
      const mode  = $("themeModeSelect")?.value  || "dark";
      const sport = $("themeSportSelect")?.value || state.profile.sport || "basketball";
      document.documentElement.setAttribute("data-theme", mode);
      state.profile.theme = { mode, sport };
      persist("Theme saved");
    });

    // Quick actions
    $("qaTrain")?.addEventListener("click", () => showView("train"));
    $("qaTeam")?.addEventListener("click",  () => showView("team"));
  }

  function boot() {
    bindUI();

    // Pre-fill drawer selects from saved profile
    const roleEl  = $("roleSelect");
    const sportEl = $("sportSelect");
    const prefEl  = $("preferredSessionSelect");
    if (roleEl)  roleEl.value  = state.profile.role  || "coach";
    if (sportEl) sportEl.value = state.profile.sport || "basketball";
    if (prefEl)  prefEl.value  = state.profile.preferred_session_type || "strength";

    // Apply saved theme
    if (state.profile?.theme?.mode) {
      document.documentElement.setAttribute("data-theme", state.profile.theme.mode);
    }

    showView(state.ui.view || "home");
    renderAll();
    toast("PerformanceIQ ready", 1400);
  }

  // Boot on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // ---------- Debug helpers (safe) ----------
  window.__PIQ_DEBUG__ = {
    generateWorkoutFor,
    generate12WeekPlan,
    computeInsights,
    getState:  () => state,
    setState:  (s) => { state = s; persist("State set via debug"); renderAll(); }
  };
})();
