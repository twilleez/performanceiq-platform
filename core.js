// core.js — v2.2.0 (Train engine: session types + warmups + injury filters + substitutions + sRPE logs + periodization)
(function () {
  "use strict";
  if (window.__PIQ_CORE__) return;
  window.__PIQ_CORE__ = true;

  const $ = (id) => document.getElementById(id);

  // ---------- State ----------
  let state = window.dataStore?.load ? window.dataStore.load() : {};
  state.profile = state.profile || {};
  state.team = state.team || { teams: [], active_team_id: null };
  state.ui = state.ui || { view: "home" };
  state.sessions = Array.isArray(state.sessions) ? state.sessions : [];

  // ---------- Local meta for UX ----------
  const metaKey = "piq_meta_v2";
  function loadMeta() { try { return JSON.parse(localStorage.getItem(metaKey) || "null") || {}; } catch { return {}; } }
  function saveMeta(m) { localStorage.setItem(metaKey, JSON.stringify(m || {})); }
  let meta = loadMeta();
  meta.lastLocalSaveAt = meta.lastLocalSaveAt || null;
  meta.lastCloudSyncAt = meta.lastCloudSyncAt || null;
  meta.syncState = meta.syncState || "off";
  saveMeta(meta);

  // ---------- Cloud config ----------
  const cloudKey = "piq_cloud_v2";
  function loadCloudCfg() { try { return JSON.parse(localStorage.getItem(cloudKey) || "null"); } catch { return null; } }
  function saveCloudCfg(cfg) { localStorage.setItem(cloudKey, JSON.stringify(cfg)); }

  function isMobile() { return window.matchMedia && window.matchMedia("(max-width: 860px)").matches; }

  // ---------- Splash fix ----------
  function hideSplash() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    // keep DOM but hidden; avoids flashes
    setTimeout(() => { s.setAttribute("aria-hidden", "true"); }, 250);
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function toast(msg, ms = 2200) {
    const t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  // ---------- Data status pill ----------
  function setDataStatus(kind, detail) {
    const dot = $("saveDot");
    const txt = $("saveText");
    if (!dot || !txt) return;

    const map = {
      local: { label: "Local saved", color: "var(--ok)" },
      saving: { label: "Saving…", color: "var(--warn)" },
      syncing: { label: "Syncing…", color: "var(--brand)" },
      synced: { label: "Synced", color: "var(--ok)" },
      off: { label: "Sync off", color: "rgba(255,255,255,.35)" },
      error: { label: "Sync error", color: "var(--danger)" }
    };

    const v = map[kind] || map.local;
    dot.style.background = v.color;
    txt.textContent = detail ? `${v.label} • ${detail}` : v.label;

    meta.syncState = kind;
    saveMeta(meta);
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const t = new Date(iso).getTime();
    if (!isFinite(t)) return "";
    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 10) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  // ---------- Navigation ----------
  const views = ["home", "team", "train", "profile"];

  function setActiveNav(view) {
    document.querySelectorAll(".navbtn").forEach(btn => {
      const on = btn.dataset.view === view;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-current", on ? "page" : "false");
    });
    document.querySelectorAll(".bottomnav .tab").forEach(btn => {
      const on = btn.dataset.view === view;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-current", on ? "page" : "false");
    });
  }

  function showView(view) {
    if (!views.includes(view)) view = "home";
    views.forEach(v => {
      const el = document.querySelector(`#view-${v}`);
      if (el) el.hidden = (v !== view);
    });
    state.ui.view = view;
    persist(null, { silentToast: true });
    setActiveNav(view);
    render(view);
    autoTourFor(view);
  }

  // ---------- Drawer ----------
  function openDrawer() {
    const backdrop = $("drawerBackdrop");
    const drawer = $("accountDrawer");
    if (!backdrop || !drawer) return;
    backdrop.hidden = false;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    const backdrop = $("drawerBackdrop");
    const drawer = $("accountDrawer");
    if (!backdrop || !drawer) return;
    backdrop.hidden = true;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  // ---------- Supabase ----------
  let sb = null;
  function validSupabaseUrl(u) {
    return typeof u === "string" && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(u.trim());
  }
  function initSupabaseIfPossible() {
    const cfg = loadCloudCfg();
    if (!cfg || !cfg.url || !cfg.anon) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    if (!validSupabaseUrl(cfg.url)) return null;
    try {
      return window.supabase.createClient(cfg.url.trim(), cfg.anon.trim(), {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    } catch {
      return null;
    }
  }
  async function refreshCloudPill() {
    const pill = $("cloudPill");
    if (!pill) return;
    if (!sb) { pill.textContent = "Cloud: Local"; return; }
    try {
      const { data } = await sb.auth.getSession();
      pill.textContent = data?.session ? "Cloud: Signed in" : "Cloud: Ready";
    } catch {
      pill.textContent = "Cloud: Ready";
    }
  }

  // ---------- Team pill ----------
  function setTeamPill() {
    const pill = $("teamPill");
    if (!pill) return;
    const teamName = (state.team?.teams || []).find(t => t.id === state.team?.active_team_id)?.name;
    pill.textContent = `Team: ${teamName || "—"}`;
  }

  // ---------- Persistence ----------
  function persist(msg, opts = {}) {
    setDataStatus("saving");
    try {
      window.dataStore?.save?.(state);
      meta.lastLocalSaveAt = new Date().toISOString();
      saveMeta(meta);
      setDataStatus(sb ? (meta.syncState === "synced" ? "synced" : "local") : "local", timeAgo(meta.lastLocalSaveAt));
    } catch {
      setDataStatus("error");
    }
    if (msg && !opts.silentToast) toast(msg);
  }

  function applyStatusFromMeta() {
    const cfg = loadCloudCfg();
    if (!cfg || !cfg.url || !cfg.anon) { setDataStatus("off"); return; }
    if (!sb) { setDataStatus("error"); return; }
    if (meta.syncState === "synced" && meta.lastCloudSyncAt) setDataStatus("synced", timeAgo(meta.lastCloudSyncAt));
    else if (meta.syncState === "syncing") setDataStatus("syncing");
    else setDataStatus("local", timeAgo(meta.lastLocalSaveAt));
  }

  // ---------- TRAIN ENGINE ----------
  function safeNum(x, d = 0) { const n = Number(x); return Number.isFinite(n) ? n : d; }

  function computeWeekIndex() {
    // Simple: week based on time since first session or since today-90d fallback
    // (later: tie to season start / plan start)
    const earliest = state.sessions.length
      ? Math.min(...state.sessions.map(s => new Date(s.date || Date.now()).getTime()).filter(t => isFinite(t)))
      : Date.now() - (7 * 24 * 3600 * 1000);
    const diffDays = Math.floor((Date.now() - earliest) / (24 * 3600 * 1000));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  }

  function phaseInfo() {
    const w = computeWeekIndex();
    const pe = window.periodizationEngine;
    const phase = pe?.getCurrentPhase ? pe.getCurrentPhase(w) : "ACCUMULATION";
    const hint = pe?.phaseHint ? pe.phaseHint(phase) : "";
    return { week: w, phase, hint };
  }

  function baseWarmupBlocks({ sport, sessionType, injuries }) {
    const has = (k) => injuries.includes(k);

    // universal, then sport/session adjustments
    const universal = [
      "Breathing reset: 4 slow breaths (1 min)",
      "Tissue temp: brisk walk / light bike (2–3 min)",
      "Mobility: ankles + hips + T-spine (3–4 min)",
      "Activation: glutes + core brace (2–3 min)"
    ];

    const landing = has("knee") || has("ankle")
      ? ["Landing mechanics: snap-down to stick (2×5)", "Low pogo contacts (2×15)"]
      : ["Pogo hops (2×20)", "Snap-down to stick (2×5)"];

    const shoulder = has("shoulder")
      ? ["Scap + cuff: band external rotation (2×12)", "Serratus wall slide (2×8)"]
      : ["Scap + cuff: band pull-aparts (2×15)", "External rotation (2×12)"];

    const sessionMap = {
      strength: [
        "Movement prep: squat + hinge + lunge patterns (2 rounds)",
        "Ramp sets: 2 light sets for first lift"
      ],
      speed: [
        "Sprint drills: A-skip / wall march (2–3 min)",
        "Build-ups: 2×20yd at 60–80%"
      ],
      conditioning: [
        "Rhythm: tempo run / jump rope (3 min)",
        "COD rehearsal: 2×20s easy shuffle + backpedal"
      ],
      skill: [
        "Neural: quick feet line hops (2×20s)",
        "Ball/implement: easy touches (2–3 min)"
      ],
      recovery: [
        "Zone 2: bike/walk (8–12 min)",
        "Mobility flow: hips/ankles/T-spine (6–8 min)",
        "Breath: nasal 4–6 breaths/min (2–3 min)"
      ]
    };

    const sportExtras = {
      basketball: ["Footwork: closeout slides (2×15s)", ...landing],
      football: ["Accel prep: falling starts (3×10yd)", ...landing],
      soccer: ["Groin/adductors: lateral lunge rocks (2×8/side)", ...landing],
      baseball: ["Throwing prep: arm circle series (2 min)", ...shoulder],
      volleyball: ["Jump prep: approach mechanics (3×3)", ...landing],
      track: ["Drills: wicket-style rhythm (2–3 min)", ...landing]
    };

    const a = [];
    a.push(...universal);
    a.push(...(sportExtras[sport] || sportExtras.basketball));
    a.push(...(sessionMap[sessionType] || sessionMap.strength));
    return a;
  }

  function exerciseLibrary() {
    // Each exercise can be filtered by injury “avoid” tags and provides substitutions.
    // This is intentionally practical + coach-friendly.
    return {
      lower: [
        {
          name: "Rear-Foot Elevated Split Squat",
          sets: "3–4", reps: "6–10/side", notes: "Front shin vertical, slow eccentric.",
          avoid: ["knee"],
          subs: ["Step-up (box)", "Goblet split squat", "Leg press (controlled)"]
        },
        {
          name: "Trap Bar Deadlift",
          sets: "3–5", reps: "3–6", notes: "Neutral spine, powerful drive.",
          avoid: ["back"],
          subs: ["RDL (dumbbells)", "Hip thrust", "Kettlebell deadlift"]
        },
        {
          name: "RDL (DB/BB)",
          sets: "3–4", reps: "6–10", notes: "Hinge, hamstrings loaded, lats tight.",
          avoid: ["back"],
          subs: ["Hip thrust", "Hamstring curl", "Single-leg RDL (light)"]
        },
        {
          name: "Nordic Hamstring (Regression)",
          sets: "2–3", reps: "4–8", notes: "Control down; assist up.",
          avoid: [],
          subs: ["Swiss ball curl", "Machine ham curl", "Eccentric slider curls"]
        }
      ],
      upper: [
        {
          name: "DB Bench Press (Neutral Grip)",
          sets: "3–4", reps: "6–10", notes: "Scap set, full control.",
          avoid: ["shoulder"],
          subs: ["Push-up (elevated)", "Landmine press", "Cable press"]
        },
        {
          name: "Chin-up / Assisted Chin-up",
          sets: "3–4", reps: "4–10", notes: "Full hang; ribs down.",
          avoid: ["shoulder"],
          subs: ["Lat pulldown", "Ring rows", "Chest-supported row"]
        },
        {
          name: "Half-Kneeling Landmine Press",
          sets: "3–4", reps: "6–10/side", notes: "Great shoulder-friendly press.",
          avoid: [],
          subs: ["Incline DB press", "Push-up", "Cable press (half kneel)"]
        },
        {
          name: "Chest-Supported Row",
          sets: "3–4", reps: "8–12", notes: "No low-back fatigue.",
          avoid: [],
          subs: ["Cable row", "1-arm DB row (bench supported)", "Seal row"]
        }
      ],
      power: [
        {
          name: "Medball Throw (Sport Pattern)",
          sets: "4–6", reps: "3–5", notes: "Max intent, full rest.",
          avoid: ["shoulder"],
          subs: ["Scoop toss (lighter)", "Chest pass", "Rotational throw (light)"]
        },
        {
          name: "Broad Jump / Approach Jump (sport)",
          sets: "3–5", reps: "2–4", notes: "Stick landings; quality > quantity.",
          avoid: ["knee", "ankle"],
          subs: ["Box jump (low)", "Snap-down + stick", "Trap bar jump (light)"]
        }
      ],
      speed: [
        {
          name: "10–20yd Accelerations",
          sets: "4–8", reps: "1", notes: "Full recovery; perfect reps.",
          avoid: ["ankle"],
          subs: ["Sled march (light)", "Wall drills", "Bike sprint (short)"]
        },
        {
          name: "Change of Direction (5-10-5 or sport)",
          sets: "4–6", reps: "1", notes: "Decel mechanics first.",
          avoid: ["knee", "ankle"],
          subs: ["Low-intensity COD", "Decel drops", "Lateral shuffle intervals"]
        }
      ],
      conditioning: [
        {
          name: "Tempo Intervals",
          sets: "8–12", reps: "30–60s", notes: "Keep heart rate controlled.",
          avoid: [],
          subs: ["Bike tempo", "Row tempo", "Pool intervals"]
        },
        {
          name: "Repeated Sprint Ability",
          sets: "2–4", reps: "6–10 reps", notes: "Short rest, quality work.",
          avoid: ["ankle", "knee"],
          subs: ["Bike sprints", "Shuttle walk/jog", "Skill-based conditioning"]
        }
      ]
    };
  }

  function buildSessionTemplate({ sport, sessionType, level, injuries, substitutionsOn }) {
    const lib = exerciseLibrary();
    const avoid = (ex) => (ex.avoid || []).some(tag => injuries.includes(tag));

    // Level modifiers
    const isAdv = level === "advanced";
    const strengthSets = isAdv ? "4–5" : "3–4";
    const accessory = isAdv ? "2–3 accessories" : "1–2 accessories";

    const pick = (arr) => arr.filter(x => !avoid(x));

    const blocks = [];

    // Strength day
    if (sessionType === "strength") {
      const lower = pick(lib.lower);
      const upper = pick(lib.upper);
      const power = pick(lib.power);

      blocks.push({ title: "Power (fresh)", items: power.slice(0, 1) });
      blocks.push({ title: "Main Lower", items: lower.slice(0, 2).map(x => Object.assign({}, x, { sets: strengthSets })) });
      blocks.push({ title: "Main Upper", items: upper.slice(0, 2).map(x => Object.assign({}, x, { sets: strengthSets })) });
      blocks.push({
        title: "Accessory / Prehab",
        note: accessory,
        items: [
          { name: "Core: dead bug / pallof press", sets: "2–3", reps: "8–12", notes: "Brace + breathe.", avoid: [], subs: ["Side plank", "Carries"] },
          { name: "Calf / tib: raises", sets: "2–3", reps: "12–20", notes: "Ankle stiffness.", avoid: [], subs: ["Jump rope (easy)", "Isometrics"] }
        ]
      });
    }

    // Speed day
    if (sessionType === "speed") {
      const speed = pick(lib.speed);
      blocks.push({ title: "Speed", items: speed.slice(0, 2) });
      blocks.push({
        title: "Strength (support)",
        items: pick(lib.lower).slice(0, 1).concat(pick(lib.upper).slice(0, 1)).map(x => Object.assign({}, x, { sets: isAdv ? "3–4" : "2–3", reps: isAdv ? "5–8" : "6–10" }))
      });
      blocks.push({ title: "Cooldown", items: [{ name: "Breathing + hips/ankles", sets: "—", reps: "5–8 min", notes: "Downshift.", avoid: [], subs: [] }] });
    }

    // Conditioning day
    if (sessionType === "conditioning") {
      const cond = pick(lib.conditioning);
      blocks.push({ title: "Conditioning", items: cond.slice(0, 2) });
      blocks.push({
        title: "Tendon / Core",
        items: [
          { name: "Isometric split squat hold", sets: "2–3", reps: "30–45s/side", notes: "Tendon-friendly.", avoid: ["knee"], subs: ["Wall sit", "Spanish squat (if OK)"] },
          { name: "Side plank + carries", sets: "2–3", reps: "30–45s", notes: "Anti-rotation.", avoid: [], subs: ["Pallof press", "Dead bug"] }
        ].filter(x => !avoid(x))
      });
    }

    // Skill day (template)
    if (sessionType === "skill") {
      blocks.push({
        title: "Skill / Technique (sport)",
        items: [
          { name: `${sport} skill block`, sets: "—", reps: "30–45 min", notes: "Keep quality high. Finish with 5–10 min of free play.", avoid: [], subs: [] }
        ]
      });
      blocks.push({
        title: "Strength Micro-dose",
        items: pick(lib.upper).slice(0, 1).concat(pick(lib.lower).slice(0, 1)).map(x => Object.assign({}, x, { sets: "2–3", reps: "6–10" }))
      });
    }

    // Recovery day
    if (sessionType === "recovery") {
      blocks.push({
        title: "Recovery Session",
        items: [
          { name: "Zone 2 (bike/walk)", sets: "—", reps: "20–30 min", notes: "Easy conversation pace.", avoid: [], subs: ["Pool", "Row (easy)"] },
          { name: "Mobility flow", sets: "—", reps: "10–15 min", notes: "Hips/ankles/T-spine + breathing.", avoid: [], subs: [] },
          { name: "Optional: light band work", sets: "2", reps: "12–15", notes: "Shoulders/hips.", avoid: [], subs: [] }
        ]
      });
    }

    // substitutions text helper
    function exRow(ex) {
      const subs = substitutionsOn && ex.subs && ex.subs.length ? `<div class="small muted">Subs: ${ex.subs.join(" • ")}</div>` : "";
      const meta = `<div class="small muted">${ex.sets || "—"} sets • ${ex.reps || "—"} reps</div>`;
      const notes = ex.notes ? `<div class="small muted">${ex.notes}</div>` : "";
      return `<li style="margin:10px 0">
        <div style="font-weight:900">${ex.name}</div>
        ${meta}
        ${notes}
        ${subs}
      </li>`;
    }

    return { blocks, exRow };
  }

  function defaultIntensityTargets(sessionType, level, phase) {
    // produce sRPE target + minutes range used for quick logging
    const adv = level === "advanced";
    const base = {
      strength: { min: 55, max: 75, rpe: adv ? 7 : 6 },
      speed: { min: 45, max: 65, rpe: adv ? 7 : 6 },
      conditioning: { min: 35, max: 55, rpe: adv ? 7 : 6 },
      skill: { min: 45, max: 75, rpe: adv ? 6 : 5 },
      recovery: { min: 25, max: 45, rpe: 3 }
    }[sessionType] || { min: 45, max: 65, rpe: 6 };

    // phase adjustments
    if (phase === "DELOAD") return { ...base, rpe: Math.max(3, base.rpe - 2), max: Math.round(base.max * 0.75) };
    if (phase === "PEAK") return { ...base, rpe: Math.max(4, base.rpe - 1), max: Math.round(base.max * 0.85) };
    if (phase === "INTENSIFICATION") return { ...base, rpe: Math.min(8, base.rpe + 1), max: Math.round(base.max * 0.9) };
    return base;
  }

  function addSessionLog({ dateISO, sport, sessionType, level, minutes, srpe, injuries }) {
    const id = `s_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    const mins = Math.max(0, Math.round(safeNum(minutes, 0)));
    const r = Math.max(0, Math.min(10, safeNum(srpe, 0)));
    const load = Math.round(mins * r);

    state.sessions.unshift({
      id,
      date: dateISO,
      sport,
      sessionType,
      level,
      minutes: mins,
      srpe: r,
      load,
      injuries: injuries || []
    });

    // keep list trimmed for speed
    if (state.sessions.length > 400) state.sessions = state.sessions.slice(0, 400);

    persist("Session saved");
  }

  function deleteSession(id) {
    if (!id) return;
    if (!confirm("Delete this session? This cannot be undone.")) return;
    state.sessions = state.sessions.filter(s => s.id !== id);
    persist("Session deleted");
    render("train");
  }

  function renderSessionHistory(container) {
    const list = state.sessions.slice(0, 12);
    if (!list.length) {
      container.innerHTML = `<div class="mini"><div class="minihead">Recent sessions</div><div class="minibody">No sessions logged yet.</div></div>`;
      return;
    }

    container.innerHTML = `
      <div class="mini">
        <div class="minihead">Recent sessions</div>
        <div class="minibody">
          ${list.map(s => `
            <div class="row between" style="padding:10px 0; border-top: 1px solid var(--line)">
              <div>
                <div style="font-weight:900">${(s.sport || "sport").toUpperCase()} • ${s.sessionType} • ${s.level}</div>
                <div class="small muted">${(s.date || "").slice(0,10)} • ${s.minutes} min • sRPE ${s.srpe} • Load ${s.load}</div>
              </div>
              <button class="btn danger" data-del="${s.id}" title="Delete">Delete</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    container.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => deleteSession(btn.getAttribute("data-del")));
    });
  }

  // ---------- Rendering ----------
  function renderHome() {
    const role = state.profile?.role || "coach";
    const sport = state.profile?.sport || "basketball";

    const subMap = {
      coach: `Coach view • Sport: ${sport}`,
      athlete: `Athlete view • Sport: ${sport}`,
      parent: `Parent view • Sport: ${sport}`
    };
    const homeSub = $("homeSub");
    if (homeSub) homeSub.textContent = subMap[role] || subMap.coach;

    const targets = window.nutritionEngine?.macroTargets
      ? window.nutritionEngine.macroTargets({
          weight_lbs: state.profile?.weight_lbs || 160,
          goal: state.profile?.goal || "maintain",
          activity: state.profile?.activity || "med"
        })
      : { calories: "—", protein_g: "—", carbs_g: "—", fat_g: "—" };

    const today = $("todayBlock");
    if (today) {
      const pi = phaseInfo();
      today.innerHTML = `
        <div class="small muted">Today snapshot</div>
        <div style="margin-top:8px" class="mono small">
          Phase: ${pi.phase} (Week ${pi.week})<br/>
          ${pi.hint ? `<span class="muted">${pi.hint}</span><br/>` : ""}
          <br/>
          Nutrition targets (auto):<br/>
          Calories: ${targets.calories}<br/>
          Protein: ${targets.protein_g}g • Carbs: ${targets.carbs_g}g • Fat: ${targets.fat_g}g
        </div>
      `;
    }
  }

  function renderTeam() {
    const teams = state.team?.teams || [];
    const body = $("teamBody");
    if (!body) return;

    if (!teams.length) {
      body.innerHTML = `
        <div class="mini">
          <div class="minihead">No teams yet</div>
          <div class="minibody">You can test locally. For shared teams + invites, enable Cloud in Account.</div>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div class="mini">
        <div class="minihead">Teams</div>
        <div class="minibody">
          ${teams.map(t => `
            <div class="row between" style="padding:8px 0; border-top: 1px solid var(--line)">
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
        persist("Team updated");
        setTeamPill();
        toast("Active team updated");
      });
    });
  }

  function renderTrain() {
    const sport = state.profile?.sport || "basketball";
    const role = state.profile?.role || "coach";
    const pi = phaseInfo();

    const trainSub = $("trainSub");
    if (trainSub) {
      const subMap = {
        coach: "Coach view: build today’s session template (then log sRPE load).",
        athlete: "Athlete view: today’s plan + quick logging.",
        parent: "Parent view: see today’s plan + what it means."
      };
      trainSub.textContent = subMap[role] || subMap.coach;
    }

    const body = $("trainBody");
    if (!body) return;

    const uiKey = "piq_train_ui_v1";
    const ui = (() => { try { return JSON.parse(localStorage.getItem(uiKey) || "null") || {}; } catch { return {}; } })();
    ui.sessionType = ui.sessionType || "strength";
    ui.level = ui.level || "standard";
    ui.subs = (typeof ui.subs === "boolean") ? ui.subs : true;
    ui.injuries = Array.isArray(ui.injuries) ? ui.injuries : [];

    function saveUI() { localStorage.setItem(uiKey, JSON.stringify(ui)); }

    const warmup = baseWarmupBlocks({ sport, sessionType: ui.sessionType, injuries: ui.injuries });
    const built = buildSessionTemplate({
      sport,
      sessionType: ui.sessionType,
      level: ui.level,
      injuries: ui.injuries,
      substitutionsOn: ui.subs
    });

    const intensity = defaultIntensityTargets(ui.sessionType, ui.level, pi.phase);

    body.innerHTML = `
      <div class="grid2">
        <div class="mini">
          <div class="minihead">Build today’s session</div>

          <div class="field" style="margin-top:10px">
            <label>Session type</label>
            <select id="piqSessionType">
              <option value="strength">Strength</option>
              <option value="speed">Speed</option>
              <option value="conditioning">Conditioning</option>
              <option value="skill">Skill</option>
              <option value="recovery">Recovery</option>
            </select>
          </div>

          <div class="field" style="margin-top:10px">
            <label>Level</label>
            <select id="piqLevel">
              <option value="standard">Standard</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div class="hintline">
            <span>Phase:</span>
            <b>${pi.phase}</b>
            <span class="muted">• Week ${pi.week}</span>
          </div>

          <div class="field" style="margin-top:10px">
            <label>Injury / sensitivity filters</label>
            <div class="chips" id="piqInjuryChips">
              ${[
                ["knee","Knee"],["ankle","Ankle"],["shoulder","Shoulder"],["back","Back"]
              ].map(([k, label]) => `
                <label class="chip">
                  <input type="checkbox" data-inj="${k}" ${ui.injuries.includes(k) ? "checked" : ""} />
                  <span>${label}</span>
                  <span class="hint">filter</span>
                </label>
              `).join("")}
            </div>
          </div>

          <div class="row between" style="margin-top:12px">
            <div class="small muted">Show substitutions</div>
            <label class="chip" style="margin:0">
              <input type="checkbox" id="piqSubs" ${ui.subs ? "checked" : ""} />
              <span>${ui.subs ? "On" : "Off"}</span>
            </label>
          </div>

          <div class="hr"></div>

          <div class="minihead" style="margin-bottom:6px">Quick log (sRPE load)</div>
          <div class="grid2">
            <div class="field">
              <label>Minutes</label>
              <input id="piqMinutes" type="number" min="0" max="240" value="${intensity.max}" />
            </div>
            <div class="field">
              <label>sRPE (0–10)</label>
              <input id="piqSrpe" type="number" min="0" max="10" step="1" value="${intensity.rpe}" />
            </div>
          </div>
          <div class="hintline">
            Suggested: ${intensity.min}–${intensity.max} min • sRPE ~${intensity.rpe}
          </div>

          <div class="row gap wrap" style="margin-top:12px">
            <button class="btn" id="piqSaveSession">Save session</button>
            <button class="btn ghost" id="piqResetFilters">Reset filters</button>
          </div>

          <div class="hintline">
            <span class="muted">Tip:</span> Filters remove risky exercises and show safer substitutions.
          </div>
        </div>

        <div class="mini">
          <div class="minihead">Warm-up generator</div>
          <div class="minibody">
            <ol style="margin:0; padding-left:18px">
              ${warmup.map(x => `<li style="margin:8px 0">${x}</li>`).join("")}
            </ol>
          </div>
        </div>
      </div>

      <div class="mini" style="margin-top:12px">
        <div class="minihead">Session plan (${sport.toUpperCase()} • ${ui.sessionType} • ${ui.level})</div>
        <div class="minibody">
          ${built.blocks.length ? built.blocks.map(b => `
            <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--line)">
              <div style="font-weight:900">${b.title}${b.note ? ` <span class="muted">(${b.note})</span>` : ""}</div>
              <ol style="margin:0; padding-left:18px">
                ${(b.items || []).map(built.exRow).join("")}
              </ol>
            </div>
          `).join("") : `
            <div class="small muted">No safe exercises remain with current filters. Try resetting filters.</div>
          `}
        </div>
      </div>

      <div id="piqHistory" style="margin-top:12px"></div>
    `;

    // bind UI
    const st = $("piqSessionType");
    const lv = $("piqLevel");
    const subs = $("piqSubs");

    if (st) st.value = ui.sessionType;
    if (lv) lv.value = ui.level;

    st?.addEventListener("change", () => { ui.sessionType = st.value; saveUI(); render("train"); });
    lv?.addEventListener("change", () => { ui.level = lv.value; saveUI(); render("train"); });

    subs?.addEventListener("change", () => {
      ui.subs = !!subs.checked;
      saveUI();
      render("train");
    });

    document.querySelectorAll("[data-inj]").forEach(cb => {
      cb.addEventListener("change", () => {
        const k = cb.getAttribute("data-inj");
        if (!k) return;
        ui.injuries = ui.injuries || [];
        if (cb.checked) {
          if (!ui.injuries.includes(k)) ui.injuries.push(k);
        } else {
          ui.injuries = ui.injuries.filter(x => x !== k);
        }
        saveUI();
        render("train");
      });
    });

    $("piqResetFilters")?.addEventListener("click", () => {
      ui.injuries = [];
      ui.subs = true;
      saveUI();
      render("train");
      toast("Filters reset");
    });

    $("piqSaveSession")?.addEventListener("click", () => {
      const mins = safeNum($("piqMinutes")?.value, intensity.max);
      const srpe = safeNum($("piqSrpe")?.value, intensity.rpe);
      const dateISO = new Date().toISOString();
      addSessionLog({
        dateISO,
        sport,
        sessionType: ui.sessionType,
        level: ui.level,
        minutes: mins,
        srpe,
        injuries: ui.injuries
      });
      render("train");
    });

    const hist = $("piqHistory");
    if (hist) renderSessionHistory(hist);
  }

  function renderProfile() {
    const role = state.profile?.role || "coach";
    const sport = state.profile?.sport || "basketball";
    const body = $("profileBody");
    if (!body) return;

    body.innerHTML = `
      <div class="mini">
        <div class="minihead">Preferences</div>
        <div class="minibody">
          Role: <b>${role}</b><br/>
          Sport: <b>${sport}</b><br/>
          <span class="small muted">Edit in Account → Role & Sport.</span>
        </div>
      </div>

      <div class="mini" style="margin-top:12px">
        <div class="minihead">What gets saved</div>
        <div class="minibody">
          • Your sessions (minutes × sRPE = load)<br/>
          • Your role + sport preferences<br/>
          <span class="small muted">Cloud sync is optional and stays inside Account.</span>
        </div>
      </div>
    `;
  }

  const renderMap = { home: renderHome, team: renderTeam, train: renderTrain, profile: renderProfile };

  function render(view) {
    setTeamPill();
    renderMap[view]?.();
    applyStatusFromMeta();
  }

  // ---------- Cloud actions (kept safe + non-blocking) ----------
  async function cloudTest() {
    const msg = $("cloudMsg");
    if (!sb) {
      if (msg) msg.textContent = "Cloud is off (local-only).";
      setDataStatus("off");
      return;
    }
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      if (msg) msg.textContent = data?.session ? "Cloud OK (signed in)." : "Cloud OK (sign in to sync).";
      setDataStatus("local");
    } catch {
      if (msg) msg.textContent = "Cloud test failed. (Local mode still works.)";
      setDataStatus("error");
    }
    await refreshCloudPill();
  }

  function getAuthCredentials() {
    const email = ($("authEmail")?.value || "").trim();
    const pass = ($("authPass")?.value || "").trim();
    return { email, pass };
  }

  async function signIn() {
    const authMsg = $("authMsg");
    if (!sb) { if (authMsg) authMsg.textContent = "Cloud is off. Use Cloud setup first."; return; }
    const { email, pass } = getAuthCredentials();
    if (!email || !pass) { if (authMsg) authMsg.textContent = "Enter email + password."; return; }
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      if (authMsg) authMsg.textContent = "Signed in.";
      toast("Signed in");
    } catch {
      if (authMsg) authMsg.textContent = "Sign in failed.";
      toast("Sign in failed");
    }
    await refreshCloudPill();
    applyStatusFromMeta();
  }

  async function signUp() {
    const authMsg = $("authMsg");
    if (!sb) { if (authMsg) authMsg.textContent = "Cloud is off. Use Cloud setup first."; return; }
    const { email, pass } = getAuthCredentials();
    if (!email || !pass) { if (authMsg) authMsg.textContent = "Enter email + password."; return; }
    try {
      const { error } = await sb.auth.signUp({ email, password: pass });
      if (error) throw error;
      if (authMsg) authMsg.textContent = "Account created. Sign in.";
      toast("Account created");
    } catch {
      if (authMsg) authMsg.textContent = "Could not create account.";
      toast("Sign up failed");
    }
    await refreshCloudPill();
  }

  async function signOut() {
    const authMsg = $("authMsg");
    if (!sb) return;
    try { await sb.auth.signOut(); } catch {}
    if (authMsg) authMsg.textContent = "Signed out.";
    toast("Signed out");
    await refreshCloudPill();
    applyStatusFromMeta();
  }

  async function getAuthedSession() {
    const syncMsg = $("syncMsg");
    if (!sb) { if (syncMsg) syncMsg.textContent = "Cloud is off (local-only)."; return null; }
    const { data: sess } = await sb.auth.getSession();
    if (!sess?.session) { if (syncMsg) syncMsg.textContent = "Sign in to sync."; return null; }
    return sess.session;
  }

  function isMissingRelationError(err) {
    const m = String(err?.message || err || "");
    return m.includes("Could not find the table") || m.includes("relation") || m.includes("schema cache");
  }

  async function pushToCloud() {
    const syncMsg = $("syncMsg");
    if (syncMsg) syncMsg.textContent = "Syncing…";
    setDataStatus("syncing");

    const session = await getAuthedSession();
    if (!session) { applyStatusFromMeta(); return; }

    try {
      const updatedAt = new Date().toISOString();
      const { error } = await sb
        .from("piq_user_state")
        .upsert({ user_id: session.user.id, state, updated_at: updatedAt }, { onConflict: "user_id" });
      if (error) throw error;

      const teamId = state.team?.active_team_id;
      if (teamId) {
        const { error: tErr } = await sb
          .from("piq_team_state")
          .upsert({ team_id: teamId, state, updated_at: updatedAt }, { onConflict: "team_id" });
        if (tErr && !isMissingRelationError(tErr)) throw tErr;
      }

      meta.lastCloudSyncAt = updatedAt;
      meta.syncState = "synced";
      saveMeta(meta);

      if (syncMsg) syncMsg.textContent = "Synced.";
      toast("Cloud sync complete");
      setDataStatus("synced", timeAgo(meta.lastCloudSyncAt));
    } catch {
      meta.syncState = "error";
      saveMeta(meta);
      if (syncMsg) syncMsg.textContent = "Sync failed. Local mode still works.";
      toast("Sync failed (local mode still works)");
      setDataStatus("error");
    }
    await refreshCloudPill();
  }

  async function pullFromCloud() {
    const syncMsg = $("syncMsg");
    if (syncMsg) syncMsg.textContent = "Syncing…";
    setDataStatus("syncing");

    const session = await getAuthedSession();
    if (!session) { applyStatusFromMeta(); return; }

    try {
      const { data, error } = await sb
        .from("piq_user_state")
        .select("state")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error) throw error;

      if (data?.state) {
        state = data.state;
        state.profile = state.profile || {};
        state.team = state.team || { teams: [], active_team_id: null };
        state.ui = state.ui || { view: "home" };
        state.sessions = Array.isArray(state.sessions) ? state.sessions : [];
        persist(null, { silentToast: true });

        const activeView =
          document.querySelector(".navbtn.active")?.dataset.view ||
          document.querySelector(".bottomnav .tab.active")?.dataset.view ||
          state.ui.view ||
          "home";
        render(activeView);
      }

      meta.lastCloudSyncAt = new Date().toISOString();
      meta.syncState = "synced";
      saveMeta(meta);

      if (syncMsg) syncMsg.textContent = "Updated.";
      toast("Pulled from cloud");
      setDataStatus("synced", timeAgo(meta.lastCloudSyncAt));
    } catch {
      meta.syncState = "error";
      saveMeta(meta);
      if (syncMsg) syncMsg.textContent = "Pull failed. Local mode still works.";
      toast("Pull failed (local mode still works)");
      setDataStatus("error");
    }
    await refreshCloudPill();
  }

  // ---------- Micro-tours ----------
  const toursKey = "piq_tours_v2";
  function loadTours() { try { return JSON.parse(localStorage.getItem(toursKey) || "null") || {}; } catch { return {}; } }
  function saveTours(t) { localStorage.setItem(toursKey, JSON.stringify(t || {})); }
  let tours = loadTours();

  function tourScript(role, tab) {
    const scripts = {
      home: {
        coach: "Home: phase + nutrition targets + quick actions.",
        athlete: "Home: your phase snapshot + targets.",
        parent: "Home: quick view of targets and training direction."
      },
      team: {
        coach: "Team: roster + access (cloud).",
        athlete: "Team: join team (cloud) when enabled.",
        parent: "Team: see the team context."
      },
      train: {
        coach: "Train: choose session type + filters + log sRPE load.",
        athlete: "Train: follow today’s plan and save your session.",
        parent: "Train: see plan and what it trains."
      },
      profile: {
        coach: "Profile: what’s saved and how to use the app.",
        athlete: "Profile: what’s saved and how to use the app.",
        parent: "Profile: what’s saved and how to use the app."
      }
    };
    return scripts?.[tab]?.[role] || "Tip: explore each tab to get started.";
  }

  function autoTourFor(tab) {
    const role = state.profile?.role || "coach";
    tours[role] = tours[role] || {};
    if (tours[role][tab]) return;
    tours[role][tab] = true;
    saveTours(tours);
    toast(tourScript(role, tab), 2600);
  }

  function runTourForCurrentTab() {
    const active =
      document.querySelector(".navbtn.active")?.dataset.view ||
      document.querySelector(".bottomnav .tab.active")?.dataset.view ||
      state.ui.view ||
      "home";
    const role = state.profile?.role || "coach";
    toast(tourScript(role, active), 2600);
  }

  // ---------- Onboarding (modal; never traps) ----------
  function ensureRoleOnboarding() {
    if (state.profile?.role && state.profile?.sport) return;

    const overlay = document.createElement("div");
    overlay.className = "piq-modal-backdrop";
    overlay.innerHTML = `
      <div class="piq-modal" role="dialog" aria-modal="true" aria-label="Choose role">
        <div class="piq-modal-head">
          <div class="piq-modal-title">Welcome to PerformanceIQ</div>
          <div class="piq-modal-sub">Choose your role and sport to personalize the app.</div>
        </div>

        <div class="piq-modal-body">
          <div class="field">
            <label>Role</label>
            <select id="piqRolePick">
              <option value="coach">Coach</option>
              <option value="athlete">Athlete</option>
              <option value="parent">Parent</option>
            </select>
          </div>

          <div class="field" style="margin-top:10px">
            <label>Sport</label>
            <select id="piqSportPick">
              <option value="basketball">Basketball</option>
              <option value="football">Football</option>
              <option value="soccer">Soccer</option>
              <option value="baseball">Baseball</option>
              <option value="volleyball">Volleyball</option>
              <option value="track">Track</option>
            </select>
          </div>

          <div class="row between" style="margin-top:14px">
            <div class="small muted">You can change this anytime in Account.</div>
            <div class="row gap">
              <button class="btn ghost" id="piqSkipBtn" title="Use defaults">Skip</button>
              <button class="btn" id="piqStartBtn">Continue</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const roleSel = overlay.querySelector("#piqRolePick");
    const sportSel = overlay.querySelector("#piqSportPick");
    const btn = overlay.querySelector("#piqStartBtn");
    const skip = overlay.querySelector("#piqSkipBtn");

    roleSel.value = state.profile?.role || "coach";
    sportSel.value = state.profile?.sport || "basketball";

    function finish() {
      persist("Preferences saved");
      overlay.remove();
      autoTourFor("home");
      showView("home");
    }

    btn.addEventListener("click", () => {
      state.profile.role = roleSel.value;
      state.profile.sport = sportSel.value;
      finish();
    });

    skip.addEventListener("click", () => {
      state.profile.role = state.profile.role || roleSel.value || "coach";
      state.profile.sport = state.profile.sport || sportSel.value || "basketball";
      finish();
    });
  }

  // ---------- Boot bindings ----------
  function bindNav() {
    document.querySelectorAll("[data-view]").forEach(btn => {
      if (btn.classList.contains("navbtn") || btn.classList.contains("tab")) {
        btn.addEventListener("click", () => showView(btn.dataset.view));
      }
    });
    $("qaTrain")?.addEventListener("click", () => showView("train"));
    $("qaTeam")?.addEventListener("click", () => showView("team"));
  }

  function bindDrawer() {
    $("btnAccount")?.addEventListener("click", openDrawer);
    $("btnCloseDrawer")?.addEventListener("click", closeDrawer);
    $("drawerBackdrop")?.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  }

  function bindAccountControls() {
    const roleSelect = $("roleSelect");
    const sportSelect = $("sportSelect");
    if (roleSelect) roleSelect.value = state.profile?.role || "coach";
    if (sportSelect) sportSelect.value = state.profile?.sport || "basketball";

    $("btnSaveProfile")?.addEventListener("click", () => {
      state.profile.role = roleSelect?.value || state.profile.role || "coach";
      state.profile.sport = sportSelect?.value || state.profile.sport || "basketball";
      persist("Preferences saved");
      render(state.ui.view || "home");
    });

    $("btnRunTour")?.addEventListener("click", runTourForCurrentTab);

    const cfg = loadCloudCfg();
    if (cfg?.url) { const el = $("sbUrl"); if (el) el.value = cfg.url; }
    if (cfg?.anon) { const el = $("sbAnon"); if (el) el.value = cfg.anon; }

    $("btnSaveCloud")?.addEventListener("click", async () => {
      const url = ($("sbUrl")?.value || "").trim();
      const anon = ($("sbAnon")?.value || "").trim();
      const cloudMsg = $("cloudMsg");

      if (!validSupabaseUrl(url) || !anon) {
        if (cloudMsg) cloudMsg.textContent = "Cloud setup failed. (Local mode still works.)";
        setDataStatus("off");
        return;
      }

      saveCloudCfg({ url, anon });
      if (cloudMsg) cloudMsg.textContent = "Cloud settings saved.";
      sb = initSupabaseIfPossible();

      await refreshCloudPill();
      applyStatusFromMeta();
      toast("Cloud saved");
    });

    $("btnTestCloud")?.addEventListener("click", cloudTest);
    $("btnSignIn")?.addEventListener("click", signIn);
    $("btnSignUp")?.addEventListener("click", signUp);
    $("btnSignOut")?.addEventListener("click", signOut);
    $("btnPush")?.addEventListener("click", pushToCloud);
    $("btnPull")?.addEventListener("click", pullFromCloud);

    $("btnHelp")?.addEventListener("click", () => {
      toast("Tip: Train tab now generates sessions + warmups + injury-safe substitutions. Save minutes + sRPE to log load.", 3200);
    });
  }

  function boot() {
    // Init SB best-effort
    sb = initSupabaseIfPossible();

    // Bind UI
    bindNav();
    bindDrawer();
    bindAccountControls();

    // Pills
    setTeamPill();
    refreshCloudPill();

    // Status
    const cfg = loadCloudCfg();
    if (!cfg || !cfg.url || !cfg.anon) setDataStatus("off");
    else if (!sb) setDataStatus("error");
    else setDataStatus("local", timeAgo(meta.lastLocalSaveAt));

    // Onboarding
    ensureRoleOnboarding();

    // Initial view
    const initial = state.ui?.view || "home";
    showView(initial);

    // ✅ always hide splash (fix trap screen)
    hideSplash();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
