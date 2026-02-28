// core.js — v3.5.0 (Micro-interactions + Score animation + sport palettes + animated transitions)
// Keeps all v3.4.0 functionality, adds:
// - Micro-interactions: press pop, subtle haptics (optional), UI “done before” feel
// - PerformanceIQ Score: computed from usage, animated count-up + pulse on change
// - Score updates on log/import/reset + renders on Home

(function () {
  "use strict";
  if (window.__PIQ_CORE_V350__) return;
  window.__PIQ_CORE_V350__ = true;

  const $ = (id) => document.getElementById(id);
  const nowISO = () => new Date().toISOString();

  const VIEWS  = ["home", "team", "train", "profile"];
  const SPORTS = ["basketball", "football", "soccer", "baseball", "volleyball", "track"];

  // -----------------------------
  // Sport palettes (smart accent)
  // -----------------------------
  const SPORT_PALETTES = {
    basketball: { accent: "#F97316", accentSoft: "rgba(249,115,22,.14)" },   // orange
    football:   { accent: "#22C55E", accentSoft: "rgba(34,197,94,.14)" },    // green
    soccer:     { accent: "#3B82F6", accentSoft: "rgba(59,130,246,.14)" },   // blue
    baseball:   { accent: "#EF4444", accentSoft: "rgba(239,68,68,.14)" },    // red
    volleyball: { accent: "#A855F7", accentSoft: "rgba(168,85,247,.14)" },   // purple
    track:      { accent: "#14B8A6", accentSoft: "rgba(20,184,166,.14)" }    // teal
  };

  function clampSport(s) {
    return SPORTS.includes(s) ? s : "basketball";
  }

  function applySportTheme(sport) {
    sport = clampSport(sport);
    const pal = SPORT_PALETTES[sport] || SPORT_PALETTES.basketball;

    const html = document.documentElement;
    html.style.setProperty("--accent", pal.accent);
    html.style.setProperty("--accent-2", pal.accentSoft);
    html.style.setProperty("--accent-3", "color-mix(in oklab, var(--accent) 26%, transparent)");

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", pal.accent);
  }

  // ---------- Load + normalize state ----------
  let state = (window.dataStore?.load) ? window.dataStore.load() : null;
  if (!state || typeof state !== "object") state = {};

  state.meta = state.meta || { version: "3.5.0", updated_at: nowISO() };

  state.profile = state.profile || {};
  state.profile.role = state.profile.role || "coach";
  state.profile.sport = clampSport(state.profile.sport || "basketball");
  state.profile.preferred_session_type = state.profile.preferred_session_type || "practice";
  state.profile.injuries = Array.isArray(state.profile.injuries) ? state.profile.injuries : [];
  state.profile.onboarded = !!state.profile.onboarded;
  state.profile.theme =
    state.profile.theme && typeof state.profile.theme === "object"
      ? state.profile.theme
      : { mode: "dark", sport: state.profile.sport };

  state.profile.theme.mode = state.profile.theme.mode || "dark";
  state.profile.theme.sport = clampSport(state.profile.theme.sport || state.profile.sport);

  state.team = state.team || { teams: [], active_team_id: null };
  state.team.teams = Array.isArray(state.team.teams) ? state.team.teams : [];
  state.team.active_team_id = state.team.active_team_id || null;

  state.sessions = Array.isArray(state.sessions) ? state.sessions : [];
  state.periodization = state.periodization || { plan: null, updated_at: null };
  state.insights = state.insights || { weekly: [], updated_at: null };

  state.ui = state.ui || {};
  state.ui.view = VIEWS.includes(state.ui.view) ? state.ui.view : "home";
  state.ui.todaySession = state.ui.todaySession || null;

  // Persist score snapshot (optional cache, safe)
  state.score = state.score && typeof state.score === "object" ? state.score : { value: 0, updated_at: null };

  try { window.dataStore?.save?.(state); } catch {}

  function syncThemeFromState() {
    const mode = state.profile?.theme?.mode || "dark";
    document.documentElement.setAttribute("data-theme", mode);

    const sportAccent = state.profile?.theme?.sport || state.profile?.sport || "basketball";
    applySportTheme(sportAccent);
  }

  // ---------- Motion preference ----------
  const prefersReducedMotion = (() => {
    try { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch { return false; }
  })();

  // ---------- Toast ----------
  let _toastTimer = null;
  function toast(msg, ms = 2200) {
    const t = $("toast");
    if (!t) { console.log("toast:", msg); return; }
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  // ---------- Persist ----------
  function persist(msg) {
    try {
      state.meta = state.meta || {};
      state.meta.version = "3.5.0";
      state.meta.updated_at = nowISO();
      window.dataStore?.save?.(state);
      if (msg) toast(msg);
    } catch (e) {
      console.error("Persist failed", e);
      toast("Save failed");
    }
    applyStatusFromMeta();
  }

  let _persistTimer = null;
  function persistDebounced(msg, ms = 250) {
    clearTimeout(_persistTimer);
    _persistTimer = setTimeout(() => persist(msg), ms);
  }

  // ---------- Safe date helpers ----------
  function safeDate(value) {
    const d = (value instanceof Date) ? value : new Date(value);
    return isFinite(d.getTime()) ? d : null;
  }
  function isoDay(value) {
    const d = safeDate(value);
    return d ? d.toISOString().slice(0, 10) : null;
  }
  function isoWeekKey(value) {
    const d = safeDate(value);
    if (!d) return null;
    const y = d.getUTCFullYear();
    const onejan = new Date(Date.UTC(y, 0, 1));
    const weekNo = Math.ceil((((d - onejan) / 86400000) + onejan.getUTCDay() + 1) / 7);
    return `${y}-W${String(weekNo).padStart(2, "0")}`;
  }
  function timeAgo(value) {
    const d = safeDate(value);
    if (!d) return "";
    const diff = Date.now() - d.getTime();
    const MIN = 60_000, HR = 3_600_000, DAY = 86_400_000;
    if (diff < MIN) return "just now";
    if (diff < HR) return Math.round(diff / MIN) + "m ago";
    if (diff < DAY) return Math.round(diff / HR) + "h ago";
    return Math.round(diff / DAY) + "d ago";
  }

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

  // ===========================
  // Micro-interactions (premium)
  // ===========================
  function canHaptic() {
    return !prefersReducedMotion && typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  }
  function hapticTap(kind = "light") {
    // Keep this subtle to feel native
    if (!canHaptic()) return;
    const pattern = kind === "nav" ? 8 : kind === "success" ? [10, 20, 12] : 8;
    try { navigator.vibrate(pattern); } catch {}
  }

  function microPress(el, kind = "light") {
    if (!el) return;
    el.classList.add("micro-press");
    window.setTimeout(() => el.classList.remove("micro-press"), 160);
    hapticTap(kind);
  }

  function wireMicroInteractions() {
    // Delegated tap effect for the whole app
    document.addEventListener("pointerdown", (e) => {
      const t = e.target.closest(".btn, .iconbtn, .navbtn, .tab, .pill");
      if (!t) return;
      microPress(t, t.classList.contains("navbtn") || t.classList.contains("tab") ? "nav" : "light");
    }, { passive: true });
  }

  // ===========================
  // Score: compute + animation
  // ===========================
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function computeStreak() {
    const sessions = Array.isArray(state.sessions) ? state.sessions : [];
    if (!sessions.length) return 0;

    const days = sessions
      .map(s => isoDay(s?.created_at || s?.generated_at || s?.date))
      .filter(Boolean);

    if (!days.length) return 0;

    const uniq = Array.from(new Set(days)).sort((a, b) => b.localeCompare(a));

    let streak = 1;
    let cursor = new Date(uniq[0] + "T00:00:00.000Z");

    for (let i = 1; i < uniq.length; i++) {
      const d = new Date(uniq[i] + "T00:00:00.000Z");
      const prev = new Date(cursor);
      prev.setUTCDate(prev.getUTCDate() - 1);

      if (d.getTime() === prev.getTime()) {
        streak++;
        cursor = d;
      } else {
        break;
      }
    }
    return streak;
  }

  function computePIQScore() {
    // Score is intentionally simple, stable, and offline-safe.
    // Signals:
    // - Consistency (sessions last 14 days)
    // - Training load volume (minutes last 14 days)
    // - Streak
    // - Variety (session types last 14 days)
    const sessions = Array.isArray(state.sessions) ? state.sessions : [];
    if (!sessions.length) return { value: 0, note: "Log sessions to build your score." };

    const now = Date.now();
    const days14 = 14 * 86_400_000;

    let minutes14 = 0;
    let sessions14 = 0;
    const types = new Set();

    sessions.forEach(s => {
      const d = safeDate(s?.created_at || s?.generated_at || s?.date);
      if (!d) return;
      const age = now - d.getTime();
      if (age <= days14) {
        sessions14 += 1;
        minutes14 += Number(s?.duration_min || 0);
        if (s?.sessionType) types.add(String(s.sessionType));
      }
    });

    const streak = computeStreak();
    const variety = types.size;

    // Normalize:
    // sessions14 target: 6 in 14 days
    // minutes14 target: 240 mins in 14 days
    const sScore = clamp((sessions14 / 6) * 35, 0, 35);
    const mScore = clamp((minutes14 / 240) * 35, 0, 35);
    const stScore = clamp(streak * 3, 0, 18);
    const vScore = clamp(variety * 3, 0, 12);

    const raw = sScore + mScore + stScore + vScore; // max 100
    const value = Math.round(clamp(raw, 0, 100));

    let note = "Keep logging sessions for momentum.";
    if (value >= 85) note = "Elite consistency — keep stacking days.";
    else if (value >= 70) note = "Strong rhythm — push one more quality session.";
    else if (value >= 50) note = "Good base — build a 3–4 day streak.";
    else if (value >= 25) note = "Start small — log 2 sessions this week.";

    return { value, note };
  }

  function animateNumber(el, from, to, ms = 650) {
    if (!el) return;
    if (prefersReducedMotion) { el.textContent = String(to); return; }

    const start = performance.now();
    const diff = to - from;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); } // smooth

    function step(now) {
      const p = clamp((now - start) / ms, 0, 1);
      const v = Math.round(from + diff * easeOut(p));
      el.textContent = String(v);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  let _lastScoreRendered = null;

  function renderPIQScore() {
    const host = $("piqScoreHome");
    const noteEl = $("piqScoreNote");
    if (!host) return;

    const res = computePIQScore();

    const prev = (typeof _lastScoreRendered === "number")
      ? _lastScoreRendered
      : (typeof state.score?.value === "number" ? state.score.value : 0);

    _lastScoreRendered = res.value;

    // Cache to state (safe)
    state.score.value = res.value;
    state.score.updated_at = nowISO();
    persistDebounced(null, 250);

    // Render with animation
    host.innerHTML = `
      <div class="piq-score">
        <div class="piq-score-num" id="piqScoreNum">0</div>
        <div class="piq-score-meta">
          <div class="piq-score-label">/ 100</div>
          <div class="piq-score-chip">${scoreTier(res.value)}</div>
        </div>
      </div>
    `;

    const numEl = $("piqScoreNum");
    if (numEl) {
      animateNumber(numEl, prev, res.value, 700);
      // Pulse if score changed
      if (prev !== res.value) {
        numEl.classList.add("score-bump");
        window.setTimeout(() => numEl.classList.remove("score-bump"), 360);
        hapticTap(res.value > prev ? "success" : "light");
      }
    }

    if (noteEl) noteEl.textContent = res.note;
  }

  function scoreTier(v) {
    if (v >= 85) return "Elite";
    if (v >= 70) return "Strong";
    if (v >= 50) return "Building";
    if (v >= 25) return "Starter";
    return "New";
  }

  // ---------- Libraries (workouts) ----------
  const EXERCISE_LIB = {
    strength: {
      goblet_squat:        { title: "Goblet Squat",         cue: "3x8–10",     subs: { knee: "box_squat" } },
      split_squat:         { title: "Split Squat",          cue: "3x6–8/leg",  subs: { knee: "reverse_lunge" } },
      rdl:                 { title: "Romanian Deadlift",    cue: "3x6–8",      subs: { back: "hip_hinge_dowel" } },
      trap_bar_deadlift:   { title: "Trap Bar Deadlift",    cue: "3x4–6",      subs: { back: "kb_deadlift" } },
      bench:               { title: "Bench Press",          cue: "3x5–8",      subs: { shoulder: "dumbbell_press" } },
      row:                 { title: "Row (DB/Band)",        cue: "3x8–12",     subs: { back: "band_row" } },
      push_press:          { title: "Push Press",           cue: "3x5",        subs: { shoulder: "landmine_press" } },
      single_leg_deadlift: { title: "Single-Leg RDL",       cue: "3x6/leg",    subs: { balance: "rack_step_down" } }
    },
    plyo: {
      approach_jumps: { title: "Approach Jumps", cue: "6 reps", subs: { knee: "low_box_jump" } },
      lateral_bounds: { title: "Lateral Bounds", cue: "4x6",    subs: { ankle: "lateral_step_up" } }
    },
    conditioning: {
      tempo_runs: { title: "Tempo Runs", cue: "6x200m", subs: { ankle: "bike_intervals" } },
      shuttles:   { title: "Shuttles",   cue: "6x20s",  subs: { knee: "rower_intervals" } }
    }
  };

  const SPORT_MICROBLOCKS = {
    basketball: {
      ball_handling: [
        { name: "Two-ball stationary", reps: "6 min", cue: "soft hands" },
        { name: "Cone weaves", reps: "6 reps", cue: "low hips" }
      ],
      shooting: [
        { name: "Catch & shoot", reps: "5x10", cue: "quick feet" },
        { name: "Pull-up 3s", reps: "4x8", cue: "create space" }
      ]
    },
    football: {
      route_running: [
        { name: "Cone route tree", reps: "5 trees", cue: "explode out" },
        { name: "Hands drill", reps: "4x8", cue: "eyes through catch" }
      ],
      throwing: [{ name: "QB quick set", reps: "8 min", cue: "base → rotate" }]
    },
    soccer: {
      dribbling: [
        { name: "1v1 close control", reps: "8 reps", cue: "soft touches" },
        { name: "Passing circuit", reps: "10 min", cue: "weight & timing" }
      ]
    },
    baseball: {
      throwing: [
        { name: "Long toss", reps: "10–15 min", cue: "smooth build" },
        { name: "Band throw pattern", reps: "3 sets", cue: "scap control" }
      ]
    },
    volleyball: {
      hitting: [
        { name: "Approach + arm swing", reps: "5x6", cue: "fast last two" },
        { name: "Block footwork", reps: "6 reps", cue: "timing" }
      ]
    },
    track: {
      sprint: [
        { name: "Acceleration 30m", reps: "6 reps", cue: "drive phase" },
        { name: "A-skips", reps: "3x30s", cue: "stiff ankles" }
      ]
    }
  };

  const SPORT_STRENGTH_PREFS = {
    basketball: ["goblet_squat", "rdl", "push_press"],
    football:   ["trap_bar_deadlift", "bench", "row"],
    soccer:     ["goblet_squat", "single_leg_deadlift", "row"],
    baseball:   ["trap_bar_deadlift", "bench", "row"],
    volleyball: ["goblet_squat", "rdl", "push_press"],
    track:      ["goblet_squat", "rdl", "single_leg_deadlift"]
  };

  const SESSION_RULES = {
    practice:          { warmup: true, skill: true,  strength: true,   plyo: true,  conditioning: true,  cooldown: true },
    strength:          { warmup: true, skill: false, strength: true,   plyo: false, conditioning: false, cooldown: true },
    speed:             { warmup: true, skill: false, strength: false,  plyo: true,  conditioning: false, cooldown: true },
    recovery:          { warmup: true, skill: true,  strength: false,  plyo: false, conditioning: false, cooldown: true },
    competition_prep:  { warmup: true, skill: true,  strength: "light", plyo: true, conditioning: false, cooldown: true }
  };

  const INJURY_FRIENDLY_TEMPLATES = {
    knee: {
      adjustBlocks: (blocks) => blocks.map(b => {
        if (b.type === "plyo") {
          return Object.assign({}, b, {
            title: "Power & Plyo (knee-friendly)",
            duration_min: Math.max(6, Math.round((b.duration_min || 10) * 0.7)),
            items: [
              { name: "Low box jump", cue: "4–6 reps (stick landings)" },
              { name: "Snap-downs", cue: "3x3 (quiet landings)" }
            ]
          });
        }
        if (b.type === "conditioning") {
          return Object.assign({}, b, {
            title: "Conditioning (low impact)",
            items: [{ name: "Bike intervals", cue: "6x20s hard / 70s easy" }]
          });
        }
        return b;
      }),
      note: "Knee-friendly: reduce impact, emphasize landing control."
    },
    ankle: {
      adjustBlocks: (blocks) => blocks.map(b => {
        if (b.type === "conditioning") {
          return Object.assign({}, b, {
            title: "Conditioning (ankle-friendly)",
            items: [{ name: "Rower intervals", cue: "6x30s / 60s easy" }]
          });
        }
        return b;
      }),
      note: "Ankle-friendly: reduce cutting volume; choose low-impact conditioning."
    },
    shoulder: {
      adjustBlocks: (blocks) => blocks.map(b => {
        if (b.type === "strength") {
          return Object.assign({}, b, {
            title: "Strength (shoulder-friendly)",
            items: (b.items || []).map(it => {
              if ((it.name || "").toLowerCase().includes("press")) {
                return Object.assign({}, it, { substitution: "landmine_press", cue: "3x8 light — controlled tempo" });
              }
              return it;
            })
          });
        }
        return b;
      }),
      note: "Shoulder-friendly: reduce overhead; use landmine/band patterns."
    },
    back: {
      adjustBlocks: (blocks) => blocks.map(b => {
        if (b.type === "strength") {
          return Object.assign({}, b, {
            title: "Strength (back-friendly)",
            items: (b.items || []).map(it => {
              const n = (it.name || "").toLowerCase();
              if (n.includes("deadlift") || n.includes("rdl")) {
                return Object.assign({}, it, { substitution: "hip_hinge_dowel", cue: "3x10 — patterning, no heavy load" });
              }
              return it;
            })
          });
        }
        return b;
      }),
      note: "Back-friendly: focus on hinge patterning and trunk control."
    }
  };

  function warmupItems(sport, sessionType) {
    const base = [
      { name: "Ankle/hip mobility", cue: "2–3 min" },
      { name: "Activation (glutes/core)", cue: "2 min" },
      { name: "Movement prep", cue: "4–5 min" }
    ];

    const sportAdds = {
      basketball: [{ name: "Pogo hops", cue: "2x20s" }, { name: "Decel snaps", cue: "3 reps" }],
      football:   [{ name: "A-skips", cue: "2x20m" }, { name: "Wall drills", cue: "3x10s" }],
      soccer:     [{ name: "Adductor rocks", cue: "8/side" }, { name: "Copenhagen (easy)", cue: "2x10s" }],
      baseball:   [{ name: "Band shoulder series", cue: "2 min" }, { name: "T-spine openers", cue: "6/side" }],
      volleyball: [{ name: "Landing mechanics", cue: "5 reps" }, { name: "Approach rhythm", cue: "3 reps" }],
      track:      [{ name: "Drills (A/B skips)", cue: "2–3 min" }, { name: "Strides", cue: "3x60m easy" }]
    };

    const typeAdds = {
      strength: [{ name: "Ramp sets (light)", cue: "2 warm-up sets" }],
      speed: [{ name: "Build-ups", cue: "3x20m" }],
      recovery: [{ name: "Breathing reset", cue: "60–90s" }],
      competition_prep: [{ name: "Neural pop", cue: "2x10s fast" }],
      practice: []
    };

    return base
      .concat(sportAdds[sport] || [])
      .concat(typeAdds[sessionType] || []);
  }

  function applyInjury(exKey, injuries) {
    const def = EXERCISE_LIB.strength[exKey];
    if (!def) return null;

    const inj = Array.isArray(injuries) ? injuries : [];
    let sub = null;
    for (const tag of inj) {
      if (def.subs?.[tag]) { sub = def.subs[tag]; break; }
    }

    return {
      key: exKey,
      name: def.title,
      cue: sub ? (def.cue + " — lighter load / controlled tempo") : def.cue,
      substitution: sub
    };
  }

  function generateWorkoutFor(sport = "basketball", sessionType = "practice", injuries = []) {
    sport = clampSport(sport);
    const rules = SESSION_RULES[sessionType] || SESSION_RULES.practice;
    const blocks = [];

    if (rules.warmup) {
      blocks.push({
        id: uid("warmup"),
        type: "warmup",
        title: "Dynamic Warm-up",
        duration_min: 10,
        items: warmupItems(sport, sessionType)
      });
    }

    if (rules.skill) {
      const micro = SPORT_MICROBLOCKS[sport] || {};
      const keys = Object.keys(micro);
      const items = [];
      keys.slice(0, 2).forEach(k => (micro[k] || []).slice(0, 2).forEach(it => items.push(it)));
      blocks.push({
        id: uid("skill"),
        type: "skill",
        title: "Skill Microblocks",
        duration_min: 15,
        items
      });
    }

    if (rules.strength) {
      const pref = SPORT_STRENGTH_PREFS[sport] || ["goblet_squat", "rdl", "row"];
      const strengthItems = [];
      pref.slice(0, 3).forEach(k => {
        const ex = applyInjury(k, injuries);
        if (ex) strengthItems.push(ex);
      });

      const isLight = (rules.strength === "light");
      blocks.push({
        id: uid("strength"),
        type: "strength",
        title: isLight ? "Strength (light)" : "Strength",
        duration_min: isLight ? 12 : 20,
        items: strengthItems.map(x => ({
          name: x.name,
          cue: isLight ? "2x6–8 light, fast intent" : x.cue,
          substitution: x.substitution || null
        }))
      });
    }

    if (rules.plyo) {
      blocks.push({
        id: uid("plyo"),
        type: "plyo",
        title: "Power & Plyo",
        duration_min: 10,
        items: [
          { name: EXERCISE_LIB.plyo.approach_jumps.title, cue: EXERCISE_LIB.plyo.approach_jumps.cue },
          { name: EXERCISE_LIB.plyo.lateral_bounds.title, cue: EXERCISE_LIB.plyo.lateral_bounds.cue }
        ]
      });
    }

    if (rules.conditioning) {
      blocks.push({
        id: uid("cond"),
        type: "conditioning",
        title: "Conditioning",
        duration_min: 8,
        items: [{ name: EXERCISE_LIB.conditioning.tempo_runs.title, cue: EXERCISE_LIB.conditioning.tempo_runs.cue }]
      });
    }

    if (rules.cooldown) {
      blocks.push({
        id: uid("cd"),
        type: "cooldown",
        title: "Cool-down",
        duration_min: 5,
        items: [{ name: "Breathing + calves/hips", cue: "5 min easy" }]
      });
    }

    const injList = Array.isArray(injuries) ? injuries : [];
    let adjustedBlocks = blocks.slice();
    let injuryNotes = [];

    injList.forEach(tag => {
      const tpl = INJURY_FRIENDLY_TEMPLATES[tag];
      if (tpl?.adjustBlocks) {
        adjustedBlocks = tpl.adjustBlocks(adjustedBlocks);
        if (tpl.note) injuryNotes.push(tpl.note);
      }
    });

    return {
      id: uid("sess"),
      sport,
      sessionType,
      injuries: injList,
      injury_notes: injuryNotes,
      generated_at: nowISO(),
      blocks: adjustedBlocks,
      total_min: adjustedBlocks.reduce((sum, b) => sum + (b.duration_min || 0), 0)
    };
  }

  // ---------- Today workflow ----------
  let todayTimer = null;
  let todayTimerStart = null;
  let todayActiveSession = null;

  function _generateTodaySession() {
    return generateWorkoutFor(
      state.profile.sport || "basketball",
      state.profile.preferred_session_type || "practice",
      state.profile.injuries || []
    );
  }

  function renderTodayBlock() {
    const container = $("todayBlock");
    if (!container) return;

    const planned = state.ui?.todaySession || null;

    if (todayActiveSession) {
      container.innerHTML = `
        <div class="minihead">In progress: ${todayActiveSession.sessionType} • ${todayActiveSession.sport}</div>
        <div class="minibody mono" id="todayRunning">Started ${timeAgo(todayTimerStart)}</div>
        <div style="margin-top:8px" class="row gap wrap">
          <button class="btn danger" id="btnStopNow" type="button">Stop &amp; Log</button>
          <button class="btn ghost" id="btnCancelNow" type="button">Cancel</button>
        </div>
      `;
      $("btnStopNow")?.addEventListener("click", stopAndLogToday);
      $("btnCancelNow")?.addEventListener("click", cancelToday);
      return;
    }

    if (planned) {
      const blocksHTML = (planned.blocks || []).map(b => {
        const items = (b.items || []).map(it => {
          const name = it.name || it.title || it.key || "Item";
          const cue  = it.cue ? ` <span class="small muted">— ${it.cue}</span>` : "";
          const sub  = it.substitution ? ` <span class="small muted">• sub: ${it.substitution}</span>` : "";
          const reps = it.reps ? ` <span class="small muted">• ${it.reps}</span>` : "";
          return `<div style="margin:4px 0">• ${name}${reps}${cue}${sub}</div>`;
        }).join("");
        return `
          <div class="blockcard">
            <div class="blockcard-head">
              <div class="blockcard-title">${b.title}</div>
              <div class="small muted">${b.duration_min} min</div>
            </div>
            <div class="small muted">${items || "—"}</div>
          </div>
        `;
      }).join("");

      const notes = (planned.injury_notes && planned.injury_notes.length)
        ? `<div class="note" style="margin-top:10px"><b>Injury-friendly notes:</b><br/>${planned.injury_notes.map(n => `• ${n}`).join("<br/>")}</div>`
        : "";

      container.innerHTML = `
        <div class="minihead">${planned.sessionType} • ${planned.sport} • ${planned.total_min} min</div>
        <div class="minibody">${blocksHTML}${notes}</div>
        <div style="margin-top:8px" class="row gap wrap">
          <button class="btn" id="btnStartToday" type="button">Start</button>
          <button class="btn ghost" id="btnGenerateNew" type="button">Generate new</button>
        </div>
      `;
      $("btnStartToday")?.addEventListener("click", () => startToday(planned));
      $("btnGenerateNew")?.addEventListener("click", () => {
        state.ui.todaySession = _generateTodaySession();
        persist("New session generated");
        renderTodayBlock();
      });
      return;
    }

    container.innerHTML = `
      <div class="minihead">No session generated</div>
      <div class="minibody">Press Generate to create a tailored session for today.</div>
      <div style="margin-top:8px" class="row gap wrap">
        <button class="btn" id="btnGenerateOnly" type="button">Generate</button>
        <button class="btn ghost" id="btnOpenTrain" type="button">Open Train</button>
      </div>
    `;
    $("btnGenerateOnly")?.addEventListener("click", () => {
      state.ui.todaySession = _generateTodaySession();
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

    const timerEl = $("todayTimer");
    if (timerEl) timerEl.textContent = "Running…";

    todayTimer = setInterval(() => {
      const el = $("todayRunning");
      if (el) el.textContent = "Started " + timeAgo(todayTimerStart);
    }, 1500);
  }

  function _clearTodayTimer() {
    if (todayTimer) clearInterval(todayTimer);
    todayTimer = null;
    todayTimerStart = null;
    todayActiveSession = null;
    const timerEl = $("todayTimer");
    if (timerEl) timerEl.textContent = "No timer running";
  }

  function stopAndLogToday() {
    if (!todayActiveSession) return;

    const durationMin = Math.max(1, Math.round((Date.now() - todayTimerStart) / 60000));
    const sRPE = 6;
    const load = Math.round(durationMin * sRPE);

    const record = {
      id: uid("log"),
      created_at: nowISO(),
      sport: todayActiveSession.sport,
      sessionType: todayActiveSession.sessionType,
      duration_min: durationMin,
      sRPE,
      load,
      blocks: todayActiveSession.blocks
    };

    state.sessions.push(record);
    state.ui.todaySession = null;
    persist(`Logged ${durationMin} min • load ${load}`);

    _clearTodayTimer();
    renderTodayBlock();
    renderInsights();
    renderPIQScore();
  }

  function cancelToday() {
    _clearTodayTimer();
    renderTodayBlock();
    toast("Session cancelled");
  }

  // ---------- Train tab ----------
  function renderTrain() {
    const sport = state.profile?.sport || "basketball";
    const role  = state.profile?.role || "coach";
    const pref  = state.profile?.preferred_session_type || "practice";

    const body = $("trainBody");
    const trainSub = $("trainSub");
    if (trainSub) trainSub.textContent = `${role} • ${sport} • ${pref}`;
    if (!body) return;

    const sportOptions = SPORTS.map(s =>
      `<option value="${s}" ${s === sport ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`
    ).join("");

    body.innerHTML = `
      <div class="row gap wrap" style="align-items:flex-end;margin-bottom:12px">
        <div class="field" style="flex:1;min-width:180px">
          <label>Sport</label>
          <select id="trainSportSelect">${sportOptions}</select>
        </div>

        <div class="field" style="width:210px">
          <label>Session type</label>
          <select id="trainSessionType">
            <option value="practice">Practice</option>
            <option value="strength">Strength</option>
            <option value="speed">Speed</option>
            <option value="recovery">Recovery</option>
            <option value="competition_prep">Competition Prep</option>
          </select>
        </div>

        <button class="btn" id="btnGenTrain" type="button">Generate</button>
      </div>

      <div id="trainCardArea"></div>
    `;

    const sessionEl = $("trainSessionType");
    if (sessionEl) sessionEl.value = pref;

    function renderCard(gen) {
      const area = $("trainCardArea");
      if (!area) return;

      area.innerHTML = `
        <div class="mini">
          <div class="minihead">${gen.sessionType} • ${gen.sport} • ${gen.total_min} min</div>
          <div class="minibody">
            ${gen.blocks.map(b => `
              <div class="blockcard">
                <div class="blockcard-head">
                  <div class="blockcard-title">${b.title}</div>
                  <div class="small muted">${b.duration_min} min</div>
                </div>
                <div class="small muted">${(b.items||[]).map(it => it.name || it.title || it.key).join(", ")}</div>
              </div>
            `).join("")}

            <div style="margin-top:10px" class="row gap wrap">
              <button class="btn" id="btnPushToday2" type="button">Push to Today</button>
              <button class="btn ghost" id="btnStartNow" type="button">Start Now</button>
            </div>
          </div>
        </div>
      `;

      $("btnPushToday2")?.addEventListener("click", () => {
        state.ui.todaySession = gen;
        persist("Pushed to Today");
        showView("home");
      });

      $("btnStartNow")?.addEventListener("click", () => {
        state.ui.todaySession = gen;
        persist("Pushed to Today and starting");
        showView("home");
        startToday(gen);
      });
    }

    renderCard(generateWorkoutFor(sport, pref, state.profile.injuries || []));

    $("trainSportSelect")?.addEventListener("change", (e) => {
      const s = clampSport(e.target.value);
      state.profile.sport = s;
      state.profile.theme.sport = s; // smart follow
      syncThemeFromState();
      persist("Sport updated");
      renderTrain();
      renderPIQScore();
    });

    $("btnGenTrain")?.addEventListener("click", () => {
      const s = clampSport($("trainSportSelect")?.value || sport);
      const t = $("trainSessionType")?.value || pref;
      state.profile.sport = s;
      state.profile.preferred_session_type = t;
      state.profile.theme.sport = s;
      syncThemeFromState();

      const gen = generateWorkoutFor(s, t, state.profile.injuries || []);
      persistDebounced(null);
      renderCard(gen);
    });
  }

  // ---------- Team ----------
  function setTeamPill() {
    const pill = $("teamPill");
    if (!pill) return;
    const teamName = (state.team?.teams || []).find(t => t.id === state.team?.active_team_id)?.name;
    pill.textContent = `Team: ${teamName || "—"}`;
  }

  function renderTeam() {
    const body = $("teamBody");
    if (!body) return;
    const teams = state.team?.teams || [];
    if (!teams.length) {
      body.innerHTML = `
        <div class="mini">
          <div class="minihead">No teams</div>
          <div class="minibody">Create or join a team when cloud is enabled, or test locally.</div>
        </div>
      `;
      return;
    }
    body.innerHTML = `
      <div class="mini">
        <div class="minihead">Teams</div>
        <div class="minibody">
          ${teams.map(t => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid var(--line)">
              <div><b>${t.name}</b><div class="small muted">${t.sport || ""}</div></div>
              <button class="btn ghost" data-setteam="${t.id}" type="button">Set Active</button>
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

  // ---------- Insights ----------
  function computeInsights() {
    const sessions = Array.isArray(state.sessions) ? state.sessions : [];
    const byWeek = {};

    sessions.forEach(s => {
      const key = isoWeekKey(s?.created_at || s?.generated_at || s?.date);
      if (!key) return;
      byWeek[key] = byWeek[key] || { minutes: 0, load: 0, sessions: 0 };
      byWeek[key].minutes += Number(s?.duration_min || 0);
      byWeek[key].load += Number(s?.load || 0);
      byWeek[key].sessions += 1;
    });

    const weekly = Object.entries(byWeek)
      .map(([k, v]) => ({ week: k, minutes: v.minutes, load: v.load, sessions: v.sessions }))
      .sort((a, b) => b.week.localeCompare(a.week))
      .slice(0, 12);

    state.insights.weekly = weekly;
    state.insights.updated_at = nowISO();
    persistDebounced(null, 250);
    return state.insights;
  }

  function renderInsights(intoEl) {
    computeInsights();
    const weekly = state.insights?.weekly || [];
    const rows = weekly.map(w => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)">
        <div>${w.week}</div>
        <div>${w.minutes}m • load ${w.load}</div>
      </div>
    `).join("");

    const streak = computeStreak();
    const host = intoEl || $("profileBody");
    if (!host) return;

    host.querySelector(".piq-insights-block")?.remove();

    const el = document.createElement("div");
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
    host.appendChild(el);
  }

  // ---------- Data Management ----------
  function exportJSON() {
    if (!window.dataStore?.exportJSON) { toast("Export not available"); return; }
    const json = window.dataStore.exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
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
    r.onload = (e) => {
      try {
        if (!window.dataStore?.importJSON) { toast("Import not available"); return; }
        window.dataStore.importJSON(e.target.result);
        state = window.dataStore.load() || state;

        // Re-normalize
        state.profile = state.profile || {};
        state.profile.sport = clampSport(state.profile.sport || "basketball");
        state.profile.theme = state.profile.theme || { mode: "dark", sport: state.profile.sport };
        state.profile.theme.mode = state.profile.theme.mode || "dark";
        state.profile.theme.sport = clampSport(state.profile.theme.sport || state.profile.sport);

        state.sessions = Array.isArray(state.sessions) ? state.sessions : [];
        state.score = state.score && typeof state.score === "object" ? state.score : { value: 0, updated_at: null };

        syncThemeFromState();
        toast("Import complete");
        renderAll();
        renderPIQScore();
      } catch (err) {
        console.error(err);
        toast("Import failed: " + (err.message || "unknown error"));
      }
    };
    r.readAsText(file);
  }

  function resetLocalState() {
    const ok = confirm("Reset local state? This will remove all local data.");
    if (!ok) return;
    const typed = prompt("Type RESET to confirm");
    if (typed !== "RESET") { toast("Reset aborted"); return; }
    localStorage.removeItem("piq_local_state_v2");
    toast("Local state reset — reloading");
    setTimeout(() => location.reload(), 700);
  }

  function runQAGrade(intoElId) {
    const issues = [];
    if (!state.profile?.sport) issues.push("Profile sport not set");
    if (!state.ui?.todaySession && !(state.sessions && state.sessions.length)) issues.push("No session generated/logged yet");
    const grade = issues.length === 0 ? "A" : issues.length === 1 ? "B" : "C";

    const report =
      `QA Grade: ${grade}\n\nIssues found:\n` +
      (issues.length ? issues.map((x, i) => `${i + 1}. ${x}`).join("\n") : "None");

    const el = $(intoElId || "gradeReport");
    if (el) el.textContent = report;
    toast("QA grade complete");
  }

  // ---------- Navigation + elite transitions ----------
  function setActiveNav(view) {
    document.querySelectorAll(".navbtn, .bottomnav .tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
      btn.setAttribute("aria-current", btn.dataset.view === view ? "page" : "false");
    });
  }

  function focusAndScrollTop(view) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const active = $(`view-${view}`);
    if (active) {
      try { active.scrollTop = 0; } catch {}
      try { active.focus({ preventScroll: true }); } catch {}
    }
    const content = document.querySelector(".content");
    if (content) {
      try { content.scrollTop = 0; } catch {}
    }
  }

  function setActiveViewClass(view) {
    VIEWS.forEach(v => {
      const el = $(`view-${v}`);
      if (!el) return;
      el.classList.toggle("is-active", v === view);
    });
  }

  function transitionToView(view) {
    VIEWS.forEach(v => {
      const el = $(`view-${v}`);
      if (!el) return;
      el.hidden = true;
      el.classList.remove("view-enter", "view-enter-active");
    });

    const el = $(`view-${view}`);
    if (!el) return;

    el.hidden = false;
    if (!prefersReducedMotion) {
      el.classList.add("view-enter");
      // force reflow
      // eslint-disable-next-line no-unused-expressions
      el.offsetHeight;
      el.classList.add("view-enter-active");
      window.setTimeout(() => el.classList.remove("view-enter", "view-enter-active"), 260);
    }
  }

  function showView(view) {
    if (!VIEWS.includes(view)) view = "home";
    state.ui.view = view;
    persistDebounced(null);

    setActiveNav(view);
    setActiveViewClass(view);
    transitionToView(view);

    renderAll();
    requestAnimationFrame(() => focusAndScrollTop(view));
  }

  // ---------- Onboarding ----------
  function ensureOnboarding() {
    if (state.profile.onboarded) return;

    const overlay = document.createElement("div");
    overlay.className = "piq-modal-backdrop";
    overlay.innerHTML = `
      <div class="piq-modal" role="dialog" aria-modal="true" aria-label="Get started">
        <div class="piq-modal-head">
          <div class="piq-modal-title">Welcome to PerformanceIQ</div>
          <div class="piq-modal-sub">Pick role, sport, and session type — then hit “Try now” to generate Today.</div>
        </div>

        <div class="piq-modal-body">
          <div class="grid2">
            <div class="field">
              <label>Role</label>
              <select id="obRole">
                <option value="coach">Coach</option>
                <option value="athlete">Athlete</option>
                <option value="parent">Parent</option>
              </select>
            </div>

            <div class="field">
              <label>Sport</label>
              <select id="obSport">
                ${SPORTS.map(s => `<option value="${s}">${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}
              </select>
            </div>
          </div>

          <div class="field" style="margin-top:10px">
            <label>Session type</label>
            <select id="obType">
              <option value="practice">Practice</option>
              <option value="strength">Strength</option>
              <option value="speed">Speed</option>
              <option value="recovery">Recovery</option>
              <option value="competition_prep">Competition prep</option>
            </select>
          </div>

          <div style="margin-top:10px">
            <div class="small muted"><b>Injury filters</b> (optional):</div>
            <div class="piq-chiprow" id="obInj">
              ${["knee","ankle","shoulder","back"].map(x => `<button class="piq-chip" data-inj="${x}" type="button">${x}</button>`).join("")}
            </div>
          </div>

          <div class="row between" style="margin-top:14px">
            <div class="small muted">You can change this anytime in Account.</div>
            <div class="row gap wrap">
              <button class="btn ghost" id="obSkip" type="button">Skip</button>
              <button class="btn" id="obTry" type="button">Try now</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const roleEl = overlay.querySelector("#obRole");
    const sportEl = overlay.querySelector("#obSport");
    const typeEl = overlay.querySelector("#obType");
    const injRow = overlay.querySelector("#obInj");

    roleEl.value = state.profile.role || "coach";
    sportEl.value = state.profile.sport || "basketball";
    typeEl.value = state.profile.preferred_session_type || "practice";

    const injSet = new Set(state.profile.injuries || []);
    function syncInjUI() {
      injRow.querySelectorAll(".piq-chip").forEach(btn => {
        const k = btn.getAttribute("data-inj");
        btn.classList.toggle("on", injSet.has(k));
      });
    }
    injRow.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-inj]");
      if (!btn) return;
      const k = btn.getAttribute("data-inj");
      if (injSet.has(k)) injSet.delete(k); else injSet.add(k);
      syncInjUI();
    });
    syncInjUI();

    overlay.querySelector("#obSkip").addEventListener("click", () => {
      state.profile.onboarded = true;
      persist("Onboarding skipped");
      overlay.remove();
      showView("home");
      renderPIQScore();
    });

    overlay.querySelector("#obTry").addEventListener("click", () => {
      state.profile.role = roleEl.value;
      state.profile.sport = clampSport(sportEl.value);
      state.profile.preferred_session_type = typeEl.value;
      state.profile.injuries = Array.from(injSet);
      state.profile.onboarded = true;

      state.profile.theme.sport = state.profile.sport;
      syncThemeFromState();

      state.ui.todaySession = _generateTodaySession();
      persist("Onboarding saved • Today generated");

      overlay.remove();
      showView("home");
      toast("Today ready — press Start", 2200);
      renderTodayBlock();
      renderPIQScore();
    });
  }

  // ---------- Profile view ----------
  function renderProfile() {
    const body = $("profileBody");
    if (!body) return;

    body.innerHTML = `
      <div class="mini">
        <div class="minihead">Profile</div>
        <div class="minibody">
          <div><b>Role</b>: ${state.profile.role}</div>
          <div><b>Sport</b>: ${state.profile.sport}</div>
          <div><b>Preferred session</b>: ${state.profile.preferred_session_type}</div>
          <div class="small muted" style="margin-top:8px">Tip: Use Train to generate by sport/session type and push to Today.</div>
        </div>
      </div>

      <div class="mini" style="margin-top:12px">
        <div class="minihead">Data Management</div>
        <div class="minibody">
          <div class="small muted">Export/Import/Reset are available here (and in Account).</div>

          <div class="row gap wrap" style="margin-top:10px">
            <button class="btn ghost" id="profExport" type="button">Export JSON</button>
            <label class="btn ghost" style="cursor:pointer">
              Import JSON
              <input id="profImport" type="file" accept="application/json" style="display:none" />
            </label>
            <button class="btn danger" id="profReset" type="button">Reset local</button>
          </div>

          <div class="row gap wrap" style="margin-top:10px">
            <button class="btn" id="profGrade" type="button">Run QA Grade</button>
          </div>

          <pre id="profGradeReport" class="small muted" style="white-space:pre-wrap;margin-top:8px">—</pre>
        </div>
      </div>
    `;

    $("profExport")?.addEventListener("click", exportJSON);
    $("profImport")?.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) importJSONFile(f);
    });
    $("profReset")?.addEventListener("click", resetLocalState);
    $("profGrade")?.addEventListener("click", () => runQAGrade("profGradeReport"));

    renderInsights(body);
  }

  function renderHome() {
    const homeSub = $("homeSub");
    if (homeSub) homeSub.textContent = `${state.profile.role} • ${state.profile.sport} • ${state.profile.preferred_session_type}`;
    renderTodayBlock();
    renderPIQScore();
  }

  function renderAll() {
    try {
      setTeamPill();
      renderHome();
      renderTeam();
      renderTrain();
      renderProfile();
      applyStatusFromMeta();
    } catch (e) {
      console.error("Render error", e);
    }
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
    if (rEl) rEl.innerHTML = helpListHTML(defaultHelpList());
  }
  function closeHelp() {
    const b = $("helpBackdrop");
    const d = $("helpDrawer");
    if (!b || !d) return;
    b.hidden = true;
    d.classList.remove("open");
    d.setAttribute("aria-hidden", "true");
  }

  function defaultHelpList() {
    return [
      { title: "Today workflow", snippet: "Home → Generate → Start → Stop & Log. Train can push sessions into Today." },
      { title: "Session types", snippet: "Practice = all blocks. Strength = lift focus. Speed = plyo/speed. Recovery = light skill + mobility. Competition prep = sharp + light." },
      { title: "Smart sport theme", snippet: "Accent color auto-updates based on sport. Change sport in Train or Account → Appearance." },
      { title: "PerformanceIQ Score", snippet: "Score increases with consistency, minutes, streaks, and variety in the last 14 days." }
    ];
  }
  function searchHelp(q) {
    const list = defaultHelpList();
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter(item => (item.title + " " + item.snippet).toLowerCase().includes(s));
  }
  function helpListHTML(list) {
    return list.map(r =>
      `<div style="padding:8px;border-bottom:1px solid var(--line)">
        <b>${r.title}</b>
        <div class="small muted">${r.snippet}</div>
      </div>`
    ).join("");
  }
  function openHelpTopic(topic) {
    openHelp();
    const searchEl = $("helpSearch");
    if (searchEl) searchEl.value = topic;
    const rEl = $("helpResults");
    if (rEl) rEl.innerHTML = helpListHTML(searchHelp(topic));
  }

  // ---------- Bind UI ----------
  function bindUI() {
    // Nav
    document.querySelectorAll("[data-view]").forEach(btn => {
      if (btn.classList.contains("navbtn") || btn.classList.contains("tab")) {
        btn.addEventListener("click", () => showView(btn.dataset.view));
      }
    });

    // Account drawer
    $("btnAccount")?.addEventListener("click", openDrawer);
    $("btnCloseDrawer")?.addEventListener("click", closeDrawer);
    $("drawerBackdrop")?.addEventListener("click", closeDrawer);

    // Help drawer
    $("btnHelp")?.addEventListener("click", openHelp);
    $("btnCloseHelp")?.addEventListener("click", closeHelp);
    $("helpBackdrop")?.addEventListener("click", closeHelp);

    $("helpSearch")?.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      const rEl = $("helpResults");
      if (rEl) rEl.innerHTML = helpListHTML(searchHelp(q));
    });

    // Context help buttons
    $("tipToday")?.addEventListener("click", () => openHelpTopic("today"));
    $("tipQuick")?.addEventListener("click", () => openHelpTopic("today"));
    $("tipTrain")?.addEventListener("click", () => openHelpTopic("session types"));
    $("tipTrain2")?.addEventListener("click", () => openHelpTopic("session types"));
    $("tipTeam")?.addEventListener("click", () => openHelpTopic("team"));
    $("tipProfile")?.addEventListener("click", () => openHelpTopic("score"));

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeDrawer(); closeHelp(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        openHelp();
        $("helpSearch")?.focus();
        e.preventDefault();
      }
    });

    // Today button
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

    // Quick actions
    $("qaTrain")?.addEventListener("click", () => showView("train"));
    $("qaTeam")?.addEventListener("click", () => showView("team"));

    // Theme toggle (dark/light)
    $("btnThemeToggle")?.addEventListener("click", () => {
      const html = document.documentElement;
      const cur = html.getAttribute("data-theme") || "dark";
      const next = cur === "dark" ? "light" : "dark";
      html.setAttribute("data-theme", next);
      state.profile.theme = state.profile.theme || {};
      state.profile.theme.mode = next;
      persistDebounced("Theme updated", 0);
      renderPIQScore();
    });

    // Drawer saves
    $("btnSaveProfile")?.addEventListener("click", () => {
      const newSport = clampSport($("sportSelect")?.value || state.profile.sport);

      state.profile.role = $("roleSelect")?.value || state.profile.role;
      state.profile.sport = newSport;
      state.profile.preferred_session_type = $("preferredSessionSelect")?.value || state.profile.preferred_session_type;

      // If accent sport was tracking the profile sport, keep tracking it.
      if (state.profile.theme?.sport === state.profile.sport) {
        state.profile.theme.sport = newSport;
      } else {
        // Default behavior: still follow new sport unless user chose something else explicitly
        state.profile.theme.sport = newSport;
      }

      syncThemeFromState();
      persist("Profile preferences saved");
      renderAll();
    });

    $("btnSaveTheme")?.addEventListener("click", () => {
      const mode = $("themeModeSelect")?.value || "dark";
      const themeSport = clampSport($("themeSportSelect")?.value || state.profile.sport);

      state.profile.theme = state.profile.theme || {};
      state.profile.theme.mode = mode;
      state.profile.theme.sport = themeSport;

      syncThemeFromState();
      persist("Theme saved");
      renderAll();
    });

    // Data management (Account drawer)
    $("btnExport")?.addEventListener("click", exportJSON);
    $("fileImport")?.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) importJSONFile(f);
    });
    $("btnResetLocal")?.addEventListener("click", resetLocalState);
    $("btnRunGrade")?.addEventListener("click", () => runQAGrade("gradeReport"));

    // FAB sheet open/close
    $("fab")?.addEventListener("click", () => {
      const back = $("sheetBackdrop");
      const sheet = $("fabSheet");
      if (back) back.hidden = false;
      if (sheet) { sheet.hidden = false; sheet.setAttribute("aria-hidden", "false"); }
    });
    $("btnCloseSheet")?.addEventListener("click", () => {
      const back = $("sheetBackdrop");
      const sheet = $("fabSheet");
      if (back) back.hidden = true;
      if (sheet) { sheet.hidden = true; sheet.setAttribute("aria-hidden", "true"); }
    });
    $("sheetBackdrop")?.addEventListener("click", () => {
      const back = $("sheetBackdrop");
      const sheet = $("fabSheet");
      if (back) back.hidden = true;
      if (sheet) { sheet.hidden = true; sheet.setAttribute("aria-hidden", "true"); }
    });
  }

  // ---------- Boot ----------
  function boot() {
    wireMicroInteractions();
    bindUI();

    // Apply theme + sport palette
    syncThemeFromState();

    // Pre-fill drawer selects
    if ($("roleSelect")) $("roleSelect").value = state.profile.role;
    if ($("sportSelect")) $("sportSelect").value = state.profile.sport;
    if ($("preferredSessionSelect")) $("preferredSessionSelect").value = state.profile.preferred_session_type;

    if ($("themeModeSelect")) $("themeModeSelect").value = state.profile?.theme?.mode || "dark";
    if ($("themeSportSelect")) $("themeSportSelect").value = state.profile?.theme?.sport || state.profile.sport;

    ensureOnboarding();

    showView(state.ui.view || "home");
    renderAll();
    renderPIQScore();
    toast("PerformanceIQ ready", 1400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Debug
  window.__PIQ_DEBUG__ = {
    generateWorkoutFor,
    getState: () => state,
    applySportTheme,
    computePIQScore
  };
})();
