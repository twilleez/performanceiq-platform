// core.js — v3.2.0 (Phase 3–7: RBAC + PIQ Score + Heatmap + Nutrition + Risk + Periodization + active view focus)
(function () {
  "use strict";
  if (window.__PIQ_CORE_V320__) return;
  window.__PIQ_CORE_V320__ = true;

  const $ = (id) => document.getElementById(id);
  const nowISO = () => new Date().toISOString();

  const VIEWS  = ["home", "team", "train", "profile"];
  const SPORTS = ["basketball", "football", "soccer", "baseball", "volleyball", "track"];

  // ---------- Load state ----------
  let state = (window.dataStore?.load) ? window.dataStore.load() : {};
  state.meta = state.meta || { version: "3.2.0", updated_at: nowISO() };
  state.profile = state.profile || {};
  state.profile.role = state.profile.role || "coach";
  state.profile.sport = state.profile.sport || "basketball";
  state.profile.preferred_session_type = state.profile.preferred_session_type || "practice";
  state.profile.injuries = Array.isArray(state.profile.injuries) ? state.profile.injuries : [];
  state.profile.onboarded = !!state.profile.onboarded;
  state.profile.theme = state.profile.theme || { mode: document.documentElement.getAttribute("data-theme") || "dark" };

  state.team = state.team || { teams: [], members: [], active_team_id: null };
  state.team.teams = Array.isArray(state.team.teams) ? state.team.teams : [];
  state.team.members = Array.isArray(state.team.members) ? state.team.members : [];
  state.sessions = Array.isArray(state.sessions) ? state.sessions : [];

  state.nutrition = state.nutrition || { logs: [], enabled: true };
  state.nutrition.logs = Array.isArray(state.nutrition.logs) ? state.nutrition.logs : [];
  state.wellness = state.wellness || { logs: [], enabled: true };
  state.wellness.logs = Array.isArray(state.wellness.logs) ? state.wellness.logs : [];

  state.risk = state.risk || { flags: [], updated_at: null };
  state.dashboards = state.dashboards || { heatmap: null, updated_at: null };
  state.piq = state.piq || { score: null, updated_at: null };
  state.periodization = state.periodization || { plan: null, updated_at: null };
  state.insights = state.insights || { weekly: [], updated_at: null };
  state.ui = state.ui || { view: "home", todaySession: null };

  try { window.dataStore?.save?.(state); } catch {}

  // ---------- Utilities ----------
  let _toastTimer = null;
  function toast(msg, ms = 2200) {
    const t = $("toast");
    if (!t) { console.log("toast:", msg); return; }
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  function persist(msg) {
    try {
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

  function uid(prefix = "") {
    return (prefix ? prefix + "_" : "") + Math.random().toString(36).slice(2, 9);
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

  // ---------- RBAC ----------
  const ROLE = {
    OWNER: "owner",
    COACH: "coach",
    ATHLETE: "athlete",
    PARENT: "parent",
    VIEWER: "viewer"
  };
  function canCoach() {
    const r = state.profile?.role;
    return r === ROLE.OWNER || r === ROLE.COACH;
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

  // ---------- Workout library (kept) ----------
  const EXERCISE_LIB = {
    strength: {
      goblet_squat:        { title: "Goblet Squat",         cue: "3x8-10",        subs: { knee: "box_squat" } },
      split_squat:         { title: "Split Squat",          cue: "3x6-8/leg",     subs: { knee: "reverse_lunge" } },
      rdl:                 { title: "Romanian Deadlift",    cue: "3x6-8",         subs: { back: "hip_hinge_dowel" } },
      trap_bar_deadlift:   { title: "Trap Bar Deadlift",    cue: "3x4-6",         subs: { back: "kb_deadlift" } },
      bench:               { title: "Bench Press",          cue: "3x5-8",         subs: { shoulder: "dumbbell_press" } },
      row:                 { title: "Row (DB/Band)",        cue: "3x8-12",        subs: { back: "band_row" } },
      push_press:          { title: "Push Press",           cue: "3x5",           subs: { shoulder: "landmine_press" } },
      single_leg_deadlift: { title: "Single-Leg RDL",       cue: "3x6/leg",       subs: { balance: "rack_step_down" } }
    },
    plyo: {
      approach_jumps: { title: "Approach Jumps", cue: "6 reps",  subs: { knee: "low_box_jump" } },
      lateral_bounds: { title: "Lateral Bounds", cue: "4x6",     subs: { ankle: "lateral_step_up" } }
    },
    conditioning: {
      tempo_runs: { title: "Tempo Runs",  cue: "6x200m", subs: { ankle: "bike_intervals" } },
      shuttles:   { title: "Shuttles",    cue: "6x20s",  subs: { knee: "rower_intervals" } }
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
    practice:          { warmup: true, skill: true,  strength: true,  plyo: true,  conditioning: true,  cooldown: true },
    strength:          { warmup: true, skill: false, strength: true,  plyo: false, conditioning: false, cooldown: true },
    speed:             { warmup: true, skill: false, strength: false, plyo: true,  conditioning: false, cooldown: true },
    recovery:          { warmup: true, skill: true,  strength: false, plyo: false, conditioning: false, cooldown: true },
    competition_prep:  { warmup: true, skill: true,  strength: "light", plyo: true, conditioning: false, cooldown: true }
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
    return base.concat(sportAdds[sport] || []).concat(typeAdds[sessionType] || []);
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
    const rules = SESSION_RULES[sessionType] || SESSION_RULES.practice;
    const blocks = [];

    if (rules.warmup) {
      blocks.push({ id: uid("warmup"), type: "warmup", title: "Dynamic Warm-up", duration_min: 10, items: warmupItems(sport, sessionType) });
    }
    if (rules.skill) {
      const micro = SPORT_MICROBLOCKS[sport] || {};
      const keys = Object.keys(micro);
      const items = [];
      keys.slice(0, 2).forEach(k => (micro[k] || []).slice(0, 2).forEach(it => items.push(it)));
      blocks.push({ id: uid("skill"), type: "skill", title: "Skill Microblocks", duration_min: 15, items });
    }
    if (rules.strength) {
      const pref = SPORT_STRENGTH_PREFS[sport] || ["goblet_squat", "rdl", "row"];
      const pick = pref.slice(0, 3);
      const strengthItems = [];
      pick.forEach(k => { const ex = applyInjury(k, injuries); if (ex) strengthItems.push(ex); });

      const cueSuffix = (rules.strength === "light") ? " (light)" : "";
      blocks.push({
        id: uid("strength"),
        type: "strength",
        title: "Strength" + cueSuffix,
        duration_min: rules.strength === "light" ? 12 : 20,
        items: strengthItems.map(x => ({
          name: x.name,
          cue: rules.strength === "light" ? "2x6–8 light, fast intent" : x.cue,
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

  // ---------- PerformanceIQ Score (Phase 4) ----------
  function computeTrainingAdherence() {
    // last 7 days: minutes logged / (planned minutes if any, else 1)
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 7);

    const logs = state.sessions.filter(s => {
      const d = safeDate(s?.created_at || s?.date);
      return d && d >= cutoff;
    });

    const loggedMin = logs.reduce((a, s) => a + Number(s?.duration_min || 0), 0);
    // If user has a periodization plan, use week target as "planned"
    const weekTarget = state.periodization?.plan?.weeks?.[0]?.target_minutes;
    const plannedMin = Number(weekTarget || Math.max(120, loggedMin || 0));
    const ratio = plannedMin ? loggedMin / plannedMin : 0;
    return Math.max(0, Math.min(1, ratio));
  }

  function computeLoadConsistency() {
    const weekly = computeInsights().weekly || [];
    if (weekly.length < 2) return 0.6; // neutral
    const a = Number(weekly[0].load || 0);
    const b = Number(weekly[1].load || 0);
    if (b <= 0) return 0.6;
    const change = Math.abs(a - b) / b; // 0 is stable
    // 0–20% change = good, >60% = poor
    if (change <= 0.20) return 1;
    if (change >= 0.60) return 0.2;
    return 1 - (change - 0.20) / 0.40 * 0.8;
  }

  function latestNutritionForDate(dateISO) {
    const logs = state.nutrition?.logs || [];
    // prefer exact date match
    const exact = logs.slice().reverse().find(l => (l.date || "").slice(0, 10) === dateISO);
    return exact || null;
  }

  function computeNutritionCompliance7d() {
    if (state.nutrition?.enabled === false) return { score: 0.7, enabled: false };
    const tgt = window.nutritionEngine?.targets?.(state.profile);
    if (!tgt) return { score: 0.7, enabled: true };

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    let sum = 0, count = 0;
    for (const day of days) {
      const log = latestNutritionForDate(day);
      if (!log) continue;
      const c = window.nutritionEngine.complianceForDay(log, tgt);
      sum += Number(c.score || 0);
      count++;
    }
    if (!count) return { score: 0.55, enabled: true }; // baseline if no logs
    return { score: Math.max(0, Math.min(1, sum / count)), enabled: true };
  }

  function computeRiskScore() {
    // convert risk flags into 0..1 (1 is low risk)
    const flags = computeRiskFlags();
    if (!flags.length) return 1;
    const max = flags.reduce((m, f) => Math.max(m, f.severity || 0), 0);
    // severity 1..3
    return max === 3 ? 0.2 : max === 2 ? 0.55 : 0.8;
  }

  function computePIQScore() {
    const a = computeTrainingAdherence();          // 0..1
    const c = computeLoadConsistency();            // 0..1
    const n = computeNutritionCompliance7d().score;// 0..1
    const r = computeRiskScore();                  // 0..1

    // weights: adherence 35, consistency 25, nutrition 20, risk 20
    const score = Math.round((a * 35 + c * 25 + n * 20 + r * 20));
    state.piq.score = score;
    state.piq.updated_at = nowISO();
    persistDebounced(null, 250);
    return score;
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
    return state.insights;
  }

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
      if (d.getTime() === prev.getTime()) { streak++; cursor = d; } else break;
    }
    return streak;
  }

  // ---------- Heatmap (Phase 5) ----------
  function computeHeatmap4w() {
    // day-of-week buckets (Sun..Sat)
    const buckets = Array.from({ length: 7 }, () => 0);

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 28);

    state.sessions.forEach(s => {
      const d = safeDate(s?.created_at || s?.date);
      if (!d || d < cutoff) return;
      const dow = d.getDay();
      buckets[dow] += Number(s?.load || 0);
    });

    // normalize for simple shading labels
    const max = Math.max(1, ...buckets);
    const levels = buckets.map(v => {
      const r = v / max;
      if (r < 0.15) return 0;
      if (r < 0.35) return 1;
      if (r < 0.60) return 2;
      if (r < 0.85) return 3;
      return 4;
    });

    const out = { buckets, levels, updated_at: nowISO() };
    state.dashboards.heatmap = out;
    state.dashboards.updated_at = nowISO();
    return out;
  }

  // ---------- Risk Detection (Phase 7) ----------
  function computeRiskFlags() {
    // ACWR estimate from weekly loads:
    // acute = last 7 days, chronic = last 28 days avg per week.
    const now = new Date();
    const acuteCut = new Date(now); acuteCut.setDate(acuteCut.getDate() - 7);
    const chronicCut = new Date(now); chronicCut.setDate(chronicCut.getDate() - 28);

    let acute = 0, chronicTotal = 0;
    state.sessions.forEach(s => {
      const d = safeDate(s?.created_at || s?.date);
      if (!d) return;
      const load = Number(s?.load || 0);
      if (d >= acuteCut) acute += load;
      if (d >= chronicCut) chronicTotal += load;
    });

    const chronicWeeklyAvg = chronicTotal / 4;
    const acwr = chronicWeeklyAvg > 0 ? acute / chronicWeeklyAvg : 0;

    const flags = [];

    // thresholds (simple)
    if (acwr >= 1.6) flags.push({ type: "spike", label: "Load spike (ACWR high)", severity: 3, detail: `ACWR ${acwr.toFixed(2)}` });
    else if (acwr >= 1.3) flags.push({ type: "spike", label: "Load trending high", severity: 2, detail: `ACWR ${acwr.toFixed(2)}` });

    // wellness check (last 3 days)
    const wlogs = (state.wellness?.logs || []).slice().reverse();
    const recent = wlogs.slice(0, 3);
    if (recent.length) {
      const avgSleep = recent.reduce((a, x) => a + Number(x.sleep_hrs || 0), 0) / recent.length;
      const avgSore  = recent.reduce((a, x) => a + Number(x.soreness_1_10 || 0), 0) / recent.length;
      const avgStress= recent.reduce((a, x) => a + Number(x.stress_1_10 || 0), 0) / recent.length;

      if (avgSleep > 0 && avgSleep < 6) flags.push({ type: "recovery", label: "Low sleep trend", severity: 2, detail: `~${avgSleep.toFixed(1)} hrs` });
      if (avgSore >= 7) flags.push({ type: "fatigue", label: "High soreness trend", severity: 2, detail: `~${avgSore.toFixed(1)}/10` });
      if (avgStress >= 7) flags.push({ type: "stress", label: "High stress trend", severity: 1, detail: `~${avgStress.toFixed(1)}/10` });
    }

    state.risk.flags = flags;
    state.risk.updated_at = nowISO();
    persistDebounced(null, 250);
    return flags;
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
        <div style="margin-top:8px">
          <button class="btn danger" id="btnStopNow">Stop &amp; Log</button>
          <button class="btn ghost" id="btnCancelNow">Cancel</button>
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
          return `<div style="margin:4px 0">• ${name}${cue}${sub}</div>`;
        }).join("");
        return `
          <div style="margin-bottom:10px;padding:10px;border:1px solid var(--line);border-radius:12px">
            <div style="font-weight:900;margin-bottom:6px">${b.title} <span class="small muted">(${b.duration_min} min)</span></div>
            <div class="small muted">${items || "—"}</div>
          </div>
        `;
      }).join("");

      container.innerHTML = `
        <div class="minihead">${planned.sessionType} • ${planned.sport} • ${planned.total_min} min</div>
        <div class="minibody">${blocksHTML}</div>
        <div style="margin-top:8px">
          <button class="btn" id="btnStartToday">Start</button>
          <button class="btn ghost" id="btnGenerateNew">Generate new</button>
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
      <div style="margin-top:8px">
        <button class="btn" id="btnGenerateOnly">Generate</button>
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
    renderHomeScore();
  }

  function cancelToday() {
    _clearTodayTimer();
    renderTodayBlock();
    toast("Session cancelled");
  }

  // ---------- Team (Phase 3) ----------
  function setTeamPill() {
    const pill = $("teamPill");
    if (!pill) return;
    const teamName = (state.team?.teams || []).find(t => t.id === state.team?.active_team_id)?.name;
    pill.textContent = `Team: ${teamName || "—"}`;
  }

  function joinCode() {
    // offline pseudo code (no guarantee of uniqueness across devices)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function renderHeatmapBlock() {
    const hm = computeHeatmap4w();
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const chips = hm.levels.map((lvl, i) => {
      const v = hm.buckets[i];
      const bg =
        lvl === 0 ? "transparent" :
        lvl === 1 ? "rgba(46,196,182,.10)" :
        lvl === 2 ? "rgba(46,196,182,.16)" :
        lvl === 3 ? "rgba(46,196,182,.22)" :
                   "rgba(46,196,182,.30)";
      return `
        <div style="flex:1;min-width:86px;border:1px solid var(--line);border-radius:12px;padding:10px;background:${bg}">
          <div style="font-weight:900">${days[i]}</div>
          <div class="small muted">load ${v}</div>
        </div>
      `;
    }).join("");

    return `
      <div class="mini" style="margin-top:12px">
        <div class="minihead">Team Heatmap (last 4 weeks)</div>
        <div class="minibody">
          <div style="display:flex;gap:10px;flex-wrap:wrap">${chips}</div>
          <div class="small muted" style="margin-top:8px">Higher shading = higher total load for that weekday.</div>
        </div>
      </div>
    `;
  }

  function renderTeam() {
    const body = $("teamBody");
    if (!body) return;

    const teams = state.team?.teams || [];
    const active = teams.find(t => t.id === state.team?.active_team_id) || null;
    const members = (state.team?.members || []).filter(m => !active || m.team_id === active.id);

    const coachTools = canCoach();

    const teamList = teams.length ? `
      ${teams.map(t => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--line)">
          <div>
            <b>${t.name}</b>
            <div class="small muted">${t.sport || ""} • code ${t.join_code || "—"}</div>
          </div>
          <button class="btn ghost" data-setteam="${t.id}">Set Active</button>
        </div>
      `).join("")}
    ` : `<div class="small muted">No teams yet.</div>`;

    const roster = active ? `
      <div class="mini" style="margin-top:12px">
        <div class="minihead">Roster — ${active.name}</div>
        <div class="minibody">
          ${members.length ? members.map(m => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--line)">
              <div><b>${m.name}</b> <span class="small muted">• ${m.role}</span></div>
              ${coachTools ? `<button class="btn ghost" data-delmember="${m.id}">Remove</button>` : ""}
            </div>
          `).join("") : `<div class="small muted" style="margin-top:8px">No members added yet.</div>`}

          ${coachTools ? `
            <div class="hr"></div>
            <div class="grid2">
              <div class="field">
                <label>Member name</label>
                <input id="newMemberName" type="text" placeholder="e.g., Jordan" />
              </div>
              <div class="field">
                <label>Role</label>
                <select id="newMemberRole">
                  <option value="coach">Coach</option>
                  <option value="athlete">Athlete</option>
                  <option value="parent">Parent</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div style="margin-top:10px">
              <button class="btn" id="btnAddMember">Add member</button>
            </div>
          ` : `
            <div class="small muted" style="margin-top:10px">Coach tools hidden for your role.</div>
          `}
        </div>
      </div>
    ` : "";

    body.innerHTML = `
      <div class="mini">
        <div class="minihead">Teams</div>
        <div class="minibody">
          ${teamList}
          <div class="hr"></div>

          ${coachTools ? `
            <div class="minihead">Create team (offline)</div>
            <div class="grid2">
              <div class="field">
                <label>Team name</label>
                <input id="teamName" type="text" placeholder="e.g., Virginia Trailblazers" />
              </div>
              <div class="field">
                <label>Sport</label>
                <select id="teamSport">
                  ${SPORTS.map(s => `<option value="${s}">${s[0].toUpperCase()+s.slice(1)}</option>`).join("")}
                </select>
              </div>
            </div>
            <div style="margin-top:10px">
              <button class="btn" id="btnCreateTeam">Create</button>
            </div>
          ` : `
            <div class="small muted">Create/manage teams is Coach/Owner only.</div>
          `}

          ${active ? `
            <div class="hr"></div>
            <div class="minihead">Active team</div>
            <div class="small muted">${active.name} • join code: <b>${active.join_code}</b></div>
          ` : ""}
        </div>
      </div>

      ${active && coachTools ? renderHeatmapBlock() : ""}
      ${active ? roster : ""}
    `;

    // actions
    body.querySelectorAll("[data-setteam]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.team.active_team_id = btn.getAttribute("data-setteam");
        persist("Active team updated");
        setTeamPill();
        renderTeam();
      });
    });

    body.querySelectorAll("[data-delmember]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-delmember");
        state.team.members = (state.team.members || []).filter(m => m.id !== id);
        persist("Member removed");
        renderTeam();
      });
    });

    $("btnCreateTeam")?.addEventListener("click", () => {
      const name = ($("teamName")?.value || "").trim();
      const sport = $("teamSport")?.value || state.profile.sport;
      if (!name) { toast("Team name required"); return; }
      const t = { id: uid("team"), name, sport, join_code: joinCode(), created_at: nowISO() };
      state.team.teams.push(t);
      state.team.active_team_id = t.id;
      persist("Team created");
      setTeamPill();
      renderTeam();
    });

    $("btnAddMember")?.addEventListener("click", () => {
      if (!active) return;
      const name = ($("newMemberName")?.value || "").trim();
      const role = $("newMemberRole")?.value || "athlete";
      if (!name) { toast("Member name required"); return; }
      state.team.members.push({ id: uid("mem"), team_id: active.id, name, role, created_at: nowISO() });
      persist("Member added");
      renderTeam();
    });
  }

  // ---------- Train ----------
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
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
        <div class="field" style="flex:1;min-width:160px">
          <label>Sport</label>
          <select id="trainSportSelect">${sportOptions}</select>
        </div>
        <div class="field" style="width:190px">
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
              <div style="margin:10px 0;padding:10px;border:1px solid var(--line);border-radius:12px">
                <b>${b.title}</b> <span class="small muted">(${b.duration_min} min)</span><br/>
                <span class="small muted">${(b.items||[]).map(it => it.name || it.title || it.key).join(", ")}</span>
              </div>
            `).join("")}
            <div style="margin-top:10px">
              <button class="btn" id="btnPushToday2">Push to Today</button>
              <button class="btn ghost" id="btnStartNow">Start Now</button>
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
      state.profile.sport = e.target.value;
      persist("Sport updated");
      renderTrain();
    });

    $("btnGenTrain")?.addEventListener("click", () => {
      const s = $("trainSportSelect")?.value || sport;
      const t = $("trainSessionType")?.value || pref;
      state.profile.sport = s;
      state.profile.preferred_session_type = t;
      const gen = generateWorkoutFor(s, t, state.profile.injuries || []);
      persistDebounced(null);
      renderCard(gen);
    });
  }

  // ---------- Home Score ----------
  function renderHomeScore() {
    const el = $("piqScoreHome");
    if (!el) return;
    const score = computePIQScore();
    const flags = computeRiskFlags();
    const riskNote = flags.length ? ` • ${flags[0].label}` : " • No risk flags";
    el.innerHTML = `<b>${score}</b><span class="small muted"> / 100</span><div class="small muted" style="margin-top:6px">${riskNote}</div>`;
  }

  // ---------- Profile (Score + Risk + Nutrition + Periodization + Insights) ----------
  function renderProfile() {
    const body = $("profileBody");
    if (!body) return;

    const score = computePIQScore();
    const flags = computeRiskFlags();
    const streak = computeStreak();

    // nutrition targets
    const tgt = window.nutritionEngine?.targets?.(state.profile) || null;
    const today = new Date().toISOString().slice(0, 10);
    const todayLog = (state.nutrition?.logs || []).slice().reverse().find(l => (l.date || "").slice(0, 10) === today) || null;

    // periodization plan (if none, show generate)
    const plan = state.periodization?.plan || null;

    body.innerHTML = `
      <div class="mini">
        <div class="minihead">Profile</div>
        <div class="minibody">
          <div><b>Role</b>: ${state.profile.role}</div>
          <div><b>Sport</b>: ${state.profile.sport}</div>
          <div><b>Preferred session</b>: ${state.profile.preferred_session_type}</div>

          <div class="hr"></div>

          <div class="minihead">PerformanceIQ Score</div>
          <div class="minibody"><b>${score}</b><span class="small muted"> / 100</span></div>

          <div class="hr"></div>

          <div class="minihead">Risk Detection</div>
          <div class="minibody">
            ${flags.length ? flags.map(f => `
              <div style="margin:6px 0;padding:10px;border:1px solid var(--line);border-radius:12px">
                <b>${f.label}</b> <span class="small muted">• severity ${f.severity}</span>
                <div class="small muted">${f.detail || ""}</div>
              </div>
            `).join("") : `<div class="small muted">No risk flags right now.</div>`}
          </div>

          <div class="hr"></div>

          <div class="minihead">Elite Nutrition</div>
          <div class="minibody">
            ${tgt ? `
              <div class="small muted">Targets: ${tgt.calories} kcal • P ${tgt.protein_g}g • C ${tgt.carbs_g}g • F ${tgt.fat_g}g</div>
              <div style="margin-top:8px">
                <button class="btn ghost" id="btnOpenNutrition">Log nutrition</button>
              </div>
              <div class="small muted" style="margin-top:8px">${todayLog ? `Today logged: ${todayLog.calories} kcal` : "No log today yet."}</div>
            ` : `<div class="small muted">Nutrition engine not loaded.</div>`}
          </div>

          <div class="hr"></div>

          <div class="minihead">Periodization</div>
          <div class="minibody">
            ${plan ? `
              <div class="small muted">Plan starts ${plan.start_date} • base ${plan.base_minutes} min/wk</div>
              <div style="margin-top:8px">
                ${plan.weeks.map(w => `
                  <div style="padding:8px 0;border-top:1px solid var(--line)">
                    <b>Week ${w.week}</b> — target ${w.target_minutes} min
                    <div class="small muted">${w.notes}</div>
                  </div>
                `).join("")}
              </div>
            ` : `
              <div class="small muted">No plan yet. Generate a simple 4-week wave.</div>
              <div style="margin-top:10px">
                <button class="btn" id="btnGenPlan">Generate 4-week plan</button>
              </div>
            `}
          </div>

          <div class="hr"></div>

          <div class="minihead">Insights</div>
          <div class="minibody">
            <div><b>Current streak</b> — ${streak} days</div>
            <div style="margin-top:8px" id="weeklyRows"></div>
          </div>
        </div>
      </div>
    `;

    // weekly rows
    const weekly = computeInsights().weekly || [];
    const rows = weekly.map(w => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid var(--line)">
        <div>${w.week}</div>
        <div>${w.minutes}m • load ${w.load}</div>
      </div>
    `).join("") || `<div class="small muted">No sessions logged yet.</div>`;

    const weeklyEl = body.querySelector("#weeklyRows");
    if (weeklyEl) weeklyEl.innerHTML = rows;

    // bind plan gen
    $("btnGenPlan")?.addEventListener("click", () => {
      const gen = window.periodizationEngine?.generate4WeekPlan?.({
        sport: state.profile.sport,
        baseMinutes: 180,
        startISO: new Date().toISOString().slice(0, 10)
      });
      if (!gen) { toast("Periodization engine not loaded"); return; }
      state.periodization.plan = gen;
      state.periodization.updated_at = nowISO();
      persist("Plan generated");
      renderProfile();
    });

    // quick nutrition modal via prompt (simple offline)
    $("btnOpenNutrition")?.addEventListener("click", () => openNutritionQuickLog());
  }

  function openNutritionQuickLog() {
    const tgt = window.nutritionEngine?.targets?.(state.profile);
    const d = new Date().toISOString().slice(0, 10);
    const cals = Number(prompt(`Calories for ${d}? (target ${tgt?.calories ?? "—"})`) || 0);
    const p = Number(prompt(`Protein grams? (target ${tgt?.protein_g ?? "—"})`) || 0);
    const carbs = Number(prompt(`Carbs grams? (target ${tgt?.carbs_g ?? "—"})`) || 0);
    const fat = Number(prompt(`Fat grams? (target ${tgt?.fat_g ?? "—"})`) || 0);

    if (!cals && !p && !carbs && !fat) { toast("No nutrition entered"); return; }
    state.nutrition.logs.push({ id: uid("nut"), created_at: nowISO(), date: d, calories: cals, protein_g: p, carbs_g: carbs, fat_g: fat, notes: "" });
    persist("Nutrition logged");
    renderHomeScore();
    if (state.ui.view === "profile") renderProfile();
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
        state = window.dataStore.load();
        toast("Import complete");
        renderAll();
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
    try { window.dataStore?.clear?.(); } catch {}
    toast("Local state reset — reloading");
    setTimeout(() => location.reload(), 700);
  }

  function runQAGrade() {
    const issues = [];
    if (!state.profile?.sport) issues.push("Profile sport not set");
    if (!state.ui?.todaySession && !state.sessions?.length) issues.push("No session generated/logged yet");
    const grade = issues.length === 0 ? "A" : issues.length === 1 ? "B" : "C";
    const report =
      `QA Grade: ${grade}\n\nIssues found:\n` +
      (issues.length ? issues.map((x, i) => `${i + 1}. ${x}`).join("\n") : "None");
    const el = $("gradeReport");
    if (el) el.textContent = report;
    toast("QA grade complete");
  }

  // ---------- Navigation + focus active selection ----------
  function setActiveNav(view) {
    document.querySelectorAll(".navbtn, .bottomnav .tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
      btn.setAttribute("aria-current", btn.dataset.view === view ? "page" : "false");
    });
  }

  function focusActiveView(view) {
    VIEWS.forEach(v => {
      const el = $(`view-${v}`);
      if (el) el.classList.toggle("is-active", v === view);
    });
    const active = $(`view-${view}`);
    if (!active) return;

    // ensure it's focusable and focus it (active screen)
    active.setAttribute("tabindex", "-1");
    try { active.focus({ preventScroll: false }); } catch { active.focus(); }
  }

  function showView(view) {
    if (!VIEWS.includes(view)) view = "home";
    state.ui.view = view;
    persistDebounced(null);

    VIEWS.forEach(v => {
      const el = $(`view-${v}`);
      if (el) el.hidden = (v !== view);
    });

    setActiveNav(view);
    renderAll();
    focusActiveView(view);
  }

  // ---------- Help drawer (expanded topics) ----------
  function defaultHelpList() {
    return [
      { title: "Today workflow", snippet: "Home → Generate → Start → Stop & Log. Train can push sessions into Today." },
      { title: "Roles & access", snippet: "Owner/Coach can manage teams + dashboards. Athletes/Parents see limited tools." },
      { title: "PerformanceIQ Score", snippet: "Score (0–100) updates from adherence, consistency, nutrition (if enabled), and risk." },
      { title: "Heatmap", snippet: "Team view shows load by weekday (last 4 weeks). Coach-only by default." },
      { title: "Risk detection", snippet: "Flags load spikes (ACWR) and low recovery trends (if wellness logs exist)." },
      { title: "Nutrition", snippet: "Targets + quick nutrition log. Compliance contributes to Score." },
      { title: "Periodization", snippet: "Generate a basic 4-week wave plan. Later phases can add athlete-specific blocks." },
      { title: "Data Management", snippet: "Account → Export/Import/Reset. Reset requires typing RESET." }
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

  function openDrawer() {
    const b = $("drawerBackdrop");
    const d = $("accountDrawer");
    if (!b || !d) return;

    // Sync drawer fields each open
    if ($("roleSelect")) $("roleSelect").value = state.profile.role || "coach";
    if ($("sportSelect")) $("sportSelect").value = state.profile.sport || "basketball";
    if ($("preferredSessionSelect")) $("preferredSessionSelect").value = state.profile.preferred_session_type || "practice";

    const mode = state.profile?.theme?.mode || (document.documentElement.getAttribute("data-theme") || "dark");
    if ($("themeModeSelect")) $("themeModeSelect").value = mode;
    if ($("themeSportSelect")) $("themeSportSelect").value = state.profile.sport || "basketball";

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
  function openHelpTopic(topic) {
    openHelp();
    const searchEl = $("helpSearch");
    if (searchEl) searchEl.value = topic;
    const rEl = $("helpResults");
    if (rEl) rEl.innerHTML = helpListHTML(searchHelp(topic));
  }

  // ---------- Render orchestration ----------
  function renderHome() {
    const homeSub = $("homeSub");
    if (homeSub) homeSub.textContent = `${state.profile.role} • ${state.profile.sport} • ${state.profile.preferred_session_type}`;
    renderTodayBlock();
    renderHomeScore();
  }

  function renderAll() {
    try {
      setTeamPill();
      applyStatusFromMeta();
      const v = state.ui?.view || "home";
      if (v === "home") renderHome();
      if (v === "team") renderTeam();
      if (v === "train") renderTrain();
      if (v === "profile") renderProfile();
    } catch (e) {
      console.error("Render error", e);
    }
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
                <option value="owner">Owner</option>
                <option value="coach">Coach</option>
                <option value="athlete">Athlete</option>
                <option value="parent">Parent</option>
                <option value="viewer">Viewer</option>
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

    // lightweight styles via inline (no extra file)
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(2,6,12,.55)";
    overlay.style.zIndex = "999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.querySelector(".piq-modal").style.width = "min(560px, 92vw)";
    overlay.querySelector(".piq-modal").style.background = "var(--top)";
    overlay.querySelector(".piq-modal").style.border = "1px solid var(--line)";
    overlay.querySelector(".piq-modal").style.borderRadius = "18px";
    overlay.querySelector(".piq-modal").style.padding = "16px";
    overlay.querySelector(".piq-modal").style.boxShadow = "var(--shadow)";

    const head = overlay.querySelector(".piq-modal-head");
    head.style.marginBottom = "10px";
    head.querySelector(".piq-modal-title").style.fontFamily = "var(--font-head)";
    head.querySelector(".piq-modal-title").style.fontWeight = "800";
    head.querySelector(".piq-modal-title").style.fontSize = "18px";
    head.querySelector(".piq-modal-sub").classList.add("small","muted");

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
        btn.style.border = "1px solid var(--pillBorder)";
        btn.style.borderRadius = "999px";
        btn.style.padding = "7px 10px";
        btn.style.marginRight = "8px";
        btn.style.marginTop = "8px";
        btn.style.background = injSet.has(k) ? "var(--accent-2)" : "transparent";
        btn.style.color = "var(--text)";
        btn.style.cursor = "pointer";
        btn.style.fontWeight = "900";
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
      renderAll();
    });

    overlay.querySelector("#obTry").addEventListener("click", () => {
      state.profile.role = roleEl.value;
      state.profile.sport = sportEl.value;
      state.profile.preferred_session_type = typeEl.value;
      state.profile.injuries = Array.from(injSet);
      state.profile.onboarded = true;

      state.ui.todaySession = _generateTodaySession();
      persist("Onboarding saved • Today generated");
      overlay.remove();

      showView("home");
      toast("Today ready — press Start", 2200);
      renderTodayBlock();
      renderHomeScore();
    });
  }

  // ---------- Bind UI ----------
  function bindUI() {
    // nav
    document.querySelectorAll("[data-view]").forEach(btn => {
      if (btn.classList.contains("navbtn") || btn.classList.contains("tab")) {
        btn.addEventListener("click", () => showView(btn.dataset.view));
      }
    });

    // account drawer
    $("btnAccount")?.addEventListener("click", openDrawer);
    $("btnCloseDrawer")?.addEventListener("click", closeDrawer);
    $("drawerBackdrop")?.addEventListener("click", closeDrawer);

    // help drawer
    $("btnHelp")?.addEventListener("click", openHelp);
    $("btnCloseHelp")?.addEventListener("click", closeHelp);
    $("helpBackdrop")?.addEventListener("click", closeHelp);
    $("helpSearch")?.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      const rEl = $("helpResults");
      if (rEl) rEl.innerHTML = helpListHTML(searchHelp(q));
    });

    // context help buttons
    $("tipToday")?.addEventListener("click", () => openHelpTopic("today"));
    $("tipQuick")?.addEventListener("click", () => openHelpTopic("today"));
    $("tipTrain")?.addEventListener("click", () => openHelpTopic("session types"));
    $("tipTrain2")?.addEventListener("click", () => openHelpTopic("session types"));
    $("tipTeam")?.addEventListener("click", () => openHelpTopic("roles"));
    $("tipProfile")?.addEventListener("click", () => openHelpTopic("score"));

    // keyboard
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeDrawer(); closeHelp(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        openHelp();
        $("helpSearch")?.focus();
        e.preventDefault();
      }
    });

    // today button
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

    // quick actions
    $("qaTrain")?.addEventListener("click", () => showView("train"));
    $("qaTeam")?.addEventListener("click", () => showView("team"));

    // theme toggle
    $("btnThemeToggle")?.addEventListener("click", () => {
      const html = document.documentElement;
      const cur = html.getAttribute("data-theme") || "dark";
      const next = cur === "dark" ? "light" : "dark";
      html.setAttribute("data-theme", next);
      state.profile.theme = state.profile.theme || {};
      state.profile.theme.mode = next;
      persistDebounced("Theme updated", 0);
    });

    // drawer saves
    $("btnSaveProfile")?.addEventListener("click", () => {
      state.profile.role = $("roleSelect")?.value || state.profile.role;
      state.profile.sport = $("sportSelect")?.value || state.profile.sport;
      state.profile.preferred_session_type = $("preferredSessionSelect")?.value || state.profile.preferred_session_type;
      persist("Profile preferences saved");
      renderAll();
    });

    $("btnSaveTheme")?.addEventListener("click", () => {
      const mode = $("themeModeSelect")?.value || "dark";
      document.documentElement.setAttribute("data-theme", mode);
      state.profile.theme = state.profile.theme || {};
      state.profile.theme.mode = mode;
      persist("Theme saved");
      renderAll();
    });

    // data management
    $("btnExport")?.addEventListener("click", exportJSON);
    $("fileImport")?.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) importJSONFile(f);
    });
    $("btnResetLocal")?.addEventListener("click", resetLocalState);
    $("btnRunGrade")?.addEventListener("click", runQAGrade);

    // FAB sheet (Phase 6 quick logs)
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

    $("fabLogWorkout")?.addEventListener("click", () => {
      // quick manual workout log
      const mins = Number(prompt("Minutes trained?") || 0);
      const rpe = Number(prompt("sRPE 1–10? (default 6)") || 6);
      if (!mins) { toast("No workout entered"); return; }
      const load = Math.round(mins * rpe);
      state.sessions.push({ id: uid("log"), created_at: nowISO(), sport: state.profile.sport, sessionType: "manual", duration_min: mins, sRPE: rpe, load, blocks: [] });
      persist(`Logged ${mins} min • load ${load}`);
      $("btnCloseSheet")?.click();
      renderAll();
    });

    $("fabLogNutrition")?.addEventListener("click", () => {
      openNutritionQuickLog();
      $("btnCloseSheet")?.click();
    });

    $("fabLogWellness")?.addEventListener("click", () => {
      const d = new Date().toISOString().slice(0, 10);
      const sleep = Number(prompt(`Sleep hours for ${d}?`) || 0);
      const sore  = Number(prompt("Soreness 1–10?") || 0);
      const stress= Number(prompt("Stress 1–10?") || 0);
      if (!sleep && !sore && !stress) { toast("No wellness entered"); return; }
      state.wellness.logs.push({ id: uid("wel"), created_at: nowISO(), date: d, sleep_hrs: sleep, soreness_1_10: sore, stress_1_10: stress, notes: "" });
      persist("Wellness logged");
      $("btnCloseSheet")?.click();
      renderAll();
    });
  }

  // ---------- Boot ----------
  function boot() {
    bindUI();

    // prefill drawer selects (initial)
    if ($("roleSelect")) $("roleSelect").value = state.profile.role;
    if ($("sportSelect")) $("sportSelect").value = state.profile.sport;
    if ($("preferredSessionSelect")) $("preferredSessionSelect").value = state.profile.preferred_session_type;

    const mode = state.profile?.theme?.mode;
    if (mode) document.documentElement.setAttribute("data-theme", mode);

    ensureOnboarding();

    showView(state.ui.view || "home");
    renderAll();
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
    computePIQScore,
    computeRiskFlags,
    computeHeatmap4w
  };
})();
