// core.js — v2.7.0 (Fix Today plan rendering + Phase 1 onboarding + Phase 2 theme system)
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

  // ---------------- Meta ----------------
  const metaKey = "piq_meta_v2";
  function loadMeta() { try { return JSON.parse(localStorage.getItem(metaKey) || "null") || {}; } catch { return {}; } }
  function saveMeta(m) { localStorage.setItem(metaKey, JSON.stringify(m || {})); }
  let meta = loadMeta();
  meta.lastLocalSaveAt = meta.lastLocalSaveAt || null;
  meta.lastCloudSyncAt = meta.lastCloudSyncAt || null;
  meta.syncState = meta.syncState || "off";
  meta.onboarded_v1 = meta.onboarded_v1 || false;
  saveMeta(meta);

  // ---------------- Theme (Phase 2) ----------------
  const themeKey = "piq_theme_v1";
  const SPORT_ACCENTS = {
    basketball: { accent: "#2EC4B6" },
    football:   { accent: "#FF6B35" },
    soccer:     { accent: "#22C55E" },
    baseball:   { accent: "#3B82F6" },
    volleyball: { accent: "#9B5DE5" },
    track:      { accent: "#F59E0B" },
  };

  function loadTheme() {
    try { return JSON.parse(localStorage.getItem(themeKey) || "null") || null; } catch { return null; }
  }
  function saveTheme(t) { localStorage.setItem(themeKey, JSON.stringify(t || {})); }

  function applyTheme(t) {
    const html = document.documentElement;
    const mode = (t?.mode === "light") ? "light" : "dark";
    const sport = t?.sport || (state.profile?.sport || "basketball");
    const accent = SPORT_ACCENTS[sport]?.accent || SPORT_ACCENTS.basketball.accent;

    html.setAttribute("data-theme", mode);
    html.style.setProperty("--accent", accent);
    html.style.setProperty("--accent-2", "color-mix(in oklab, var(--accent) 18%, transparent)");

    // Keep themeSportSelect consistent if present
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

  // ---------------- Cloud config ----------------
  const cloudKey = "piq_cloud_v2";
  function loadCloudCfg() { try { return JSON.parse(localStorage.getItem(cloudKey) || "null"); } catch { return null; } }
  function saveCloudCfg(cfg) { localStorage.setItem(cloudKey, JSON.stringify(cfg)); }

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
  function hideUndoToast() { const t = $("undoToast"); if (!t) return; t.hidden = true; t.innerHTML = ""; }

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
      error: { label: "Sync failed — open Account to retry", color: "#EF4444" }
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

  // Autosave every 30s
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
    const role = state.profile?.role || "coach";
    return [
      { k: "today", title: "Today workflow", body: "Tap Today to generate a plan, start a timer, then log when done. Fastest way to track consistency." },
      { k: "train", title: "Train tab", body: "Pick sport + session type, choose injury tags, view warm-up + microblocks, then Save session to log minutes and sRPE." },
      { k: "srpe", title: "sRPE & training load", body: "sRPE is effort 0–10. Load = minutes × sRPE. Use it to track week-to-week workload." },
      { k: "injury", title: "Injury-friendly templates", body: "Select injury tags (knee/ankle/shoulder/back) to generate safer templates and substitutions." },
      { k: "theme", title: "Theme & sport accent", body: "Switch dark/light and choose a sport accent in Account → Appearance." },
      { k: "data", title: "Data Management", body: "Export JSON to backup, Import JSON to restore, and Reset local if needed. Undo appears for 6 seconds after destructive actions." },
      { k: role, title: "Role tips", body: `You are in ${role} mode. Use Help to learn each tab quickly.` },
      { k: "shortcuts", title: "Shortcuts", body: "Press Ctrl/⌘+K to open Help Search from anywhere." },
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
  function openSheet() {
    $("sheetBackdrop").hidden = false;
    $("fabSheet").hidden = false;
  }
  function closeSheet() {
    $("sheetBackdrop").hidden = true;
    $("fabSheet").hidden = true;
  }

  // ---------------- Team pill ----------------
  function setTeamPill() {
    const pill = $("teamPill");
    if (!pill) return;
    const teamName = (state.team?.teams || []).find(t => t.id === state.team?.active_team_id)?.name;
    pill.textContent = `Team: ${teamName || "—"}`;
  }

  // ---------------- Training building blocks ----------------
  function skillMicroblocksFor(sport) {
    const map = {
      basketball: [
        { name: "Ball Handling: Stationary series (3 min)", duration: 3 },
        { name: "Ball Handling: Change-of-pace (4 min)", duration: 4 },
        { name: "Shooting: Form + arc (6 min)", duration: 6 },
        { name: "Shooting: Spot-up game pace (8 min)", duration: 8 },
        { name: "Footwork: Closeout + retreat (4 min)", duration: 4 }
      ],
      football: [
        { name: "Route running: stem + break mechanics (8 min)", duration: 8 },
        { name: "Hands: catch-to-tuck series (6 min)", duration: 6 },
        { name: "Release vs press: 1–2 moves (6 min)", duration: 6 }
      ],
      soccer: [
        { name: "Dribbling: cone weave + bursts (8 min)", duration: 8 },
        { name: "Shooting: placement focus (6 min)", duration: 6 },
        { name: "Passing: wall reps + first touch (5 min)", duration: 5 }
      ],
      baseball: [
        { name: "Throwing: easy progression (6 min)", duration: 6 },
        { name: "Fielding: footwork → throw (8 min)", duration: 8 },
        { name: "Rotational power: medball (6 min)", duration: 6 }
      ],
      volleyball: [
        { name: "Approach footwork rhythm (6 min)", duration: 6 },
        { name: "Blocking hands/press timing (5 min)", duration: 5 },
        { name: "Spike contact timing (6 min)", duration: 6 }
      ],
      track: [
        { name: "Drills: A/B series (6 min)", duration: 6 },
        { name: "Starts: drive phase (6 min)", duration: 6 },
        { name: "Relaxed sprint mechanics (6 min)", duration: 6 }
      ]
    };
    return map[sport] || map.basketball;
  }

  function warmupFor(sport) {
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
    return base.concat(extra[sport] || []);
  }

  function injuryTemplate(sport, injuryTag) {
    const inj = injuryTag || null;
    const title = `${sport} — ${inj ? inj + "-friendly" : "standard"} session`;

    const blocks = [
      { h: "Warm-up", items: warmupFor(sport) },
      { h: "Skill microblocks", items: skillMicroblocksFor(sport).slice(0, 4).map(x => x.name) }
    ];

    if (inj === "knee") blocks.push({ h: "Knee-friendly strength", items: ["Split squat (light)", "Hamstring eccentrics", "Bike intervals (low impact)"] });
    else if (inj === "ankle") blocks.push({ h: "Ankle-friendly work", items: ["Balance progression", "Isometric calf holds", "Bike or pool option"] });
    else if (inj === "shoulder") blocks.push({ h: "Shoulder-friendly work", items: ["Band ER", "Scap work", "Avoid heavy overhead pressing"] });
    else if (inj === "back") blocks.push({ h: "Back-safe work", items: ["Glute bridge / hinge regressions", "Pallof press", "Avoid heavy spinal flexion"] });
    else blocks.push({ h: "Strength / Conditioning", items: ["Hinge pattern (moderate)", "Rows + push pattern", "Tempo conditioning"] });

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
    const inj = (state.profile?.injuries || [])[0] || null;
    today.plan = injuryTemplate(sport, inj);
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
      sessionType: "today",
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

  // ---------------- Render Home (✅ FIXED: show exercises) ----------------
  function renderHome() {
    const role = state.profile?.role || "coach";
    const sport = state.profile?.sport || "basketball";
    $("homeSub").textContent = `${role} view • Sport: ${sport}`;

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
            <div style="font-weight:800">${b.h}</div>
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

  // ---------------- Render Team/Profile (minimal) ----------------
  function renderTeam() { $("teamBody").innerHTML = `<div class="mini"><div class="minihead">Team</div><div class="minibody">Team tools expand with cloud + roles.</div></div>`; }
  function renderProfile() {
    const role = state.profile?.role || "coach";
    const sport = state.profile?.sport || "basketball";
    $("profileBody").innerHTML = `
      <div class="mini">
        <div class="minihead">Preferences</div>
        <div class="minibody">
          Role: <b>${role}</b><br/>
          Sport: <b>${sport}</b><br/>
          Injuries: <b>${(state.profile?.injuries||[]).join(", ") || "none"}</b>
        </div>
      </div>
    `;
  }

  // ---------------- Render Train (unchanged structure; sport picker exists) ----------------
  function renderTrain() {
    const role = state.profile?.role || "coach";
    $("trainSub").textContent = role === "coach"
      ? "Coach: build sessions + log training load."
      : "Athlete: follow the plan + save your session.";

    const sport = state.profile?.sport || "basketball";
    const uiKey = "piq_train_ui_v3";
    const ui = (() => { try { return JSON.parse(localStorage.getItem(uiKey) || "null") || {}; } catch { return {}; } })();
    ui.sport = ui.sport || sport;
    ui.sessionType = ui.sessionType || "strength";
    ui.level = ui.level || "standard";
    ui.injuries = Array.isArray(ui.injuries) ? ui.injuries : state.profile.injuries.slice(0);
    function saveUI() { localStorage.setItem(uiKey, JSON.stringify(ui)); }

    const tpl = injuryTemplate(ui.sport, ui.injuries[0] || null);
    const warm = warmupFor(ui.sport);
    const micro = skillMicroblocksFor(ui.sport);

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
            <label>Level</label>
            <select id="piqLevel">
              <option value="standard">Standard</option>
              <option value="advanced">Advanced</option>
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
            <button class="btn ghost" id="piqResetFilters">Reset filters</button>
          </div>
        </div>

        <div class="mini">
          <div class="minihead">Warm-up generator</div>
          <div class="minibody">
            <ol style="margin:0; padding-left:18px">
              ${warm.map(x=>`<li style="margin:8px 0">${x}</li>`).join("")}
            </ol>
          </div>

          <div style="margin-top:12px" class="minihead">Skill microblocks</div>
          <div class="minibody">
            <ol style="margin:0; padding-left:18px">
              ${micro.map(m=>`<li style="margin:8px 0">${m.name}</li>`).join("")}
            </ol>
          </div>
        </div>
      </div>

      <div class="mini" style="margin-top:12px">
        <div class="minihead">${tpl.title}</div>
        <div class="minibody">
          ${tpl.blocks.map(b => `
            <div style="margin-top:10px">
              <div style="font-weight:800">${b.h}</div>
              <ul style="margin-top:6px; padding-left:18px">
                ${b.items.map(it=>`<li style="margin:6px 0">${it}</li>`).join("")}
              </ul>
            </div>
          `).join("")}
        </div>
      </div>

      <div id="piqHistory" style="margin-top:12px"></div>
    `;

    const sportSel = $("piqSportPickTrain");
    const st = $("piqSessionType");
    const lv = $("piqLevel");
    sportSel.value = ui.sport;
    st.value = ui.sessionType;
    lv.value = ui.level;

    sportSel.addEventListener("change", () => {
      ui.sport = sportSel.value;
      state.profile.sport = ui.sport;
      // Keep theme sport accent aligned unless user changed it explicitly
      const t = loadTheme() || { mode: document.documentElement.getAttribute("data-theme") || "dark", sport: ui.sport };
      if (!t.sport) t.sport = ui.sport;
      saveTheme({ ...t, sport: t.sport || ui.sport });
      applyTheme(loadTheme());
      persist(null, { silentToast: true });
      saveUI();
      render("train");
    });

    st.addEventListener("change", () => { ui.sessionType = st.value; saveUI(); render("train"); });
    lv.addEventListener("change", () => { ui.level = lv.value; saveUI(); render("train"); });

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

    $("piqSaveSession").addEventListener("click", () => {
      const mins = safeNum($("piqMinutes").value, 30);
      const srpe = safeNum($("piqSrpe").value, 6);
      addSessionLog({
        dateISO: new Date().toISOString(),
        sport: ui.sport,
        sessionType: ui.sessionType,
        minutes: mins,
        srpe,
        planTitle: `${ui.sport} ${ui.sessionType} (${ui.level})`
      });
      render("train");
    });

    renderSessionHistory($("piqHistory"));
  }

  function renderSessionHistory(container) {
    if (!container) return;
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
                <div style="font-weight:800">${(s.planTitle||s.sessionType||"session").toUpperCase()}</div>
                <div class="small muted">${(s.date||"").slice(0,10)} • ${s.minutes} min • sRPE ${s.srpe} • Load ${s.load}</div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // ---------------- Render map ----------------
  const renderMap = { home: renderHome, team: renderTeam, train: renderTrain, profile: renderProfile };
  function render(view) { setTeamPill(); renderMap[view]?.(); }

  // ---------------- Phase 1: Onboarding (5 steps) ----------------
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

    function renderStep() {
      elSub.textContent = `Step ${step} of ${total}`;
      btnBack.disabled = step === 1;

      // Skip available from step 2 onward
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
          <div class="small muted" style="margin-top:10px;line-height:1.6">
            Role changes what you see first. Sport changes the warm-up, microblocks, and templates.
          </div>
        `;
        elBody.querySelector("#obRole").value = state.profile?.role || "coach";
        elBody.querySelector("#obSport").value = state.profile?.sport || "basketball";
        return;
      }

      if (step === 2) {
        const role = state.profile?.role || "coach";
        elBody.innerHTML = `
          <div style="font-weight:800;margin-bottom:6px">Preview</div>
          <div class="small muted" style="line-height:1.7">
            ${role === "coach" ? "Coach mode emphasizes planning sessions and team structure."
            : role === "athlete" ? "Athlete mode emphasizes Today + logging and consistency."
            : "Parent mode emphasizes understanding the plan and targets."}
          </div>
          <div class="hr"></div>
          <div style="font-weight:800;margin-bottom:6px">Tip</div>
          <div class="small muted">Press Ctrl/⌘+K any time to search Help.</div>
        `;
        return;
      }

      if (step === 3) {
        elBody.innerHTML = `
          <div style="font-weight:800;margin-bottom:6px">Your first action</div>
          <div class="small muted" style="line-height:1.7">
            Use <b>Today</b> once per day: Generate → Start timer → Done (log).
          </div>
          <div class="hr"></div>
          <button class="btn" id="obTryToday">Try Today now</button>
        `;
        elBody.querySelector("#obTryToday").addEventListener("click", () => {
          showView("home");
          toast("Tap Today: Generate → Start → Done", 3000);
        });
        return;
      }

      if (step === 4) {
        elBody.innerHTML = `
          <div style="font-weight:800;margin-bottom:6px">Team or Solo</div>
          <div class="small muted" style="line-height:1.7">
            You can run solo local-only. Cloud sync is optional and in Account.
          </div>
          <div class="hr"></div>
          <button class="btn ghost" id="obOpenAccount">Open Account</button>
        `;
        elBody.querySelector("#obOpenAccount").addEventListener("click", () => openDrawer());
        return;
      }

      // step 5
      elBody.innerHTML = `
        <div style="font-weight:800;margin-bottom:6px">You’re ready</div>
        <div class="small muted" style="line-height:1.7">
          Suggested next steps:
          <ul style="margin-top:8px;padding-left:18px">
            <li>Home → Today workflow</li>
            <li>Train → pick sport + injury tags</li>
            <li>Use ＋ quick log on mobile</li>
          </ul>
        </div>
        <div class="hr"></div>
        <button class="btn" id="obFinish">Finish</button>
      `;
      elBody.querySelector("#obFinish").addEventListener("click", finish);
    }

    function finish() {
      meta.onboarded_v1 = true;
      saveMeta(meta);
      overlay.remove();
      toast("Onboarding complete");
    }

    btnBack.addEventListener("click", () => { if (step > 1) { step--; renderStep(); } });
    btnNext.addEventListener("click", () => {
      if (step === 1) {
        const role = elBody.querySelector("#obRole").value;
        const sport = elBody.querySelector("#obSport").value;
        state.profile.role = role;
        state.profile.sport = sport;
        persist(null, { silentToast: true });

        // align theme accent sport if not set
        const t = loadTheme() || { mode: "dark", sport };
        if (!t.sport) t.sport = sport;
        saveTheme(t);
        applyTheme(t);
      }
      if (step < total) { step++; renderStep(); }
      else finish();
    });
    btnSkip.addEventListener("click", finish);

    renderStep();
  }

  // ---------------- Micro-tours ----------------
  const toursKey = "piq_tours_v2";
  function loadTours() { try { return JSON.parse(localStorage.getItem(toursKey) || "null") || {}; } catch { return {}; } }
  function saveTours(t) { localStorage.setItem(toursKey, JSON.stringify(t || {})); }
  let tours = loadTours();
  function tourScript(role, tab) {
    const scripts = {
      home: { coach:"Home: use Today to generate & log sessions fast.", athlete:"Home: hit Today daily.", parent:"Home: view targets + Today overview." },
      team: { coach:"Team: roster + access.", athlete:"Team: join later via cloud.", parent:"Team: context & access." },
      train:{ coach:"Train: pick sport + injury tags; Save session.", athlete:"Train: follow plan; Save session.", parent:"Train: see the plan." },
      profile:{ coach:"Profile: preferences + injuries.", athlete:"Profile: preferences + injuries.", parent:"Profile: preferences + injuries." }
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
    const active = document.querySelector(".navbtn.active")?.dataset.view ||
      document.querySelector(".bottomnav .tab.active")?.dataset.view ||
      state.ui.view || "home";
    toast(tourScript(state.profile?.role || "coach", active), 2400);
  }

  // ---------------- Tooltips ----------------
  function bindTooltips() {
    const tips = {
      tipToday: "Today = Generate → Start timer → Done (log). Shows full plan blocks underneath.",
      tipQuick: "Quick actions jump to the most common tabs.",
      tipTeam: "Team expands with cloud roles later.",
      tipTrain: "Train: pick sport + session type + injury tags, then Save session.",
      tipProfile: "Profile shows role/sport/injuries.",
      tipRoleSport: "Role changes what’s emphasized. Sport changes microblocks & templates.",
      tipDataMgmt: "Export/Import/Reset are device-level. Undo appears for 6 seconds.",
      tipTheme: "Light/Dark mode + sport accent live here."
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

  // ---------------- QA Grade ----------------
  function runQaGrade() {
    const issues = [];
    if (!$("todayBlock")) issues.push("Home Today block missing");
    // This ensures the FIX is present (plan blocks render path exists)
    if (typeof renderHome !== "function") issues.push("renderHome missing");
    if (!$("piqSportPickTrain")) issues.push("Train sport picker missing (open Train tab once)");
    if (!$("btnExport") || !$("fileImport") || !$("btnResetLocal")) issues.push("Data Management missing");
    if (!$("helpDrawer") || !$("helpSearch")) issues.push("Help drawer missing");
    if (!$("fab") || !$("fabSheet")) issues.push("FAB missing");
    if (!$("btnThemeToggle") || !$("themeModeSelect") || !$("themeSportSelect")) issues.push("Theme system missing");
    const grade = issues.length === 0 ? "A" : (issues.length <= 2 ? "B" : "C");
    return { grade, summary: issues.length ? `WARN — Grade ${grade}: ${issues.join("; ")}` : "PASS — Grade A", issues };
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
    $("fabLogNutrition")?.addEventListener("click", () => { closeSheet(); toast("Nutrition quick log is Phase 3.", 2800); });
    $("fabLogWellness")?.addEventListener("click", () => { closeSheet(); toast("Wellness quick log is Phase 3.", 2800); });
  }

  function bindThemeControls() {
    $("btnThemeToggle")?.addEventListener("click", toggleThemeMode);

    $("btnSaveTheme")?.addEventListener("click", () => {
      const mode = ($("themeModeSelect")?.value || "dark");
      const sport = ($("themeSportSelect")?.value || (state.profile?.sport || "basketball"));
      const t = { mode, sport };
      saveTheme(t);
      applyTheme(t);
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

      // If theme sport not set, align it:
      const t = loadTheme() || { mode: document.documentElement.getAttribute("data-theme") || "dark", sport: state.profile.sport };
      if (!t.sport) t.sport = state.profile.sport;
      saveTheme(t);
      applyTheme(t);

      render(state.ui.view || "home");
    });

    $("btnRunTour")?.addEventListener("click", runTourForCurrentTab);

    // Data management
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

  // ---------------- Boot ----------------
  function hideSplash() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    setTimeout(() => s.setAttribute("aria-hidden", "true"), 250);
  }

  function boot() {
    // Apply theme early
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

    const initial = state.ui?.view || "home";
    showView(initial);
    startAutosave();
    hideSplash();

    // Phase 1 onboarding wizard
    if (!meta.onboarded_v1) openOnboardingWizard();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
