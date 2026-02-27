// core.js — v2.9.0 (Phase 2 polish + Phase 3 slice + session-type plans + onboarding Try Now fix)
(function () {
  "use strict";
  if (window.__PIQ_CORE__) return;
  window.__PIQ_CORE__ = true;

  const $ = (id) => document.getElementById(id);

  // ---------------- State ----------------
  let state = window.dataStore?.load ? window.dataStore.load() : {};
  state.profile = state.profile || {};
  state.team = state.team || { teams: [], active_team_id: null };
  state.ui = state.ui || { view: "home" };
  state.sessions = Array.isArray(state.sessions) ? state.sessions : [];
  state.profile.injuries = Array.isArray(state.profile.injuries) ? state.profile.injuries : [];
  state.profile.goal = state.profile.goal || "maintain";

  // default preferred session type
  state.profile.preferred_session_type = state.profile.preferred_session_type || "strength";

  // ---------------- Meta ----------------
  const metaKey = "piq_meta_v2";
  function loadMeta() { try { return JSON.parse(localStorage.getItem(metaKey) || "null") || {}; } catch { return {}; } }
  function saveMeta(m) { localStorage.setItem(metaKey, JSON.stringify(m || {})); }
  let meta = loadMeta();
  meta.lastLocalSaveAt = meta.lastLocalSaveAt || null;
  meta.syncState = meta.syncState || "off";
  meta.onboarded_v1 = meta.onboarded_v1 || false;
  saveMeta(meta);

  // ---------------- Theme ----------------
  const themeKey = "piq_theme_v1";
  const SPORT_ACCENTS = {
    basketball: { accent: "#2EC4B6" },
    football:   { accent: "#FF6B35" },
    soccer:     { accent: "#22C55E" },
    baseball:   { accent: "#3B82F6" },
    volleyball: { accent: "#9B5DE5" },
    track:      { accent: "#F59E0B" },
  };

  function loadTheme() { try { return JSON.parse(localStorage.getItem(themeKey) || "null") || null; } catch { return null; } }
  function saveTheme(t) { localStorage.setItem(themeKey, JSON.stringify(t || {})); }

  function applyTheme(t) {
    const html = document.documentElement;
    const mode = (t?.mode === "light") ? "light" : "dark";
    const sport = t?.sport || (state.profile?.sport || "basketball");
    const accent = SPORT_ACCENTS[sport]?.accent || SPORT_ACCENTS.basketball.accent;

    html.setAttribute("data-theme", mode);
    html.style.setProperty("--accent", accent);
    html.style.setProperty("--accent-2", "color-mix(in oklab, var(--accent) 18%, transparent)");

    if ($("themeModeSelect")) $("themeModeSelect").value = mode;
    if ($("themeSportSelect")) $("themeSportSelect").value = sport;
  }

  function toggleThemeMode() {
    const cur = loadTheme() || { mode: "dark", sport: (state.profile?.sport || "basketball") };
    cur.mode = (cur.mode === "dark") ? "light" : "dark";
    saveTheme(cur);
    applyTheme(cur);
    toast(cur.mode === "dark" ? "Dark mode" : "Light mode");
  }

  // ---------------- Toast ----------------
  function toast(msg, ms = 2200) {
    const t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.hidden = true; }, ms);
  }

  // ---------------- Undo ----------------
  let undoTimer = null;
  function showUndoToast(label, onUndo, ms = 6000) {
    const t = $("undoToast");
    if (!t) return;
    t.hidden = false;
    t.innerHTML = `<div style="flex:1">${label}</div><button id="btnUndoNow">Undo</button>`;
    $("btnUndoNow")?.addEventListener("click", () => {
      try { onUndo?.(); } catch {}
      hideUndoToast();
      toast("Undone");
    });
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { hideUndoToast(); }, ms);
  }
  function hideUndoToast() {
    const t = $("undoToast");
    if (!t) return;
    t.hidden = true;
    t.innerHTML = "";
  }

  // ---------------- Status pill ----------------
  function setDataStatus(kind, detail) {
    const dot = $("saveDot"), txt = $("saveText");
    if (!dot || !txt) return;
    const map = {
      local: { label: "Local saved", color: "#22C55E" },
      saving: { label: "Saving…", color: "#F59E0B" },
      syncing: { label: "Syncing…", color: "var(--accent)" },
      synced: { label: "Synced", color: "#22C55E" },
      off: { label: "Sync off", color: "rgba(255,255,255,.35)" },
      error: { label: "Sync failed — open Account", color: "#EF4444" }
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

  // ---------------- Persistence ----------------
  function persist(msg, opts = {}) {
    setDataStatus("saving");
    try {
      window.dataStore?.save?.(state);
      meta.lastLocalSaveAt = new Date().toISOString();
      saveMeta(meta);
      setDataStatus("local", timeAgo(meta.lastLocalSaveAt));
    } catch {
      setDataStatus("error");
    }
    if (msg && !opts.silentToast) toast(msg);
  }

  // Autosave
  let autosaveTimer = null;
  function startAutosave() {
    clearInterval(autosaveTimer);
    autosaveTimer = setInterval(() => { try { persist(null, { silentToast: true }); } catch {} }, 30000);
  }

  // ---------------- Navigation ----------------
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

  // ---------------- Drawer ----------------
  function openDrawer() {
    $("drawerBackdrop").hidden = false;
    $("accountDrawer").classList.add("open");
    $("accountDrawer").setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    $("drawerBackdrop").hidden = true;
    $("accountDrawer").classList.remove("open");
    $("accountDrawer").setAttribute("aria-hidden", "true");
  }

  // ---------------- Help drawer ----------------
  function openHelp() {
    $("helpBackdrop").hidden = false;
    $("helpDrawer").classList.add("open");
    $("helpDrawer").setAttribute("aria-hidden", "false");
    $("helpSearch")?.focus();
    renderHelpResults(($("helpSearch")?.value || "").trim());
  }
  function closeHelp() {
    $("helpBackdrop").hidden = true;
    $("helpDrawer").classList.remove("open");
    $("helpDrawer").setAttribute("aria-hidden", "true");
  }

  // ---------------- Help KB ----------------
  function helpArticles() {
    return [
      { k: "today", title: "Today workflow", body: "Tap Today: Generate → Start timer → Done (log). Today uses your preferred session type + injury tag." },
      { k: "session", title: "Session types", body: "Strength, Speed, Conditioning, Skill, Recovery. Train builds a different workout based on session type." },
      { k: "injury", title: "Injury-friendly templates", body: "Knee/Ankle/Shoulder/Back templates swap risky moves for safer substitutions." },
      { k: "report", title: "Coach report (Print → PDF)", body: "Profile (Coach) → Generate report. Print/Save as PDF. Works offline." },
      { k: "theme", title: "Theme", body: "Switch dark/light and choose a sport accent in Account → Appearance." },
      { k: "shortcuts", title: "Shortcuts", body: "Ctrl/⌘+K opens Help Search." },
    ];
  }

  function renderHelpResults(q) {
    const box = $("helpResults");
    if (!box) return;
    const list = helpArticles();
    const query = (q || "").toLowerCase();
    const filtered = !query ? list : list.filter(a =>
      a.title.toLowerCase().includes(query) || a.body.toLowerCase().includes(query) || a.k.includes(query)
    );
    box.innerHTML = filtered.map(a => `
      <div class="card subtle" style="margin-top:10px">
        <div class="card-title">${a.title}</div>
        <div class="small muted" style="margin-top:6px;line-height:1.6">${a.body}</div>
      </div>
    `).join("") || `<div class="small muted">No results.</div>`;
  }

  // ---------------- FAB ----------------
  function openSheet() { $("sheetBackdrop").hidden = false; $("fabSheet").hidden = false; }
  function closeSheet() { $("sheetBackdrop").hidden = true; $("fabSheet").hidden = true; }

  // ---------------- Team pill ----------------
  function setTeamPill() {
    const pill = $("teamPill");
    if (!pill) return;
    const teamName = (state.team?.teams || []).find(t => t.id === state.team?.active_team_id)?.name;
    pill.textContent = `Team: ${teamName || "—"}`;
  }

  // ---------------- Training building blocks ----------------
  function warmupFor(sport, sessionType) {
    const base = [
      "Breathing reset (1 min)",
      "Pulse raise: easy movement (2–3 min)",
      "Mobility: ankles + hips + T-spine (3–4 min)"
    ];
    const extra = {
      basketball: ["Footwork: closeout slides (2×15s)", "Pogo hops (2×20 contacts)"],
      football: ["Accel prep: falling starts (3×10yd)", "A-skips (2×15yd)"],
      soccer: ["Adductor flow (2×8/side)", "Low shuttles (3×10s)"],
      baseball: ["Band shoulder series (2–3 min)", "Throwing: easy progression"],
      volleyball: ["Approach footwork (3×3)", "Landing mechanics (2×5)"],
      track: ["A/B-skips (2–3 min)", "Build-ups (3×40m easy→fast)"]
    };
    const st = {
      strength: ["Primer: 2 light sets of first lift"],
      speed: ["Sprint drills: 2–3 min technique"],
      conditioning: ["Low-intensity build: 3–4 min"],
      skill: ["Skill prep: 2–3 min easy reps"],
      recovery: ["Breath + tissue + easy mobility (6–8 min)"]
    };
    return base.concat(st[sessionType] || []).concat(extra[sport] || []);
  }

  function skillMicroblocksFor(sport) {
    const map = {
      basketball: [
        "Ball Handling: stationary series (3 min)",
        "Ball Handling: change-of-pace (4 min)",
        "Shooting: form + arc (6 min)",
        "Shooting: spot-up game pace (8 min)",
        "Footwork: closeout + retreat (4 min)",
        "Finishing: 2-foot + 1-foot reads (6 min)"
      ],
      football: [
        "Route running: stem + break mechanics (8 min)",
        "Hands: catch-to-tuck series (6 min)",
        "Release vs press: 1–2 moves (6 min)",
        "Throwing: footwork + timing (QB) (8 min)"
      ],
      soccer: [
        "Dribbling: cone weave + bursts (8 min)",
        "Shooting: placement focus (6 min)",
        "Passing: wall reps + first touch (5 min)",
        "Change of direction: 5-10-5 pattern (6 min)"
      ],
      baseball: [
        "Throwing: easy progression (6 min)",
        "Fielding: footwork → throw (8 min)",
        "Rotational power: medball (6 min)",
        "Sprint: 10–30 yd accelerations (6 min)"
      ],
      volleyball: [
        "Approach footwork rhythm (6 min)",
        "Blocking hands timing (5 min)",
        "Spike contact timing (6 min)",
        "Serve consistency: target zones (6 min)"
      ],
      track: [
        "Drills: A/B series (6 min)",
        "Starts: drive phase (6 min)",
        "Relaxed sprint mechanics (6 min)",
        "Strides: smooth build-ups (6 min)"
      ]
    };
    return map[sport] || map.basketball;
  }

  function strengthBlock(sport) {
    const common = [
      "Split squat or rear-foot elevated (3×6–10)",
      "RDL / hinge pattern (3×6–10)",
      "Row variation (3×8–12)",
      "Push variation (3×8–12)",
      "Core: anti-rotation (2–3×10/side)"
    ];
    const sportAdds = {
      basketball: ["Calf work + tib raises (2–3×12–15)"],
      football: ["Trap bar deadlift option (3×3–5)"],
      soccer: ["Nordic regression (2–3×4–6)"],
      baseball: ["Scap + cuff finisher (2–3×12–15)"],
      volleyball: ["Landing strength: step-downs (2–3×6–8)"],
      track: ["Posterior chain emphasis (hip thrust 3×6–10)"]
    };
    return common.concat(sportAdds[sport] || []);
  }

  function speedBlock(sport) {
    const base = [
      "Acceleration: 6×10–20yd (full rest)",
      "Decel mechanics: 3×3 reps (stick landing)",
      "COD: 4× reps (5-10-5 or sport pattern)"
    ];
    const sportAdds = {
      basketball: ["Closeout → retreat → re-accelerate (6 reps)"],
      football: ["Resisted starts (4×10yd)"],
      soccer: ["Flying 10s (4×)"],
      baseball: ["First-step reaction (6×)"],
      volleyball: ["Approach speed reps (6×)"],
      track: ["Event-specific sprint set (6–10 reps)"]
    };
    return base.concat(sportAdds[sport] || []);
  }

  function conditioningBlock(sport) {
    const base = [
      "Intervals: 8–12 min total",
      "Work: 15–30s hard / Rest: 30–60s easy",
      "Cool-down: 3–5 min easy movement"
    ];
    const sportAdds = {
      basketball: ["Court shuttles or tempo runs"],
      football: ["Short burst repeats (10–15s)"],
      soccer: ["Repeated sprint ability (RSA)"],
      baseball: ["Short accelerations + walk-back"],
      volleyball: ["Short court shuttles"],
      track: ["Tempo/strides (event dependent)"]
    };
    return base.concat(sportAdds[sport] || []);
  }

  function recoveryBlock() {
    return [
      "Breath: 4-6 breathing (3–5 min)",
      "Mobility flow: hips/ankles/T-spine (8–12 min)",
      "Easy cardio: 10–20 min zone 2 (optional)",
      "Tissue: calves/quads/hips (optional)"
    ];
  }

  function injurySubstitutions(injury) {
    if (injury === "knee") return ["Swap deep squats → box squat / split squat range-limited", "Swap high-impact plyos → bike intervals", "Add isometrics: wall sit 3×30–45s"];
    if (injury === "ankle") return ["Swap lateral bounds → line hops low", "Add balance + tib/calf work", "Prefer bike/pool for conditioning"];
    if (injury === "shoulder") return ["Swap heavy overhead press → landmine press", "Limit high-volume throwing", "Add cuff/scap work 2–3×/wk"];
    if (injury === "back") return ["Swap heavy hinge → hip hinge regression", "Avoid loaded spinal flexion", "Add anti-rotation + glute bridge"];
    return [];
  }

  function buildSessionPlan({ sport, sessionType, injuryTag }) {
    const st = sessionType || "strength";
    const inj = injuryTag || null;
    const title = `${sport} • ${st.toUpperCase()}${inj ? ` • ${inj}-friendly` : ""}`;

    const blocks = [];
    blocks.push({ h: "Warm-up", items: warmupFor(sport, st) });

    // microblocks: always include, but change emphasis
    const micro = skillMicroblocksFor(sport);
    const microPick =
      st === "skill" ? micro.slice(0, 5) :
      st === "speed" ? micro.slice(0, 2) :
      st === "conditioning" ? micro.slice(2, 4) :
      micro.slice(0, 3);

    blocks.push({ h: "Skill microblocks", items: microPick });

    // main block depends on session type
    if (st === "strength") blocks.push({ h: "Strength", items: strengthBlock(sport) });
    else if (st === "speed") blocks.push({ h: "Speed", items: speedBlock(sport) });
    else if (st === "conditioning") blocks.push({ h: "Conditioning", items: conditioningBlock(sport) });
    else if (st === "skill") blocks.push({ h: "Skill focus", items: micro.concat(["Game-speed reps: 6–10 min", "Cool-down reset (3–5 min)"]) });
    else if (st === "recovery") blocks.push({ h: "Recovery", items: recoveryBlock() });

    // injury-friendly substitutions section
    const subs = injurySubstitutions(inj);
    if (subs.length) blocks.push({ h: "Injury substitutions", items: subs });

    blocks.push({ h: "Cool-down", items: ["Easy breathing (2 min)", "Calves/hips stretch (3–5 min)"] });

    return { title, blocks };
  }

  // ---------------- Session logging ----------------
  function safeNum(x, d = 0) { const n = Number(x); return Number.isFinite(n) ? n : d; }
  function addSessionLog({ dateISO, sport, sessionType, minutes, srpe, planTitle }) {
    const id = `s_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    const mins = Math.max(0, Math.round(safeNum(minutes, 0)));
    const r = Math.max(0, Math.min(10, safeNum(srpe, 0)));
    const load = Math.round(mins * r);
    state.sessions.unshift({ id, date: dateISO, sport, sessionType, minutes: mins, srpe: r, load, planTitle });
    if (state.sessions.length > 400) state.sessions = state.sessions.slice(0, 400);
    persist("Session saved");
  }

  // ---------------- Today workflow ----------------
  let today = { plan: null, running: false, startAt: null, tId: null };

  function todayGenerate() {
    const sport = state.profile?.sport || "basketball";
    const st = state.profile?.preferred_session_type || "strength";
    const inj = (state.profile?.injuries || [])[0] || null;
    today.plan = buildSessionPlan({ sport, sessionType: st, injuryTag: inj });
    renderHome();
    toast("Today plan generated");
  }
  function todayStart() {
    if (!today.plan) todayGenerate();
    if (today.running) return;
    today.running = true;
    today.startAt = Date.now();
    clearInterval(today.tId);
    today.tId = setInterval(() => {
      const s = Math.floor((Date.now() - today.startAt) / 1000);
      $("todayTimer").textContent = `Running • ${s}s elapsed`;
    }, 800);
    renderHome();
    toast("Timer started");
  }
  function todayDone() {
    if (!today.plan) return;
    clearInterval(today.tId);
    const minutes = today.running ? Math.max(0, Math.round((Date.now() - today.startAt) / 60000)) : 0;
    today.running = false;
    $("todayTimer").textContent = "No timer running";
    addSessionLog({
      dateISO: new Date().toISOString(),
      sport: state.profile?.sport || "basketball",
      sessionType: state.profile?.preferred_session_type || "strength",
      minutes,
      srpe: 6,
      planTitle: today.plan.title
    });
    today.plan = null;
    renderHome();
    toast("Done");
  }
  function todayButtonHandler() {
    if (!today.plan) return todayGenerate();
    if (!today.running) return todayStart();
    return todayDone();
  }

  // ---------------- Render Home ----------------
  function renderHome() {
    const role = state.profile?.role || "coach";
    const sport = state.profile?.sport || "basketball";
    const st = state.profile?.preferred_session_type || "strength";
    $("homeSub").textContent = `${role} view • Sport: ${sport} • Today: ${st}`;

    const targets = window.nutritionEngine?.macroTargets
      ? window.nutritionEngine.macroTargets({
          weight_lbs: state.profile?.weight_lbs || 160,
          goal: state.profile?.goal || "maintain",
          activity: state.profile?.activity || "med"
        })
      : { calories: "—", protein_g: "—", carbs_g: "—", fat_g: "—" };

    const plan = today.plan;
    const planHtml = !plan ? `<div class="small muted">Not generated yet.</div>` : `
      <div style="margin-top:6px"><b>${plan.title}</b></div>
      <div style="margin-top:10px">
        ${plan.blocks.map(b => `
          <div style="margin-top:10px">
            <div style="font-weight:900">${b.h}</div>
            <ul style="margin-top:6px; padding-left:18px">
              ${b.items.map(it => `<li style="margin:6px 0">${it}</li>`).join("")}
            </ul>
          </div>
        `).join("")}
      </div>
    `;

    $("todayBlock").innerHTML = `
      <div class="small muted">Nutrition targets (auto)</div>
      <div style="margin-top:8px" class="small">
        Calories: <b>${targets.calories}</b><br/>
        Protein: <b>${targets.protein_g}g</b> • Carbs: <b>${targets.carbs_g}g</b> • Fat: <b>${targets.fat_g}g</b>
      </div>

      <div style="margin-top:12px" class="small muted">Today plan</div>
      ${planHtml}
    `;

    const btn = $("todayButton");
    if (btn) {
      btn.onclick = todayButtonHandler;
      if (!today.plan) btn.textContent = "Generate → Start → Log";
      else if (!today.running) btn.textContent = "Start timer";
      else btn.textContent = "Done (log)";
    }
    if (!today.running) $("todayTimer").textContent = "No timer running";
  }

  // ---------------- Render Team/Profile ----------------
  function renderTeam() {
    $("teamBody").innerHTML = `
      <div class="mini">
        <div class="minihead">Team</div>
        <div class="minibody">Team tools expand with cloud roles later. (Phase 3+)</div>
      </div>
    `;
  }

  function renderProfile() {
    const role = state.profile?.role || "coach";
    const sport = state.profile?.sport || "basketball";
    const st = state.profile?.preferred_session_type || "strength";

    $("profileBody").innerHTML = `
      <div class="grid2">
        <div class="mini">
          <div class="minihead">Preferences</div>
          <div class="minibody">
            Role: <b>${role}</b><br/>
            Sport: <b>${sport}</b><br/>
            Preferred session: <b>${st}</b><br/>
            Injuries: <b>${(state.profile?.injuries||[]).join(", ") || "none"}</b>
          </div>
        </div>

        <div class="mini">
          <div class="minihead">Phase 3: Coach report</div>
          <div class="minibody">Generate a printable report (Print → Save as PDF). Works offline.</div>
          <div class="row gap wrap" style="margin-top:10px">
            <button class="btn" id="btnCoachReport" ${role!=="coach" ? "disabled" : ""}>Generate report</button>
            <button class="btn ghost" id="btnViewSessions">View recent sessions</button>
          </div>
          ${role!=="coach" ? `<div class="small muted" style="margin-top:8px">Coach role required for report.</div>` : ""}
        </div>
      </div>

      <div id="profileExtra" style="margin-top:12px"></div>
    `;

    $("btnCoachReport")?.addEventListener("click", () => {
      try { openCoachReportWindow(); } catch { toast("Report failed"); }
    });
    $("btnViewSessions")?.addEventListener("click", () => {
      renderSessionHistory($("profileExtra"), 16);
    });
  }

  function renderSessionHistory(container, limit = 12) {
    if (!container) return;
    const list = state.sessions.slice(0, limit);
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
                <div style="font-weight:900">${(s.planTitle||s.sessionType||"session")}</div>
                <div class="small muted">${(s.date||"").slice(0,10)} • ${s.minutes} min • sRPE ${s.srpe} • Load ${s.load}</div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // ---------------- Coach Report (Print → PDF) ----------------
  function openCoachReportWindow() {
    const sport = state.profile?.sport || "basketball";
    const role = state.profile?.role || "coach";
    if (role !== "coach") { toast("Coach role required"); return; }

    const last14 = state.sessions
      .filter(s => (s.sport || "") === sport)
      .slice(0, 14);

    const totalMinutes = last14.reduce((a,s)=>a+(s.minutes||0),0);
    const totalLoad = last14.reduce((a,s)=>a+(s.load||0),0);

    const w = window.open("", "_blank");
    if (!w) { toast("Popup blocked"); return; }

    w.document.write(`
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>PerformanceIQ Report</title>
        <style>
          body{font-family:Arial, sans-serif; padding:24px; color:#111}
          h1{margin:0 0 6px}
          .muted{color:#555}
          .kpis{display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:16px 0}
          .card{border:1px solid #ddd; border-radius:10px; padding:12px}
          table{width:100%; border-collapse:collapse; margin-top:14px}
          th,td{border-bottom:1px solid #eee; padding:10px; text-align:left; font-size:13px}
          th{background:#fafafa}
          .small{font-size:12px}
        </style>
      </head>
      <body>
        <h1>PerformanceIQ • Coach Report</h1>
        <div class="muted">Sport: <b>${sport}</b> • Generated: <b>${new Date().toLocaleString()}</b></div>

        <div class="kpis">
          <div class="card"><div class="small muted">Sessions shown</div><div style="font-size:22px;font-weight:800">${last14.length}</div></div>
          <div class="card"><div class="small muted">Total minutes</div><div style="font-size:22px;font-weight:800">${totalMinutes}</div></div>
          <div class="card"><div class="small muted">Total load</div><div style="font-size:22px;font-weight:800">${totalLoad}</div></div>
        </div>

        <div class="card">
          <div style="font-weight:800;margin-bottom:6px">Session history (most recent)</div>
          <table>
            <thead><tr><th>Date</th><th>Plan</th><th>Minutes</th><th>sRPE</th><th>Load</th></tr></thead>
            <tbody>
              ${last14.map(s=>`
                <tr>
                  <td>${(s.date||"").slice(0,10)}</td>
                  <td>${(s.planTitle||s.sessionType||"")}</td>
                  <td>${s.minutes||0}</td>
                  <td>${s.srpe||0}</td>
                  <td>${s.load||0}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div style="margin-top:14px" class="muted small">
          Tip: Print → “Save as PDF” to share with parents/admins.
        </div>
      </body>
      </html>
    `);
    w.document.close();
    w.focus();
    toast("Report opened (Print → Save as PDF)");
  }

  // ---------------- Render Train (session type WORKS now) ----------------
  function renderTrain() {
    const role = state.profile?.role || "coach";
    $("trainSub").textContent = role === "coach"
      ? "Coach: pick sport + session type + injury tags. Save session to log."
      : "Athlete: follow plan. Save session to log your load.";

    const uiKey = "piq_train_ui_v4";
    const ui = (() => { try { return JSON.parse(localStorage.getItem(uiKey) || "null") || {}; } catch { return {}; } })();
    ui.sport = ui.sport || (state.profile?.sport || "basketball");
    ui.sessionType = ui.sessionType || (state.profile?.preferred_session_type || "strength");
    ui.level = ui.level || "standard";
    ui.injuries = Array.isArray(ui.injuries) ? ui.injuries : state.profile.injuries.slice(0);
    function saveUI() { localStorage.setItem(uiKey, JSON.stringify(ui)); }

    const plan = buildSessionPlan({ sport: ui.sport, sessionType: ui.sessionType, injuryTag: ui.injuries[0] || null });

    $("trainBody").innerHTML = `
      <div class="grid2">
        <div class="mini">
          <div class="minihead">Session builder</div>

          <div class="field" style="margin-top:10px">
            <label>Sport</label>
            <select id="piqSportPickTrain">
              <option value="basketball">Basketball</option>
              <option value="football">Football</option>
              <option value="soccer">Soccer</option>
              <option value="baseball">Baseball</option>
              <option value="volleyball">Volleyball</option>
              <option value="track">Track</option>
            </select>
          </div>

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
            <label>Injury / sensitivity</label>
            <div class="row gap wrap">
              ${[["knee","Knee"],["ankle","Ankle"],["shoulder","Shoulder"],["back","Back"]].map(([k,l]) => `
                <label class="pill" style="gap:8px">
                  <input type="checkbox" data-inj="${k}" ${ui.injuries.includes(k) ? "checked" : ""} />
                  <span>${l}</span>
                </label>
              `).join("")}
            </div>
          </div>

          <div class="hr"></div>

          <div class="minihead" style="margin-bottom:6px">Quick log</div>
          <div class="grid2">
            <div class="field"><label>Minutes</label><input id="piqMinutes" type="number" min="0" max="240" value="30" /></div>
            <div class="field"><label>sRPE</label><input id="piqSrpe" type="number" min="0" max="10" step="1" value="6" /></div>
          </div>

          <div class="row gap wrap" style="margin-top:12px">
            <button class="btn" id="piqSaveSession">Save session</button>
            <button class="btn ghost" id="piqMakeToday">Make this Today</button>
            <button class="btn ghost" id="piqResetFilters">Reset</button>
          </div>
          <div class="small muted" style="margin-top:8px">
            “Make this Today” sets your preferred session type for Home → Today.
          </div>
        </div>

        <div class="mini">
          <div class="minihead">Generated plan</div>
          <div class="minibody">
            <div style="margin-top:6px"><b>${plan.title}</b></div>
            ${plan.blocks.map(b => `
              <div style="margin-top:10px">
                <div style="font-weight:900">${b.h}</div>
                <ul style="margin-top:6px;padding-left:18px">
                  ${b.items.map(it => `<li style="margin:6px 0">${it}</li>`).join("")}
                </ul>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <div id="piqHistory" style="margin-top:12px"></div>
    `;

    const sportSel = $("piqSportPickTrain");
    const stSel = $("piqSessionType");
    sportSel.value = ui.sport;
    stSel.value = ui.sessionType;

    sportSel.addEventListener("change", () => {
      ui.sport = sportSel.value;
      state.profile.sport = ui.sport;

      // align accent sport
      const t = loadTheme() || { mode: document.documentElement.getAttribute("data-theme") || "dark", sport: ui.sport };
      saveTheme({ ...t, sport: ui.sport });
      applyTheme(loadTheme());

      persist(null, { silentToast: true });
      saveUI();
      render("train");
    });

    stSel.addEventListener("change", () => {
      ui.sessionType = stSel.value;
      saveUI();
      render("train");
    });

    document.querySelectorAll("[data-inj]").forEach(cb => {
      cb.addEventListener("change", () => {
        const k = cb.getAttribute("data-inj");
        ui.injuries = ui.injuries || [];
        if (cb.checked) { if (!ui.injuries.includes(k)) ui.injuries.push(k); }
        else ui.injuries = ui.injuries.filter(x => x !== k);
        state.profile.injuries = ui.injuries.slice();
        persist(null, { silentToast: true });
        saveUI();
        render("train");
      });
    });

    $("piqResetFilters").addEventListener("click", () => {
      ui.injuries = [];
      state.profile.injuries = [];
      persist(null, { silentToast: true });
      saveUI();
      render("train");
      toast("Filters reset");
    });

    $("piqMakeToday").addEventListener("click", () => {
      state.profile.preferred_session_type = ui.sessionType;
      persist("Today preference saved");
      toast("Home → Today will use this session type");
      renderHome();
    });

    $("piqSaveSession").addEventListener("click", () => {
      const mins = safeNum($("piqMinutes").value, 30);
      const srpe = safeNum($("piqSrpe").value, 6);
      addSessionLog({
        dateISO: new Date().toISOString(),
        sport: ui.sport,
        sessionType: ui.sessionType,
        minutes: mins,
        srpe,
        planTitle: plan.title
      });
      render("train");
    });

    renderSessionHistory($("piqHistory"), 12);
  }

  // ---------------- Render map ----------------
  const renderMap = { home: renderHome, team: renderTeam, train: renderTrain, profile: renderProfile };
  function render(view) { setTeamPill(); renderMap[view]?.(); }

  // ---------------- Micro-tours ----------------
  const toursKey = "piq_tours_v2";
  function loadTours() { try { return JSON.parse(localStorage.getItem(toursKey) || "null") || {}; } catch { return {}; } }
  function saveTours(t) { localStorage.setItem(toursKey, JSON.stringify(t || {})); }
  let tours = loadTours();

  function tourScript(role, tab) {
    const scripts = {
      home: { coach:"Home: Today generates a session-type plan and logs it fast.", athlete:"Home: Today = Generate → Start → Done.", parent:"Home: view Today plan + targets." },
      team: { coach:"Team: roster + access later.", athlete:"Team: join later via cloud.", parent:"Team: context & access." },
      train:{ coach:"Train: session type changes the workout.", athlete:"Train: follow plan and Save session.", parent:"Train: see the plan." },
      profile:{ coach:"Profile: generate report (Print → PDF).", athlete:"Profile: preferences + history.", parent:"Profile: preferences + history." }
    };
    return scripts?.[tab]?.[role] || "Tip: explore each tab to get started.";
  }
  function autoTourFor(tab) {
    const role = state.profile?.role || "coach";
    tours[role] = tours[role] || {};
    if (tours[role][tab]) return;
    tours[role][tab] = true;
    saveTours(tours);
    toast(tourScript(role, tab), 2400);
  }
  function runTourForCurrentTab() {
    const active =
      document.querySelector(".navbtn.active")?.dataset.view ||
      document.querySelector(".bottomnav .tab.active")?.dataset.view ||
      state.ui.view || "home";
    toast(tourScript(state.profile?.role || "coach", active), 2400);
  }

  // ---------------- Tooltips ----------------
  function bindTooltips() {
    const tips = {
      tipToday: "Today uses your preferred session type (set in Train). Generate → Start timer → Done (log).",
      tipQuick: "Quick actions jump to the most common tabs.",
      tipTeam: "Team expands with cloud roles later.",
      tipTrain: "Session type changes the workout. Use “Make this Today” to set Home preference.",
      tipProfile: "Coach report: Print → Save as PDF."
    };
    Object.keys(tips).forEach(id => $(id)?.addEventListener("click", () => toast(tips[id], 3200)));
  }

  // ---------------- Data management ----------------
  function exportFile(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function openHardResetModal(onConfirm) {
    if (!confirm("Reset local data on this device?")) return;
    const typed = prompt("Type RESET to confirm:");
    if ((typed || "").trim().toUpperCase() !== "RESET") return;
    if (!confirm("Final confirm: All local data will be lost. Continue?")) return;
    onConfirm?.();
  }
  function resetLocalWithUndo() {
    const prev = JSON.parse(JSON.stringify(state));
    try {
      localStorage.removeItem("piq_local_state_v2");
      state = window.dataStore.load();
      persist(null, { silentToast: true });
      render("home");
      showUndoToast("Local data reset.", () => {
        state = prev;
        persist(null, { silentToast: true });
        render(state.ui?.view || "home");
      });
      toast("Reset complete");
    } catch {
      toast("Reset failed");
    }
  }
  function importJSONWithUndo(text) {
    const prev = JSON.parse(JSON.stringify(state));
    try {
      window.dataStore.importJSON(text);
      state = window.dataStore.load();
      persist(null, { silentToast: true });
      render("home");
      showUndoToast("Import complete (overwrote local).", () => {
        state = prev;
        persist(null, { silentToast: true });
        render(state.ui?.view || "home");
      });
      toast("Imported");
    } catch {
      toast("Import failed");
    }
  }

  // ---------------- Phase 1 onboarding wizard (FIXED Try Now) ----------------
  function openOnboardingWizard() {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(2,6,12,.55)";
    overlay.style.zIndex = "999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";

    overlay.innerHTML = `
      <div style="width:min(560px,92vw);background:var(--top);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:10px;align-items:center">
          <div>
            <div style="font-family:var(--font-head);font-weight:800;font-size:18px">Welcome to PerformanceIQ</div>
            <div class="small muted" id="obSub">Step 1 of 5</div>
          </div>
          <button class="btn ghost" id="obSkip" style="display:none">Skip</button>
        </div>
        <div style="padding:16px" id="obBody"></div>
        <div style="padding:14px 16px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:10px;align-items:center">
          <button class="btn ghost" id="obBack" disabled>Back</button>
          <button class="btn" id="obNext">Next</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    let step = 1;
    const total = 5;

    const elSub = overlay.querySelector("#obSub");
    const elBody = overlay.querySelector("#obBody");
    const btnBack = overlay.querySelector("#obBack");
    const btnNext = overlay.querySelector("#obNext");
    const btnSkip = overlay.querySelector("#obSkip");

    function closeWizard(markComplete) {
      if (markComplete) { meta.onboarded_v1 = true; saveMeta(meta); }
      overlay.remove();
    }

    function renderStep() {
      elSub.textContent = `Step ${step} of ${total}`;
      btnBack.disabled = step === 1;
      btnSkip.style.display = step >= 2 ? "inline-flex" : "none";

      if (step === 1) {
        elBody.innerHTML = `
          <div class="field">
            <label>Choose your role</label>
            <select id="obRole">
              <option value="coach">Coach</option>
              <option value="athlete">Athlete</option>
              <option value="parent">Parent</option>
            </select>
          </div>
          <div class="field" style="margin-top:10px">
            <label>Choose your sport</label>
            <select id="obSport">
              <option value="basketball">Basketball</option>
              <option value="football">Football</option>
              <option value="soccer">Soccer</option>
              <option value="baseball">Baseball</option>
              <option value="volleyball">Volleyball</option>
              <option value="track">Track</option>
            </select>
          </div>
          <div class="field" style="margin-top:10px">
            <label>Preferred session type</label>
            <select id="obSessionType">
              <option value="strength">Strength</option>
              <option value="speed">Speed</option>
              <option value="conditioning">Conditioning</option>
              <option value="skill">Skill</option>
              <option value="recovery">Recovery</option>
            </select>
          </div>
          <div class="small muted" style="margin-top:10px;line-height:1.6">
            Role changes what you see first. Sport + session type change Today + Train plans.
          </div>
        `;
        elBody.querySelector("#obRole").value = state.profile?.role || "coach";
        elBody.querySelector("#obSport").value = state.profile?.sport || "basketball";
        elBody.querySelector("#obSessionType").value = state.profile?.preferred_session_type || "strength";
        return;
      }

      if (step === 2) {
        const role = state.profile?.role || "coach";
        elBody.innerHTML = `
          <div style="font-weight:900;margin-bottom:6px">Preview</div>
          <div class="small muted" style="line-height:1.7">
            ${role === "coach" ? "Coach mode emphasizes planning sessions and reports."
            : role === "athlete" ? "Athlete mode emphasizes Today + logging."
            : "Parent mode emphasizes understanding the plan."}
          </div>
          <div class="hr"></div>
          <div style="font-weight:900;margin-bottom:6px">Tip</div>
          <div class="small muted">Press Ctrl/⌘+K any time to search Help.</div>
        `;
        return;
      }

      if (step === 3) {
        elBody.innerHTML = `
          <div style="font-weight:900;margin-bottom:6px">Try it now</div>
          <div class="small muted" style="line-height:1.7">
            Tap the button below to jump to Home and run Today.
          </div>
          <div class="hr"></div>
          <button class="btn" id="obTryToday">Try Today now</button>
          <div class="small muted" style="margin-top:10px">
            This will close onboarding so you can tap the app.
          </div>
        `;
        elBody.querySelector("#obTryToday").addEventListener("click", () => {
          closeWizard(true);              // ✅ FIX: remove overlay so taps work
          showView("home");
          toast("Tap Today: Generate → Start → Done", 3200);
        });
        return;
      }

      if (step === 4) {
        elBody.innerHTML = `
          <div style="font-weight:900;margin-bottom:6px">Team or Solo</div>
          <div class="small muted" style="line-height:1.7">
            You can run solo local-only. Cloud sync is optional and in Account.
          </div>
          <div class="hr"></div>
          <button class="btn ghost" id="obOpenAccount">Open Account</button>
        `;
        elBody.querySelector("#obOpenAccount").addEventListener("click", () => openDrawer());
        return;
      }

      elBody.innerHTML = `
        <div style="font-weight:900;margin-bottom:6px">You’re ready</div>
        <div class="small muted" style="line-height:1.7">
          Suggested next steps:
          <ul style="margin-top:8px;padding-left:18px">
            <li>Home → Today workflow</li>
            <li>Train → change session type (it changes the workout)</li>
            <li>Profile → Coach report (Print → PDF)</li>
          </ul>
        </div>
        <div class="hr"></div>
        <button class="btn" id="obFinish">Finish</button>
      `;
      elBody.querySelector("#obFinish").addEventListener("click", () => closeWizard(true));
    }

    btnBack.addEventListener("click", () => { if (step > 1) { step--; renderStep(); } });
    btnNext.addEventListener("click", () => {
      if (step === 1) {
        const role = elBody.querySelector("#obRole").value;
        const sport = elBody.querySelector("#obSport").value;
        const st = elBody.querySelector("#obSessionType").value;

        state.profile.role = role;
        state.profile.sport = sport;
        state.profile.preferred_session_type = st;
        persist(null, { silentToast: true });

        const t = loadTheme() || { mode: "dark", sport };
        saveTheme({ ...t, sport });
        applyTheme(loadTheme());
      }
      if (step < total) { step++; renderStep(); }
      else closeWizard(true);
    });
    btnSkip.addEventListener("click", () => closeWizard(true));

    renderStep();
  }

  // ---------------- Bindings ----------------
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
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeDrawer(); closeHelp(); closeSheet(); }
    });
  }

  function bindHelp() {
    $("btnHelp")?.addEventListener("click", openHelp);
    $("btnCloseHelp")?.addEventListener("click", closeHelp);
    $("helpBackdrop")?.addEventListener("click", closeHelp);
    $("helpSearch")?.addEventListener("input", (e) => renderHelpResults((e.target.value || "").trim()));
    document.addEventListener("keydown", (e) => {
      const isK = (e.key || "").toLowerCase() === "k";
      if ((e.ctrlKey || e.metaKey) && isK) { e.preventDefault(); openHelp(); }
    });
  }

  function bindFab() {
    $("fab")?.addEventListener("click", openSheet);
    $("btnCloseSheet")?.addEventListener("click", closeSheet);
    $("sheetBackdrop")?.addEventListener("click", closeSheet);

    $("fabLogWorkout")?.addEventListener("click", () => { closeSheet(); showView("train"); });
    $("fabLogNutrition")?.addEventListener("click", () => { closeSheet(); toast("Nutrition deep features are Phase 3+", 2800); });
    $("fabLogWellness")?.addEventListener("click", () => { closeSheet(); toast("Wellness tracking is Phase 3+", 2800); });
  }

  function bindThemeControls() {
    $("btnThemeToggle")?.addEventListener("click", toggleThemeMode);

    $("btnSaveTheme")?.addEventListener("click", () => {
      const mode = ($("themeModeSelect")?.value || "dark");
      const sport = ($("themeSportSelect")?.value || (state.profile?.sport || "basketball"));
      saveTheme({ mode, sport });
      applyTheme(loadTheme());
      toast("Theme saved");
    });
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

      const t = loadTheme() || { mode: document.documentElement.getAttribute("data-theme") || "dark", sport: state.profile.sport };
      saveTheme({ ...t, sport: state.profile.sport });
      applyTheme(loadTheme());

      render(state.ui.view || "home");
    });

    $("btnRunTour")?.addEventListener("click", runTourForCurrentTab);

    $("btnExport")?.addEventListener("click", () => {
      try {
        const json = window.dataStore.exportJSON();
        exportFile(`performanceiq-export-${new Date().toISOString().slice(0,10)}.json`, json);
        $("dataMsg") && ($("dataMsg").textContent = "Exported JSON file.");
        toast("Exported");
      } catch {
        $("dataMsg") && ($("dataMsg").textContent = "Export failed.");
        toast("Export failed");
      }
    });

    $("fileImport")?.addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        importJSONWithUndo(text);
        $("dataMsg") && ($("dataMsg").textContent = "Imported (Undo available).");
      } catch {
        $("dataMsg") && ($("dataMsg").textContent = "Import failed.");
        toast("Import failed");
      } finally {
        e.target.value = "";
      }
    });

    $("btnResetLocal")?.addEventListener("click", () => {
      openHardResetModal(() => {
        resetLocalWithUndo();
        $("dataMsg") && ($("dataMsg").textContent = "Reset performed (Undo available).");
      });
    });

    $("btnRunGrade")?.addEventListener("click", () => {
      const rep = runQaGrade();
      $("gradeReport").textContent = rep.summary;
      console.log("PIQ QA GRADE", rep);
    });
  }

  // ---------------- QA Grade ----------------
  function runQaGrade() {
    const issues = [];
    if (!$("todayBlock")) issues.push("Home Today block missing");
    if (!$("trainBody")) issues.push("Train body missing");
    if (!$("btnThemeToggle")) issues.push("Theme toggle missing");
    if (!$("btnExport") || !$("fileImport") || !$("btnResetLocal")) issues.push("Data Management missing");
    const grade = issues.length === 0 ? "A" : (issues.length <= 2 ? "B" : "C");
    return { grade, summary: issues.length ? `WARN — Grade ${grade}: ${issues.join("; ")}` : "PASS — Grade A", issues };
  }

  // ---------------- Splash ----------------
  function hideSplash() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    setTimeout(() => s.setAttribute("aria-hidden", "true"), 250);
  }

  // ---------------- Boot ----------------
  function boot() {
    const savedTheme = loadTheme() || { mode: "dark", sport: (state.profile?.sport || "basketball") };
    saveTheme(savedTheme);
    applyTheme(savedTheme);

    bindNav();
    bindDrawer();
    bindHelp();
    bindFab();
    bindThemeControls();
    bindAccountControls();
    bindTooltips();

    setTeamPill();
    setDataStatus("off");

    showView(state.ui?.view || "home");
    startAutosave();
    hideSplash();

    if (!meta.onboarded_v1) openOnboardingWizard();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
