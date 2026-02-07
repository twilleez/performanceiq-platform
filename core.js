// core.js (TOP — COPY/PASTE)
(function () {
  "use strict";

  // Prevent double-init if core.js is accidentally loaded twice
  if (window.__PIQ_CORE_LOADED__) return;
  window.__PIQ_CORE_LOADED__ = true;

  // OPTIONAL safety stub (remove later if you implement a real chooser)
  window.showRoleChooser = window.showRoleChooser || function () {
    alert("Role chooser not implemented yet.");
  };

  // ...the rest of your real core.js code goes here...
})();

  "use strict";

  // Prevent double-init if core.js is accidentally loaded twice
  if (window.__PIQ_CORE_LOADED__) return;
  window.__PIQ_CORE_LOADED__ = true;

  const STORAGE_KEY = "piq_state_v1";
  const TRIAL_DAYS = 30, LICENSE_MONTHS = 12;

  const $ = (id) => document.getElementById(id) || null;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  const nowMs = () => Date.now();
  const daysBetween = (a, b) => Math.floor((b - a) / (1000 * 60 * 60 * 24));

  function addMonths(date, months) {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) d.setDate(0);
    return d;
  }

  function normalizeKey(k) {
    return String(k || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function validKey(k) {
    const nk = normalizeKey(k);
    if (nk.length !== 12) return false;
    const body = nk.slice(0, 10), chk = nk.slice(10);
    let sum = 0;
    for (const ch of body) sum += ch.charCodeAt(0);
    const expected = String(sum % 97).padStart(2, "0");
    return chk === expected;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
  }

  function defaultState() {
    return {
      role: "athlete",
      trial: { startedAtMs: nowMs(), activated: false, licenseKey: "", licenseUntilMs: 0 },
      profile: {
        sport: "basketball",
        level: "youth",
        days: 4,
        programLevel: "standard",
        focus: "balanced",
        secondary: "none",
        position: "General",
        skill: "Balanced",
        landmine: "on",
        wellness: 7,
        notes: ""
      },
      week: null,
      todayIndex: 0,
      logs: [],
      tests: [],
      prompts: [],
      team: { name: "", compliance: "off", roster: [], attendance: [], board: "" }
    };
  }

  const state = loadState() || defaultState();

  // Expose minimal API if needed
  window.PIQ = window.PIQ || {};
  window.PIQ._getState = () => state;
  window.PIQ._saveState = () => saveState(state);

  // --------------------------
  // SPORT DATA (all sports)
  // --------------------------
  const SPORT_DATA = {
    basketball: {
      positions: ["General", "PG", "SG/Wing", "SF/PF", "C/Big"],
      skills: ["Balanced", "Ball-handling", "Shooting", "Finishing", "Defense"],
      micro: {
        General: ["Speed/Quickness", "Strength A", "Skill+COD", "Strength B", "Conditioning/Skill"],
        PG: ["Speed+Decel", "Strength A", "COD+Skill", "Strength B", "Conditioning/Skill"],
        "SG/Wing": ["Speed+Shooting", "Strength A", "COD+Finishing", "Strength B", "Conditioning/Skill"],
        "SF/PF": ["Power+Contact", "Strength A", "COD+Rebound", "Strength B", "Conditioning/Skill"],
        "C/Big": ["Power+Rim", "Strength A", "COD+Post", "Strength B", "Conditioning/Skill"]
      },
      addOns: {
        Balanced: ["Skill: ball-handling 10 min", "Skill: shooting volume 20–30 min"],
        "Ball-handling": ["Handles: stationary → change-of-pace (10 min)", "Handles: pressure combos (8 min)"],
        Shooting: ["Shooting: form + catch&shoot (10 min)", "Shooting: movement + game shots (15–20 min)"],
        Finishing: ["Finishing: footwork series (8 min)", "Finishing: contact takes + floaters (10–12 min)"],
        Defense: ["Defense: closeouts + slides (10 min)", "Defense: hip turns + reaction (8 min)"]
      }
    },

    football: {
      positions: ["General", "QB", "RB", "WR/TE", "OL/DL", "LB", "DB"],
      skills: ["Balanced", "Speed/Starts", "Agility/COD", "Position skills"],
      micro: {
        General: ["Speed", "Strength A", "COD", "Strength B", "Conditioning/Skill"],
        QB: ["Throws+Footwork", "Strength A", "Accel+COD", "Strength B", "Conditioning/Skill"],
        RB: ["Accel+Cuts", "Strength A", "Top-speed", "Strength B", "Conditioning/Skill"],
        "WR/TE": ["Starts+Route", "Strength A", "COD+Catch", "Strength B", "Conditioning/Skill"],
        "OL/DL": ["Power+Hands", "Strength A", "Short accel", "Strength B", "Conditioning/Skill"],
        LB: ["COD+Read", "Strength A", "Speed", "Strength B", "Conditioning/Skill"],
        DB: ["Backpedal+Break", "Strength A", "Speed+COD", "Strength B", "Conditioning/Skill"]
      },
      addOns: {
        Balanced: ["Skill: starts + accel (10 min)", "Skill: position drills (10–15 min)"],
        "Speed/Starts": ["Starts: 6–10 reps (full rest)", "Accel: 10–20 yd x 6"],
        "Agility/COD": ["COD: 5-10-5 technique (10 min)", "Reactive shuffle (6–8 min)"],
        "Position skills": ["Position drill block (10–15 min)", "Catching/footwork/handwork (10 min)"]
      }
    },

    baseball: {
      positions: ["General", "Pitcher", "Catcher", "IF", "OF"],
      skills: ["Balanced", "Throwing care", "Hitting", "Speed/Baserunning"],
      micro: {
        General: ["Speed", "Strength A", "Skill", "Strength B", "Conditioning/Skill"],
        Pitcher: ["Arm care+Mobility", "Strength A", "Speed+Throws", "Strength B", "Conditioning/Skill"],
        Catcher: ["Hips+Mobility", "Strength A", "Explosive+Throws", "Strength B", "Conditioning/Skill"],
        IF: ["First step+Hands", "Strength A", "Speed+Bat", "Strength B", "Conditioning/Skill"],
        OF: ["Speed+Routes", "Strength A", "Power+Bat", "Strength B", "Conditioning/Skill"]
      },
      addOns: {
        Balanced: ["Skill: throwing care (8–10 min)", "Skill: sprint mechanics (10 min)"],
        "Throwing care": ["Throwing care: band/arm routine (8–10 min)", "Scap + cuff circuit (8 min)"],
        Hitting: ["Hitting: tee → front toss (15 min)", "Bat speed intent swings (6–8 min)"],
        "Speed/Baserunning": ["Sprint mechanics (8 min)", "Baserunning: 1st step + turns (8–10 min)"]
      }
    },

    volleyball: {
      positions: ["General", "Setter", "OH/OPP", "Middle", "Libero/DS"],
      skills: ["Balanced", "Approach jump", "Serve/Receive", "Defense"],
      micro: {
        General: ["Jump", "Strength A", "Skill", "Strength B", "Conditioning/Skill"],
        Setter: ["Footwork+Hands", "Strength A", "Approach jump", "Strength B", "Conditioning/Skill"],
        "OH/OPP": ["Approach jump", "Strength A", "Power+Hit", "Strength B", "Conditioning/Skill"],
        Middle: ["Approach jump", "Strength A", "Block+Landing", "Strength B", "Conditioning/Skill"],
        "Libero/DS": ["Defense+Reads", "Strength A", "Speed+COD", "Strength B", "Conditioning/Skill"]
      },
      addOns: {
        Balanced: ["Skill: approach jumps (10 min)", "Skill: serve/receive (15–20 min)"],
        "Approach jump": ["Approach jump technique (10 min)", "Landing mechanics (6–8 min)"],
        "Serve/Receive": ["Serving reps (10 min)", "Receive + platform control (10–12 min)"],
        Defense: ["Defensive reads + footwork (10 min)", "Dig reaction series (6–8 min)"]
      }
    },

    soccer: {
      positions: ["General", "GK", "CB", "FB/WB", "CM", "Winger", "ST"],
      skills: ["Balanced", "Acceleration", "Agility/COD", "Ball mastery", "Finishing"],
      micro: {
        General: ["Speed", "Strength A", "COD", "Strength B", "Conditioning/Skill"],
        GK: ["Explosive+Footwork", "Strength A", "Reaction+Jumps", "Strength B", "Conditioning/Skill"],
        CB: ["Accel+Decel", "Strength A", "COD+Duels", "Strength B", "Conditioning/Skill"],
        "FB/WB": ["Speed+Runs", "Strength A", "COD+Cross", "Strength B", "Conditioning/Skill"],
        CM: ["COD+Workrate", "Strength A", "Ball+Accel", "Strength B", "Conditioning/Skill"],
        Winger: ["Speed+Cuts", "Strength A", "Finishing", "Strength B", "Conditioning/Skill"],
        ST: ["Accel+Shots", "Strength A", "COD+Finish", "Strength B", "Conditioning/Skill"]
      },
      addOns: {
        Balanced: ["Skill: ball mastery (10 min)", "Skill: small-sided touches (15 min)"],
        Acceleration: ["Accel: 10–20 m x 6 (full rest)", "Curved runs (6 reps)"],
        "Agility/COD": ["COD: decel + re-accel (10 min)", "Reactive cuts (6–8 min)"],
        "Ball mastery": ["Ball mastery series (10 min)", "1v1 moves + exits (8 min)"],
        Finishing: ["Finishing: 1-touch reps (10 min)", "Finishing: angles + weak foot (10–12 min)"]
      }
    }
  };

  // --------------------------
  // Trial + License
  // --------------------------
  function trialInfo() {
    const t = state.trial || { startedAtMs: nowMs(), activated: false, licenseUntilMs: 0 };

    if (t.activated && t.licenseUntilMs && nowMs() < t.licenseUntilMs) {
      return {
        status: "licensed",
        daysLeft: Math.max(0, Math.ceil((t.licenseUntilMs - nowMs()) / (1000 * 60 * 60 * 24)))
      };
    }

    const used = daysBetween(t.startedAtMs, nowMs());
    const left = TRIAL_DAYS - used;
    if (left >= 0) return { status: "trial", daysLeft: left };
    return { status: "expired", daysLeft: 0 };
  }

  function updateTrialUI() {
    const info = trialInfo();
    const pill = $("trialPill");
    const status = $("licenseStatus");
    if (!pill || !status) return;

    if (info.status === "licensed") {
      pill.textContent = `Licensed (${info.daysLeft}d left)`;
      pill.className = "pill ok";
      status.innerHTML = `Status: <b>Licensed</b><br>Ends: <b>${new Date(state.trial.licenseUntilMs).toISOString().slice(0, 10)}</b>`;
    } else if (info.status === "trial") {
      pill.textContent = `Trial: ${info.daysLeft}d left`;
      pill.className = "pill warn";
      status.innerHTML = `Status: <b>Trial</b><br>Ends after ${TRIAL_DAYS} days on this device.`;
    } else {
      pill.textContent = "Trial expired";
      pill.className = "pill bad";
      status.innerHTML = `Status: <b>Expired</b><br>Enter a 12-month license key to continue.`;
    }
  }

  function gateIfExpired() {
    const info = trialInfo();
    if (info.status !== "expired") return true;
    location.hash = "#settings";
    alert("Trial expired on this device. Enter a license key in Settings.");
    return false;
  }

  function activateKey(keyRaw) {
    const key = normalizeKey(keyRaw);
    if (!validKey(key)) return { ok: false, msg: "Invalid key format/checksum." };
    state.trial.activated = true;
    state.trial.licenseKey = key;
    state.trial.licenseUntilMs = addMonths(new Date(), LICENSE_MONTHS).getTime();
    saveState(state);
    return { ok: true, msg: "Activated. License applied to this device." };
  }

  // --------------------------
  // Tabs / Navigation / Role UI
  // --------------------------
  function setActive(tab) {
    ["profile", "program", "log", "performance", "dashboard", "team", "parent", "settings"].forEach((t) => {
      const b = $("nav-" + t), p = $("tab-" + t);
      if (b) b.classList.toggle("active", t === tab);
      if (p) p.style.display = (t === tab) ? "block" : "none";
    });

    if (tab === "program") renderProgram();
    if (tab === "log") renderLog();
    if (tab === "performance") renderPerformance();
    if (tab === "dashboard") renderDashboard();
    if (tab === "team") renderTeam();
    if (tab === "parent") renderParent();
    if (tab === "settings") updateTrialUI();
  }

  function applyRoleUI() {
    const rolePill = $("rolePill");
    if (rolePill) rolePill.textContent = `Role: ${state.role || "athlete"}`;

    const showTeam = (state.role === "coach" || state.role === "admin");
    const navTeam = $("nav-team");
    if (navTeam) navTeam.style.display = showTeam ? "inline-block" : "none";

    const showParent = (state.role === "parent" || state.role === "coach" || state.role === "admin");
    const navParent = $("nav-parent");
    if (navParent) navParent.style.display = showParent ? "inline-block" : "none";
  }

  function route() {
    const h = (location.hash || "#profile").replace("#", "");
    const ok = new Set(["profile", "program", "log", "performance", "dashboard", "team", "parent", "settings"]);
    let tab = ok.has(h) ? h : "profile";
    if (trialInfo().status === "expired" && tab !== "settings") tab = "settings";
    setActive(tab);
  }

  function bindNav() {
    ["profile", "program", "log", "performance", "dashboard", "team", "parent", "settings"].forEach((t) => {
      const b = $("nav-" + t);
      if (!b) return;
      b.addEventListener("click", () => location.hash = "#" + t);
    });
    window.addEventListener("hashchange", route);
  }

  // --------------------------
  // Profile UI
  // --------------------------
  function populate(sel, opts, selected) {
    if (!sel) return;
    sel.innerHTML = "";
    opts.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o;
      opt.textContent = o;
      if (o === selected) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function syncProfileUI() {
    if ($("sport")) $("sport").value = state.profile.sport;
    if ($("level")) $("level").value = state.profile.level;
    if ($("days")) $("days").value = String(state.profile.days);
    if ($("programLevel")) $("programLevel").value = state.profile.programLevel;
    if ($("focus")) $("focus").value = state.profile.focus;
    if ($("secondary")) $("secondary").value = state.profile.secondary;
    if ($("landmine")) $("landmine").value = state.profile.landmine;
    if ($("notes")) $("notes").value = state.profile.notes || "";
    if ($("wellness")) $("wellness").value = String(state.profile.wellness || 7);
    if ($("wellnessNum")) $("wellnessNum").textContent = String(state.profile.wellness || 7);

    const sd = SPORT_DATA[state.profile.sport] || SPORT_DATA.basketball;
    populate($("position"), sd.positions, state.profile.position);
    populate($("skill"), sd.skills, state.profile.skill);
  }

  function readProfileUI() {
    if ($("sport")) state.profile.sport = $("sport").value;
    if ($("level")) state.profile.level = $("level").value;
    if ($("days")) state.profile.days = Number($("days").value);
    if ($("programLevel")) state.profile.programLevel = $("programLevel").value;
    if ($("focus")) state.profile.focus = $("focus").value;
    if ($("secondary")) state.profile.secondary = $("secondary").value;
    if ($("landmine")) state.profile.landmine = $("landmine").value;
    if ($("position")) state.profile.position = $("position").value;
    if ($("skill")) state.profile.skill = $("skill").value;
    if ($("wellness")) state.profile.wellness = Number($("wellness").value);
    if ($("notes")) state.profile.notes = ($("notes").value || "");

    saveState(state);
  }

  function onSportChange() {
    const sportSel = $("sport");
    if (!sportSel) return;

    const sd = SPORT_DATA[sportSel.value] || SPORT_DATA.basketball;
    populate($("position"), sd.positions, "General");
    populate($("skill"), sd.skills, "Balanced");
    state.profile.position = "General";
    state.profile.skill = "Balanced";
    readProfileUI();
  }

  // --------------------------
  // Program building
  // --------------------------
  function estimateMinutes(level) {
    const base = { warmup: 10, speed: 12, power: 10, strength: 30, skill: 18, conditioning: 8, transitions: 5 };
    if (level === "easy") { base.strength = 22; base.skill = 15; base.conditioning = 6; }
    if (level === "advanced") { base.strength = 38; base.skill = 22; base.conditioning = 10; }
    const total = Object.values(base).reduce((a, b) => a + b, 0);
    return { total, calc: Object.values(base).join("+") + "=" + total };
  }

  function applyCompliance(items) {
    if (state.team?.compliance !== "on") return items;
    return items.map(x => x
      .replace(/Squat pattern/g, "Goblet squat / split squat")
      .replace(/RDL/g, "DB RDL / hip hinge"));
  }

  function strengthBlock(level, landmineOn, strengthBias) {
    const more = strengthBias ? 1 : 0;
    const out = [];

    if (level === "easy") {
      out.push(`Squat pattern ${2 + more}x6 (RPE ~6–7)`, "DB bench 2x8", "RDL 2x8", "Row/Pull 2x10");
    } else if (level === "advanced") {
      out.push(`Squat pattern ${4 + more}x5 (RPE ~7–8)`, "DB bench 4x6–8", "RDL 4x6–8", "Row/Pull 4x8");
    } else {
      out.push(`Squat pattern ${3 + more}x6 (RPE ~7)`, "DB bench 3x8", "RDL 3x8", "Row/Pull 3x8");
    }

    if (landmineOn) {
      out.push(
        level === "advanced"
          ? "Landmine press 3x8 + Landmine row 3x8"
          : (level === "easy" ? "Landmine press 2x10 (controlled)" : "Landmine press 3x10 OR Landmine row 3x10")
      );
    }

    return applyCompliance(out);
  }

  function speedBlock(focus, level, quickBias) {
    const base = (level === "easy") ? 5 : (level === "advanced") ? 8 : 6;
    const extra = quickBias ? 2 : 0;

    if (focus === "faster") return [`Acceleration 10–20 yd x ${base + 2 + extra} (full rest)`, "Decel to stick: 6 reps"];
    if (focus === "jump") return [`Acceleration 10–20 yd x ${base + extra} (full rest)`, "Lateral quickness: 6 reps"];
    if (focus === "power") return [`Acceleration 10–20 yd x ${base + extra} (full rest)`, "Resisted march / A-skip 2x10"];
    return [`Acceleration 10–20 yd x ${base + extra} (full rest)`];
  }

  function powerBlock(focus, level) {
    const js = (level === "easy") ? "3x3" : (level === "advanced") ? "5x3" : "4x3";
    const ms = (level === "easy") ? "3x3" : (level === "advanced") ? "5x3" : "4x3";
    if (focus === "jump") return [`Jumps: box or vertical ${js} (full rest)`, "Pogos 2x12"];
    if (focus === "power") return [`Med-ball throw ${ms}`, `Jumps: broad or box ${js}`];
    return [`Jumps: box or broad ${js}`, `Med-ball throw ${ms}`];
  }

  function skillBlock(p) {
    const sd = SPORT_DATA[p.sport] || SPORT_DATA.basketball;
    const addOn = (sd.addOns[p.skill] || sd.addOns.Balanced || ["Skill block 15–20 min"]);
    return (p.secondary === "skill") ? addOn.concat(["+ Extra skill volume: 10–15 min"]) : addOn;
  }

  function secondaryText(sec) {
    return sec === "conditioning" ? "Secondary: Conditioning added."
      : sec === "strength" ? "Secondary: Strength bias added."
        : sec === "quickness" ? "Secondary: Quickness/COD bias added."
          : sec === "mobility" ? "Secondary: Extra mobility/landing added."
            : sec === "skill" ? "Secondary: Extra skill volume added."
              : "Secondary: none.";
  }

  function makeDay(p, dayName, theme) {
    const est = estimateMinutes(p.programLevel);
    const landmineOn = p.landmine === "on";
    const strengthBias = p.secondary === "strength";
    const quickBias = p.secondary === "quickness";
    const mobilityBias = p.secondary === "mobility";

    const warm = ["5 min easy cardio", "Dynamic mobility (hips/ankles/T-spine)", "2x10 skips/pogos"];
    if (mobilityBias) warm.push("Extra mobility + landing: 6–8 min");

    const blocks = [
      { label: "Warm-up", items: warm },
      { label: "Speed / Quickness", items: speedBlock(p.focus, p.programLevel, quickBias) },
      { label: "Jump / Power", items: powerBlock(p.focus, p.programLevel) },
      { label: "Strength", items: strengthBlock(p.programLevel, landmineOn, strengthBias) },
      { label: "Skill block", items: skillBlock(p) },
      {
        label: "Conditioning (optional)",
        items: (p.secondary === "conditioning")
          ? ["Tempo intervals 8–12 min (or bike)", "Stop if form breaks"]
          : [(p.programLevel === "easy" ? "Easy tempo 6 min (optional)" : "Tempo 6–10 min (optional)")]
      },
      { label: "Cooldown", items: ["Breathing 2 min", "Light stretch (hips/calves/hamstrings) 4–6 min"] }
    ];

    const notes = [
      secondaryText(p.secondary),
      "Load guidance: avoid grinding reps. Leave 2–3 reps in reserve.",
      "If practice/game day: prioritize speed + skill; reduce strength volume by ~1 set."
    ];
    if ((p.notes || "").trim()) notes.unshift("Today note: " + p.notes.trim());

    const lifts = [
      { name: "Squat pattern", sets: (p.programLevel === "advanced") ? 4 : (p.programLevel === "easy") ? 2 : 3, reps: (p.programLevel === "advanced") ? "5" : "6" },
      { name: "DB bench", sets: (p.programLevel === "advanced") ? 4 : (p.programLevel === "easy") ? 2 : 3, reps: (p.programLevel === "advanced") ? "6" : "8" },
      { name: "RDL", sets: (p.programLevel === "advanced") ? 4 : (p.programLevel === "easy") ? 2 : 3, reps: (p.programLevel === "advanced") ? "6" : "8" },
      { name: "Row/Pull", sets: (p.programLevel === "advanced") ? 4 : (p.programLevel === "easy") ? 2 : 3, reps: "8" }
    ];
    if (landmineOn) lifts.push({ name: "Landmine press/row", sets: (p.programLevel === "easy") ? 2 : 3, reps: (p.programLevel === "advanced") ? "8" : "10" });

    if (state.team?.compliance === "on") {
      lifts.forEach(l => l.name = l.name.replace(/Squat pattern/g, "Goblet squat / split squat").replace(/RDL/g, "DB RDL / hip hinge"));
    }

    return {
      dayName,
      theme,
      estMin: est.total,
      estCalc: est.calc,
      why: `Sport: ${p.sport} • Program: ${p.programLevel} • Primary: ${p.focus} • Secondary: ${p.secondary} • Position: ${p.position} • Skill: ${p.skill} • Landmine: ${landmineOn ? "on" : "off"} • Wellness: ${p.wellness}/10`,
      blocks,
      notes,
      logLifts: lifts
    };
  }

  function buildWeek(p) {
    const sd = SPORT_DATA[p.sport] || SPORT_DATA.basketball;
    const key = sd.micro[p.position] ? p.position : "General";
    const pattern = sd.micro[key] || sd.micro.General;
    const names = (p.days === 3) ? ["Day 1", "Day 2", "Day 3"]
      : (p.days === 4) ? ["Day 1", "Day 2", "Day 3", "Day 4"]
        : ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

    const themes = pattern.slice(0, p.days);

    return {
      meta: { ...p },
      createdISO: new Date().toISOString(),
      days: names.map((n, i) => makeDay(p, n, themes[i] || "Training"))
    };
  }

  function microGoals(p) {
    const g = [];
    const d = p.days;

    if (p.focus === "faster") g.push(`Hit ${Math.min(d, 3)} sprint/start sessions this week (quality reps, full rest).`);
    if (p.focus === "jump") g.push(`Complete ${Math.min(d, 3)} jump/power exposures this week (full rest).`);
    if (p.focus === "power") g.push(`Do ${Math.min(d, 2)} med-ball power sessions + ${Math.min(d, 3)} jump exposures.`);
    if (p.focus === "balanced") g.push(`Complete ${d} sessions this week and log at least 1 strength day.`);
    if (p.secondary === "mobility") g.push("Add 8–10 minutes mobility + landing on 2 days.");
    if (p.secondary === "conditioning") g.push("Add 8–12 minutes tempo conditioning on 2 days.");
    if (p.secondary === "skill") g.push("Add 10–15 minutes extra skill volume on 2 days.");
    if (p.secondary === "strength") g.push("Progress load slightly on 1 strength movement (no grinding).");
    if (p.secondary === "quickness") g.push("Add 2 extra COD/quickness exposures this week.");

    g.push("Monthly target: improve one metric slightly (e.g., +0.5–1.0 in jump OR -0.03–0.07 sec sprint).");
    return g;
  }

  function renderMicroGoals() {
    const mg = $("microGoals");
    if (!mg) return;
    mg.innerHTML = microGoals(state.profile).map(x => `• ${esc(x)}`).join("<br>");
  }

  function renderProgram() {
    const out = $("programOutput");
    if (!out) return;

    if (!state.week) {
      out.innerHTML = '<div class="small">Generate a weekly microcycle from Profile.</div>';
      return;
    }

    const w = state.week;
    const header =
      `<div class="wcard"><div class="whead"><div class="wtitle">Weekly microcycle</div><div class="badge">${esc(w.meta.sport)} • ${esc(w.meta.programLevel)} • ${w.meta.days} days</div></div>
      <div class="small" style="margin-top:8px">Primary: <b>${esc(w.meta.focus)}</b> • Secondary: <b>${esc(w.meta.secondary)}</b> • Position: <b>${esc(w.meta.position)}</b> • Skill: <b>${esc(w.meta.skill)}</b></div></div>`;

    const daysHtml = w.days.map((d, i) => {
      const blocks = d.blocks.map(b =>
        `<div class="wcard">
          <div class="whead"><div class="wtitle">${esc(b.label)}</div><div class="badge">${esc(d.theme)}</div></div>
          <div class="wlist">${b.items.map(x => `<div class="witem"><input type="checkbox"><div class="wtext">${esc(x)}</div></div>`).join("")}</div>
        </div>`
      ).join("");

      const notes =
        `<div class="wcard"><div class="wtitle">Notes</div>
          <div class="small" style="margin-top:8px">${d.notes.map(esc).join("<br>")}</div>
        </div>`;

      return `
        <div class="wcard" style="border-color: rgba(43,124,255,.25)">
          <div class="whead">
            <div class="wtitle">${esc(d.dayName)} — ${esc(d.theme)}</div>
            <div class="badge">Est: ${d.estMin} min • ${esc(d.estCalc)}</div>
          </div>
          <div class="small" style="margin-top:8px">${esc(d.why)}</div>
          <div class="sectionGrid" style="margin-top:12px">${blocks}${notes}</div>
          <div class="btnRow hidePrint">
            <button class="btn secondary" type="button" onclick="setToday(${i})">Set as today</button>
          </div>
        </div>`;
    }).join("");

    out.innerHTML = header + `<div class="sectionGrid" style="margin-top:12px">${daysHtml}</div>`;
  }

  window.setToday = (i) => {
    state.todayIndex = i;
    saveState(state);
    alert("Set. Open Log to enter weights for today.");
  };

  // --------------------------
  // Log
  // --------------------------
  function renderLog() {
    const wrap = $("logContainer");
    const logDaySel = $("logDay");
    const logDate = $("logDate");
    if (!wrap || !logDaySel || !logDate) return;

    const todayISO = new Date().toISOString().slice(0, 10);
    if (!logDate.value) logDate.value = todayISO;

    if (!state.week) {
      wrap.innerHTML = '<div class="small">Generate a weekly microcycle first.</div>';
      logDaySel.innerHTML = "";
      return;
    }

    logDaySel.innerHTML = "";
    state.week.days.forEach((d, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${d.dayName} — ${d.theme}`;
      if (i === state.todayIndex) opt.selected = true;
      logDaySel.appendChild(opt);
    });

    const idx = Number(logDaySel.value || state.todayIndex || 0);
    const day = state.week.days[idx];
    if (!day) {
      wrap.innerHTML = '<div class="small">No day selected.</div>';
      return;
    }

    let rows = "";
    (day.logLifts || []).forEach(l => {
      for (let s = 1; s <= l.sets; s++) {
        rows += `<tr>
          <td>${esc(l.name)}</td>
          <td>${s}</td>
          <td>${esc(l.reps)}</td>
          <td><input inputmode="decimal" data-lift="${esc(l.name)}" data-set="${s}" data-reps="${esc(l.reps)}" placeholder="lbs"></td>
          <td><input inputmode="decimal" data-rpe="${esc(l.name)}" data-set="${s}" placeholder="RPE (opt)"></td>
        </tr>`;
      }
    });

    wrap.innerHTML = `
      <div class="wcard">
        <div class="whead"><div class="wtitle">Log template</div><div class="badge">${esc(day.dayName)} • ${esc(day.theme)}</div></div>
        <div class="small" style="margin-top:8px">Volume = sum(weight × reps). Only sets you enter count.</div>
      </div>
      <table class="table" style="margin-top:10px">
        <thead><tr><th>Lift</th><th>Set</th><th>Reps</th><th>Weight (lbs)</th><th>RPE</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function saveLog() {
    if (!state.week) return;

    const logDate = $("logDate");
    const logDay = $("logDay");
    const injuryFlag = $("injuryFlag");
    if (!logDate || !logDay || !injuryFlag) return;

    const dateISO = logDate.value || new Date().toISOString().slice(0, 10);
    const dayIndex = Number(logDay.value || 0);
    const day = state.week.days[dayIndex];
    const injury = injuryFlag.value || "none";

    const weights = [...document.querySelectorAll('#logContainer input[data-lift]')];
    const rpes = [...document.querySelectorAll('#logContainer input[data-rpe]')];

    const rpeMap = new Map();
    rpes.forEach(i => {
      const k = i.dataset.rpe + "|" + i.dataset.set;
      const v = (i.value || "").trim();
      if (v) rpeMap.set(k, v);
    });

    const entries = [];
    weights.forEach(i => {
      const w = (i.value || "").trim();
      if (!w) return;
      const n = Number(w);
      if (!Number.isFinite(n)) return;
      const k = i.dataset.lift + "|" + i.dataset.set;
      entries.push({
        name: i.dataset.lift,
        set: Number(i.dataset.set),
        reps: i.dataset.reps,
        weight: n,
        rpe: rpeMap.get(k) || ""
      });
    });

    state.logs = state.logs.filter(x => !(x.dateISO === dateISO && x.dayIndex === dayIndex));
    state.logs.push({ dateISO, dayIndex, theme: day.theme, injury, wellness: state.profile.wellness, entries });
    state.logs.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    saveState(state);
  }

  function quote(s) {
    const str = String(s ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }

  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function exportLogsCSV() {
    const header = ["date", "dayIndex", "theme", "injury", "wellness", "lift", "set", "reps", "weight", "rpe"];
    const rows = [header.join(",")];
    state.logs.forEach(l => {
      (l.entries || []).forEach(e =>
        rows.push([
          l.dateISO,
          l.dayIndex,
          quote(l.theme),
          l.injury,
          l.wellness,
          quote(e.name),
          e.set,
          quote(e.reps),
          e.weight,
          quote(e.rpe || "")
        ].join(","))
      );
    });
    downloadText("piq_logs.csv", rows.join("\n"), "text/csv");
  }

  // --------------------------
  // Charts + Performance
  // --------------------------
  function drawLine(canvas, pts, unit, invert = false) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padL = 50, padR = 20, padT = 18, padB = 30;
    const w = canvas.width, h = canvas.height;
    const pw = w - padL - padR, ph = h - padT - padB;

    if (!pts.length) {
      ctx.fillStyle = "rgba(231,238,248,.75)";
      ctx.font = "14px system-ui";
      ctx.fillText("No data yet.", padL, padT + 30);
      return;
    }

    const ys = pts.map(p => p.y);
    const max = Math.max(...ys), min = Math.min(...ys);
    const spread = (max - min) || 1;
    const yMax = max + spread * 0.15;
    const yMin = min - spread * 0.15;

    ctx.strokeStyle = "rgba(231,238,248,.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + ph * i / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + pw, y);
      ctx.stroke();
    }

    const n = pts.length;
    const x = (i) => padL + (n === 1 ? pw / 2 : pw * (i / (n - 1)));
    const y = (v) => {
      const norm = (v - yMin) / (yMax - yMin);
      const yv = invert ? norm : (1 - norm);
      return padT + ph * yv;
    };

    ctx.strokeStyle = "rgba(43,124,255,.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const xx = x(i), yy = y(p.y);
      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    });
    ctx.stroke();

    ctx.fillStyle = "rgba(255,138,0,.95)";
    pts.forEach((p, i) => {
      const xx = x(i), yy = y(p.y);
      ctx.beginPath();
      ctx.arc(xx, yy, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "rgba(231,238,248,.70)";
    ctx.font = "12px system-ui";
    pts.forEach((p, i) => ctx.fillText(p.x.slice(5), x(i) - 18, padT + ph + 22));
    ctx.fillText(String(Math.round(yMin * 10) / 10), 6, padT + ph + 4);
    ctx.fillText(String(Math.round(yMax * 10) / 10) + " " + unit, 6, padT + 12);
  }

  function renderPerformance() {
    const testDate = $("testDate");
    if (!testDate) return;

    const todayISO = new Date().toISOString().slice(0, 10);
    if (!testDate.value) testDate.value = todayISO;

    const vertPts = state.tests.filter(t => Number.isFinite(t.vert)).map(t => ({ x: t.dateISO, y: t.vert }));
    const sprPts = state.tests.filter(t => Number.isFinite(t.sprint10)).map(t => ({ x: t.dateISO, y: t.sprint10 }));

    drawLine($("chartVert"), vertPts, "in", false);
    drawLine($("chartSprint"), sprPts, "sec", true);
  }

  function saveTests() {
    const testDate = $("testDate");
    if (!testDate) return;

    const dateISO = testDate.value || new Date().toISOString().slice(0, 10);
    const parse = (id) => {
      const el = $(id);
      const v = (el?.value || "").trim();
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const entry = {
      dateISO,
      vert: parse("vert"),
      sprint10: parse("sprint10"),
      cod: parse("cod"),
      bw: parse("bw"),
      sleep: parse("sleep")
    };

    state.tests = state.tests.filter(t => t.dateISO !== dateISO);
    state.tests.push(entry);
    state.tests.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    saveState(state);
  }

  // --------------------------
  // Dashboard + Insights
  // --------------------------
  function computeWeeklyVolumes() {
    const byWeek = new Map();

    state.logs.forEach(day => {
      const date = new Date(day.dateISO + "T00:00:00");
      const dow = date.getDay();
      const mondayOffset = (dow === 0) ? -6 : (1 - dow);
      const ws = new Date(date);
      ws.setDate(date.getDate() + mondayOffset);
      const weekISO = ws.toISOString().slice(0, 10);

      let vol = 0;
      (day.entries || []).forEach(e => {
        const reps = Number(String(e.reps).replace(/[^0-9]/g, ""));
        if (Number.isFinite(reps) && Number.isFinite(e.weight)) vol += e.weight * reps;
      });

      byWeek.set(weekISO, (byWeek.get(weekISO) || 0) + vol);
    });

    return [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekStartISO, totalVolume]) => ({ weekStartISO, totalVolume }));
  }

  function weeklyWindow(weekISO) {
    const start = new Date(weekISO + "T00:00:00");
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }

  function renderInsights(latestWeekISO) {
    const el = $("insights");
    if (!el) return;

    if (!latestWeekISO) {
      el.textContent = "Save logs to generate insights.";
      return;
    }

    const { start, end } = weeklyWindow(latestWeekISO);
    const inWeek = state.logs.filter(l => {
      const d = new Date(l.dateISO + "T00:00:00");
      return d >= start && d < end;
    });

    const wellness = inWeek.map(x => Number(x.wellness)).filter(Number.isFinite);
    const avg = wellness.length ? (wellness.reduce((a, b) => a + b, 0) / wellness.length) : null;

    const injuries = inWeek.map(x => x.injury).filter(x => x && x !== "none");
    const injuryCounts = injuries.reduce((m, x) => { m[x] = (m[x] || 0) + 1; return m; }, {});

    const vols = computeWeeklyVolumes();
    const idx = vols.findIndex(v => v.weekStartISO === latestWeekISO);
    const cur = idx >= 0 ? vols[idx].totalVolume : null;
    const prev = idx > 0 ? vols[idx - 1].totalVolume : null;

    const ins = [];

    if (avg !== null) {
      ins.push(`Wellness avg this week: ${avg.toFixed(1)}/10 (${wellness.length} logged days).`);
      if (avg <= 4.5) ins.push("Suggestion: reduce strength volume by ~1 set and keep speed reps high-quality.");
      else if (avg >= 8) ins.push("Suggestion: readiness looks strong; progress loads slightly (no grinding).");
    } else {
      ins.push("No wellness values logged this week yet.");
    }

    if (Object.keys(injuryCounts).length) {
      ins.push(`Injury flags: ${Object.entries(injuryCounts).map(([k, v]) => `${k}:${v}`).join(", ")}.`);
      ins.push("Suggestion: if pain/injury flagged, prioritize mobility + technique; stop if symptoms worsen.");
    } else {
      ins.push("No injury flags this week.");
    }

    if (cur !== null && prev !== null) {
      const pct = prev === 0 ? null : ((cur - prev) / prev * 100);
      ins.push(
        pct === null
          ? "Volume change vs last week: cannot compute (prev 0)."
          : `Volume change vs last week: ${pct.toFixed(0)}% (calc: (cur-prev)/prev×100).`
      );
      if (pct !== null && pct > 25) ins.push("Suggestion: volume rose >25%; consider keeping next week flatter.");
    } else {
      ins.push("Need at least two weeks of logs to compute volume change insight.");
    }

    el.innerHTML = ins.map(x => `• ${esc(x)}`).join("<br>");
  }

  function renderDashboard() {
    const c = $("volChart");
    const sum = $("dashSummary");
    const ws = $("weeklySummary");
    if (!c || !sum || !ws) return;

    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);

    const data = computeWeeklyVolumes();
    const padL = 50, padR = 20, padT = 18, padB = 30;
    const w = c.width, h = c.height;
    const pw = w - padL - padR, ph = h - padT - padB;

    if (!data.length) {
      ctx.fillStyle = "rgba(231,238,248,.75)";
      ctx.font = "14px system-ui";
      ctx.fillText("No log data yet. Save a log to see weekly volume.", padL, padT + 30);
      sum.textContent = "Weekly volume = sum(weight × reps) across logged sets.";
      ws.textContent = "No weekly data yet.";
      renderInsights(null);
      return;
    }

    const max = Math.max(...data.map(d => d.totalVolume));
    const yMax = max * 1.15 || 1;

    ctx.strokeStyle = "rgba(231,238,248,.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + ph * i / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + pw, y);
      ctx.stroke();
    }

    const n = data.length;
    const x = (i) => padL + (n === 1 ? pw / 2 : pw * (i / (n - 1)));
    const y = (v) => padT + ph * (1 - (v / yMax));

    ctx.strokeStyle = "rgba(43,124,255,.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    data.forEach((d, i) => {
      const xx = x(i), yy = y(d.totalVolume);
      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    });
    ctx.stroke();

    ctx.fillStyle = "rgba(255,138,0,.95)";
    data.forEach((d, i) => {
      const xx = x(i), yy = y(d.totalVolume);
      ctx.beginPath();
      ctx.arc(xx, yy, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "rgba(231,238,248,.70)";
    ctx.font = "12px system-ui";
    data.forEach((d, i) => ctx.fillText(d.weekStartISO.slice(5), x(i) - 18, padT + ph + 22));
    ctx.fillText("0", 18, padT + ph + 4);
    ctx.fillText(String(Math.round(yMax)), 8, padT + 12);

    const last = data[data.length - 1];
    sum.innerHTML = `Weeks tracked: <b>${data.length}</b> • Latest (${last.weekStartISO}): <b>${Math.round(last.totalVolume)}</b> volume<br>Volume calc: sum(weight × reps) for all logged sets.`;

    const { start, end } = weeklyWindow(last.weekStartISO);
    const inWeek = state.logs.filter(l => {
      const d = new Date(l.dateISO + "T00:00:00");
      return d >= start && d < end;
    });

    const sessions = inWeek.length;
    const themes = [...new Set(inWeek.map(x => x.theme).filter(Boolean))];
    const focusHitPct = sessions === 0 ? 0 : Math.min(100, Math.round((sessions / state.profile.days) * 100));

    ws.innerHTML = `Sessions completed: <b>${sessions}</b> / ${state.profile.days}<br>Primary: <b>${esc(state.profile.focus)}</b> • Secondary: <b>${esc(state.profile.secondary)}</b><br>Focus hit % (sessions ÷ planned): <b>${focusHitPct}%</b><br>Themes hit: ${themes.length ? themes.map(esc).join(", ") : "—"}`;

    renderInsights(last.weekStartISO);
  }

  // --------------------------
  // Prompts + Print
  // --------------------------
  function savePrompts() {
    const todayISO = new Date().toISOString().slice(0, 10);
    const hard = $("promptHard")?.value || "";
    const improve = $("promptImprove")?.value || "";

    state.prompts = state.prompts.filter(p => p.dateISO !== todayISO);
    state.prompts.push({ dateISO: todayISO, hard, improve });
    saveState(state);
  }

  function printToday() {
    if (!state.week) { alert("Generate a week first."); return; }
    const day = state.week.days[state.todayIndex || 0];
    if (!day) { alert("No day selected."); return; }

    const out = $("programOutput");
    if (!out) return;

    const orig = out.innerHTML;
    const blocks = day.blocks.map(b =>
      `<div class="wcard"><div class="whead"><div class="wtitle">${esc(b.label)}</div><div class="badge">${esc(day.theme)}</div></div>
       <div class="wlist">${b.items.map(x => `<div class="witem"><input type="checkbox"><div class="wtext">${esc(x)}</div></div>`).join("")}</div></div>`
    ).join("");

    out.innerHTML =
      `<div class="wcard"><div class="whead"><div class="wtitle">${esc(day.dayName)} — ${esc(day.theme)}</div>
       <div class="badge">Est: ${day.estMin} min • ${esc(day.estCalc)}</div></div>
       <div class="small" style="margin-top:8px">${esc(day.why)}</div></div>
       <div class="sectionGrid" style="margin-top:12px">${blocks}</div>`;

    window.print();
    out.innerHTML = orig;
  }

  const printWeek = () => window.print();
  const printParent = () => window.print();
  const printReport = () => window.print();

  // --------------------------
  // Team + Parent
  // --------------------------
  function renderRoster() {
    const rosterTable = $("rosterTable");
    if (!rosterTable) return;

    const r = state.team.roster || [];
    if (!r.length) {
      rosterTable.innerHTML = '<div class="small">No athletes yet.</div>';
      return;
    }

    const rows = r.map((a, i) =>
      `<tr>
        <td>${esc(a.name)}</td><td>${esc(a.pos || "")}</td><td>${esc(a.grade || "")}</td><td>${esc(a.id || "")}</td>
        <td><button class="btn secondary" type="button" onclick="removeAthlete(${i})">Remove</button></td>
      </tr>`
    ).join("");

    rosterTable.innerHTML =
      `<table class="table"><thead><tr><th>Name</th><th>Pos</th><th>Grade</th><th>ID</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  window.removeAthlete = (i) => {
    state.team.roster.splice(i, 1);
    saveState(state);
    renderRoster();
    renderAttendance();
    renderParentSelectors();
  };

  function renderAttendance() {
    const attendanceTable = $("attendanceTable");
    const attDate = $("attDate");
    if (!attendanceTable || !attDate) return;

    const r = state.team.roster || [];
    if (!r.length) {
      attendanceTable.innerHTML = '<div class="small">Add athletes to take attendance.</div>';
      return;
    }

    const dateISO = attDate.value || new Date().toISOString().slice(0, 10);
    const existing = (state.team.attendance || []).find(x => x.dateISO === dateISO);
    const present = new Set((existing?.presentIds) || []);

    const rows = r.map(a =>
      `<tr>
        <td>${esc(a.name)}</td><td>${esc(a.pos || "")}</td>
        <td><input type="checkbox" data-att="${esc(a.id || a.name)}" ${present.has(a.id || a.name) ? "checked" : ""}></td>
      </tr>`
    ).join("");

    attendanceTable.innerHTML =
      `<table class="table"><thead><tr><th>Athlete</th><th>Pos</th><th>Present</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function saveAttendance() {
    const attDate = $("attDate");
    if (!attDate) return;

    const dateISO = attDate.value || new Date().toISOString().slice(0, 10);
    const checks = [...document.querySelectorAll('input[type="checkbox"][data-att]')];
    const presentIds = checks.filter(c => c.checked).map(c => c.dataset.att);

    state.team.attendance = (state.team.attendance || []).filter(x => x.dateISO !== dateISO);
    state.team.attendance.push({ dateISO, presentIds });
    state.team.attendance.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    saveState(state);
  }

  function attendancePctFor(id) {
    const att = state.team.attendance || [];
    if (!att.length) return null;

    let total = att.length, present = 0;
    att.forEach(s => { if ((s.presentIds || []).includes(id)) present++; });

    return { present, total, pct: Math.round((present / total) * 100) };
  }

  function exportTeam() {
    downloadText("piq_team.json", JSON.stringify({ version: "piq-team-v1", team: state.team }, null, 2), "application/json");
  }

  function importTeam(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        if (!obj.team) throw new Error("Missing team");
        state.team = obj.team;
        saveState(state);
        alert("Imported team.");
        renderTeam();
      } catch (e) {
        alert("Import failed: " + e.message);
      }
    };
    r.readAsText(file);
  }

  function renderTeam() {
    if ($("teamName")) $("teamName").value = state.team.name || "";
    if ($("compliance")) $("compliance").value = state.team.compliance || "off";
    if ($("attDate") && !$("attDate").value) $("attDate").value = new Date().toISOString().slice(0, 10);
    if ($("teamBoard")) $("teamBoard").value = state.team.board || "";

    renderRoster();
    renderAttendance();
    renderParentSelectors();
  }

  function renderParentSelectors() {
    const sel = $("parentAthlete");
    if (!sel) return;

    const r = state.team.roster || [];
    sel.innerHTML = "";

    const o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = r.length ? "Choose athlete…" : "No roster yet";
    sel.appendChild(o0);

    r.forEach(a => {
      const opt = document.createElement("option");
      opt.value = a.id || a.name;
      opt.textContent = `${a.name}${a.pos ? (" • " + a.pos) : ""}`;
      sel.appendChild(opt);
    });
  }

  function renderParent() {
    renderParentSelectors();

    const pa = $("parentAthlete");
    const parentAttendance = $("parentAttendance");
    const parentGoals = $("parentGoals");
    if (!pa || !parentAttendance || !parentGoals) return;

    const id = pa.value;

    if (!id) {
      parentAttendance.textContent = "Select an athlete to view attendance.";
      parentGoals.innerHTML = microGoals(state.profile).map(x => `• ${esc(x)}`).join("<br>");
      return;
    }

    const att = attendancePctFor(id);
    parentAttendance.innerHTML = att
      ? `Attendance: <b>${att.present}</b> / ${att.total} sessions (<b>${att.pct}%</b>).`
      : "No attendance sessions logged yet.";

    parentGoals.innerHTML = microGoals(state.profile).map(x => `• ${esc(x)}`).join("<br>");
  }

  function exportAll() {
    downloadText("piq_all_data.json", JSON.stringify({ version: "piq-all-v1", state }, null, 2), "application/json");
  }

  function importAll(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        if (!obj.state) throw new Error("Missing state");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj.state));
        location.reload();
      } catch (e) {
        alert("Import failed: " + e.message);
      }
    };
    r.readAsText(file);
  }

  // --------------------------
  // Onboarding (blocks until required)
  // --------------------------
  function onboardingNeeded() {
    return !state.role || !state.profile?.sport || !state.profile?.days;
  }

  function showOnboarding() {
    const mount = $("onboard");
    if (!mount) return;

    mount.style.display = "block";
    mount.innerHTML = `
      <div class="modalBack">
        <div class="modal">
          <h3>Welcome to PerformanceIQ</h3>
          <div class="small">Complete required setup to continue.</div>
          <div class="hr"></div>

          <div class="row">
            <div class="field">
              <label>Role (required)</label>
              <select id="obRole">
                <option value="athlete">Athlete</option>
                <option value="coach">Coach</option>
                <option value="parent">Parent</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div class="field">
              <label>Sport (required)</label>
              <select id="obSport">
                <option value="basketball">Basketball</option>
                <option value="football">Football</option>
                <option value="baseball">Baseball</option>
                <option value="volleyball">Volleyball</option>
                <option value="soccer">Soccer</option>
              </select>
            </div>

            <div class="field">
              <label>Days/week (required)</label>
              <select id="obDays">
                <option value="3">3</option>
                <option value="4" selected>4</option>
                <option value="5">5</option>
              </select>
            </div>
          </div>

          <div class="row" style="margin-top:10px">
            <div class="field">
              <label>Level</label>
              <select id="obLevel">
                <option value="youth" selected>Youth development</option>
                <option value="hs">High school</option>
                <option value="college">College prep</option>
              </select>
            </div>

            <div class="field">
              <label>Primary focus</label>
              <select id="obFocus">
                <option value="balanced" selected>Balanced</option>
                <option value="faster">Get faster</option>
                <option value="jump">Jump higher</option>
                <option value="power">Explosive power</option>
              </select>
            </div>

            <div class="field">
              <label>Program</label>
              <select id="obProg">
                <option value="easy">Easy</option>
                <option value="standard" selected>Standard</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div class="btnRow">
            <button class="btn" id="obSave" type="button">Save & continue</button>
          </div>

          <div class="small" style="margin-top:6px">Required: role, sport, days/week.</div>
        </div>
      </div>`;

    $("obRole").value = state.role || "athlete";
    $("obSport").value = state.profile.sport || "basketball";
    $("obDays").value = String(state.profile.days || 4);
    $("obLevel").value = state.profile.level || "youth";
    $("obFocus").value = state.profile.focus || "balanced";
    $("obProg").value = state.profile.programLevel || "standard";

    $("obSave").addEventListener("click", () => {
      const role = $("obRole").value;
      const sport = $("obSport").value;
      const days = Number($("obDays").value);

      if (!role || !sport || !days) {
        alert("Please complete required fields.");
        return;
      }

      state.role = role;
      state.profile.sport = sport;
      state.profile.days = days;
      state.profile.level = $("obLevel").value;
      state.profile.focus = $("obFocus").value;
      state.profile.programLevel = $("obProg").value;

      // IMPORTANT: write role to localStorage so boot gate matches
      try { localStorage.setItem("role", role); } catch {}
      try { localStorage.setItem("selectedRole", role); } catch {}

      saveState(state);

      mount.style.display = "none";
      mount.innerHTML = "";

      applyRoleUI();
      syncProfileUI();
      renderMicroGoals();
      updateTrialUI();
      route();
    });
  }

  // --------------------------
  // Init + Bindings
  // --------------------------
  function init() {
    // Ensure trial exists
    if (!state.trial || !state.trial.startedAtMs) {
      state.trial = { startedAtMs: nowMs(), activated: false, licenseKey: "", licenseUntilMs: 0 };
      saveState(state);
    }

    applyRoleUI();
    bindNav();
    syncProfileUI();
    renderMicroGoals();
    updateTrialUI();

    $("wellness")?.addEventListener("input", () => {
      if ($("wellnessNum") && $("wellness")) $("wellnessNum").textContent = $("wellness").value;
    });

    $("sport")?.addEventListener("change", () => {
      onSportChange();
      syncProfileUI();
      renderMicroGoals();
    });

    ["level", "days", "programLevel", "focus", "secondary", "landmine", "position", "skill"].forEach((id) => {
      $(id)?.addEventListener("change", () => {
        readProfileUI();
        renderMicroGoals();
      });
    });

    $("notes")?.addEventListener("change", readProfileUI);
    $("wellness")?.addEventListener("change", readProfileUI);

    $("btnGenerateWeek")?.addEventListener("click", () => {
      if (!gateIfExpired()) return;
      readProfileUI();
      state.week = buildWeek(state.profile);
      state.todayIndex = 0;
      saveState(state);
      location.hash = "#program";
      renderProgram();
      alert("Weekly microcycle generated.");
    });

    $("btnShowToday")?.addEventListener("click", () => {
      if (!gateIfExpired()) return;
      if (!state.week) { alert("Generate a week first."); return; }
      location.hash = "#program";
      renderProgram();
    });

    $("logDay")?.addEventListener("change", renderLog);

    $("btnSaveLog")?.addEventListener("click", () => {
      if (!gateIfExpired()) return;
      saveLog();
      alert("Saved. Open Dashboard for trends.");
    });

    $("btnExportCSV")?.addEventListener("click", exportLogsCSV);

    $("btnSaveTests")?.addEventListener("click", () => {
      if (!gateIfExpired()) return;
      saveTests();
      alert("Saved.");
      renderPerformance();
    });

    $("btnSavePrompts")?.addEventListener("click", () => { savePrompts(); alert("Saved."); });

    $("btnPrintWeek")?.addEventListener("click", printWeek);
    $("btnPrintToday")?.addEventListener("click", printToday);
    $("btnPrintReport")?.addEventListener("click", printReport);
    $("btnPrintParent")?.addEventListener("click", printParent);

    // Team
    $("btnAddAthlete")?.addEventListener("click", () => {
      if (state.role !== "coach" && state.role !== "admin") {
        alert("Switch to Coach role to manage team.");
        return;
      }
      const name = ($("athName")?.value || "").trim();
      if (!name) { alert("Name required."); return; }
      const pos = ($("athPos")?.value || "").trim();
      const grade = ($("athGrade")?.value || "").trim();
      const id = ($("athId")?.value || "").trim() || name;

      state.team.roster = state.team.roster || [];
      state.team.roster.push({ name, pos, grade, id });
      saveState(state);

      if ($("athName")) $("athName").value = "";
      if ($("athPos")) $("athPos").value = "";
      if ($("athGrade")) $("athGrade").value = "";
      if ($("athId")) $("athId").value = "";

      renderRoster();
      renderAttendance();
      renderParentSelectors();
    });

    $("btnSaveAttendance")?.addEventListener("click", () => { saveAttendance(); alert("Attendance saved."); renderParent(); });
    $("attDate")?.addEventListener("change", renderAttendance);

    $("btnSaveBoard")?.addEventListener("click", () => {
      if ($("teamBoard")) state.team.board = $("teamBoard").value || "";
      saveState(state);
      alert("Saved.");
    });

    $("teamName")?.addEventListener("change", () => { state.team.name = $("teamName").value || ""; saveState(state); });

    $("compliance")?.addEventListener("change", () => {
      state.team.compliance = $("compliance").value;
      saveState(state);
      if (state.week) {
        state.week = buildWeek(state.profile);
        saveState(state);
        renderProgram();
      }
    });

    $("btnExportTeam")?.addEventListener("click", exportTeam);
    $("btnImportTeam")?.addEventListener("click", () => $("fileTeam")?.click());
    $("fileTeam")?.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) importTeam(f);
      e.target.value = "";
    });

    $("parentAthlete")?.addEventListener("change", renderParent);

    // Settings
    $("btnActivate")?.addEventListener("click", () => {
      const res = activateKey($("licenseKey")?.value || "");
      alert(res.msg);
      updateTrialUI();
      route();
    });

    $("btnResetData")?.addEventListener("click", () => {
      if (!confirm("Clear ALL saved data on this device?")) return;
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    });

    $("btnExportAll")?.addEventListener("click", exportAll);
    $("btnImportAll")?.addEventListener("click", () => $("fileAll")?.click());
    $("fileAll")?.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) importAll(f);
      e.target.value = "";
    });

    if (!location.hash) location.hash = "#profile";
    route();

    if (onboardingNeeded()) showOnboarding();
  }

  document.addEventListener("DOMContentLoaded", init);

})(); // end core.js IIFE
```0  }

  function validKey(k) {
    const nk = normalizeKey(k);
    if (nk.length !== 12) return false;
    const body = nk.slice(0, 10), chk = nk.slice(10);
    let sum = 0;
    for (const ch of body) sum += ch.charCodeAt(0);
    const expected = String(sum % 97).padStart(2, "0");
    return chk === expected;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveState(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  function defaultState() {
    return {
      role: "athlete",
      trial: { startedAtMs: nowMs(), activated: false, licenseKey: "", licenseUntilMs: 0 },
      profile: {
        sport: "basketball",
        level: "youth",
        days: 4,
        programLevel: "standard",
        focus: "balanced",
        secondary: "none",
        position: "General",
        skill: "Balanced",
        landmine: "on",
        wellness: 7,
        notes: ""
      },
      week: null,
      todayIndex: 0,
      logs: [],
      tests: [],
      prompts: [],
      team: { name: "", compliance: "off", roster: [], attendance: [], board: "" }
    };
  }

  // IMPORTANT: keep state scoped in this IIFE
  const state = loadState() || defaultState();

  // (Optional) expose a tiny API if other files need it
  window.PIQ = window.PIQ || {};
  window.PIQ._getState = () => state;
  window.PIQ._saveState = () => saveState(state);

  // ---- your existing core.js continues below this line ----

const SPORT_DATA={
 basketball:{positions:["General","PG","SG/Wing","SF/PF","C/Big"],skills:["Balanced","Ball-handling","Shooting","Finishing","Defense"],
  micro:{General:["Speed/Quickness","Strength A","Skill+COD","Strength B","Conditioning/Skill"],PG:["Speed+Decel","Strength A","COD+Skill","Strength B","Conditioning/Skill"],"SG/Wing":["Speed+Shooting","Strength A","COD+Finishing","Strength B","Conditioning/Skill"],"SF/PF":["Power+Contact","Strength A","COD+Rebound","Strength B","Conditioning/Skill"],"C/Big":["Power+Rim","Strength A","COD+Post","Strength B","Conditioning/Skill"]},
  addOns:{Balanced:["Skill: ball-handling 10 min","Skill: shooting volume 20–30 min"],"Ball-handling":["Handles: stationary → change-of-pace (10 min)","Handles: pressure combos (8 min)"],Shooting:["Shooting: form + catch&shoot (10 min)","Shooting: movement + game shots (15–20 min)"],Finishing:["Finishing: footwork series (8 min)","Finishing: contact takes + floaters (10–12 min)"],Defense:["Defense: closeouts + slides (10 min)","Defense: hip turns + reaction (8 min)"]}
 },
 football:{positions:["General","QB","RB","WR/TE","OL/DL","LB","DB"],skills:["Balanced","Speed/Starts","Agility/COD","Position skills"],
  micro:{General:["Speed","Strength A","COD","Strength B","Conditioning/Skill"],QB:["Throws+Footwork","Strength A","Accel+COD","Strength B","Conditioning/Skill"],RB:["Accel+Cuts","Strength A","Top-speed","Strength B","Conditioning/Skill"],"WR/TE":["Starts+Route","Strength A","COD+Catch","Strength B","Conditioning/Skill"],"OL/DL":["Power+Hands","Strength A","Short accel","Strength B","Conditioning/Skill"],LB:["COD+Read","Strength A","Speed","Strength B","Conditioning/Skill"],DB:["Backpedal+Break","Strength A","Speed+COD","Strength B","Conditioning/Skill"]},
  addOns:{Balanced:["Skill: starts + accel (10 min)","Skill: position drills (10–15 min)"],"Speed/Starts":["Starts: 6–10 reps (full rest)","Accel: 10–20 yd x 6"],"Agility/COD":["COD: 5-10-5 technique (10 min)","Reactive shuffle (6–8 min)"],"Position skills":["Position drill block (10–15 min)","Catching/footwork/handwork (10 min)"]}
 },
 baseball:{positions:["General","Pitcher","Catcher","IF","OF"],skills:["Balanced","Throwing care","Hitting","Speed/Baserunning"],
  micro:{General:["Speed","Strength A","Skill","Strength B","Conditioning/Skill"],Pitcher:["Arm care+Mobility","Strength A","Speed+Throws","Strength B","Conditioning/Skill"],Catcher:["Hips+Mobility","Strength A","Explosive+Throws","Strength B","Conditioning/Skill"],IF:["First step+Hands","Strength A","Speed+Bat","Strength B","Conditioning/Skill"],OF:["Speed+Routes","Strength A","Power+Bat","Strength B","Conditioning/Skill"]},
  addOns:{Balanced:["Skill: throwing care (8–10 min)","Skill: sprint mechanics (10 min)"],"Throwing care":["Throwing care: band/arm routine (8–10 min)","Scap + cuff circuit (8 min)"],Hitting:["Hitting: tee → front toss (15 min)","Bat speed intent swings (6–8 min)"],"Speed/Baserunning":["Sprint mechanics (8 min)","Baserunning: 1st step + turns (8–10 min)"]}
 },
 volleyball:{positions:["General","Setter","OH/OPP","Middle","Libero/DS"],skills:["Balanced","Approach jump","Serve/Receive","Defense"],
  micro:{General:["Jump","Strength A","Skill","Strength B","Conditioning/Skill"],Setter:["Footwork+Hands","Strength A","Approach jump","Strength B","Conditioning/Skill"],"OH/OPP":["Approach jump","Strength A","Power+Hit","Strength B","Conditioning/Skill"],Middle:["Approach jump","Strength A","Block+Landing","Strength B","Conditioning/Skill"],"Libero/DS":["Defense+Reads","Strength A","Speed+COD","Strength B","Conditioning/Skill"]},
  addOns:{Balanced:["Skill: approach jumps (10 min)","Skill: serve/receive (15–20 min)"],"Approach jump":["Approach jump technique (10 min)","Landing mechanics (6–8 min)"],"Serve/Receive":["Serving reps (10 min)","Receive + platform control (10–12 min)"],Defense:["Defensive reads + footwork (10 min)","Dig reaction series (6–8 min)"]}
 },
 soccer:{positions:["General","GK","CB","FB/WB","CM","Winger","ST"],skills:["Balanced","Acceleration","Agility/COD","Ball mastery","Finishing"],
  micro:{General:["Speed","Strength A","COD","Strength B","Conditioning/Skill"],GK:["Explosive+Footwork","Strength A","Reaction+Jumps","Strength B","Conditioning/Skill"],CB:["Accel+Decel","Strength A","COD+Duels","Strength B","Conditioning/Skill"],"FB/WB":["Speed+Runs","Strength A","COD+Cross","Strength B","Conditioning/Skill"],CM:["COD+Workrate","Strength A","Ball+Accel","Strength B","Conditioning/Skill"],Winger:["Speed+Cuts","Strength A","Finishing","Strength B","Conditioning/Skill"],ST:["Accel+Shots","Strength A","COD+Finish","Strength B","Conditioning/Skill"]},
  addOns:{Balanced:["Skill: ball mastery (10 min)","Skill: small-sided touches (15 min)"],Acceleration:["Accel: 10–20 m x 6 (full rest)","Curved runs (6 reps)"],"Agility/COD":["COD: decel + re-accel (10 min)","Reactive cuts (6–8 min)"],"Ball mastery":["Ball mastery series (10 min)","1v1 moves + exits (8 min)"],Finishing:["Finishing: 1-touch reps (10 min)","Finishing: angles + weak foot (10–12 min)"]}
 }
};

function trialInfo(){
 const t=state.trial||{startedAtMs:nowMs(),activated:false,licenseUntilMs:0};
 if(t.activated && t.licenseUntilMs && nowMs()<t.licenseUntilMs){
  return {status:"licensed",daysLeft:Math.max(0,Math.ceil((t.licenseUntilMs-nowMs())/(1000*60*60*24)))};
 }
 const used=daysBetween(t.startedAtMs, nowMs());
 const left=TRIAL_DAYS-used;
 if(left>=0) return {status:"trial",daysLeft:left};
 return {status:"expired",daysLeft:0};
}
function updateTrialUI(){
 const info=trialInfo(), pill=$("trialPill"), status=$("licenseStatus");
 if(info.status==="licensed"){pill.textContent=`Licensed (${info.daysLeft}d left)`;pill.className="pill ok";status.innerHTML=`Status: <b>Licensed</b><br>Ends: <b>${new Date(state.trial.licenseUntilMs).toISOString().slice(0,10)}</b>`;}
 else if(info.status==="trial"){pill.textContent=`Trial: ${info.daysLeft}d left`;pill.className="pill warn";status.innerHTML=`Status: <b>Trial</b><br>Ends after ${TRIAL_DAYS} days on this device.`;}
 else {pill.textContent="Trial expired";pill.className="pill bad";status.innerHTML=`Status: <b>Expired</b><br>Enter a 12-month license key to continue.`;}
}
function gateIfExpired(){const info=trialInfo();if(info.status!=="expired")return true;location.hash="#settings";alert("Trial expired on this device. Enter a license key in Settings.");return false;}
function activateKey(keyRaw){
 const key=normalizeKey(keyRaw);
 if(!validKey(key)) return {ok:false,msg:"Invalid key format/checksum."};
 state.trial.activated=true; state.trial.licenseKey=key; state.trial.licenseUntilMs=addMonths(new Date(), LICENSE_MONTHS).getTime();
 saveState(state); return {ok:true,msg:"Activated. License applied to this device."};
}

function setActive(tab){
 ["profile","program","log","performance","dashboard","team","parent","settings"].forEach(t=>{
  const b=$("nav-"+t), p=$("tab-"+t);
  if(b) b.classList.toggle("active", t===tab);
  if(p) p.style.display=(t===tab)?"block":"none";
 });
 if(tab==="program") renderProgram();
 if(tab==="log") renderLog();
 if(tab==="performance") renderPerformance();
 if(tab==="dashboard") renderDashboard();
 if(tab==="team") renderTeam();
 if(tab==="parent") renderParent();
 if(tab==="settings") updateTrialUI();
}
function applyRoleUI(){
 $("rolePill").textContent=`Role: ${state.role||"athlete"}`;
 const showTeam=(state.role==="coach"||state.role==="admin");
 $("nav-team").style.display=showTeam?"inline-block":"none";
 const showParent=(state.role==="parent"||state.role==="coach"||state.role==="admin");
 $("nav-parent").style.display=showParent?"inline-block":"none";
}
function route(){
 const h=(location.hash||"#profile").replace("#","");
 const ok=new Set(["profile","program","log","performance","dashboard","team","parent","settings"]);
 let tab=ok.has(h)?h:"profile";
 if(trialInfo().status==="expired" && tab!=="settings") tab="settings";
 setActive(tab);
}
function bindNav(){
 ["profile","program","log","performance","dashboard","team","parent","settings"].forEach(t=>{
  const b=$("nav-"+t); if(!b) return;
  b.addEventListener("click", ()=> location.hash="#"+t);
 });
 window.addEventListener("hashchange", route);
}
function populate(sel, opts, selected){
 sel.innerHTML="";
 opts.forEach(o=>{const opt=document.createElement("option");opt.value=o;opt.textContent=o;if(o===selected)opt.selected=true;sel.appendChild(opt);});
}
function syncProfileUI(){
 $("sport").value=state.profile.sport; $("level").value=state.profile.level;
 $("days").value=String(state.profile.days); $("programLevel").value=state.profile.programLevel;
 $("focus").value=state.profile.focus; $("secondary").value=state.profile.secondary;
 $("landmine").value=state.profile.landmine; $("notes").value=state.profile.notes||"";
 $("wellness").value=String(state.profile.wellness||7); $("wellnessNum").textContent=String(state.profile.wellness||7);
 const sd=SPORT_DATA[state.profile.sport]||SPORT_DATA.basketball;
 populate($("position"), sd.positions, state.profile.position);
 populate($("skill"), sd.skills, state.profile.skill);
}
function readProfileUI(){
 state.profile.sport=$("sport").value; state.profile.level=$("level").value;
 state.profile.days=Number($("days").value); state.profile.programLevel=$("programLevel").value;
 state.profile.focus=$("focus").value; state.profile.secondary=$("secondary").value;
 state.profile.landmine=$("landmine").value; state.profile.position=$("position").value; state.profile.skill=$("skill").value;
 state.profile.wellness=Number($("wellness").value); state.profile.notes=$("notes").value||"";
 saveState(state);
}
function onSportChange(){
 const sd=SPORT_DATA[$("sport").value]||SPORT_DATA.basketball;
 populate($("position"), sd.positions, "General"); populate($("skill"), sd.skills, "Balanced");
 state.profile.position="General"; state.profile.skill="Balanced"; readProfileUI();
}
function estimateMinutes(level){
 const base={warmup:10,speed:12,power:10,strength:30,skill:18,conditioning:8,transitions:5};
 if(level==="easy"){base.strength=22;base.skill=15;base.conditioning=6;}
 if(level==="advanced"){base.strength=38;base.skill=22;base.conditioning=10;}
 const total=Object.values(base).reduce((a,b)=>a+b,0);
 return {total,calc:Object.values(base).join("+")+"="+total};
}
function applyCompliance(items){
 if(state.team?.compliance!=="on") return items;
 return items.map(x=>x.replace(/Squat pattern/g,"Goblet squat / split squat").replace(/RDL/g,"DB RDL / hip hinge"));
}
function strengthBlock(level, landmineOn, strengthBias){
 const more=strengthBias?1:0, out=[];
 if(level==="easy"){out.push(`Squat pattern ${2+more}x6 (RPE ~6–7)`,"DB bench 2x8","RDL 2x8","Row/Pull 2x10");}
 else if(level==="advanced"){out.push(`Squat pattern ${4+more}x5 (RPE ~7–8)`,"DB bench 4x6–8","RDL 4x6–8","Row/Pull 4x8");}
 else {out.push(`Squat pattern ${3+more}x6 (RPE ~7)`,"DB bench 3x8","RDL 3x8","Row/Pull 3x8");}
 if(landmineOn){out.push(level==="advanced"?"Landmine press 3x8 + Landmine row 3x8":(level==="easy"?"Landmine press 2x10 (controlled)":"Landmine press 3x10 OR Landmine row 3x10"));}
 return applyCompliance(out);
}
function speedBlock(focus, level, quickBias){
 const base=(level==="easy")?5:(level==="advanced")?8:6, extra=quickBias?2:0;
 if(focus==="faster") return [`Acceleration 10–20 yd x ${base+2+extra} (full rest)`,"Decel to stick: 6 reps"];
 if(focus==="jump") return [`Acceleration 10–20 yd x ${base+extra} (full rest)`,"Lateral quickness: 6 reps"];
 if(focus==="power") return [`Acceleration 10–20 yd x ${base+extra} (full rest)`,"Resisted march / A-skip 2x10"];
 return [`Acceleration 10–20 yd x ${base+extra} (full rest)`];
}
function powerBlock(focus, level){
 const js=(level==="easy")?"3x3":(level==="advanced")?"5x3":"4x3";
 const ms=(level==="easy")?"3x3":(level==="advanced")?"5x3":"4x3";
 if(focus==="jump") return [`Jumps: box or vertical ${js} (full rest)`,"Pogos 2x12"];
 if(focus==="power") return [`Med-ball throw ${ms}`,`Jumps: broad or box ${js}`];
 return [`Jumps: box or broad ${js}`,`Med-ball throw ${ms}`];
}
function skillBlock(p){
 const sd=SPORT_DATA[p.sport]||SPORT_DATA.basketball;
 const addOn=(sd.addOns[p.skill]||sd.addOns.Balanced||["Skill block 15–20 min"]);
 return (p.secondary==="skill")?addOn.concat(["+ Extra skill volume: 10–15 min"]):addOn;
}
function secondaryText(sec){
 return sec==="conditioning"?"Secondary: Conditioning added."
 :sec==="strength"?"Secondary: Strength bias added."
 :sec==="quickness"?"Secondary: Quickness/COD bias added."
 :sec==="mobility"?"Secondary: Extra mobility/landing added."
 :sec==="skill"?"Secondary: Extra skill volume added."
 :"Secondary: none.";
}
function makeDay(p, dayName, theme){
 const est=estimateMinutes(p.programLevel);
 const landmineOn=p.landmine==="on";
 const strengthBias=p.secondary==="strength";
 const quickBias=p.secondary==="quickness";
 const mobilityBias=p.secondary==="mobility";
 const warm=["5 min easy cardio","Dynamic mobility (hips/ankles/T-spine)","2x10 skips/pogos"];
 if(mobilityBias) warm.push("Extra mobility + landing: 6–8 min");
 const blocks=[
  {label:"Warm-up",items:warm},
  {label:"Speed / Quickness",items:speedBlock(p.focus,p.programLevel,quickBias)},
  {label:"Jump / Power",items:powerBlock(p.focus,p.programLevel)},
  {label:"Strength",items:strengthBlock(p.programLevel,landmineOn,strengthBias)},
  {label:"Skill block",items:skillBlock(p)},
  {label:"Conditioning (optional)",items:(p.secondary==="conditioning")?["Tempo intervals 8–12 min (or bike)","Stop if form breaks"]:[(p.programLevel==="easy"?"Easy tempo 6 min (optional)":"Tempo 6–10 min (optional)")]},
  {label:"Cooldown",items:["Breathing 2 min","Light stretch (hips/calves/hamstrings) 4–6 min"]}
 ];
 const notes=[secondaryText(p.secondary),"Load guidance: avoid grinding reps. Leave 2–3 reps in reserve.","If practice/game day: prioritize speed + skill; reduce strength volume by ~1 set."];
 if((p.notes||"").trim()) notes.unshift("Today note: "+p.notes.trim());
 const lifts=[
  {name:"Squat pattern",sets:(p.programLevel==="advanced")?4:(p.programLevel==="easy")?2:3,reps:(p.programLevel==="advanced")?"5":"6"},
  {name:"DB bench",sets:(p.programLevel==="advanced")?4:(p.programLevel==="easy")?2:3,reps:(p.programLevel==="advanced")?"6":"8"},
  {name:"RDL",sets:(p.programLevel==="advanced")?4:(p.programLevel==="easy")?2:3,reps:(p.programLevel==="advanced")?"6":"8"},
  {name:"Row/Pull",sets:(p.programLevel==="advanced")?4:(p.programLevel==="easy")?2:3,reps:"8"}
 ];
 if(landmineOn) lifts.push({name:"Landmine press/row",sets:(p.programLevel==="easy")?2:3,reps:(p.programLevel==="advanced")?"8":"10"});
 if(state.team?.compliance==="on") lifts.forEach(l=>l.name=l.name.replace(/Squat pattern/g,"Goblet squat / split squat").replace(/RDL/g,"DB RDL / hip hinge"));
 return {dayName,theme,estMin:est.total,estCalc:est.calc,why:`Sport: ${p.sport} • Program: ${p.programLevel} • Primary: ${p.focus} • Secondary: ${p.secondary} • Position: ${p.position} • Skill: ${p.skill} • Landmine: ${landmineOn?"on":"off"} • Wellness: ${p.wellness}/10`,blocks,notes,logLifts:lifts};
}
function buildWeek(p){
 const sd=SPORT_DATA[p.sport]||SPORT_DATA.basketball;
 const key=sd.micro[p.position]?p.position:"General";
 const pattern=sd.micro[key]||sd.micro.General;
 const names=(p.days===3)?["Day 1","Day 2","Day 3"]:(p.days===4)?["Day 1","Day 2","Day 3","Day 4"]:["Day 1","Day 2","Day 3","Day 4","Day 5"];
 const themes=pattern.slice(0,p.days);
 return {meta:{...p},createdISO:new Date().toISOString(),days:names.map((n,i)=>makeDay(p,n,themes[i]||"Training"))};
}
function microGoals(p){
 const g=[]; const d=p.days;
 if(p.focus==="faster") g.push(`Hit ${Math.min(d,3)} sprint/start sessions this week (quality reps, full rest).`);
 if(p.focus==="jump") g.push(`Complete ${Math.min(d,3)} jump/power exposures this week (full rest).`);
 if(p.focus==="power") g.push(`Do ${Math.min(d,2)} med-ball power sessions + ${Math.min(d,3)} jump exposures.`);
 if(p.focus==="balanced") g.push(`Complete ${d} sessions this week and log at least 1 strength day.`);
 if(p.secondary==="mobility") g.push("Add 8–10 minutes mobility + landing on 2 days.");
 if(p.secondary==="conditioning") g.push("Add 8–12 minutes tempo conditioning on 2 days.");
 if(p.secondary==="skill") g.push("Add 10–15 minutes extra skill volume on 2 days.");
 if(p.secondary==="strength") g.push("Progress load slightly on 1 strength movement (no grinding).");
 if(p.secondary==="quickness") g.push("Add 2 extra COD/quickness exposures this week.");
 g.push("Monthly target: improve one metric slightly (e.g., +0.5–1.0 in jump OR -0.03–0.07 sec sprint).");
 return g;
}
function renderMicroGoals(){ $("microGoals").innerHTML=microGoals(state.profile).map(x=>`• ${esc(x)}`).join("<br>"); }

function renderProgram(){
 const out=$("programOutput");
 if(!state.week){out.innerHTML='<div class="small">Generate a weekly microcycle from Profile.</div>';return;}
 const w=state.week;
 const header=`<div class="wcard"><div class="whead"><div class="wtitle">Weekly microcycle</div><div class="badge">${esc(w.meta.sport)} • ${esc(w.meta.programLevel)} • ${w.meta.days} days</div></div>
 <div class="small" style="margin-top:8px">Primary: <b>${esc(w.meta.focus)}</b> • Secondary: <b>${esc(w.meta.secondary)}</b> • Position: <b>${esc(w.meta.position)}</b> • Skill: <b>${esc(w.meta.skill)}</b></div></div>`;
 const daysHtml=w.days.map((d,i)=>{
  const blocks=d.blocks.map(b=>`<div class="wcard"><div class="whead"><div class="wtitle">${esc(b.label)}</div><div class="badge">${esc(d.theme)}</div></div><div class="wlist">${b.items.map(x=>`<div class="witem"><input type="checkbox"><div class="wtext">${esc(x)}</div></div>`).join("")}</div></div>`).join("");
  const notes=`<div class="wcard"><div class="wtitle">Notes</div><div class="small" style="margin-top:8px">${d.notes.map(esc).join("<br>")}</div></div>`;
  return `<div class="wcard" style="border-color: rgba(43,124,255,.25)"><div class="whead"><div class="wtitle">${esc(d.dayName)} — ${esc(d.theme)}</div><div class="badge">Est: ${d.estMin} min • ${esc(d.estCalc)}</div></div>
   <div class="small" style="margin-top:8px">${esc(d.why)}</div><div class="sectionGrid" style="margin-top:12px">${blocks}${notes}</div>
   <div class="btnRow hidePrint"><button class="btn secondary" type="button" onclick="setToday(${i})">Set as today</button></div></div>`;
 }).join("");
 out.innerHTML=header+`<div class="sectionGrid" style="margin-top:12px">${daysHtml}</div>`;
}
window.setToday=(i)=>{state.todayIndex=i;saveState(state);alert("Set. Open Log to enter weights for today.");};

function renderLog(){
 const wrap=$("logContainer");
 const logDaySel=$("logDay"), logDate=$("logDate");
 const todayISO=new Date().toISOString().slice(0,10);
 if(!logDate.value) logDate.value=todayISO;
 if(!state.week){wrap.innerHTML='<div class="small">Generate a weekly microcycle first.</div>';logDaySel.innerHTML="";return;}
 logDaySel.innerHTML="";
 state.week.days.forEach((d,i)=>{const opt=document.createElement("option");opt.value=String(i);opt.textContent=`${d.dayName} — ${d.theme}`;if(i===state.todayIndex)opt.selected=true;logDaySel.appendChild(opt);});
 const idx=Number(logDaySel.value||state.todayIndex||0);
 const day=state.week.days[idx]; if(!day){wrap.innerHTML='<div class="small">No day selected.</div>';return;}
 let rows=""; (day.logLifts||[]).forEach(l=>{for(let s=1;s<=l.sets;s++){rows+=`<tr><td>${esc(l.name)}</td><td>${s}</td><td>${esc(l.reps)}</td><td><input inputmode="decimal" data-lift="${esc(l.name)}" data-set="${s}" data-reps="${esc(l.reps)}" placeholder="lbs"></td><td><input inputmode="decimal" data-rpe="${esc(l.name)}" data-set="${s}" placeholder="RPE (opt)"></td></tr>`;}});
 wrap.innerHTML=`<div class="wcard"><div class="whead"><div class="wtitle">Log template</div><div class="badge">${esc(day.dayName)} • ${esc(day.theme)}</div></div>
 <div class="small" style="margin-top:8px">Volume = sum(weight × reps). Only sets you enter count.</div></div>
 <table class="table" style="margin-top:10px"><thead><tr><th>Lift</th><th>Set</th><th>Reps</th><th>Weight (lbs)</th><th>RPE</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function saveLog(){
 if(!state.week) return;
 const dateISO=$("logDate").value||new Date().toISOString().slice(0,10);
 const dayIndex=Number($("logDay").value||0);
 const day=state.week.days[dayIndex];
 const injury=$("injuryFlag").value||"none";
 const weights=[...document.querySelectorAll('#logContainer input[data-lift]')];
 const rpes=[...document.querySelectorAll('#logContainer input[data-rpe]')];
 const rpeMap=new Map(); rpes.forEach(i=>{const k=i.dataset.rpe+"|"+i.dataset.set;const v=(i.value||"").trim(); if(v) rpeMap.set(k,v);});
 const entries=[];
 weights.forEach(i=>{const w=(i.value||"").trim(); if(!w) return; const n=Number(w); if(!Number.isFinite(n)) return; const k=i.dataset.lift+"|"+i.dataset.set; entries.push({name:i.dataset.lift,set:Number(i.dataset.set),reps:i.dataset.reps,weight:n,rpe:rpeMap.get(k)||""});});
 state.logs=state.logs.filter(x=>!(x.dateISO===dateISO && x.dayIndex===dayIndex));
 state.logs.push({dateISO,dayIndex,theme:day.theme,injury,wellness:state.profile.wellness,entries});
 state.logs.sort((a,b)=>a.dateISO.localeCompare(b.dateISO));
 saveState(state);
}
function quote(s){const str=String(s??""); return /[",\n]/.test(str)?`"${str.replace(/"/g,'""')}"`:str;}
function downloadText(filename,text,mime){
 const blob=new Blob([text],{type:mime||"text/plain"});
 const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename;
 document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
function exportLogsCSV(){
 const header=["date","dayIndex","theme","injury","wellness","lift","set","reps","weight","rpe"];
 const rows=[header.join(",")];
 state.logs.forEach(l=>{(l.entries||[]).forEach(e=>rows.push([l.dateISO,l.dayIndex,quote(l.theme),l.injury,l.wellness,quote(e.name),e.set,quote(e.reps),e.weight,quote(e.rpe||"")].join(",")));});
 downloadText("piq_logs.csv", rows.join("\n"), "text/csv");
}

function drawLine(canvas, pts, unit, invert=false){
 const ctx=canvas.getContext("2d"); ctx.clearRect(0,0,canvas.width,canvas.height);
 const padL=50,padR=20,padT=18,padB=30, w=canvas.width,h=canvas.height, pw=w-padL-padR, ph=h-padT-padB;
 if(!pts.length){ctx.fillStyle="rgba(231,238,248,.75)";ctx.font="14px system-ui";ctx.fillText("No data yet.",padL,padT+30);return;}
 const ys=pts.map(p=>p.y), max=Math.max(...ys), min=Math.min(...ys), spread=(max-min)||1;
 const yMax=max+spread*0.15, yMin=min-spread*0.15;
 ctx.strokeStyle="rgba(231,238,248,.12)";ctx.lineWidth=1;
 for(let i=0;i<=4;i++){const y=padT+ph*i/4;ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(padL+pw,y);ctx.stroke();}
 const n=pts.length; const x=i=>padL+(n===1?pw/2:pw*(i/(n-1)));
 const y=v=>{const norm=(v-yMin)/(yMax-yMin); const yv=invert?norm:(1-norm); return padT+ph*yv;};
 ctx.strokeStyle="rgba(43,124,255,.95)";ctx.lineWidth=3;ctx.beginPath();
 pts.forEach((p,i)=>{const xx=x(i),yy=y(p.y); if(i===0)ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);});ctx.stroke();
 ctx.fillStyle="rgba(255,138,0,.95)";pts.forEach((p,i)=>{const xx=x(i),yy=y(p.y);ctx.beginPath();ctx.arc(xx,yy,5,0,Math.PI*2);ctx.fill();});
 ctx.fillStyle="rgba(231,238,248,.70)";ctx.font="12px system-ui";
 pts.forEach((p,i)=>ctx.fillText(p.x.slice(5),x(i)-18,padT+ph+22));
 ctx.fillText(String(Math.round(yMin*10)/10),6,padT+ph+4);
 ctx.fillText(String(Math.round(yMax*10)/10)+" "+unit,6,padT+12);
}
function renderPerformance(){
 const todayISO=new Date().toISOString().slice(0,10);
 if(!$("testDate").value) $("testDate").value=todayISO;
 const vertPts=state.tests.filter(t=>Number.isFinite(t.vert)).map(t=>({x:t.dateISO,y:t.vert}));
 const sprPts=state.tests.filter(t=>Number.isFinite(t.sprint10)).map(t=>({x:t.dateISO,y:t.sprint10}));
 drawLine($("chartVert"),vertPts,"in",false);
 drawLine($("chartSprint"),sprPts,"sec",true);
}
function saveTests(){
 const dateISO=$("testDate").value||new Date().toISOString().slice(0,10);
 const parse=id=>{const v=($(id).value||"").trim(); if(!v) return null; const n=Number(v); return Number.isFinite(n)?n:null;};
 const entry={dateISO,vert:parse("vert"),sprint10:parse("sprint10"),cod:parse("cod"),bw:parse("bw"),sleep:parse("sleep")};
 state.tests=state.tests.filter(t=>t.dateISO!==dateISO); state.tests.push(entry); state.tests.sort((a,b)=>a.dateISO.localeCompare(b.dateISO)); saveState(state);
}
function computeWeeklyVolumes(){
 const byWeek=new Map();
 state.logs.forEach(day=>{
  const date=new Date(day.dateISO+"T00:00:00");
  const dow=date.getDay(); const mondayOffset=(dow===0)?-6:(1-dow);
  const ws=new Date(date); ws.setDate(date.getDate()+mondayOffset);
  const weekISO=ws.toISOString().slice(0,10);
  let vol=0; (day.entries||[]).forEach(e=>{const reps=Number(String(e.reps).replace(/[^0-9]/g,"")); if(Number.isFinite(reps)&&Number.isFinite(e.weight)) vol+=e.weight*reps;});
  byWeek.set(weekISO,(byWeek.get(weekISO)||0)+vol);
 });
 return [...byWeek.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([weekStartISO,totalVolume])=>({weekStartISO,totalVolume}));
}
function weeklyWindow(weekISO){const start=new Date(weekISO+"T00:00:00"); const end=new Date(start); end.setDate(start.getDate()+7); return {start,end};}
function renderInsights(latestWeekISO){
 const el=$("insights");
 if(!latestWeekISO){el.textContent="Save logs to generate insights.";return;}
 const {start,end}=weeklyWindow(latestWeekISO);
 const inWeek=state.logs.filter(l=>{const d=new Date(l.dateISO+"T00:00:00"); return d>=start && d<end;});
 const wellness=inWeek.map(x=>Number(x.wellness)).filter(Number.isFinite);
 const avg=wellness.length?(wellness.reduce((a,b)=>a+b,0)/wellness.length):null;
 const injuries=inWeek.map(x=>x.injury).filter(x=>x&&x!=="none");
 const injuryCounts=injuries.reduce((m,x)=>{m[x]=(m[x]||0)+1;return m;},{});
 const vols=computeWeeklyVolumes(); const idx=vols.findIndex(v=>v.weekStartISO===latestWeekISO);
 const cur=idx>=0?vols[idx].totalVolume:null, prev=idx>0?vols[idx-1].totalVolume:null;
 const ins=[];
 if(avg!==null){ins.push(`Wellness avg this week: ${avg.toFixed(1)}/10 (${wellness.length} logged days).`); if(avg<=4.5) ins.push("Suggestion: reduce strength volume by ~1 set and keep speed reps high-quality."); else if(avg>=8) ins.push("Suggestion: readiness looks strong; progress loads slightly (no grinding).");}
 else ins.push("No wellness values logged this week yet.");
 if(Object.keys(injuryCounts).length){ins.push(`Injury flags: ${Object.entries(injuryCounts).map(([k,v])=>`${k}:${v}`).join(", ")}.`); ins.push("Suggestion: if pain/injury flagged, prioritize mobility + technique; stop if symptoms worsen.");}
 else ins.push("No injury flags this week.");
 if(cur!==null && prev!==null){const pct=prev===0?null:((cur-prev)/prev*100); ins.push(pct===null?"Volume change vs last week: cannot compute (prev 0).":`Volume change vs last week: ${pct.toFixed(0)}% (calc: (cur-prev)/prev×100).`); if(pct!==null && pct>25) ins.push("Suggestion: volume rose >25%; consider keeping next week flatter.");}
 else ins.push("Need at least two weeks of logs to compute volume change insight.");
 el.innerHTML=ins.map(x=>`• ${esc(x)}`).join("<br>");
}
function renderDashboard(){
 const c=$("volChart"), sum=$("dashSummary"), ws=$("weeklySummary"); const ctx=c.getContext("2d"); ctx.clearRect(0,0,c.width,c.height);
 const data=computeWeeklyVolumes(); const padL=50,padR=20,padT=18,padB=30, w=c.width,h=c.height,pw=w-padL-padR,ph=h-padT-padB;
 if(!data.length){ctx.fillStyle="rgba(231,238,248,.75)";ctx.font="14px system-ui";ctx.fillText("No log data yet. Save a log to see weekly volume.",padL,padT+30); sum.textContent="Weekly volume = sum(weight × reps) across logged sets."; ws.textContent="No weekly data yet."; renderInsights(null); return;}
 const max=Math.max(...data.map(d=>d.totalVolume)); const yMax=max*1.15||1;
 ctx.strokeStyle="rgba(231,238,248,.12)";ctx.lineWidth=1;
 for(let i=0;i<=4;i++){const y=padT+ph*i/4;ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(padL+pw,y);ctx.stroke();}
 const n=data.length, x=i=>padL+(n===1?pw/2:pw*(i/(n-1))), y=v=>padT+ph*(1-(v/yMax));
 ctx.strokeStyle="rgba(43,124,255,.95)";ctx.lineWidth=3;ctx.beginPath(); data.forEach((d,i)=>{const xx=x(i),yy=y(d.totalVolume); if(i===0)ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);}); ctx.stroke();
 ctx.fillStyle="rgba(255,138,0,.95)"; data.forEach((d,i)=>{const xx=x(i),yy=y(d.totalVolume);ctx.beginPath();ctx.arc(xx,yy,5,0,Math.PI*2);ctx.fill();});
 ctx.fillStyle="rgba(231,238,248,.70)";ctx.font="12px system-ui"; data.forEach((d,i)=>ctx.fillText(d.weekStartISO.slice(5),x(i)-18,padT+ph+22));
 ctx.fillText("0",18,padT+ph+4); ctx.fillText(String(Math.round(yMax)),8,padT+12);
 const last=data[data.length-1]; sum.innerHTML=`Weeks tracked: <b>${data.length}</b> • Latest (${last.weekStartISO}): <b>${Math.round(last.totalVolume)}</b> volume<br>Volume calc: sum(weight × reps) for all logged sets.`;
 const {start,end}=weeklyWindow(last.weekStartISO);
 const inWeek=state.logs.filter(l=>{const d=new Date(l.dateISO+"T00:00:00"); return d>=start&&d<end;});
 const sessions=inWeek.length; const themes=[...new Set(inWeek.map(x=>x.theme).filter(Boolean))];
 const focusHitPct=sessions===0?0:Math.min(100,Math.round((sessions/state.profile.days)*100));
 ws.innerHTML=`Sessions completed: <b>${sessions}</b> / ${state.profile.days}<br>Primary: <b>${esc(state.profile.focus)}</b> • Secondary: <b>${esc(state.profile.secondary)}</b><br>Focus hit % (sessions ÷ planned): <b>${focusHitPct}%</b><br>Themes hit: ${themes.length?themes.map(esc).join(", "):"—"}`;
 renderInsights(last.weekStartISO);
}
function savePrompts(){
 const todayISO=new Date().toISOString().slice(0,10);
 const hard=$("promptHard").value||"", improve=$("promptImprove").value||"";
 state.prompts=state.prompts.filter(p=>p.dateISO!==todayISO); state.prompts.push({dateISO:todayISO,hard,improve}); saveState(state);
}
function printToday(){
 if(!state.week){alert("Generate a week first.");return;}
 const day=state.week.days[state.todayIndex||0]; if(!day){alert("No day selected.");return;}
 const out=$("programOutput"), orig=out.innerHTML;
 const blocks=day.blocks.map(b=>`<div class="wcard"><div class="whead"><div class="wtitle">${esc(b.label)}</div><div class="badge">${esc(day.theme)}</div></div><div class="wlist">${b.items.map(x=>`<div class="witem"><input type="checkbox"><div class="wtext">${esc(x)}</div></div>`).join("")}</div></div>`).join("");
 out.innerHTML=`<div class="wcard"><div class="whead"><div class="wtitle">${esc(day.dayName)} — ${esc(day.theme)}</div><div class="badge">Est: ${day.estMin} min • ${esc(day.estCalc)}</div></div><div class="small" style="margin-top:8px">${esc(day.why)}</div></div><div class="sectionGrid" style="margin-top:12px">${blocks}</div>`;
 window.print(); out.innerHTML=orig;
}
const printWeek=()=>window.print(), printParent=()=>window.print(), printReport=()=>window.print();

// Team
function renderRoster(){
 const r=state.team.roster||[];
 if(!r.length){$("rosterTable").innerHTML='<div class="small">No athletes yet.</div>'; return;}
 const rows=r.map((a,i)=>`<tr><td>${esc(a.name)}</td><td>${esc(a.pos||"")}</td><td>${esc(a.grade||"")}</td><td>${esc(a.id||"")}</td><td><button class="btn secondary" type="button" onclick="removeAthlete(${i})">Remove</button></td></tr>`).join("");
 $("rosterTable").innerHTML=`<table class="table"><thead><tr><th>Name</th><th>Pos</th><th>Grade</th><th>ID</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
window.removeAthlete=(i)=>{state.team.roster.splice(i,1); saveState(state); renderRoster(); renderAttendance(); renderParentSelectors();};
function renderAttendance(){
 const r=state.team.roster||[];
 if(!r.length){$("attendanceTable").innerHTML='<div class="small">Add athletes to take attendance.</div>'; return;}
 const dateISO=$("attDate").value||new Date().toISOString().slice(0,10);
 const existing=(state.team.attendance||[]).find(x=>x.dateISO===dateISO);
 const present=new Set((existing?.presentIds)||[]);
 const rows=r.map(a=>`<tr><td>${esc(a.name)}</td><td>${esc(a.pos||"")}</td><td><input type="checkbox" data-att="${esc(a.id||a.name)}" ${present.has(a.id||a.name)?"checked":""}></td></tr>`).join("");
 $("attendanceTable").innerHTML=`<table class="table"><thead><tr><th>Athlete</th><th>Pos</th><th>Present</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function saveAttendance(){
 const dateISO=$("attDate").value||new Date().toISOString().slice(0,10);
 const checks=[...document.querySelectorAll('input[type="checkbox"][data-att]')];
 const presentIds=checks.filter(c=>c.checked).map(c=>c.dataset.att);
 state.team.attendance=(state.team.attendance||[]).filter(x=>x.dateISO!==dateISO);
 state.team.attendance.push({dateISO,presentIds}); state.team.attendance.sort((a,b)=>a.dateISO.localeCompare(b.dateISO)); saveState(state);
}
function attendancePctFor(id){
 const att=state.team.attendance||[]; if(!att.length) return null;
 let total=att.length,present=0; att.forEach(s=>{if((s.presentIds||[]).includes(id)) present++;});
 return {present,total,pct:Math.round((present/total)*100)};
}
function exportTeam(){downloadText("piq_team.json", JSON.stringify({version:"piq-team-v1",team:state.team},null,2),"application/json");}
function importTeam(file){
 const r=new FileReader();
 r.onload=()=>{try{const obj=JSON.parse(r.result); if(!obj.team) throw new Error("Missing team"); state.team=obj.team; saveState(state); alert("Imported team."); renderTeam();}catch(e){alert("Import failed: "+e.message);} };
 r.readAsText(file);
}
function renderTeam(){
 $("teamName").value=state.team.name||""; $("compliance").value=state.team.compliance||"off";
 if(!$("attDate").value) $("attDate").value=new Date().toISOString().slice(0,10);
 $("teamBoard").value=state.team.board||"";
 renderRoster(); renderAttendance(); renderParentSelectors();
}
function renderParentSelectors(){
 const sel=$("parentAthlete"); if(!sel) return;
 const r=state.team.roster||[]; sel.innerHTML="";
 const o0=document.createElement("option"); o0.value=""; o0.textContent=r.length?"Choose athlete…":"No roster yet"; sel.appendChild(o0);
 r.forEach(a=>{const opt=document.createElement("option"); opt.value=a.id||a.name; opt.textContent=`${a.name}${a.pos?(" • "+a.pos):""}`; sel.appendChild(opt);});
}
function renderParent(){
 renderParentSelectors();
 const id=$("parentAthlete").value;
 if(!id){$("parentAttendance").textContent="Select an athlete to view attendance."; $("parentGoals").innerHTML=microGoals(state.profile).map(x=>`• ${esc(x)}`).join("<br>"); return;}
 const att=attendancePctFor(id);
 $("parentAttendance").innerHTML=att?`Attendance: <b>${att.present}</b> / ${att.total} sessions (<b>${att.pct}%</b>).`:"No attendance sessions logged yet.";
 $("parentGoals").innerHTML=microGoals(state.profile).map(x=>`• ${esc(x)}`).join("<br>");
}
function exportAll(){downloadText("piq_all_data.json", JSON.stringify({version:"piq-all-v1",state},null,2),"application/json");}
function importAll(file){
 const r=new FileReader();
 r.onload=()=>{try{const obj=JSON.parse(r.result); if(!obj.state) throw new Error("Missing state"); localStorage.setItem(STORAGE_KEY, JSON.stringify(obj.state)); location.reload();}catch(e){alert("Import failed: "+e.message);} };
 r.readAsText(file);
}

// Onboarding (blocks until required)
function onboardingNeeded(){return !state.role || !state.profile?.sport || !state.profile?.days;}
function showOnboarding(){
 const mount=$("onboard"); mount.style.display="block";
 mount.innerHTML=`<div class="modalBack"><div class="modal"><h3>Welcome to PerformanceIQ</h3>
 <div class="small">Complete required setup to continue.</div><div class="hr"></div>
 <div class="row">
  <div class="field"><label>Role (required)</label><select id="obRole"><option value="athlete">Athlete</option><option value="coach">Coach</option><option value="parent">Parent</option><option value="admin">Administrator</option></select></div>
  <div class="field"><label>Sport (required)</label><select id="obSport"><option value="basketball">Basketball</option><option value="football">Football</option><option value="baseball">Baseball</option><option value="volleyball">Volleyball</option><option value="soccer">Soccer</option></select></div>
  <div class="field"><label>Days/week (required)</label><select id="obDays"><option value="3">3</option><option value="4" selected>4</option><option value="5">5</option></select></div>
 </div>
 <div class="row" style="margin-top:10px">
  <div class="field"><label>Level</label><select id="obLevel"><option value="youth" selected>Youth development</option><option value="hs">High school</option><option value="college">College prep</option></select></div>
  <div class="field"><label>Primary focus</label><select id="obFocus"><option value="balanced" selected>Balanced</option><option value="faster">Get faster</option><option value="jump">Jump higher</option><option value="power">Explosive power</option></select></div>
  <div class="field"><label>Program</label><select id="obProg"><option value="easy">Easy</option><option value="standard" selected>Standard</option><option value="advanced">Advanced</option></select></div>
 </div>
 <div class="btnRow"><button class="btn" id="obSave" type="button">Save & continue</button></div>
 <div class="small" style="margin-top:6px">Required: role, sport, days/week.</div></div></div>`;
 $("obRole").value=state.role||"athlete"; $("obSport").value=state.profile.sport||"basketball"; $("obDays").value=String(state.profile.days||4);
 $("obLevel").value=state.profile.level||"youth"; $("obFocus").value=state.profile.focus||"balanced"; $("obProg").value=state.profile.programLevel||"standard";
 $("obSave").addEventListener("click", ()=>{
  const role=$("obRole").value, sport=$("obSport").value, days=Number($("obDays").value);
  if(!role||!sport||!days){alert("Please complete required fields.");return;}
  state.role=role; state.profile.sport=sport; state.profile.days=days;
  state.profile.level=$("obLevel").value; state.profile.focus=$("obFocus").value; state.profile.programLevel=$("obProg").value;
  saveState(state); mount.style.display="none"; mount.innerHTML="";
  applyRoleUI(); syncProfileUI(); renderMicroGoals(); updateTrialUI(); route();
 });
}

function init(){
 if(!state.trial || !state.trial.startedAtMs){state.trial={startedAtMs:nowMs(),activated:false,licenseKey:"",licenseUntilMs:0}; saveState(state);}
 applyRoleUI(); bindNav(); syncProfileUI(); renderMicroGoals(); updateTrialUI();
 $("wellness").addEventListener("input", ()=> $("wellnessNum").textContent=$("wellness").value);
 $("sport").addEventListener("change", ()=>{onSportChange(); syncProfileUI(); renderMicroGoals();});
 ["level","days","programLevel","focus","secondary","landmine","position","skill"].forEach(id=>$(id).addEventListener("change", ()=>{readProfileUI(); renderMicroGoals();}));
 $("notes").addEventListener("change", readProfileUI); $("wellness").addEventListener("change", readProfileUI);

 $("btnGenerateWeek").addEventListener("click", ()=>{if(!gateIfExpired())return; readProfileUI(); state.week=buildWeek(state.profile); state.todayIndex=0; saveState(state); location.hash="#program"; renderProgram(); alert("Weekly microcycle generated.");});
 $("btnShowToday").addEventListener("click", ()=>{if(!gateIfExpired())return; if(!state.week){alert("Generate a week first.");return;} location.hash="#program"; renderProgram();});

 $("logDay").addEventListener("change", renderLog);
 $("btnSaveLog").addEventListener("click", ()=>{if(!gateIfExpired())return; saveLog(); alert("Saved. Open Dashboard for trends.");});
 $("btnExportCSV").addEventListener("click", exportLogsCSV);

 $("btnSaveTests").addEventListener("click", ()=>{if(!gateIfExpired())return; saveTests(); alert("Saved."); renderPerformance();});

 $("btnSavePrompts").addEventListener("click", ()=>{savePrompts(); alert("Saved.");});

 $("btnPrintWeek").addEventListener("click", printWeek);
 $("btnPrintToday").addEventListener("click", printToday);
 $("btnPrintReport").addEventListener("click", printReport);
 $("btnPrintParent").addEventListener("click", printParent);

 // Team events
 $("btnAddAthlete").addEventListener("click", ()=>{
  if(state.role!=="coach"&&state.role!=="admin"){alert("Switch to Coach role to manage team.");return;}
  const name=$("athName").value.trim(); if(!name){alert("Name required.");return;}
  const pos=$("athPos").value.trim(), grade=($("athGrade").value||"").trim(), id=$("athId").value.trim()||name;
  state.team.roster=state.team.roster||[]; state.team.roster.push({name,pos,grade,id}); saveState(state);
  $("athName").value="";$("athPos").value="";$("athGrade").value="";$("athId").value="";
  renderRoster(); renderAttendance(); renderParentSelectors();
 });
 $("btnSaveAttendance").addEventListener("click", ()=>{saveAttendance(); alert("Attendance saved."); renderParent();});
 $("attDate").addEventListener("change", renderAttendance);
 $("btnSaveBoard").addEventListener("click", ()=>{state.team.board=$("teamBoard").value||""; saveState(state); alert("Saved.");});
 $("teamName").addEventListener("change", ()=>{state.team.name=$("teamName").value||""; saveState(state);});
 $("compliance").addEventListener("change", ()=>{state.team.compliance=$("compliance").value; saveState(state); if(state.week){state.week=buildWeek(state.profile); saveState(state); renderProgram();}});
 $("btnExportTeam").addEventListener("click", exportTeam);
 $("btnImportTeam").addEventListener("click", ()=> $("fileTeam").click());
 $("fileTeam").addEventListener("change", (e)=>{const f=e.target.files?.[0]; if(f) importTeam(f); e.target.value="";});

 $("parentAthlete").addEventListener("change", renderParent);

 // Settings
 $("btnActivate").addEventListener("click", ()=>{const res=activateKey($("licenseKey").value||""); alert(res.msg); updateTrialUI(); route();});
 $("btnResetData").addEventListener("click", ()=>{if(!confirm("Clear ALL saved data on this device?")) return; localStorage.removeItem(STORAGE_KEY); location.reload();});
 $("btnExportAll").addEventListener("click", exportAll);
 $("btnImportAll").addEventListener("click", ()=> $("fileAll").click());
 $("fileAll").addEventListener("change", (e)=>{const f=e.target.files?.[0]; if(f) importAll(f); e.target.value="";});

 if(!location.hash) location.hash="#profile";
 route();
 if(onboardingNeeded()) showOnboarding();
}
  // expose starter for boot.js
  window.startApp = function () {
    init();
  };

})();
