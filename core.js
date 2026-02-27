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

  // ---------- Load state ----------
  let state = (window.dataStore && window.dataStore.load) ? window.dataStore.load() : null;
  if (!state) {
    // minimal fallback if dataStore missing
    state = {
      meta: { version: "3.0.0", updated_at: nowISO() },
      profile: { role: "coach", sport: "basketball", preferred_session_type: "strength", injuries: [], weight_lbs: 160, goal: "maintain", activity: "med" },
      team: { teams: [], active_team_id: null },
      sessions: [],
      periodization: { plan: null, updated_at: null },
      insights: { weekly: [], updated_at: null },
      ui: { view: "home" }
    };
    if (window.dataStore && window.dataStore.save) window.dataStore.save(state);
  }

  // ---------- Utilities ----------
  function persist(msg) {
    try {
      if (window.dataStore && window.dataStore.save) {
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

  function toast(msg, ms = 2200) {
    const t = $("toast");
    if (!t) {
      console.log("toast:", msg);
      return;
    }
    t.textContent = msg;
    t.hidden = false;
    setTimeout(() => { t.hidden = true; }, ms);
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 1000 * 60) return "just now";
    if (diff < 1000 * 60 * 60) return Math.round(diff / (1000 * 60)) + "m ago";
    if (diff < 1000 * 60 * 60 * 24) return Math.round(diff / (1000 * 60 * 60)) + "h ago";
    return Math.round(diff / (1000 * 60 * 60 * 24)) + "d ago";
  }

  // ---------- Status pill (reuse existing DOM) ----------
  function setDataStatusLabel(text, color) {
    const dot = $("saveDot");
    const txt = $("saveText");
    if (!dot || !txt) return;
    dot.style.background = color || "var(--ok)";
    txt.textContent = text || "Saved";
  }

  function applyStatusFromMeta() {
    // simple local-only status for offline-first
    setDataStatusLabel("Local saved", "var(--ok)");
  }

  // ---------- Sport-specific microblocks, strength library, substitutions ----------
  // Each sport: sessionTypes: skill, strength, conditioning, recovery, speed
  const EXERCISE_LIB = {
    // Strength exercises with brief cues; include injury-friendly substitutes
    strength: {
      split_squat: { title: "Split Squat", cue: "3x6-8 per leg", load: "moderate", subs: { knee: "reverse_lunge", hamstring: "single_leg_deadlift" } },
      rdl: { title: "Romanian Deadlift", cue: "3x6-8", load: "moderate", subs: { back: "good_mornings", hamstring: "bridge" } },
      push_press: { title: "Push Press", cue: "3x5", load: "high", subs: { shoulder: "seated_dumbbell_press", injury: "band_press" } },
      trap_bar_deadlift: { title: "Trap Bar Deadlift", cue: "3x4-6", load: "high", subs: { back: "kb_deadlift" } },
      goblet_squat: { title: "Goblet Squat", cue: "3x8-10", load: "moderate", subs: { knee: "box_squat" } },
      single_leg_deadlift: { title: "Single-Leg RDL", cue: "3x6 per leg", load: "moderate", subs: { balance: "rack_step_down" } },
      bench: { title: "Bench Press", cue: "3x5-8", load: "high", subs: { shoulder: "dumbbell_press" } },
      row: { title: "Bent-Over Row", cue: "3x8", load: "moderate", subs: { back: "band_row" } }
    },

    // Plyo / power
    plyo: {
      approach_jumps: { title: "Approach Jumps", cue: "6x", load: "explosive", subs: { knee: "box_jumps_low" } },
      lateral_bounds: { title: "Lateral Bounds", cue: "4x6", load: "explosive", subs: { ankle: "lateral_step_ups" } }
    },

    // Conditioning
    conditioning: {
      suicides: { title: "Court Suicides", cue: "5 repeats", load: "high", subs: { injury: "bike_intervals" } },
      tempo_runs: { title: "Tempo Runs", cue: "6x200m", load: "moderate", subs: { ankle: "rower" } }
    },

    // Skill microblocks mapped per sport below
  };

  const SPORT_MICROBLOCKS = {
    basketball: {
      shooting: [
        { name: "Catch & Shoot", reps: "5 sets x 10", cue: "Pocket, quick release", load: "skill" },
        { name: "Pull-up 3s", reps: "4 sets x 8", cue: "create space, set feet", load: "skill" }
      ],
      ball_handling: [
        { name: "Two-Ball Stationary", reps: "6 min", cue: "soft hands", load: "skill" },
        { name: "Cone Weaves", reps: "6 reps", cue: "low stance", load: "skill" }
      ]
    },

    football: {
      route_running: [
        { name: "Cone Route Tree", reps: "5 trees", cue: "explosive release", load: "skill" },
        { name: "Hands Drill", reps: "4 sets x 8", cue: "catch focus", load: "skill" }
      ],
      blocking: [
        { name: "Sled Drive", reps: "5 x 10m", cue: "hip drive", load: "skill" }
      ]
    },

    soccer: {
      dribbling: [
        { name: "1v1 Close Control", reps: "8 reps", cue: "soft touches", load: "skill" },
        { name: "Passing Circuit", reps: "10 min", cue: "weight & timing", load: "skill" }
      ]
    },

    baseball: {
      throwing: [
        { name: "Long Toss", reps: "10-15 min", cue: "accelerate through release", load: "skill" },
        { name: "Band Throw Pattern", reps: "3 sets", cue: "wrist & scap", load: "skill" }
      ]
    },

    volleyball: {
      hitting: [
        { name: "Approach & Arm Swing", reps: "5 sets x 6", cue: "arm path", load: "skill" },
        { name: "Block Footwork", reps: "6 reps", cue: "timing", load: "skill" }
      ]
    },

    track: {
      sprint: [
        { name: "Acceleration 30m", reps: "6 reps", cue: "drive phase", load: "skill" },
        { name: "A-Skips", reps: "3 x 30s", cue: "ankle stiffness", load: "skill" }
      ]
    }
  };

  // Session type templates (mix of skill/strength/plyo/cond)
  const SESSION_TEMPLATES = {
    practice: { mix: ["skill", "strength", "plyo", "conditioning"], mins: 75 },
    competition_prep: { mix: ["skill", "speed", "light_strength"], mins: 60 },
    recovery: { mix: ["mobility", "light_skill"], mins: 35 },
    strength: { mix: ["warmup", "strength", "accessory"], mins: 60 },
    speed: { mix: ["warmup", "speed", "plyo"], mins: 50 }
  };

  // Map "session element" to real generator functions below

  // ---------- Injury handling helpers ----------
  function hasInjury(tag) {
    if (!state.profile || !Array.isArray(state.profile.injuries)) return false;
    return state.profile.injuries.includes(tag);
  }

  function applyInjuryAdjustments(exercise, injuries) {
    // exercise is a string key e.g. "split_squat"
    // injuries is array
    const def = EXERCISE_LIB.strength[exercise];
    if (!def) return null;
    const res = Object.assign({}, def);
    // If knee injury -> prefer low impact subs and reduce load
    if (injuries && injuries.length) {
      injuries.forEach(i => {
        if (def.subs && def.subs[i]) {
          // map to substitution key name (string)
          res.substitution = def.subs[i];
        } else if (i === "knee") {
          // generic knee fallback to goblet squat or box squat
          res.substitution = res.substitution || "goblet_squat";
        } else if (i === "shoulder") {
          res.substitution = res.substitution || "band_press";
        }
      });
      // reduce load indicator
      res.cue = (res.cue || "") + " — reduce load / higher reps for injury";
    }
    return res;
  }

  // ---------- Workout generation ----------
  // Generate a single session for given sport, sessionType (strength/speed/practice/etc.), and injury flags
  function generateWorkoutFor(sport = "basketball", sessionType = "practice", injuries = []) {
    // Build an array of blocks: warmup, skill, strength, plyo, conditioning, cooldown
    const template = SESSION_TEMPLATES[sessionType] || SESSION_TEMPLATES.practice;
    const blocks = [];

    // Warm-up generator (dynamic)
    blocks.push({
      id: `warmup_${Math.random().toString(36).slice(2,8)}`,
      type: "warmup",
      title: "Dynamic Warm-up",
      duration_min: 10,
      items: [
        { name: "Ankle/hip mobility", cue: "3 min total" },
        { name: "Band activation (glutes/shoulders)", cue: "2 min" },
        { name: "Movement prep (A skips, leg swings)", cue: "5 min" }
      ]
    });

    // Skill microblocks
    const micro = SPORT_MICROBLOCKS[sport] || {};
    // choose top two skill blocks relevant to sessionType
    const skillKeys = Object.keys(micro);
    if (skillKeys.length) {
      const skillBlock = {
        id: `skill_${Math.random().toString(36).slice(2,8)}`,
        type: "skill",
        title: "Skill Microblocks",
        duration_min: 15,
        items: []
      };
      // pick 2 microblocks deterministically (first two)
      skillKeys.slice(0, 2).forEach(k => {
        const arr = micro[k] || [];
        // push top 1-2 items
        arr.slice(0, 2).forEach(it => skillBlock.items.push(it));
      });
      blocks.push(skillBlock);
    }

    // Strength block (if template calls for it)
    if (template.mix.includes("strength") || template.mix.includes("light_strength") || sessionType === "strength") {
      const strengthBlock = {
        id: `strength_${Math.random().toString(36).slice(2,8)}`,
        type: "strength",
        title: "Strength",
        duration_min: 20,
        items: []
      };

      // pick 2–3 exercises from library based on sport common patterns
      const preferred = {
        basketball: ["goblet_squat", "rdl", "push_press"],
        football: ["trap_bar_deadlift", "bench", "row"],
        soccer: ["goblet_squat", "single_leg_deadlift", "row"],
        baseball: ["trap_bar_deadlift", "bench", "row"],
        volleyball: ["goblet_squat", "rdl", "push_press"],
        track: ["goblet_squat", "rdl", "single_leg_deadlift"]
      }[sport] || ["goblet_squat", "rdl", "row"];

      preferred.slice(0, 3).forEach(key => {
        const ex = applyInjuryAdjustments(key, injuries) || EXERCISE_LIB.strength[key];
        if (!ex) return;
        strengthBlock.items.push({ key, name: ex.title, cue: ex.cue, substitution: ex.substitution || null });
      });

      blocks.push(strengthBlock);
    }

    // Plyo / power block (when included)
    if (template.mix.includes("plyo") || template.mix.includes("speed") || sessionType === "speed") {
      const plyoBlock = { id: `plyo_${Math.random().toString(36).slice(2,8)}`, type: "plyo", title: "Power & Plyo", duration_min: 10, items: [] };
      // pick plyo items
      Object.keys(EXERCISE_LIB.plyo).slice(0, 2).forEach(k => {
        const def = EXERCISE_LIB.plyo[k];
        plyoBlock.items.push({ key: k, name: def.title, cue: def.cue });
      });
      blocks.push(plyoBlock);
    }

    // Conditioning block
    if (template.mix.includes("conditioning") || sessionType === "practice") {
      const cond = { id: `cond_${Math.random().toString(36).slice(2,8)}`, type: "conditioning", title: "Conditioning", duration_min: 8, items: [] };
      Object.keys(EXERCISE_LIB.conditioning).slice(0, 1).forEach(k => {
        const def = EXERCISE_LIB.conditioning[k];
        cond.items.push({ key: k, name: def.title, cue: def.cue, substitution: injuries.includes("ankle") ? "bike_intervals" : null });
      });
      blocks.push(cond);
    }

    // Cool-down
    blocks.push({ id: `cd_${Math.random().toString(36).slice(2,8)}`, type: "cooldown", title: "Cool-down", duration_min: 5, items: [{ name: "Breathing & calves/hips", cue: "5 min easy" }] });

    // Return assembled session
    return {
      id: `sess_${Math.random().toString(36).slice(2,8)}`,
      sport,
      sessionType,
      injuries: injuries || [],
      generated_at: nowISO(),
      blocks,
      total_min: blocks.reduce((s, b) => s + (b.duration_min || 0), 0)
    };
  }

  // ---------- Periodization wizard (12-week) ----------
  // Simple practical periodization: 3-week accumulation, 3-week intensification, week 7 deload, weeks 8-10 build, week 11 peak, week 12 taper
  function generate12WeekPlan({ sport = "basketball", startDate = null, sessionsPerWeek = 3, sessionDistribution = { practice: 0.6, strength: 0.3, recovery: 0.1 }, injuries = [] } = {}) {
    const weeks = [];
    // compute week start dates if startDate provided
    let start = startDate ? new Date(startDate) : new Date();
    start.setHours(6, 0, 0, 0);

    const phases = [
      { name: "Accumulation", weeks: 3, volumeMultiplier: 1.0 },
      { name: "Intensification", weeks: 3, volumeMultiplier: 1.15 },
      { name: "Deload", weeks: 1, volumeMultiplier: 0.6 },
      { name: "Build", weeks: 3, volumeMultiplier: 1.1 },
      { name: "Peak", weeks: 1, volumeMultiplier: 0.8 },
      { name: "Taper", weeks: 1, volumeMultiplier: 0.6 }
    ];

    let weekIndex = 0;
    phases.forEach(phase => {
      for (let w = 0; w < phase.weeks; w++) {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (weekIndex * 7));

        // make sessionsPerWeek sessions with types chosen from distribution
        const sessions = [];
        const types = Object.keys(sessionDistribution);
        for (let s = 0; s < sessionsPerWeek; s++) {
          // pick type by weight
          const r = Math.random();
          let acc = 0;
          let chosen = types[0];
          for (let t of types) {
            acc += sessionDistribution[t];
            if (r <= acc) { chosen = t; break; }
          }
          // apply injury adjustments in generator
          const gen = generateWorkoutFor(sport, chosen, injuries);
          // adjust volume by multiplier (scale total minutes)
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

    return {
      created_at: nowISO(),
      sport,
      sessionsPerWeek,
      weeks
    };
  }

  // ---------- Today workflow (Generate -> Start -> Log -> Done) ----------
  let todayTimer = null;
  let todayTimerStart = null;
  let todayActiveSession = null;

  function renderTodayBlock() {
    const container = $("todayBlock");
    if (!container) return;

    // show today's planned session if periodization pushes one
    let todaySession = null;
    // Check state.periodization.plan for a session on today's date
    try {
      const plan = state.periodization && state.periodization.plan;
      if (plan && plan.weeks) {
        const todayISO = new Date().toISOString().slice(0, 10);
        for (let wk of plan.weeks) {
          if (wk.startDate <= todayISO) {
            // pick a session corresponding to day-of-week using modulo
            // fairly simple: pick first session for now
            // we allow pushToToday to set state.ui.todaySessionId
          }
        }
      }
      // if state.ui has a todaySessionId, fetch it
      if (state.ui && state.ui.todaySession) {
        todaySession = state.ui.todaySession;
      }
    } catch (e) {
      console.error(e);
    }

    // If there's an active timer, show running session
    if (todayActiveSession) {
      container.innerHTML = `
        <div class="minihead">In progress: ${todayActiveSession.sessionType} • ${todayActiveSession.sport}</div>
        <div class="minibody mono" id="todayRunning">Started ${timeAgo(todayTimerStart)}</div>
        <div style="margin-top:8px">
          <button class="btn danger" id="btnStopNow">Stop & Log</button>
          <button class="btn ghost" id="btnCancelNow">Cancel</button>
        </div>
      `;
      $("btnStopNow")?.addEventListener("click", () => stopAndLogToday());
      $("btnCancelNow")?.addEventListener("click", () => cancelToday());
      return;
    }

    // No active session — show generated plan if exists, else suggestion
    if (todaySession) {
      // render the planned session (summarized)
      const blocksHTML = (todaySession.blocks || []).map(b => `<div style="margin-bottom:6px"><b>${b.title}</b> — ${b.duration_min} min</div>`).join("");
      container.innerHTML = `
        <div class="minihead">${todaySession.sessionType} • ${todaySession.sport}</div>
        <div class="minibody">${blocksHTML}</div>
        <div style="margin-top:8px">
          <button class="btn" id="btnStartToday">Start</button>
          <button class="btn ghost" id="btnGenerateNew">Generate new</button>
        </div>
      `;
      $("btnStartToday")?.addEventListener("click", () => startToday(todaySession));
      $("btnGenerateNew")?.addEventListener("click", () => {
        const gen = generateWorkoutFor(state.profile.sport || "basketball", state.profile.preferred_session_type || "practice", state.profile.injuries || []);
        state.ui.todaySession = gen;
        persist("New session generated");
        renderTodayBlock();
      });
      return;
    }

    // No planned session — show quick generate button
    container.innerHTML = `
      <div class="minihead">No session generated</div>
      <div class="minibody">Press Generate to create a tailored session for today.</div>
      <div style="margin-top:8px">
        <button class="btn" id="btnGenerateOnly">Generate</button>
        <button class="btn ghost" id="btnOpenTrain">Open Train</button>
      </div>
    `;
    $("btnGenerateOnly")?.addEventListener("click", () => {
      const gen = generateWorkoutFor(state.profile.sport || "basketball", state.profile.preferred_session_type || "practice", state.profile.injuries || []);
      state.ui.todaySession = gen;
      persist("Session generated");
      renderTodayBlock();
    });
    $("btnOpenTrain")?.addEventListener("click", () => showView("train"));
  }

  function startToday(session) {
    if (!session) session = state.ui.todaySession;
    if (!session) { toast("No session to start"); return; }
    todayActiveSession = session;
    todayTimerStart = Date.now();
    renderTodayBlock();
    // update UI timer pill
    $("todayTimer") && ($("todayTimer").textContent = "Running…");
    // set interval to update running label
    todayTimer = setInterval(() => {
      const el = $("todayRunning");
      if (el) el.textContent = "Started " + timeAgo(todayTimerStart);
    }, 1500);
  }

  function stopAndLogToday() {
    if (!todayActiveSession) return;
    const durationMin = Math.max(1, Math.round((Date.now() - todayTimerStart) / 60000));
    // sRPE estimation UI could be added; for now default = 6 moderate
    const sRPE = 6;
    const load = Math.round(durationMin * sRPE);

    // Save session record
    const record = {
      id: `log_${Math.random().toString(36).slice(2,9)}`,
      created_at: nowISO(),
      sport: todayActiveSession.sport,
      sessionType: todayActiveSession.sessionType,
      duration_min: durationMin,
      sRPE,
      load,
      blocks: todayActiveSession.blocks
    };
    state.sessions = state.sessions || [];
    state.sessions.push(record);

    // clean up today's session marker
    state.ui.todaySession = null;
    persist(`Logged ${durationMin} min • load ${load}`);

    // stop timer
    if (todayTimer) clearInterval(todayTimer);
    todayTimer = null;
    todayTimerStart = null;
    todayActiveSession = null;
    $("todayTimer") && ($("todayTimer").textContent = "No timer running");
    renderTodayBlock();
    renderInsights(); // update insights to reflect new log
  }

  function cancelToday() {
    if (todayTimer) clearInterval(todayTimer);
    todayTimer = null;
    todayTimerStart = null;
    todayActiveSession = null;
    $("todayTimer") && ($("todayTimer").textContent = "No timer running");
    renderTodayBlock();
    toast("Session cancelled");
  }

  // ---------- Train tab rendering (fix sport pick and dropdown readability) ----------
  function sportWorkoutCard(sport, sessionType, injuries) {
    // reuse generator but return compact card object
    const gen = generateWorkoutFor(sport, sessionType || state.profile.preferred_session_type || "practice", injuries || state.profile.injuries || []);
    return {
      title: `${(gen.sessionType || "Session").replace("_", " ").toUpperCase()} • ${sport}`,
      list: gen.blocks.map(b => `${b.title} — ${b.duration_min} min`),
      full: gen
    };
  }

  function renderTrain() {
    const sport = state.profile?.sport || "basketball";
    const role = state.profile?.role || "coach";

    const card = sportWorkoutCard(sport, state.profile.preferred_session_type, state.profile.injuries);

    const trainSub = $("trainSub");
    if (trainSub) trainSub.textContent = `${role} • ${sport} • ${state.profile.preferred_session_type || "practice"}`;

    const body = $("trainBody");
    if (!body) return;

    // show sport selector on Train tab
    body.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
        <div class="field" style="flex:1">
          <label>Sport</label>
          <select id="trainSportSelect" style="background:var(--panel2);color:var(--text)"></select>
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
        <div>
          <button class="btn" id="btnGenTrain">Generate</button>
        </div>
      </div>

      <div id="trainCardArea">
        <div class="mini">
          <div class="minihead">${card.title}</div>
          <div class="minibody">
            <ol style="margin:0; padding-left:18px">
              ${card.list.map(x => `<li style="margin:8px 0">${x}</li>`).join("")}
            </ol>
            <div style="margin-top:10px">
              <button class="btn" id="btnPushToday">Push to Today</button>
              <button class="btn ghost" id="btnOpenFull">Open full</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // populate sport select
    const trainSportSelect = $("trainSportSelect");
    const sports = Object.keys(SPORT_MICROBLOCKS);
    if (trainSportSelect) {
      trainSportSelect.innerHTML = sports.map(s => `<option value="${s}" ${s===sport? "selected":""}>${s[0].toUpperCase()+s.slice(1)}</option>`).join("");
      trainSportSelect.addEventListener("change", () => {
        state.profile.sport = trainSportSelect.value;
        persist("Sport updated");
        renderTrain();
      });
    }

    const trainSessionType = $("trainSessionType");
    if (trainSessionType) trainSessionType.value = state.profile.preferred_session_type || "practice";

    $("btnGenTrain")?.addEventListener("click", () => {
      const s = $("trainSportSelect")?.value || sport;
      const t = $("trainSessionType")?.value || state.profile.preferred_session_type || "practice";
      state.profile.sport = s;
      state.profile.preferred_session_type = t;
      const gen = generateWorkoutFor(s, t, state.profile.injuries || []);
      // replace train card area with new gen
      const trainCardArea = $("trainCardArea");
      if (trainCardArea) {
        trainCardArea.innerHTML = `
          <div class="mini">
            <div class="minihead">${gen.sessionType} • ${gen.sport} • ${gen.total_min} min</div>
            <div class="minibody">
              <ol style="margin:0; padding-left:18px">
                ${gen.blocks.map(b=>`<li style="margin:8px 0"><b>${b.title}</b> — ${b.duration_min} min<br/><small class="muted">${b.items.map(it=>it.name||it.title||it.key).join(", ")}</small></li>`).join("")}
              </ol>
              <div style="margin-top:10px">
                <button class="btn" id="btnPushToday2">Push to Today</button>
                <button class="btn ghost" id="btnStartNow">Start Now</button>
              </div>
            </div>
          </div>
        `;
      }
      // attach listeners
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
      // open a modal or push to today for now
      state.ui.todaySession = card.full;
      persist("Full session stored in Today");
      showView("home");
      renderTodayBlock();
    });
  }

  // ---------- Periodization UI + push helper ----------
  function renderPeriodizationUI() {
    // on Profile tab we show periodization controls and plan
    const profileBody = $("profileBody");
    if (!profileBody) return;

    const plan = state.periodization && state.periodization.plan;
    profileBody.innerHTML = `
      <div class="mini">
        <div class="minihead">Periodization Wizard</div>
        <div class="minibody">
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <div class="field" style="width:240px">
              <label>Sport</label>
              <select id="wizSport">
                ${Object.keys(SPORT_MICROBLOCKS).map(s => `<option value="${s}" ${s===state.profile.sport?"selected":""}>${s}</option>`).join("")}
              </select>
            </div>

            <div class="field" style="width:180px">
              <label>Start date</label>
              <input id="wizStart" type="date" value="${(new Date()).toISOString().slice(0,10)}" />
            </div>

            <div class="field" style="width:180px">
              <label>Sessions / week</label>
              <select id="wizFreq">
                <option value="2" ${state.periodization?.plan?.sessionsPerWeek === 2 ? "selected":""}>2</option>
                <option value="3" ${state.periodization?.plan?.sessionsPerWeek === 3 ? "selected":""}>3</option>
                <option value="4" ${state.periodization?.plan?.sessionsPerWeek === 4 ? "selected":""}>4</option>
              </select>
            </div>

            <div style="display:flex;align-items:flex-end;gap:8px">
              <button class="btn" id="btnGenPlan">Generate 12-week Plan</button>
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
      const sport = $("wizSport")?.value || state.profile.sport || "basketball";
      const start = $("wizStart")?.value || (new Date()).toISOString().slice(0,10);
      const freq = parseInt($("wizFreq")?.value || 3, 10);
      const plan = generate12WeekPlan({ sport, startDate: start, sessionsPerWeek: freq, sessionDistribution: { practice: 0.6, strength: 0.3, recovery: 0.1 }, injuries: state.profile.injuries || [] });
      state.periodization.plan = plan;
      state.periodization.updated_at = nowISO();
      persist("Periodization plan generated");
      renderPeriodizationUI();
    });

    $("btnClearPlan")?.addEventListener("click", () => {
      state.periodization.plan = null;
      persist("Plan cleared");
      renderPeriodizationUI();
    });

    // helper: push today's first session from plan to Today
    // Add push buttons per week in preview HTML via delegation
    setTimeout(() => {
      document.querySelectorAll("[data-push-week]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(btn.getAttribute("data-push-week"), 10);
          const plan = state.periodization.plan;
          if (!plan || !plan.weeks || !plan.weeks[idx]) { toast("Plan not found"); return; }
          // pick first session of that week as today's session candidate
          const sess = plan.weeks[idx].sessions[0];
          if (!sess) { toast("No session in selected week"); return; }
          state.ui.todaySession = sess;
          persist("Pushed plan session to Today");
          showView("home");
          renderTodayBlock();
        });
      });
    }, 100);
  }

  function renderPlanPreviewHTML(plan) {
    if (!plan || !plan.weeks) return `<div class="small muted">Invalid plan</div>`;
    const weekTiles = plan.weeks.map((w, i) => {
      return `
        <div style="padding:10px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700">Week ${w.weekNumber} — ${w.phase}</div>
            <div class="small muted">${w.sessions.length} sessions — start ${w.startDate} • vol x${w.volumeMultiplier}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn ghost" data-push-week="${i}" title="Push first session to Today">Push →</button>
            <div class="small muted">${w.sessions[0] ? w.sessions[0].sessionType : "—"}</div>
          </div>
        </div>
      `;
    }).join("");
    return `<div>${weekTiles}</div>`;
  }

  // ---------- Insights (weekly minutes, load, streak) ----------
  function computeInsights() {
    const sessions = state.sessions || [];
    // group by ISO week (year-week)
    const byWeek = {};
    sessions.forEach(s => {
      const d = new Date(s.created_at || s.generated_at || nowISO());
      const y = d.getUTCFullYear();
      // week number (ISO-like)
      const onejan = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      const weekNo = Math.ceil((((d - onejan) / 86400000) + onejan.getUTCDay()+1)/7);
      const key = `${y}-W${String(weekNo).padStart(2,"0")}`;
      byWeek[key] = byWeek[key] || { minutes: 0, load: 0, sessions: 0 };
      byWeek[key].minutes += (s.duration_min || 0);
      byWeek[key].load += (s.load || 0);
      byWeek[key].sessions += 1;
    });
    const weekly = Object.entries(byWeek).map(([k,v]) => ({ week: k, minutes: v.minutes, load: v.load, sessions: v.sessions }));
    // sort descending by week label simple string compare may work
    weekly.sort((a,b) => b.week.localeCompare(a.week));
    state.insights.weekly = weekly.slice(0, 12);
    state.insights.updated_at = nowISO();
    persist(); // store updated insights
    return state.insights;
  }

  function renderInsights() {
    computeInsights();
    // quick render into profile area below periodization
    const profileBody = $("profileBody");
    if (!profileBody) return;
    const weekly = (state.insights && state.insights.weekly) || [];
    const rows = weekly.map(w => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)"><div>${w.week}</div><div>${w.minutes}m • load ${w.load}</div></div>`).join("");
    const streak = computeStreak();
    // append below existing periodization UI
    const el = document.createElement("div");
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
    // remove existing insights appended earlier to avoid duplicates
    const existing = profileBody.querySelector(".mini.insights");
    if (existing) existing.remove();
    el.classList.add("insights");
    profileBody.appendChild(el);
  }

  function computeStreak() {
    // compute consecutive days with at least one session ending on most recent session date
    const sessions = (state.sessions || []).slice().sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    if (!sessions.length) return 0;
    let streak = 0;
    let cursor = new Date(sessions[0].created_at).toISOString().slice(0,10);
    for (let i = 0; i < sessions.length; i++) {
      const sdate = new Date(sessions[i].created_at).toISOString().slice(0,10);
      if (sdate === cursor) {
        // same day - counted
        // note: ensure streak counts unique days only
        if (i === 0 || new Date(sessions[i-1]?.created_at).toISOString().slice(0,10) !== sdate) {
          streak++;
        }
      } else {
        // check if next day back
        const prev = new Date(cursor);
        prev.setDate(prev.getDate() - 1);
        const prevIso = prev.toISOString().slice(0,10);
        if (sdate === prevIso) {
          streak++;
          cursor = sdate;
        } else break;
      }
    }
    return streak;
  }

  // ---------- Data Management (export/import/reset + QA grade) ----------
  function exportJSON() {
    if (!window.dataStore || !window.dataStore.exportJSON) {
      toast("Export not available");
      return;
    }
    const json = window.dataStore.exportJSON();
    // create blob and trigger download
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `piq_export_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Export started");
  }

  function importJSONFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const txt = e.target.result;
        if (!window.dataStore || !window.dataStore.importJSON) {
          toast("Import not available");
          return;
        }
        window.dataStore.importJSON(txt);
        state = window.dataStore.load();
        toast("Import complete");
        persist("Imported data");
        renderAll();
      } catch (err) {
        console.error(err);
        toast("Import failed");
      }
    };
    r.readAsText(file);
  }

  function resetLocalState(confirmText) {
    // triple confirm modal may exist elsewhere; here we do a JS confirm fallback
    const ok = confirm("Reset local state? This will remove all local data. Type RESET to continue.");
    if (!ok) return;
    // For stricter guard, ask user to type RESET
    const typed = prompt("Type RESET to confirm");
    if (typed !== "RESET") { toast("Reset aborted"); return; }
    localStorage.removeItem("piq_local_state_v2");
    // reload page to reflect clean slate
    toast("Local state reset — reloading");
    setTimeout(() => location.reload(), 700);
  }

  function runQAGrade() {
    // Provide a short QA grade based on presence of key features
    const issues = [];
    if (!state.periodization || !state.periodization.plan) issues.push("No periodization plan generated");
    if ((!state.sessions || state.sessions.length === 0) && (state.profile.role !== "coach")) issues.push("No sessions logged yet");
    if (!state.profile || !state.profile.sport) issues.push("Profile sport not set");
    if (state.profile.injuries && state.profile.injuries.length > 0) {
      // ok
    }
    const grade = issues.length ? "C" : "A";
    const report = `QA Grade: ${grade}\n\nIssues found:\n${issues.length ? issues.map((i,idx)=>`${idx+1}. ${i}`).join("\n") : "None"}`;
    $("gradeReport") && ($("gradeReport").textContent = report);
    toast("QA grade complete");
  }

  // ---------- Bind UI (boot) ----------
  function setActiveNav(view) {
    document.querySelectorAll(".navbtn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    document.querySelectorAll(".bottomnav .tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
  }

  function showView(view) {
    state.ui.view = view;
    persist(null);
    ["home","team","train","profile"].forEach(v => {
      const el = $(`view-${v}`);
      if (el) el.hidden = (v !== view);
    });
    setActiveNav(view);
    renderAll();
  }

  function renderTeam() {
    const body = $("teamBody");
    if (!body) return;
    const teams = state.team.teams || [];
    if (!teams.length) {
      body.innerHTML = `<div class="mini"><div class="minihead">No teams</div><div class="minibody">Create or join a team when cloud is enabled, or test locally.</div></div>`;
      return;
    }
    body.innerHTML = `<div class="mini"><div class="minihead">Teams</div><div class="minibody">${teams.map(t => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid var(--line)"><div><b>${t.name}</b><div class="small muted">${t.sport || ""}</div></div><button class="btn ghost" data-setteam="${t.id}">Set Active</button></div>`).join("")}</div></div>`;
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

  // ---------- Boot & bindings ----------
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

    // Today button in topbar
    $("todayButton")?.addEventListener("click", () => {
      // Three-state flow: Generate -> Start -> Log handled by renderTodayBlock UI
      // If no today session: generate
      if (!state.ui.todaySession) {
        const gen = generateWorkoutFor(state.profile.sport || "basketball", state.profile.preferred_session_type || "practice", state.profile.injuries || []);
        state.ui.todaySession = gen;
        persist("Generated Today session");
        renderTodayBlock();
        toast("Session generated — press Start");
        return;
      }
      // if there's a session but not running, start
      if (!todayActiveSession) {
        startToday(state.ui.todaySession);
        return;
      }
      // if running, stop & log
      if (todayActiveSession) {
        stopAndLogToday();
        return;
      }
    });

    // FAB sheet
    $("fab")?.addEventListener("click", () => {
      const b = $("sheetBackdrop");
      const s = $("fabSheet");
      if (!b || !s) return;
      b.hidden = false;
      s.hidden = false;
    });
    $("btnCloseSheet")?.addEventListener("click", () => {
      $("sheetBackdrop").hidden = true;
      $("fabSheet").hidden = true;
    });

    // Help drawer
    $("btnHelp")?.addEventListener("click", openHelp);
    $("btnCloseHelp")?.addEventListener("click", closeHelp);
    $("helpSearch")?.addEventListener("input", () => {
      const q = $("helpSearch").value.trim().toLowerCase();
      const results = searchHelp(q);
      const rEl = $("helpResults");
      rEl.innerHTML = results.map(r => `<div style="padding:8px;border-bottom:1px solid var(--line)"><b>${r.title}</b><div class="small muted">${r.snippet}</div></div>`).join("");
    });

    // Data management
    $("btnExport")?.addEventListener("click", exportJSON);
    $("fileImport")?.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importJSONFile(f);
    });
    $("btnResetLocal")?.addEventListener("click", () => resetLocalState());
    $("btnRunGrade")?.addEventListener("click", runQAGrade);
    $("btnSaveProfile")?.addEventListener("click", () => {
      const role = $("roleSelect")?.value || state.profile.role;
      const sport = $("sportSelect")?.value || state.profile.sport;
      const pref = $("preferredSessionSelect")?.value || state.profile.preferred_session_type;
      state.profile.role = role;
      state.profile.sport = sport;
      state.profile.preferred_session_type = pref;
      persist("Profile preferences saved");
      renderAll();
    });

    // Theme save
    $("btnSaveTheme")?.addEventListener("click", () => {
      const mode = $("themeModeSelect")?.value || "dark";
      const sport = $("themeSportSelect")?.value || state.profile.sport || "basketball";
      // simple class toggle for body
      document.documentElement.setAttribute("data-theme", mode);
      // store in state
      state.profile.theme = { mode, sport };
      persist("Theme saved");
      toast("Theme saved");
    });

    // Quick actions QA tips
    $("qaTrain")?.addEventListener("click", () => showView("train"));
    $("qaTeam")?.addEventListener("click", () => showView("team"));

    // Auto K keyboard for help
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        openHelp();
        $("helpSearch") && $("helpSearch").focus();
        e.preventDefault();
      }
    });
  }

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
    $("helpSearch") && ($("helpSearch").value = "");
    const rEl = $("helpResults");
    if (rEl) rEl.innerHTML = defaultHelpList().map(r => `<div style="padding:8px;border-bottom:1px solid var(--line)"><b>${r.title}</b><div class="small muted">${r.snippet}</div></div>`).join("");
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
      { title: "Today workflow", snippet: "Generate a session, Start the timer, Stop to log. Use the top 'Generate → Start → Log' button." },
      { title: "Periodization Wizard", snippet: "Profile → Periodization Wizard: create a 12-week plan and push sessions to Today." },
      { title: "Injury settings", snippet: "Add injuries in Account → Role & Sport; generated sessions will include substitutions and reduced load." },
      { title: "Data Management", snippet: "Export / Import your data from Account → Data Management. Reset requires typing RESET." }
    ];
  }

  function searchHelp(q) {
    if (!q) return defaultHelpList();
    const list = defaultHelpList();
    return list.filter(item => (item.title + " " + item.snippet).toLowerCase().includes(q));
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

  // Individual renderers reuse earlier functions
  function renderHome() {
    const homeSub = $("homeSub");
    if (homeSub) homeSub.textContent = `${state.profile.role || "coach"} • ${state.profile.sport || "basketball"}`;
    renderTodayBlock();
  }

  function renderProfile() {
    // existing content plus periodization + insights appended
    renderPeriodizationUI();
    // profile basic info
    const body = $("profileBody");
    if (!body) return;
    // top part may be overwritten by periodization UI; ensure role/sport selects exist in drawer already
    // but create a compact overview here
    const role = state.profile.role || "coach";
    const sport = state.profile.sport || "basketball";
    // ensure Periodization UI remains (it writes into #profileBody), so we won't overwrite here
  }

  // ---------- Initial boot ----------
  function boot() {
    // ensure DOM hooks exist
    bindUI();
    // prefill account drawer selects
    const roleSelect = $("roleSelect");
    const sportSelect = $("sportSelect");
    const pref = $("preferredSessionSelect");
    if (roleSelect) roleSelect.value = state.profile.role || "coach";
    if (sportSelect) sportSelect.value = state.profile.sport || "basketball";
    if (pref) pref.value = state.profile.preferred_session_type || "strength";
    // theme defaults
    if (state.profile && state.profile.theme) {
      document.documentElement.setAttribute("data-theme", state.profile.theme.mode || "dark");
    }
    // set initial view
    showView(state.ui.view || "home");
    // initial render
    renderAll();
    toast("PerformanceIQ ready", 1400);
  }

  // Boot on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // ---------- Expose debug helpers (safe) ----------
  window.__PIQ_DEBUG__ = {
    generateWorkoutFor,
    generate12WeekPlan,
    computeInsights,
    getState: () => state,
    setState: (s) => { state = s; persist("State set via debug"); renderAll(); }
  };
})();
