// core.js — v2.6.0 (Phase 1: Help system + FAB + Train sport picker + Data Mgmt + dropdown fixes)
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

  // ---------------- Meta ----------------
  const metaKey = "piq_meta_v2";
  function loadMeta() { try { return JSON.parse(localStorage.getItem(metaKey) || "null") || {}; } catch { return {}; } }
  function saveMeta(m) { localStorage.setItem(metaKey, JSON.stringify(m || {})); }
  let meta = loadMeta();
  meta.lastLocalSaveAt = meta.lastLocalSaveAt || null;
  meta.lastCloudSyncAt = meta.lastCloudSyncAt || null;
  meta.syncState = meta.syncState || "off";
  saveMeta(meta);

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
      syncing: { label: "Syncing…", color: "#2EC4B6" },
      synced: { label: "Synced", color: "#22C55E" },
      off: { label: "Sync off", color: "rgba(255,255,255,.35)" },
      error: { label: "Sync failed — open Account to retry", color: "#FF2D55" }
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

  // ---------------- Help drawer (Phase 1) ----------------
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

  // Help KB
  function helpArticles() {
    const role = state.profile?.role || "coach";
    return [
      { k: "today", title: "Today workflow", body: "Tap Today to generate a plan, start a timer, then log when done. Fastest way to track consistency." },
      { k: "train", title: "Train tab", body: "Pick sport + session type, choose injury filters, view warm-up + microblocks, then Save session to log minutes and sRPE." },
      { k: "srpe", title: "sRPE & training load", body: "sRPE is effort 0–10. Load = minutes × sRPE. Use it to track week-to-week workload." },
      { k: "injury", title: "Injury-friendly templates", body: "Select injury tags (knee/ankle/shoulder/back) to generate safer templates and substitutions." },
      { k: "data", title: "Data Management", body: "Export JSON to backup, Import JSON to restore, and Reset local if needed. Undo appears for 6 seconds after destructive actions." },
      { k: "coach", title: "Coach workflow", body: "Use Train to generate templates, then track athlete sessions. Share summaries in later phases." },
      { k: "athlete", title: "Athlete workflow", body: "Use Today daily. Use Train for full sessions. Use Quick Log (＋) when you’re in a rush." },
      { k: "parent", title: "Parent workflow", body: "Use Home for targets, Train to understand the plan, and sessions history to see consistency." },
      { k: "shortcuts", title: "Shortcuts", body: "Press Ctrl/⌘+K to open Help Search from anywhere." },
      { k: role, title: "Role tips", body: `You are in ${role} mode. Use Help to learn each tab quickly.` },
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

  // ---------------- FAB (Phase 1) ----------------
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

  // ---------------- Skill microblocks ----------------
  function skillMicroblocksFor(sport) {
    const map = {
      basketball: [
        { name: "Ball Handling: Stationary (3 mins)", duration: 3 },
        { name: "Ball Handling: Two-ball (4 mins)", duration: 4 },
        { name: "Shooting: Form + arc (6 mins)", duration: 6 },
        { name: "Shooting: Spot-up game pace (8 mins)", duration: 8 },
        { name: "Footwork: Closeout + retreat (4 mins)", duration: 4 }
      ],
      football: [
        { name: "Route running: stem + break (8 mins)", duration: 8 },
        { name: "Catching: hands only (6 mins)", duration: 6 },
        { name: "Release vs press (6 mins)", duration: 6 }
      ],
      soccer: [
        { name: "Dribble cone weave (8 mins)", duration: 8 },
        { name: "Shooting placement (6 mins)", duration: 6 },
        { name: "Passing wall reps (5 mins)", duration: 5 }
      ],
      baseball: [
        { name: "Arm path warm-up (6 mins)", duration: 6 },
        { name: "Fielding → throw footwork (8 mins)", duration: 8 },
        { name: "Long toss controlled (8 mins)", duration: 8 }
      ],
      volleyball: [
        { name: "Approach footwork rhythm (6 mins)", duration: 6 },
        { name: "Blocking hand position (5 mins)", duration: 5 },
        { name: "Spike contact timing (6 mins)", duration: 6 }
      ],
      track: [
        { name: "A/B drill set (6 mins)", duration: 6 },
        { name: "Starts: drive phase (6 mins)", duration: 6 },
        { name: "Curve running control (6 mins)", duration: 6 }
      ]
    };
    return map[sport] || map.basketball;
  }

  // ---------------- Warm-up generator ----------------
  function warmupFor(sport) {
    const base = [
      "Breathing reset (1 min)",
      "Light pulse raise (2–3 min)",
      "Mobility: ankles + hips + T-spine (3–4 min)"
    ];
    const extra = {
      basketball: ["Footwork: closeout slides (2×15s)"],
      football: ["Accel prep: falling starts (3×10yd)"],
      soccer: ["Adductor flow (2×8/side)"],
      baseball: ["Throwing progression (light)"],
      volleyball: ["Approach footwork (3×3)"],
      track: ["A-skips + B-skips (2–3 min)"]
    };
    return base.concat(extra[sport] || []);
  }

  // ---------------- Injury-friendly templates ----------------
  function injuryTemplate(sport, injuryTag) {
    const inj = injuryTag || null;
    const title = `${sport} — ${inj ? inj + "-friendly" : "standard"} session`;
    const blocks = [
      { h: "Warm-up", items: warmupFor(sport) },
      { h: "Skill microblocks", items: skillMicroblocksFor(sport).slice(0, 3).map(x => x.name) }
    ];

    if (inj === "knee") blocks.push({ h: "Knee-friendly strength", items: ["Split squat (light)", "Hamstring eccentrics", "Bike intervals (low impact)"] });
    else if (inj === "ankle") blocks.push({ h: "Ankle-friendly work", items: ["Balance progression", "Isometric calf holds", "Bike or pool option"] });
    else if (inj === "shoulder") blocks.push({ h: "Shoulder-friendly work", items: ["Band ER", "Scap work", "Avoid heavy overhead pressing"] });
    else if (inj === "back") blocks.push({ h: "Back-safe work", items: ["Glute bridge / hip hinge regressions", "Pallof press", "Avoid heavy flexion"] });
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

  // ---------------- Render Home ----------------
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
    $("todayBlock").innerHTML = `
      <div class="small muted">Nutrition targets (auto)</div>
      <div style="margin-top:8px" class="small">
        Calories: <b>${targets.calories}</b><br/>
        Protein: <b>${targets.protein_g}g</b> • Carbs: <b>${targets.carbs_g}g</b> • Fat: <b>${targets.fat_g}g</b>
      </div>
      <div style="margin-top:10px" class="small muted">Today plan</div>
      <div style="margin-top:6px" class="small">
        ${plan ? `<b>${plan.title}</b>` : "Not generated yet"}
      </div>
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

  // ---------------- Render Team ----------------
  function renderTeam() {
    const teams = state.team?.teams || [];
    const body = $("teamBody");
    if (!teams.length) {
      body.innerHTML = `<div class="mini"><div class="minihead">No teams yet</div><div class="minibody">You can test locally. For shared teams + invites, enable Cloud in Account.</div></div>`;
      return;
    }
    body.innerHTML = `
      <div class="mini">
        <div class="minihead">Teams</div>
        <div class="minibody">
          ${teams.map(t => `
            <div style="padding:8px 0; border-top: 1px solid var(--line)">
              <b>${t.name}</b><div class="small muted">${t.sport || ""}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // ---------------- Render Train (✅ sport picker added) ----------------
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
    ui.injuries = Array.isArray(ui.injuries) ? ui.injuries : [];
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
              <div style="font-weight:1000">${b.h}</div>
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
    if (sportSel) sportSel.value = ui.sport;
    if (st) st.value = ui.sessionType;
    if (lv) lv.value = ui.level;

    sportSel?.addEventListener("change", () => {
      ui.sport = sportSel.value;
      // optionally also set profile sport for consistency:
      state.profile.sport = ui.sport;
      persist(null, { silentToast: true });
      saveUI();
      render("train");
    });

    st?.addEventListener("change", () => { ui.sessionType = st.value; saveUI(); render("train"); });
    lv?.addEventListener("change", () => { ui.level = lv.value; saveUI(); render("train"); });

    document.querySelectorAll("[data-inj]").forEach(cb => {
      cb.addEventListener("change", () => {
        const k = cb.getAttribute("data-inj");
        ui.injuries = ui.injuries || [];
        if (cb.checked) { if (!ui.injuries.includes(k)) ui.injuries.push(k); }
        else ui.injuries = ui.injuries.filter(x => x !== k);
        // persist injuries into profile too
        state.profile.injuries = ui.injuries.slice();
        persist(null, { silentToast: true });
        saveUI();
        render("train");
      });
    });

    $("piqResetFilters")?.addEventListener("click", () => {
      ui.injuries = [];
      state.profile.injuries = [];
      persist(null, { silentToast: true });
      saveUI();
      render("train");
      toast("Filters reset");
    });

    $("piqSaveSession")?.addEventListener("click", () => {
      const mins = safeNum($("piqMinutes")?.value, 30);
      const srpe = safeNum($("piqSrpe")?.value, 6);
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
                <div style="font-weight:1000">${(s.planTitle||s.sessionType||"session").toUpperCase()}</div>
                <div class="small muted">${(s.date||"").slice(0,10)} • ${s.minutes} min • sRPE ${s.srpe} • Load ${s.load}</div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // ---------------- Render Profile ----------------
  function renderProfile() {
    const role = state.profile?.role || "coach";
    const sport = state.profile?.sport || "basketball";
    $("profileBody").innerHTML = `
      <div class="mini">
        <div class="minihead">Preferences</div>
        <div class="minibody">
          Role: <b>${role}</b><br/>
          Sport: <b>${sport}</b><br/>
          Injuries: <b>${(state.profile?.injuries||[]).join(", ") || "none"}</b><br/>
          <span class="small muted">Edit in Account → Role & Sport.</span>
        </div>
      </div>
    `;
  }

  // ---------------- Render map ----------------
  const renderMap = { home: renderHome, team: renderTeam, train: renderTrain, profile: renderProfile };
  function render(view) {
    setTeamPill();
    renderMap[view]?.();
    applyStatusFromMeta();
  }

  // ---------------- Cloud (best-effort) ----------------
  let sb = null;
  function validSupabaseUrl(u) { return typeof u === "string" && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(u.trim()); }
  function initSupabaseIfPossible() {
    const cfg = loadCloudCfg();
    if (!cfg || !cfg.url || !cfg.anon) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    if (!validSupabaseUrl(cfg.url)) return null;
    try {
      return window.supabase.createClient(cfg.url.trim(), cfg.anon.trim(), {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    } catch { return null; }
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
  function applyStatusFromMeta() {
    const cfg = loadCloudCfg();
    if (!cfg || !cfg.url || !cfg.anon) { setDataStatus("off"); return; }
    if (!sb) { setDataStatus("error"); return; }
    if (meta.syncState === "synced" && meta.lastCloudSyncAt) setDataStatus("synced", timeAgo(meta.lastCloudSyncAt));
    else if (meta.syncState === "syncing") setDataStatus("syncing");
    else setDataStatus("local", timeAgo(meta.lastLocalSaveAt));
  }

  async function cloudTest() {
    const msg = $("cloudMsg");
    if (!sb) { if (msg) msg.textContent = "Cloud is off (local-only)."; setDataStatus("off"); return; }
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

  async function pushToCloud() {
    const syncMsg = $("syncMsg");
    if (syncMsg) syncMsg.textContent = "Syncing…";
    setDataStatus("syncing");
    if (!sb) { applyStatusFromMeta(); return; }

    const { data: sess } = await sb.auth.getSession();
    if (!sess?.session) { if (syncMsg) syncMsg.textContent = "Sign in to sync."; applyStatusFromMeta(); return; }

    try {
      const updatedAt = new Date().toISOString();
      const { error } = await sb
        .from("piq_user_state")
        .upsert({ user_id: sess.session.user.id, state, updated_at: updatedAt }, { onConflict: "user_id" });
      if (error) throw error;

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
    if (!sb) { applyStatusFromMeta(); return; }

    const { data: sess } = await sb.auth.getSession();
    if (!sess?.session) { if (syncMsg) syncMsg.textContent = "Sign in to sync."; applyStatusFromMeta(); return; }

    const prev = JSON.parse(JSON.stringify(state));
    try {
      const { data, error } = await sb
        .from("piq_user_state")
        .select("state")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      if (error) throw error;

      if (data?.state) {
        state = data.state;
        state.profile = state.profile || {};
        state.team = state.team || { teams: [], active_team_id: null };
        state.ui = state.ui || { view: "home" };
        state.sessions = Array.isArray(state.sessions) ? state.sessions : [];
        persist(null, { silentToast: true });

        showUndoToast("Pulled from cloud.", () => {
          state = prev;
          persist(null, { silentToast: true });
          render(state.ui?.view || "home");
        });
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

  // ---------------- Data Management ----------------
  function exportFile(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function openHardResetModal(onConfirm) {
    // Simple but safe: triple-confirm gate via prompt chain (works everywhere)
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

  // ---------------- Micro-tours (kept) ----------------
  const toursKey = "piq_tours_v2";
  function loadTours() { try { return JSON.parse(localStorage.getItem(toursKey) || "null") || {}; } catch { return {}; } }
  function saveTours(t) { localStorage.setItem(toursKey, JSON.stringify(t || {})); }
  let tours = loadTours();

  function tourScript(role, tab) {
    const scripts = {
      home: {
        coach: "Home: use Today to generate & log sessions fast. Use Help (Ctrl/⌘+K) anytime.",
        athlete: "Home: hit Today daily. Use ＋ for quick log when in a rush.",
        parent: "Home: view targets + Today overview. Use Train to understand the plan."
      },
      team: {
        coach: "Team: roster + access live here (cloud expands later).",
        athlete: "Team: join a team when cloud invites are enabled.",
        parent: "Team: context & access."
      },
      train: {
        coach: "Train: pick sport + session type. Add injury tags. Save session to log load.",
        athlete: "Train: follow the plan and save your session.",
        parent: "Train: see what training looks like today."
      },
      profile: {
        coach: "Profile: preferences and injury tags.",
        athlete: "Profile: preferences and injury tags.",
        parent: "Profile: preferences and injury tags."
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
      state.ui.view || "home";
    toast(tourScript(state.profile?.role || "coach", active), 2600);
  }

  // ---------------- Tooltips (Phase 1) ----------------
  function bindTooltips() {
    const tips = {
      tipToday: "Today = fastest workflow: Generate → Start timer → Log → Done.",
      tipQuick: "Quick actions jump to the most common tabs.",
      tipTeam: "Team is where roster and shared access will expand when cloud is enabled.",
      tipTrain: "Train builds a session: choose sport, injury tags, then save to log minutes & sRPE.",
      tipProfile: "Profile shows your role, sport, and injury tags that affect templates.",
      tipRoleSport: "Role changes what the app emphasizes. Sport changes microblocks and templates.",
      tipDataMgmt: "Export/Import/Reset are device-level. Undo appears for 6 seconds after actions."
    };
    Object.keys(tips).forEach(id => {
      $(id)?.addEventListener("click", () => toast(tips[id], 3200));
    });
  }

  // ---------------- QA Grade ----------------
  function runQaGrade() {
    const issues = [];
    if (!$("piqSportPickTrain")) issues.push("Train sport picker missing");
    if (!$("btnExport") || !$("fileImport") || !$("btnResetLocal")) issues.push("Data Management missing");
    if (!$("helpDrawer") || !$("helpSearch")) issues.push("Help drawer missing");
    if (!$("fab") || !$("fabSheet")) issues.push("FAB missing");
    if (!autosaveTimer) issues.push("Autosave not running");
    const grade = issues.length === 0 ? "A" : (issues.length <= 2 ? "B" : "C");
    const summary = issues.length === 0 ? "PASS — Grade A" : `WARN — Grade ${grade}: ${issues.join("; ")}`;
    return { grade, summary, issues, at: new Date().toISOString() };
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
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeDrawer(); closeHelp(); closeSheet(); } });
  }

  function bindHelp() {
    $("btnHelp")?.addEventListener("click", openHelp);
    $("btnCloseHelp")?.addEventListener("click", closeHelp);
    $("helpBackdrop")?.addEventListener("click", closeHelp);
    $("helpSearch")?.addEventListener("input", (e) => renderHelpResults((e.target.value || "").trim()));

    // Ctrl/⌘+K
    document.addEventListener("keydown", (e) => {
      const isK = (e.key || "").toLowerCase() === "k";
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        openHelp();
      }
    });
  }

  function bindFab() {
    $("fab")?.addEventListener("click", openSheet);
    $("btnCloseSheet")?.addEventListener("click", closeSheet);
    $("sheetBackdrop")?.addEventListener("click", closeSheet);

    $("fabLogWorkout")?.addEventListener("click", () => {
      closeSheet();
      showView("train");
      toast("Use Train → Save session for a detailed log.", 2600);
    });
    $("fabLogNutrition")?.addEventListener("click", () => {
      closeSheet();
      toast("Nutrition quick log is Phase 3. For now, use Home targets.", 2800);
    });
    $("fabLogWellness")?.addEventListener("click", () => {
      closeSheet();
      toast("Wellness quick log is Phase 2/3. Coming next.", 2800);
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
      render(state.ui.view || "home");
    });

    $("btnRunTour")?.addEventListener("click", runTourForCurrentTab);

    // Cloud
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

  // ---------------- Boot ----------------
  function hideSplash() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    setTimeout(() => s.setAttribute("aria-hidden", "true"), 250);
  }

  function boot() {
    sb = initSupabaseIfPossible();

    bindNav();
    bindDrawer();
    bindHelp();
    bindFab();
    bindAccountControls();
    bindTooltips();

    setTeamPill();
    refreshCloudPill();

    const cfg = loadCloudCfg();
    if (!cfg || !cfg.url || !cfg.anon) setDataStatus("off");
    else if (!sb) setDataStatus("error");
    else setDataStatus("local", timeAgo(meta.lastLocalSaveAt));

    const initial = state.ui?.view || "home";
    showView(initial);
    startAutosave();
    hideSplash();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // Expose QA for debugging
  window.__PIQ = window.__PIQ || {};
  window.__PIQ.runQaGrade = runQaGrade;
})();
