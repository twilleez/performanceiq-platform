// core.js — v13.2.0
// Micro-tours per tab + safe cloud status indicator + clean UI (no dev info exposed)

(function () {
  "use strict";
  if (window.__PIQ_CORE_V13_2_0__) return;
  window.__PIQ_CORE_V13_2_0__ = true;

  const APP_VERSION = "13.2.0";
  const STORAGE_KEY = "piq_state_v13_local";
  const PUSH_DEBOUNCE_MS = 900;

  const MICRO_TOUR_VERSION = 1;

  const $ = (id) => document.getElementById(id);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const uid = (p = "id") => `${p}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

  // ---------------------------
  // State
  // ---------------------------
  function defaultTeamState(teamId, name) {
    return {
      meta: { teamId, name, createdAt: Date.now(), updatedAt: Date.now() },
      athletes: [],
      logs: { readiness: {}, training: {}, nutrition: {} },
      workouts: {},
      periodization: {}
    };
  }

  function defaultAppState() {
    const localTeamId = uid("team");
    return {
      meta: {
        appVersion: APP_VERSION,
        updatedAt: Date.now(),
        onboarded: false,
        microTours: { version: 0, completed: {} } // { version, completed: { role: { home:true, team:true... } } }
      },
      role: "coach",
      sport: "basketball",
      activeTeamId: localTeamId,
      teams: { [localTeamId]: defaultTeamState(localTeamId, "My Team") },
      cloud: { enabled: false, lastPulledAt: 0, lastPushedAt: 0 }
    };
  }

  function normalizeState(s) {
    const d = defaultAppState();
    if (!s || typeof s !== "object") return d;

    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;
    if (typeof s.meta.onboarded !== "boolean") s.meta.onboarded = false;

    if (!s.meta.microTours || typeof s.meta.microTours !== "object") {
      s.meta.microTours = { version: 0, completed: {} };
    }
    if (typeof s.meta.microTours.version !== "number") s.meta.microTours.version = 0;
    if (!s.meta.microTours.completed || typeof s.meta.microTours.completed !== "object") s.meta.microTours.completed = {};

    s.role = typeof s.role === "string" ? s.role : d.role;
    s.sport = typeof s.sport === "string" ? s.sport : d.sport;

    s.activeTeamId = typeof s.activeTeamId === "string" ? s.activeTeamId : d.activeTeamId;
    s.teams = s.teams && typeof s.teams === "object" ? s.teams : d.teams;

    if (!s.teams[s.activeTeamId]) {
      const tid = s.activeTeamId || uid("team");
      s.activeTeamId = tid;
      s.teams[tid] = defaultTeamState(tid, "My Team");
    }

    s.cloud = s.cloud && typeof s.cloud === "object" ? s.cloud : d.cloud;
    if (typeof s.cloud.enabled !== "boolean") s.cloud.enabled = false;

    return s;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultAppState();
      return normalizeState(JSON.parse(raw));
    } catch {
      return defaultAppState();
    }
  }

  const state = loadState();

  // ---------------------------
  // Save indicator
  // ---------------------------
  let pushTimer = null;

  function setSync(mode, text) {
    const dot = $("syncIndicator");
    const lab = $("syncText");
    if (dot) dot.className = `sync-dot ${mode}`;
    if (lab) lab.textContent = text;
  }

  function cloudReady() {
    return !!(window.cloudSync?.isReady?.() && window.cloudSync?.isConfigured?.());
  }

  function saveLocal() {
    state.meta.updatedAt = Date.now();
    try {
      setSync("saving", "Saving…");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      scheduleCloudPush();
      setTimeout(() => {
        if (!cloudReady()) setSync("synced", "Saved");
      }, 220);
    } catch {
      setSync("error", "Save failed");
    }
  }

  async function tryInitCloud() {
    const res = window.cloudSync?.initFromStorage?.();
    if (!res?.ok) {
      state.cloud.enabled = false;
      setSync("offline", "Local");
      return false;
    }
    state.cloud.enabled = true;

    const sess = await window.cloudSync.getSession();
    if (sess.ok && sess.session) setSync("cloud", "Cloud");
    else setSync("cloud", "Cloud");
    return true;
  }

  function scheduleCloudPush() {
    if (!cloudReady()) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      pushTimer = null;
      pushActiveTeamToCloud().catch(() => {});
    }, PUSH_DEBOUNCE_MS);
  }

  async function pullActiveTeamFromCloud() {
    if (!cloudReady()) return { ok: false, reason: "Cloud not ready" };
    const teamId = state.activeTeamId;

    setSync("saving", "Pulling…");
    const sess = await window.cloudSync.getSession();
    if (!sess.ok || !sess.session) {
      setSync("cloud", "Cloud");
      return { ok: false, reason: "Not signed in" };
    }

    const res = await window.cloudSync.pullTeamState(teamId);
    if (!res.ok) { setSync("error", "Pull failed"); return res; }
    if (!res.row?.state) { setSync("cloud", "Cloud"); return { ok: true, empty: true }; }

    const cloudState = res.row.state;
    const localTeam = state.teams[teamId];
    const localUpdated = localTeam?.meta?.updatedAt || 0;

    let cloudUpdated = 0;
    try { cloudUpdated = Date.parse(res.row.updated_at || "") || Date.now(); } catch { cloudUpdated = Date.now(); }

    if (cloudUpdated >= localUpdated) {
      state.teams[teamId] = cloudState;
      state.teams[teamId].meta = state.teams[teamId].meta || {};
      state.teams[teamId].meta.teamId = teamId;
      state.teams[teamId].meta.updatedAt = Date.now();
      state.cloud.lastPulledAt = Date.now();
      saveLocal();
      setSync("cloud", "Cloud");
      renderAll();
      return { ok: true, applied: true };
    }

    setSync("cloud", "Cloud");
    return { ok: true, applied: false };
  }

  async function pushActiveTeamToCloud() {
    if (!cloudReady()) return { ok: false, reason: "Cloud not ready" };

    const teamId = state.activeTeamId;
    const teamState = state.teams[teamId];
    if (!teamState) return { ok: false, reason: "Missing team state" };

    const sess = await window.cloudSync.getSession();
    if (!sess.ok || !sess.session) {
      setSync("cloud", "Cloud");
      return { ok: false, reason: "Not signed in" };
    }

    setSync("saving", "Syncing…");
    teamState.meta = teamState.meta || {};
    teamState.meta.updatedAt = Date.now();
    teamState.meta.teamId = teamId;

    const res = await window.cloudSync.pushTeamState(teamId, teamState);
    if (!res.ok) { setSync("error", "Sync failed"); return res; }

    state.cloud.lastPushedAt = Date.now();
    saveLocal();
    setSync("cloud", "Cloud");
    return { ok: true };
  }

  // ---------------------------
  // Theme
  // ---------------------------
  function applySportTheme(sport) {
    const root = document.documentElement;
    const s = String(sport || "basketball");
    if (s === "football") {
      root.style.setProperty("--accent", "#16a34a");
      root.style.setProperty("--accent2", "#0f7a35");
    } else if (s === "soccer") {
      root.style.setProperty("--accent", "#eab308");
      root.style.setProperty("--accent2", "#b8860b");
    } else {
      root.style.setProperty("--accent", "#2e7cff");
      root.style.setProperty("--accent2", "#1b56b8");
    }
  }

  // ---------------------------
  // Views + nav
  // ---------------------------
  const VIEWS = ["home", "team", "train", "profile"];
  let activeView = "home";
  let activeTrainTab = "log";

  function showView(v) {
    const view = VIEWS.includes(v) ? v : "home";
    activeView = view;

    VIEWS.forEach(name => {
      const el = $(`view-${name}`);
      if (el) el.hidden = (name !== view);
    });
    qa(".navbtn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    renderAll();

    // auto micro-tour once per tab (role-specific)
    setTimeout(() => autoMicroTour(view), 120);
  }

  qa(".navbtn").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));

  // Tooltip system
  document.addEventListener("mouseover", (e) => {
    const el = e.target?.closest?.("[data-tip]");
    const tip = el?.getAttribute?.("data-tip");
    if (!tip) return;
    const t = $("tooltip");
    if (!t) return;
    t.textContent = tip;
    t.style.left = (e.pageX + 12) + "px";
    t.style.top = (e.pageY + 12) + "px";
    t.hidden = false;
  });
  document.addEventListener("mouseout", () => { const t = $("tooltip"); if (t) t.hidden = true; });

  // ---------------------------
  // Team helpers
  // ---------------------------
  function activeTeam() { return state.teams[state.activeTeamId]; }

  function setActiveTeam(teamId) {
    if (!state.teams[teamId]) return;
    state.activeTeamId = teamId;
    saveLocal();
    renderAll();
  }

  function addTeam(name) {
    const id = uid("team");
    state.teams[id] = defaultTeamState(id, name || "New Team");
    state.activeTeamId = id;
    saveLocal();
    renderAll();
  }

  function addAthlete(name) {
    const t = activeTeam();
    t.athletes.push({ id: uid("ath"), name: name.trim(), role: "athlete", position: "", weightLb: 0, sport: state.sport });
    t.meta.updatedAt = Date.now();
    saveLocal();
  }

  // ---------------------------
  // Training log
  // ---------------------------
  function addTrainingSession(athleteId, dateISO, minutes, rpe, type, notes) {
    const t = activeTeam();
    t.logs.training[athleteId] = Array.isArray(t.logs.training[athleteId]) ? t.logs.training[athleteId] : [];
    const load = Math.round(Number(minutes || 0) * Number(rpe || 0));
    t.logs.training[athleteId].unshift({
      id: uid("sess"),
      dateISO: dateISO || todayISO(),
      minutes: Number(minutes || 0),
      rpe: Number(rpe || 0),
      type: String(type || "practice"),
      notes: String(notes || ""),
      load
    });
    t.meta.updatedAt = Date.now();
    saveLocal();
  }

  // ---------------------------
  // Micro Tours (per tab)
  // ---------------------------
  let microSteps = [];
  let microIndex = 0;
  let microHighlight = null;

  function ensureMicroState() {
    const role = normalizeRole(state.role);
    state.meta.microTours = state.meta.microTours || { version: 0, completed: {} };
    state.meta.microTours.completed = state.meta.microTours.completed || {};
    state.meta.microTours.completed[role] = state.meta.microTours.completed[role] || {};
    if (state.meta.microTours.version !== MICRO_TOUR_VERSION) {
      // reset completion if tour version bumped
      state.meta.microTours.version = MICRO_TOUR_VERSION;
      state.meta.microTours.completed = {};
      state.meta.microTours.completed[role] = {};
    }
  }

  function normalizeRole(role) {
    const r = String(role || "coach").toLowerCase();
    return (r === "athlete" || r === "parent") ? r : "coach";
  }

  function hasCompletedMicro(view) {
    ensureMicroState();
    const role = normalizeRole(state.role);
    return !!state.meta.microTours.completed?.[role]?.[view];
  }

  function markCompletedMicro(view) {
    ensureMicroState();
    const role = normalizeRole(state.role);
    state.meta.microTours.completed[role][view] = true;
    saveLocal();
  }

  function clearMicroHighlight() {
    if (microHighlight) {
      try { microHighlight.classList.remove("tour-highlight"); } catch {}
      microHighlight = null;
    }
  }

  function setMicroVisible(on) {
    const o = $("tourOverlay");
    if (!o) return;
    o.hidden = !on;
    o.setAttribute("aria-hidden", on ? "false" : "true");
    if (!on) clearMicroHighlight();
  }

  function buildMicroSteps(view) {
    const role = normalizeRole(state.role);

    // Keep it short: 3–5 steps max, tab-specific, role-personalized.
    if (view === "home") {
      if (role === "coach") return [
        { title: "Home (Coach)", body: "This is your command center: quick overview + next actions.", selector: "#view-home" },
        { title: "Saved status", body: "Top-left dot tells you if data is saved locally or syncing to cloud.", selector: ".sync-status" },
        { title: "Go to Team", body: "Add athletes and manage teams in Team.", selector: "[data-view='team']" }
      ];
      if (role === "athlete") return [
        { title: "Home (Athlete)", body: "Your daily starting point. Head to Train to log your work.", selector: "#view-home" },
        { title: "Saved status", body: "That dot shows if your data is saved (Local) or synced (Cloud).", selector: ".sync-status" },
        { title: "Go to Train", body: "Train is where you log sessions and track progress.", selector: "[data-view='train']" }
      ];
      return [
        { title: "Home (Parent)", body: "Quick view of the athlete’s world. More insight grows as data is logged.", selector: "#view-home" },
        { title: "Saved status", body: "The dot tells you if the device saved data or synced to cloud.", selector: ".sync-status" },
        { title: "Team view", body: "Use Team to view roster and switch teams.", selector: "[data-view='team']" }
      ];
    }

    if (view === "team") {
      return [
        { title: "Team setup", body: "Switch teams, choose sport theme, and manage your roster.", selector: "#view-team" },
        { title: "Switch teams", body: "Use the team dropdown to switch the active team.", selector: "#teamSelect" },
        { title: "Roster", body: "Add athletes and manage their profiles here.", selector: "#rosterList" }
      ];
    }

    if (view === "train") {
      return [
        { title: "Train", body: "This is your daily workflow: log sessions and review recent activity.", selector: "#view-train" },
        { title: "Log a session", body: "Pick athlete, date, minutes, and sRPE — load is calculated for you.", selector: "#trainPanel" },
        { title: "Sub-modules", body: "Nutrition/workouts/periodization expand here as you build usage.", selector: ".subnav" }
      ];
    }

    // profile
    return [
      { title: "Profile", body: "Change role preferences and replay tours anytime.", selector: "#view-profile" },
      { title: "Replay micro-tours", body: "Use Replay to re-run the tour for the current tab.", selector: "#btnReplayTour" },
      { title: "Cloud access", body: "Open Account (top right) to sign in and sync across devices.", selector: "#btnAuthOpen" }
    ];
  }

  function renderMicroStep(view) {
    const title = $("tourTitle");
    const body = $("tourBody");
    const prog = $("tourProgress");
    const back = $("tourBack");
    const next = $("tourNext");

    const step = microSteps[microIndex];
    if (!step) return;

    if (title) title.textContent = step.title || "Help";
    if (body) body.textContent = step.body || "";
    if (prog) prog.textContent = `Tip ${microIndex + 1} of ${microSteps.length}`;

    if (back) back.disabled = (microIndex === 0);
    if (next) next.textContent = (microIndex === microSteps.length - 1) ? "Done" : "Next";

    clearMicroHighlight();
    if (step.selector) {
      const el = document.querySelector(step.selector);
      if (el) {
        microHighlight = el;
        try {
          microHighlight.classList.add("tour-highlight");
          microHighlight.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        } catch {}
      }
    }
  }

  function startMicroTour(view, manual = false) {
    microSteps = buildMicroSteps(view);
    microIndex = 0;

    // show overlay
    setMicroVisible(true);

    // show controls in micro-mode (reusing the same overlay UI)
    $("tourSkip") && ($("tourSkip").textContent = manual ? "Close" : "Skip");
    renderMicroStep(view);
  }

  function finishMicroTour(view) {
    markCompletedMicro(view);
    setMicroVisible(false);
  }

  function autoMicroTour(view) {
    if (!state.meta.onboarded) return;
    if (hasCompletedMicro(view)) return;
    startMicroTour(view, false);
  }

  function wireTourUI() {
    // Help button: run micro tour for CURRENT tab
    $("btnHelp")?.addEventListener("click", () => startMicroTour(activeView, true));

    $("tourClose")?.addEventListener("click", () => setMicroVisible(false));

    $("tourSkip")?.addEventListener("click", () => setMicroVisible(false));

    $("tourBack")?.addEventListener("click", () => {
      if (microIndex > 0) {
        microIndex -= 1;
        renderMicroStep(activeView);
      }
    });

    $("tourNext")?.addEventListener("click", () => {
      if (microIndex >= microSteps.length - 1) {
        finishMicroTour(activeView);
        return;
      }
      microIndex += 1;
      renderMicroStep(activeView);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const o = $("tourOverlay");
        if (o && !o.hidden) setMicroVisible(false);
      }
    });
  }

  // ---------------------------
  // Onboarding (role + sport) — modal dropdown already in index.html
  // ---------------------------
  function openOnboarding() {
    const m = $("onboardingModal");
    if (!m) return;

    if ($("obRole")) $("obRole").value = state.role || "coach";
    if ($("obSport")) $("obSport").value = state.sport || "basketball";

    $("obMsg").textContent = "Choose role and sport. You’ll get quick tips per tab.";
    m.hidden = false;

    const onContinue = () => {
      const role = ($("obRole")?.value || "coach").toLowerCase();
      const sport = ($("obSport")?.value || "basketball").toLowerCase();

      state.role = normalizeRole(role);
      state.sport = (sport === "football" || sport === "soccer") ? sport : "basketball";
      applySportTheme(state.sport);

      state.meta.onboarded = true;

      // reset micro tour completion for new role
      state.meta.microTours = { version: MICRO_TOUR_VERSION, completed: {} };

      saveLocal();
      m.hidden = true;

      showView("home");
      startMicroTour("home", false);
    };

    const onSkip = () => {
      state.meta.onboarded = true;
      saveLocal();
      m.hidden = true;
      showView("home");
    };

    $("obSport")?.addEventListener("change", (e) => applySportTheme(e.target.value));

    $("obContinue")?.addEventListener("click", onContinue, { once: true });
    $("obSkip")?.addEventListener("click", onSkip, { once: true });
  }

  // ---------------------------
  // Render: Home / Team / Train / Profile
  // ---------------------------
  function renderHome() {
    const el = $("view-home");
    if (!el) return;

    const t = activeTeam();
    const role = normalizeRole(state.role);
    const teamName = t?.meta?.name || "—";
    const athleteCount = t?.athletes?.length || 0;

    let body = `
      <div class="card">
        <h2>${role === "coach" ? "Coach Home" : role === "parent" ? "Parent Home" : "Athlete Home"}</h2>
        <div class="small muted">Team: <b>${escapeHTML(teamName)}</b> • Sport: <b>${escapeHTML(state.sport)}</b></div>
      </div>
    `;

    if (role === "coach") {
      body += `
        <div class="grid2">
          <div class="card">
            <h3>Roster</h3>
            <div class="small muted">${athleteCount} athletes</div>
            <div class="small muted" style="margin-top:8px">Use Team to add athletes and manage teams.</div>
          </div>
          <div class="card">
            <h3>Quick actions</h3>
            <div class="row gap wrap">
              <button class="btn" id="goTeam">Manage Team</button>
              <button class="btn ghost" id="goTrain">Open Train</button>
            </div>
          </div>
        </div>
      `;
    } else {
      body += `
        <div class="card">
          <h3>Today</h3>
          <div class="small muted">Open Train to log your session.</div>
          <div class="row gap wrap" style="margin-top:10px">
            <button class="btn" id="goTrain2">Go to Train</button>
          </div>
        </div>
      `;
    }

    el.innerHTML = body;

    $("goTeam")?.addEventListener("click", () => showView("team"));
    $("goTrain")?.addEventListener("click", () => showView("train"));
    $("goTrain2")?.addEventListener("click", () => showView("train"));
  }

  function renderTeam() {
    const el = $("view-team");
    if (!el) return;

    const t = activeTeam();
    const teamsList = Object.values(state.teams).map(x => ({ id: x.meta.teamId, name: x.meta.name }));

    el.innerHTML = `
      <div class="card">
        <h2>Team</h2>
        <div class="small muted">Manage teams and roster.</div>
      </div>

      <div class="grid2">
        <div class="card">
          <h3>Active team</h3>
          <div class="row gap wrap">
            <div class="field grow">
              <label>Switch team</label>
              <select id="teamSelect">
                ${teamsList.map(x => `<option value="${escapeHTML(x.id)}"${x.id===state.activeTeamId?" selected":""}>${escapeHTML(x.name)}</option>`).join("")}
              </select>
            </div>
            <div class="field grow">
              <label>Sport</label>
              <select id="sportSelect" data-tip="Changes accent theme">
                <option value="basketball"${state.sport==="basketball"?" selected":""}>Basketball</option>
                <option value="football"${state.sport==="football"?" selected":""}>Football</option>
                <option value="soccer"${state.sport==="soccer"?" selected":""}>Soccer</option>
              </select>
            </div>
          </div>

          <div class="row gap wrap" style="margin-top:10px">
            <div class="field grow">
              <label>New team name</label>
              <input id="newTeamName" type="text" placeholder="e.g., Warwick JV" />
            </div>
            <button class="btn" id="btnCreateTeam">Create team</button>
          </div>
        </div>

        <div class="card">
          <h3>Roster</h3>
          <div class="row gap wrap">
            <div class="field grow">
              <label>Add athlete</label>
              <input id="athName" type="text" placeholder="Full name" />
            </div>
            <button class="btn" id="btnAddAth">Add</button>
          </div>

          <div class="mini" style="margin-top:12px">
            <div class="minihead">Athletes</div>
            <div id="rosterList" class="minibody"></div>
          </div>
        </div>
      </div>
    `;

    $("teamSelect")?.addEventListener("change", (e) => setActiveTeam(e.target.value));
    $("btnCreateTeam")?.addEventListener("click", () => {
      const nm = ($("newTeamName")?.value || "").trim();
      addTeam(nm || "New Team");
      $("newTeamName").value = "";
    });

    $("sportSelect")?.addEventListener("change", (e) => {
      state.sport = e.target.value;
      applySportTheme(state.sport);
      saveLocal();
      renderAll();
    });

    $("btnAddAth")?.addEventListener("click", () => {
      const nm = ($("athName")?.value || "").trim();
      if (!nm) return alert("Enter athlete name.");
      addAthlete(nm);
      $("athName").value = "";
      renderAll();
    });

    const roster = $("rosterList");
    if (roster) {
      if (!t.athletes.length) roster.innerHTML = `<div class="small muted">No athletes yet.</div>`;
      else roster.innerHTML = t.athletes.map(a => `
        <div class="row between" style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div><b>${escapeHTML(a.name)}</b></div>
            <div class="small muted">Sport: ${escapeHTML(a.sport || state.sport)}</div>
          </div>
          ${normalizeRole(state.role) === "coach" ? `<button class="btn danger" data-del-ath="${escapeHTML(a.id)}">Remove</button>` : ``}
        </div>
      `).join("");

      qa("[data-del-ath]").forEach(btn => btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del-ath");
        if (!id) return;
        if (!confirm("Remove athlete and their logs?")) return;
        t.athletes = t.athletes.filter(x => x.id !== id);
        delete t.logs.training[id];
        delete t.logs.readiness[id];
        delete t.logs.nutrition[id];
        t.meta.updatedAt = Date.now();
        saveLocal();
        renderAll();
      }));
    }
  }

  function renderTrain() {
    const el = $("view-train");
    if (!el) return;

    const t = activeTeam();
    const athletes = t.athletes || [];

    el.innerHTML = `
      <div class="card">
        <h2>Train</h2>
        <div class="small muted">Log training + nutrition.</div>
      </div>

      <div class="subnav" role="tablist" aria-label="Train modules">
        ${subBtn("log","Log")}
        ${subBtn("nutrition","Nutrition")}
        ${subBtn("workouts","Workouts")}
        ${subBtn("periodization","Periodization")}
        ${subBtn("analytics","Analytics")}
      </div>

      <div id="trainPanel"></div>
    `;

    qa(".subnav button", el).forEach(b => b.addEventListener("click", () => {
      activeTrainTab = b.getAttribute("data-tab") || "log";
      renderTrain();
    }));

    const panel = $("trainPanel");
    if (!panel) return;

    if (activeTrainTab === "log") {
      panel.innerHTML = renderLogModule(athletes);
      wireLogModule(athletes, t);
      return;
    }

    if (activeTrainTab === "nutrition") {
      panel.innerHTML = `
        <div class="card">
          <h3>Nutrition</h3>
          <div class="small muted">Macro auto-calculation is scheduled next — the UI will compute it automatically.</div>
        </div>
      `;
      return;
    }

    panel.innerHTML = `
      <div class="card">
        <h3>${escapeHTML(activeTrainTab.charAt(0).toUpperCase()+activeTrainTab.slice(1))}</h3>
        <div class="small muted">This module is staged next. Core workflow is ready.</div>
      </div>
    `;
  }

  function subBtn(id, label){
    const on = (activeTrainTab === id) ? " active" : "";
    return `<button class="${on.trim()}" data-tab="${escapeHTML(id)}">${escapeHTML(label)}</button>`;
  }

  function renderLogModule(athletes) {
    if (!athletes.length) {
      return `<div class="card"><h3>Log</h3><div class="small muted">Add athletes in Team first.</div></div>`;
    }

    return `
      <div class="grid2">
        <div class="card">
          <h3>Training Session</h3>
          <div class="row gap wrap">
            <div class="field grow">
              <label>Athlete</label>
              <select id="logAthlete">
                ${athletes.map(a=>`<option value="${escapeHTML(a.id)}">${escapeHTML(a.name)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Date</label>
              <input id="logDate" type="date" value="${todayISO()}"/>
            </div>
          </div>

          <div class="row gap wrap" style="margin-top:10px">
            <div class="field">
              <label>Minutes</label>
              <input id="logMin" type="number" min="0" max="600" value="60"/>
            </div>
            <div class="field">
              <label>sRPE (0–10)</label>
              <input id="logRpe" type="number" min="0" max="10" step="1" value="6"/>
            </div>
            <div class="field grow">
              <label>Type</label>
              <select id="logType">
                <option value="practice">Practice</option>
                <option value="lift">Lift</option>
                <option value="skills">Skills</option>
                <option value="conditioning">Conditioning</option>
                <option value="game">Game</option>
                <option value="recovery">Recovery</option>
              </select>
            </div>
          </div>

          <div class="row gap wrap" style="margin-top:10px">
            <div class="field grow">
              <label>Notes</label>
              <input id="logNotes" type="text" placeholder="optional"/>
            </div>
            <div class="field">
              <label>Load</label>
              <div class="pill" id="loadPreview">—</div>
            </div>
          </div>

          <div class="row gap wrap" style="margin-top:10px">
            <button class="btn" id="btnSaveSess">Save session</button>
          </div>
        </div>

        <div class="card">
          <h3>Recent Sessions</h3>
          <div id="sessList" class="minibody"></div>
        </div>
      </div>
    `;
  }

  function wireLogModule(athletes, teamState) {
    const updateLoad = () => {
      const m = Number($("logMin")?.value || 0);
      const r = Number($("logRpe")?.value || 0);
      const load = Math.round(m * r);
      const pill = $("loadPreview");
      if (pill) pill.textContent = String(load);
    };

    $("logMin")?.addEventListener("input", updateLoad);
    $("logRpe")?.addEventListener("input", updateLoad);
    updateLoad();

    $("btnSaveSess")?.addEventListener("click", () => {
      const aid = $("logAthlete")?.value || athletes[0].id;
      const d = $("logDate")?.value || todayISO();
      const m = Number($("logMin")?.value || 0);
      const r = Number($("logRpe")?.value || 0);
      const type = $("logType")?.value || "practice";
      const notes = ($("logNotes")?.value || "").trim();
      addTrainingSession(aid, d, m, r, type, notes);
      $("logNotes").value = "";
      renderTrain();
    });

    renderRecentSessions(athletes, teamState);
    $("logAthlete")?.addEventListener("change", () => renderRecentSessions(athletes, teamState));
  }

  function renderRecentSessions(athletes, teamState) {
    const list = $("sessList");
    if (!list) return;

    const aid = $("logAthlete")?.value || athletes[0].id;
    const sessions = Array.isArray(teamState.logs.training[aid]) ? teamState.logs.training[aid] : [];
    const top = sessions.slice(0, 10);

    if (!top.length) {
      list.innerHTML = `<div class="small muted">No sessions yet.</div>`;
      return;
    }

    list.innerHTML = top.map(s => `
      <div class="row between" style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div><b>${escapeHTML(s.dateISO)}</b> • ${escapeHTML(s.type)} • ${escapeHTML(String(s.minutes))} min • sRPE ${escapeHTML(String(s.rpe))}</div>
          <div class="small muted">Load: <b>${escapeHTML(String(s.load))}</b>${s.notes?` • ${escapeHTML(s.notes)}`:""}</div>
        </div>
        ${normalizeRole(state.role)==="coach" ? `<button class="btn danger" data-del-sess="${escapeHTML(s.id)}">Delete</button>` : ``}
      </div>
    `).join("");

    qa("[data-del-sess]").forEach(btn => btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del-sess");
      const aid2 = $("logAthlete")?.value || athletes[0].id;
      if (!id || !aid2) return;
      if (!confirm("Delete this session?")) return;
      teamState.logs.training[aid2] = (teamState.logs.training[aid2] || []).filter(x => x.id !== id);
      teamState.meta.updatedAt = Date.now();
      saveLocal();
      renderTrain();
    }));
  }

  function renderProfile() {
    const el = $("view-profile");
    if (!el) return;

    const role = normalizeRole(state.role);

    el.innerHTML = `
      <div class="card">
        <h2>Profile</h2>
        <div class="small muted">Preferences + help.</div>
      </div>

      <div class="grid2">
        <div class="card">
          <h3>Role</h3>
          <div class="row gap wrap" style="margin-top:10px">
            <div class="field grow">
              <label>Role</label>
              <select id="roleSelect">
                <option value="coach"${role==="coach"?" selected":""}>Coach</option>
                <option value="athlete"${role==="athlete"?" selected":""}>Athlete</option>
                <option value="parent"${role==="parent"?" selected":""}>Parent</option>
              </select>
            </div>
          </div>

          <div class="row gap wrap" style="margin-top:10px">
            <button class="btn" id="btnReplayTour">Replay micro-tour (current tab)</button>
            <button class="btn ghost" id="btnResetTours">Reset all micro-tours</button>
          </div>

          <div class="small muted" style="margin-top:8px">
            Micro-tours are short tips per tab. They auto-run once per role.
          </div>
        </div>

        <div class="card">
          <h3>Cloud</h3>
          <div class="small muted">Use Account (top right) to sign in and sync.</div>
          <div class="mini" style="margin-top:12px">
            <div class="minihead">Status</div>
            <div class="minibody mono small" id="profileCloudState">—</div>
          </div>
        </div>
      </div>
    `;

    $("roleSelect")?.addEventListener("change", (e) => {
      state.role = normalizeRole(e.target.value);
      // Reset tours when switching role so they make sense
      state.meta.microTours = { version: MICRO_TOUR_VERSION, completed: {} };
      saveLocal();
      renderAll();
      setTimeout(() => startMicroTour(activeView, true), 120);
    });

    $("btnReplayTour")?.addEventListener("click", () => startMicroTour(activeView, true));

    $("btnResetTours")?.addEventListener("click", () => {
      if (!confirm("Reset all micro-tours?")) return;
      state.meta.microTours = { version: MICRO_TOUR_VERSION, completed: {} };
      saveLocal();
      renderAll();
      setTimeout(() => startMicroTour(activeView, true), 120);
    });

    updateProfileCloudState();
  }

  async function updateProfileCloudState() {
    const el = $("profileCloudState");
    if (!el) return;

    const cfg = window.cloudSync?.loadCfg?.() || { url: "", anon: "" };
    const urlOk = window.cloudSync?.validateSupabaseUrl?.(cfg.url);
    const keyOk = window.cloudSync?.validateAnonKey?.(cfg.anon);

    let msg = "";
    msg += `Cloud configured: ${(urlOk?.ok && keyOk?.ok) ? "yes" : "no"}\n`;
    msg += `URL: ${urlOk?.ok ? "valid" : "invalid"}\n`;
    msg += `Key: ${keyOk?.ok ? "valid" : "invalid"}\n`;

    if (urlOk?.ok && keyOk?.ok) {
      const sess = await window.cloudSync.getSession();
      if (sess.ok && sess.session) msg += `Session: signed in\n`;
      else msg += `Session: signed out\n`;
    } else {
      msg += `Note: Use your Supabase URL (https://xxxx.supabase.co)\n`;
    }

    el.textContent = msg.trim();
  }

  // ---------------------------
  // Auth modal wiring (clean UI messages)
  // ---------------------------
  function wireAuthModal() {
    $("btnAuthOpen")?.addEventListener("click", async () => {
      const m = $("authModal");
      if (m) m.hidden = false;

      const cfg = window.cloudSync?.loadCfg?.() || { url: "", anon: "" };
      if ($("sbUrl")) $("sbUrl").value = cfg.url || "";
      if ($("sbAnon")) $("sbAnon").value = cfg.anon || "";

      await refreshAuthState();
    });

    $("btnAuthClose")?.addEventListener("click", () => { const m = $("authModal"); if (m) m.hidden = true; });

    $("btnSaveCloud")?.addEventListener("click", async () => {
      const url = ($("sbUrl")?.value || "").trim();
      const anon = ($("sbAnon")?.value || "").trim();

      window.cloudSync?.saveCfg?.({ url, anon });

      const vUrl = window.cloudSync?.validateSupabaseUrl?.(url);
      const vKey = window.cloudSync?.validateAnonKey?.(anon);

      if (!vUrl?.ok) {
        $("cloudMsg").textContent = `Cloud not enabled: ${vUrl.reason}`;
        setSync("offline", "Local");
        await refreshAuthState();
        return;
      }
      if (!vKey?.ok) {
        $("cloudMsg").textContent = `Cloud not enabled: ${vKey.reason}`;
        setSync("offline", "Local");
        await refreshAuthState();
        return;
      }

      const ok = await tryInitCloud();
      $("cloudMsg").textContent = ok ? "Cloud settings saved." : "Cloud not enabled (check URL/Key).";
      await refreshAuthState();
      updateProfileCloudState();
    });

    $("btnTestCloud")?.addEventListener("click", async () => {
      const res = await window.cloudSync.testConnection();
      $("cloudMsg").textContent = res.ok ? "Cloud connection OK." : `Cloud error: ${res.reason || "unknown"}`;
      await refreshAuthState();
      updateProfileCloudState();
    });

    $("btnSignUp")?.addEventListener("click", async () => {
      await tryInitCloud();
      const email = ($("authEmail")?.value || "").trim();
      const pass = ($("authPass")?.value || "").trim();
      if (!email || !pass) return ($("authMsg").textContent = "Enter email + password.");
      const res = await window.cloudSync.signUp(email, pass);
      $("authMsg").textContent = res.ok ? "Account created." : `Sign up failed: ${res.reason}`;
      await refreshAuthState();
      updateProfileCloudState();
    });

    $("btnSignIn")?.addEventListener("click", async () => {
      await tryInitCloud();
      const email = ($("authEmail")?.value || "").trim();
      const pass = ($("authPass")?.value || "").trim();
      if (!email || !pass) return ($("authMsg").textContent = "Enter email + password.");
      const res = await window.cloudSync.signIn(email, pass);
      $("authMsg").textContent = res.ok ? "Signed in." : `Sign in failed: ${res.reason}`;
      if (res.ok) {
        setSync("cloud", "Cloud");
        await pullActiveTeamFromCloud().catch(()=>{});
      }
      await refreshAuthState();
      updateProfileCloudState();
      renderAll();
    });

    $("btnSignOut")?.addEventListener("click", async () => {
      if (!cloudReady()) return;
      const res = await window.cloudSync.signOut();
      $("authMsg").textContent = res.ok ? "Signed out." : `Sign out failed: ${res.reason}`;
      setSync("cloud", "Cloud");
      await refreshAuthState();
      updateProfileCloudState();
    });

    $("btnPull")?.addEventListener("click", async () => {
      const r = await pullActiveTeamFromCloud();
      $("cloudMsg").textContent = r.ok ? "Pulled team data." : `Pull failed: ${r.reason || "unknown"}`;
      await refreshAuthState();
      updateProfileCloudState();
    });

    $("btnPush")?.addEventListener("click", async () => {
      const r = await pushActiveTeamToCloud();
      $("cloudMsg").textContent = r.ok ? "Pushed team data." : `Push failed: ${r.reason || "unknown"}`;
      await refreshAuthState();
      updateProfileCloudState();
    });
  }

  async function refreshAuthState() {
    const el = $("authState");
    if (!el) return;

    const cfg = window.cloudSync?.loadCfg?.() || { url: "", anon: "" };
    const u = window.cloudSync?.validateSupabaseUrl?.(cfg.url);
    const k = window.cloudSync?.validateAnonKey?.(cfg.anon);

    if (!u?.ok || !k?.ok) {
      el.textContent = "Cloud not configured.";
      setSync("offline", "Local");
      return;
    }

    await tryInitCloud();

    const res = await window.cloudSync.getSession();
    if (!res.ok) { el.textContent = "Cloud session error"; setSync("error", "Cloud error"); return; }
    if (!res.session) { el.textContent = "Signed out."; setSync("cloud", "Cloud"); return; }

    el.textContent = `Signed in as:\n${res.session.user?.email || "user"}`;
    setSync("cloud", "Cloud");
  }

  // ---------------------------
  // Render all
  // ---------------------------
  function renderAll() {
    const t = activeTeam();
    if ($("activeTeamPill")) $("activeTeamPill").textContent = `Team: ${t?.meta?.name || "—"}`;
    applySportTheme(state.sport);

    renderHome();
    renderTeam();
    renderTrain();
    renderProfile();
  }

  function escapeHTML(str) {
    const d = document.createElement("div");
    d.textContent = String(str ?? "");
    return d.innerHTML;
  }

  // ---------------------------
  // Boot
  // ---------------------------
  async function boot() {
    wireAuthModal();
    wireTourUI();
    await tryInitCloud();

    if (window.cloudSync?.isReady?.()) {
      window.cloudSync.onAuthChange(async (session) => {
        if (session) {
          setSync("cloud", "Cloud");
          await pullActiveTeamFromCloud().catch(()=>{});
        } else {
          setSync("cloud", "Cloud");
        }
        updateProfileCloudState();
      });
    }

    showView("home");
    renderAll();

    if (!state.meta?.onboarded) {
      openOnboarding();
    }

    setTimeout(() => { try { $("splash")?.remove(); } catch {} }, 650);
  }

  boot().catch(() => {
    try { $("splash")?.remove(); } catch {}
    setSync("error", "Startup error");
  });

})();
