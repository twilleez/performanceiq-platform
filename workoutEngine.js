// workoutEngine.js — v1.0.0 (FULL FILE)
// Generates a multi-week workout plan with sessions + blocks + exercises (sport-tailored)
// Output is saved by core.js into state.workouts[athleteId]
(function () {
  "use strict";
  if (window.workoutEngine) return;

  const clamp = (n, a, b) => Math.min(Math.max(Number(n) || 0, a), b);

  function safeISO(d) {
    const s = String(d || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }

  function addDaysISO(iso, days) {
    const d = safeISO(iso) || new Date().toISOString().slice(0, 10);
    const ms = Date.parse(d);
    if (!Number.isFinite(ms)) return new Date().toISOString().slice(0, 10);
    return new Date(ms + days * 86400000).toISOString().slice(0, 10);
  }

  function uid(prefix = "wk") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function weekStartMondayISO(iso) {
    const d = new Date(safeISO(iso) || new Date().toISOString().slice(0, 10));
    const day = d.getDay(); // 0 Sun..6 Sat
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  // Phase by week (simple)
  function getPhase(weekIndex1) {
    if (weekIndex1 % 4 === 0) return "DELOAD";
    if (weekIndex1 % 8 === 0) return "PEAK";
    return "ACCUMULATION";
  }

  // Base intensity by phase + level
  function phaseTuning(phase, level) {
    const adv = level === "advanced";
    if (phase === "DELOAD") return { vol: 0.65, rpeAdj: adv ? -1.0 : -0.8 };
    if (phase === "PEAK") return { vol: 0.85, rpeAdj: adv ? 0.4 : 0.25 };
    if (phase === "ACCUMULATION") return { vol: adv ? 1.12 : 1.05, rpeAdj: adv ? 0.35 : 0.2 };
    return { vol: 1.0, rpeAdj: 0.0 };
  }

  // Sport session blueprint (weekly skeleton)
  function weeklyTemplate(sportId) {
    switch (sportId) {
      case "football":
        return [
          { dayIndex: 0, dayType: "training", theme: "strength_power" },
          { dayIndex: 1, dayType: "training", theme: "speed_agility" },
          { dayIndex: 3, dayType: "training", theme: "hypertrophy" },
          { dayIndex: 5, dayType: "training", theme: "conditioning" }
        ];
      case "soccer":
        return [
          { dayIndex: 0, dayType: "training", theme: "strength" },
          { dayIndex: 2, dayType: "training", theme: "speed_agility" },
          { dayIndex: 3, dayType: "training", theme: "conditioning" },
          { dayIndex: 5, dayType: "training", theme: "skills_mobility" }
        ];
      case "baseball":
        return [
          { dayIndex: 0, dayType: "training", theme: "strength_power" },
          { dayIndex: 2, dayType: "training", theme: "rotational_power" },
          { dayIndex: 4, dayType: "training", theme: "hypertrophy" },
          { dayIndex: 5, dayType: "training", theme: "mobility_prevention" }
        ];
      case "volleyball":
        return [
          { dayIndex: 0, dayType: "training", theme: "jump_power" },
          { dayIndex: 2, dayType: "training", theme: "speed_agility" },
          { dayIndex: 3, dayType: "training", theme: "hypertrophy" },
          { dayIndex: 5, dayType: "training", theme: "skills_mobility" }
        ];
      case "track":
        return [
          { dayIndex: 0, dayType: "training", theme: "speed" },
          { dayIndex: 2, dayType: "training", theme: "strength_power" },
          { dayIndex: 4, dayType: "training", theme: "speed_endurance" },
          { dayIndex: 5, dayType: "training", theme: "mobility_prevention" }
        ];
      case "basketball":
      default:
        return [
          { dayIndex: 0, dayType: "training", theme: "strength_power" },
          { dayIndex: 1, dayType: "training", theme: "skill_speed" },
          { dayIndex: 3, dayType: "training", theme: "hypertrophy" },
          { dayIndex: 5, dayType: "training", theme: "conditioning" }
        ];
    }
  }

  // Exercise libraries
  const LIB = {
    warmup: [
      { name: "Dynamic Warm-up", sets: "1", reps: "8–10 min", notes: "hips/ankles/T-spine, light skips, mobility" }
    ],
    power: [
      { name: "Box Jumps", sets: "4", reps: "3", notes: "full rest, crisp reps" },
      { name: "Med Ball Slams", sets: "3", reps: "6", notes: "explosive" },
      { name: "Broad Jump", sets: "4", reps: "2", notes: "stick landing" }
    ],
    strengthLower: [
      { name: "Back Squat", sets: "4", reps: "5", notes: "controlled eccentrics" },
      { name: "RDL", sets: "4", reps: "6", notes: "hamstring tension" },
      { name: "Split Squat", sets: "3", reps: "8/side", notes: "knee control" }
    ],
    strengthUpper: [
      { name: "Bench Press", sets: "4", reps: "5", notes: "tight form" },
      { name: "Pull-ups", sets: "4", reps: "6", notes: "full ROM" },
      { name: "DB Row", sets: "3", reps: "10", notes: "pause at top" }
    ],
    hypertrophy: [
      { name: "Leg Press", sets: "3", reps: "12", notes: "pump / control" },
      { name: "DB Incline Press", sets: "3", reps: "12", notes: "tempo" },
      { name: "Lat Pulldown", sets: "3", reps: "12", notes: "full ROM" }
    ],
    speedAgility: [
      { name: "A-Skips", sets: "3", reps: "20m", notes: "fast contacts" },
      { name: "5-10-5 Shuttle", sets: "5", reps: "1", notes: "full rest" },
      { name: "Lateral Bounds", sets: "4", reps: "4/side", notes: "stick landings" }
    ],
    conditioning: [
      { name: "Tempo Runs", sets: "8", reps: "100m", notes: "60–75s rest" },
      { name: "Bike Intervals", sets: "10", reps: "30s hard/60s easy", notes: "repeat" }
    ],
    core: [
      { name: "Pallof Press", sets: "3", reps: "10/side", notes: "anti-rotation" },
      { name: "Dead Bug", sets: "3", reps: "10/side", notes: "slow control" }
    ],
    mobility: [
      { name: "Hip Mobility Flow", sets: "1", reps: "6–8 min", notes: "hips/ankles" },
      { name: "Shoulder Prehab", sets: "2", reps: "12", notes: "band work" }
    ],
    skillBasketball: [
      { name: "Ball Handling Series", sets: "1", reps: "12 min", notes: "tight dribble, both hands" },
      { name: "Shooting Ladder", sets: "1", reps: "20–30 makes", notes: "game spots" }
    ],
    skillSoccer: [
      { name: "Touch Wall Passes", sets: "4", reps: "60s", notes: "both feet" },
      { name: "Dribble Change of Direction", sets: "6", reps: "20m", notes: "quick cuts" }
    ],
    skillFootball: [
      { name: "Route Stems / Footwork", sets: "6", reps: "1 rep", notes: "sharp breaks" },
      { name: "Catching Series", sets: "4", reps: "8", notes: "hands + eyes" }
    ],
    rotational: [
      { name: "Med Ball Rotational Throw", sets: "4", reps: "4/side", notes: "violent hips" },
      { name: "Cable Chop", sets: "3", reps: "10/side", notes: "control + speed" }
    ],
    jumpVolleyball: [
      { name: "Approach Jumps", sets: "5", reps: "2", notes: "full rest, max intent" },
      { name: "Depth Jump (low box)", sets: "4", reps: "2", notes: "quick ground contact" }
    ]
  };

  function block(title, focus, exercises) {
    return { title, focus, exercises: exercises.slice() };
  }

  // Build blocks by theme + sport
  function buildBlocks({ sportId, theme, level, phase }) {
    const adv = level === "advanced";
    const deload = phase === "DELOAD";

    // Reduce volume during deload by trimming 1 accessory exercise
    function maybeTrim(exList) {
      if (!deload) return exList;
      return exList.slice(0, Math.max(1, exList.length - 1));
    }

    // Adjust sets/reps slightly for advanced (display-only; keeps it simple)
    function advBoost(exList) {
      if (!adv || deload) return exList;
      return exList.map(e => ({ ...e, notes: e.notes ? `${e.notes} • (+1 set if feeling good)` : "(+1 set if feeling good)" }));
    }

    // Core blocks used everywhere
    const warm = block("Warm-up", "prep", LIB.warmup);

    if (theme === "strength_power") {
      const p = block("Power", "explosive", maybeTrim(advBoost(LIB.power)));
      const l = block("Lower Strength", "strength", maybeTrim(advBoost(LIB.strengthLower)));
      const u = block("Upper Strength", "strength", maybeTrim(advBoost(LIB.strengthUpper)));
      const c = block("Core", "stability", LIB.core);
      return [warm, p, l, u, c];
    }

    if (theme === "hypertrophy") {
      const h = block("Hypertrophy", "volume", maybeTrim(advBoost(LIB.hypertrophy)));
      const u = block("Upper Accessory", "volume", maybeTrim(advBoost(LIB.strengthUpper)));
      const c = block("Core", "stability", LIB.core);
      const m = block("Mobility", "recovery", LIB.mobility);
      return [warm, h, u, c, m];
    }

    if (theme === "speed_agility") {
      const s = block("Speed + Agility", "speed", maybeTrim(advBoost(LIB.speedAgility)));
      const c = block("Core", "stability", LIB.core);
      const m = block("Mobility", "recovery", LIB.mobility);
      return [warm, s, c, m];
    }

    if (theme === "conditioning") {
      const con = block("Conditioning", "engine", maybeTrim(advBoost(LIB.conditioning)));
      const c = block("Core", "stability", LIB.core);
      const m = block("Mobility", "recovery", LIB.mobility);
      return [warm, con, c, m];
    }

    if (theme === "skill_speed") {
      const skill =
        sportId === "basketball" ? block("Skill", "skill", LIB.skillBasketball) :
        sportId === "football" ? block("Skill", "skill", LIB.skillFootball) :
        sportId === "soccer" ? block("Skill", "skill", LIB.skillSoccer) :
        block("Skill", "skill", LIB.skillBasketball);

      const s = block("Speed + Agility", "speed", maybeTrim(advBoost(LIB.speedAgility)));
      const c = block("Core", "stability", LIB.core);
      return [warm, skill, s, c];
    }

    if (theme === "skills_mobility") {
      const skill =
        sportId === "basketball" ? block("Skill", "skill", LIB.skillBasketball) :
        sportId === "football" ? block("Skill", "skill", LIB.skillFootball) :
        sportId === "soccer" ? block("Skill", "skill", LIB.skillSoccer) :
        block("Skill", "skill", LIB.skillBasketball);

      const m = block("Mobility", "recovery", LIB.mobility);
      const c = block("Core", "stability", LIB.core);
      return [warm, skill, m, c];
    }

    if (theme === "rotational_power") {
      const r = block("Rotational Power", "rotation", maybeTrim(advBoost(LIB.rotational)));
      const u = block("Upper Strength", "strength", maybeTrim(advBoost(LIB.strengthUpper)));
      const c = block("Core", "stability", LIB.core);
      const m = block("Mobility", "recovery", LIB.mobility);
      return [warm, r, u, c, m];
    }

    if (theme === "mobility_prevention") {
      const m = block("Mobility + Prehab", "recovery", LIB.mobility);
      const c = block("Core", "stability", LIB.core);
      return [warm, m, c];
    }

    if (theme === "jump_power") {
      const j = block("Jump Power", "jump", maybeTrim(advBoost(LIB.jumpVolleyball)));
      const l = block("Lower Strength", "strength", maybeTrim(advBoost(LIB.strengthLower)));
      const c = block("Core", "stability", LIB.core);
      return [warm, j, l, c];
    }

    if (theme === "speed") {
      const s = block("Speed", "speed", maybeTrim(advBoost(LIB.speedAgility)));
      const p = block("Power", "explosive", maybeTrim(advBoost(LIB.power)));
      const m = block("Mobility", "recovery", LIB.mobility);
      return [warm, s, p, m];
    }

    if (theme === "speed_endurance") {
      const con = block("Speed Endurance", "engine", maybeTrim(advBoost(LIB.conditioning)));
      const s = block("Technique", "speed", maybeTrim(advBoost(LIB.speedAgility)));
      const m = block("Mobility", "recovery", LIB.mobility);
      return [warm, s, con, m];
    }

    // fallback
    return [warm, block("Core", "stability", LIB.core), block("Mobility", "recovery", LIB.mobility)];
  }

  function computeMinutesRPE({ theme, level, phase }) {
    const adv = level === "advanced";
    const base =
      theme === "strength_power" ? { minutes: 75, rpe: 7.0 } :
      theme === "hypertrophy" ? { minutes: 70, rpe: 6.5 } :
      theme === "speed_agility" ? { minutes: 55, rpe: 6.0 } :
      theme === "conditioning" ? { minutes: 55, rpe: 6.5 } :
      theme === "skill_speed" ? { minutes: 70, rpe: 6.0 } :
      theme === "skills_mobility" ? { minutes: 60, rpe: 5.5 } :
      theme === "rotational_power" ? { minutes: 65, rpe: 6.5 } :
      theme === "jump_power" ? { minutes: 60, rpe: 6.5 } :
      theme === "speed" ? { minutes: 55, rpe: 6.5 } :
      theme === "speed_endurance" ? { minutes: 60, rpe: 6.5 } :
      theme === "mobility_prevention" ? { minutes: 45, rpe: 4.5 } :
      { minutes: 60, rpe: 6.0 };

    const tune = phaseTuning(phase, level);
    let minutes = base.minutes * tune.vol * (adv ? 1.05 : 1.0);
    let rpe = base.rpe + tune.rpeAdj + (adv ? 0.25 : 0.0);

    // Deload should be clearly easier
    if (phase === "DELOAD") rpe = Math.max(4.5, rpe);

    minutes = clamp(Math.round(minutes), 30, 120);
    rpe = clamp(Math.round(rpe * 2) / 2, 3, 10);

    return { minutes, rpe, load: Math.round(minutes * rpe) };
  }

  function generate({ athleteId, sportId, level, startISO, weeks, defaultDayType }) {
    const start = weekStartMondayISO(startISO);
    const W = clamp(weeks, 2, 16);

    const sid = String(sportId || "basketball");
    const lvl = String(level || "standard");
    const tpl = weeklyTemplate(sid);

    const weeksPlan = [];
    for (let i = 1; i <= W; i++) {
      const wkStart = addDaysISO(start, (i - 1) * 7);
      const phase = getPhase(i);

      const sessions = tpl.map((t) => {
        const dateISO = addDaysISO(wkStart, t.dayIndex);
        const mr = computeMinutesRPE({ theme: t.theme, level: lvl, phase });
        const blocks = buildBlocks({ sportId: sid, theme: t.theme, level: lvl, phase });

        const logType =
          t.theme === "strength_power" || t.theme === "hypertrophy" ? "lift" :
          t.theme === "conditioning" ? "conditioning" :
          "practice";

        return {
          id: uid("sess"),
          athleteId,
          sportId: sid,
          level: lvl,
          weekIndex1: i,
          weekStartISO: wkStart,
          dateISO,
          dayType: t.dayType || defaultDayType || "training",
          phase,
          theme: t.theme,
          minutes: mr.minutes,
          rpe: mr.rpe,
          load: mr.load,
          logType,
          blocks
        };
      });

      const weeklyLoad = sessions.reduce((a, s) => a + (s.load || 0), 0);
      weeksPlan.push({ weekIndex1: i, weekStartISO: wkStart, phase, weeklyLoad, sessions });
    }

    return {
      athleteId,
      sportId: sid,
      level: lvl,
      startISO: start,
      weeks: W,
      createdAt: Date.now(),
      weeksPlan
    };
  }

  window.workoutEngine = {
    generate,
    weekStartMondayISO
  };
})();
