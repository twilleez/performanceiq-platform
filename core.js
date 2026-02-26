// core.js — v3.0.0 (Week 1–2)
// Production base: mobile bottom-nav, zero-empty views, customer-safe UI, splash safety
(function () {
  "use strict";
  if (window.__PIQ_CORE_V3__) return;
  window.__PIQ_CORE_V3__ = true;

  const APP_VERSION = "3.0.0";
  const STORAGE_KEY = "piq_state_v3";

  // -----------------------------
  // DOM helpers
  // -----------------------------
  const $ = (id) => document.getElementById(id);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const q = (sel, root = document) => root.querySelector(sel);

  function escHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  function safeISO(d) {
    const s = String(d || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }
  const todayISO = () => new Date().toISOString().slice(0, 10);

  // -----------------------------
  // Customer-safe toast (no stack traces)
  // -----------------------------
  let toastTimer = null;
  function toast(msg, ms = 2200) {
    try {
      const text = String(msg || "Saved.").slice(0, 180);
      let el = document.getElementById("__piq_toast__");
      if (!el) {
        el = document.createElement("div");
        el.id = "__piq_toast__";
        el.className = "toast";
        document.body.appendChild(el);
      }
      el.textContent = text;
      el.style.display = "block";
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        el.style.display = "none";
      }, ms);
    } catch {}
  }

  // -----------------------------
  // Splash safety
  // -----------------------------
  function hideSplashNow() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    s.setAttribute("aria-hidden", "true");
  }
  // Always hide splash after a hard timeout
  setTimeout(() => hideSplashNow(), 2500);
  window.hideSplashNow = hideSplashNow;

  // -----------------------------
  // Device detection (mobile bottom-nav only)
  // -----------------------------
  function computeDeviceMode() {
    const mobile = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
    document.body.classList.toggle("is-mobile", !!mobile);
    return { mobile };
  }
  let device = computeDeviceMode();
  window.addEventListener("resize", () => {
    device = computeDeviceMode();
  });

  // -----------------------------
  // State
  // -----------------------------
  function defaultState() {
    const now = Date.now();
    return {
      meta: { version: 1, appVersion: APP_VERSION, updatedAtMs: now },
      ui: {
        role: "coach",            // "coach" | "athlete"
        activeView: "dashboard",
        lastAthleteId: "",
        device: { mobile: device.mobile }
      },
      team: { id: "local", name: "Default" },
      athletes: [],               // {id,name,position,heightIn,weightLb}
      logs: {
        training: {},             // training[athleteId] = [{id,dateISO,minutes,rpe,type,notes,load}]
        readiness: {},            // readiness[athleteId] = [{dateISO,sleep,soreness,stress,energy,injuryNote}]
        nutrition: {}             // nutrition[athleteId] = [{dateISO,protein,carbs,fat,waterOz,notes}]
      }
    };
  }

  let state = loadState();
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch {
      return defaultState();
    }
  }

  function normalizeState(s) {
    const d = defaultState();
    if (!s || typeof s !== "object") return d;

    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;
    s.ui = s.ui && typeof s.ui === "object" ? s.ui : d.ui;
    s.team = s.team && typeof s.team === "object" ? s.team : d.team;
    if (!Array.isArray(s.athletes)) s.athletes = [];
    s.logs = s.logs && typeof s.logs === "object" ? s.logs : d.logs;
    if (!s.logs.training || typeof s.logs.training !== "object") s.logs.training = {};
    if (!s.logs.readiness || typeof s.logs.readiness !== "object") s.logs.readiness = {};
    if (!s.logs.nutrition || typeof s.logs.nutrition !== "object") s.logs.nutrition = {};
    if (!s.ui.device || typeof s.ui.device !== "object") s.ui.device = { mobile: device.mobile };
    return s;
  }

  function saveState() {
    try {
      state.meta.updatedAtMs = Date.now();
      state.meta.appVersion = APP_VERSION;
      state.ui.device = { mobile: device.mobile };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // do not show dev error; keep customer-safe
      toast("Could not save on this device.");
    }
  }

  // -----------------------------
  // Data helpers
  // -----------------------------
  function uid(prefix = "id") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }
  function toNum(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function clamp(n, a, b) {
    return Math.min(Math.max(n, a), b);
  }
  function getAthletes() {
    return state.athletes.slice();
  }
  function athleteLabel(a) {
    const name = (a?.name || "").trim();
    const pos = (a?.position || "").trim();
    return name ? (pos ? `${name} (${pos})` : name) : "—";
  }
  function ensureLogBucket(bucket, athleteId) {
    if (!athleteId) return;
    if (!state.logs[bucket][athleteId]) state.logs[bucket][athleteId] = [];
  }
  function getTraining(athleteId) {
    return Array.isArray(state.logs.training[athleteId]) ? state.logs.training[athleteId].slice() : [];
  }

  function fillAthleteSelect(selectEl, selectedId) {
    if (!selectEl) return;
    const athletes = getAthletes();
    if (!athletes.length) {
      selectEl.innerHTML = `<option value="">(No athletes yet)</option>`;
      selectEl.value = "";
      return;
    }
    selectEl.innerHTML = athletes
      .map((a) => `<option value="${escHTML(a.id)}">${escHTML(athleteLabel(a))}</option>`)
      .join("");
    const pick = selectedId && athletes.some((x) => x.id === selectedId) ? selectedId : athletes[0].id;
    selectEl.value = pick;
  }

  // -----------------------------
  // Views
  // -----------------------------
  const VIEWS = ["dashboard", "team", "log", "nutrition", "workouts", "periodization", "analytics", "settings"];

  function showView(name) {
    const view = VIEWS.includes(name) ? name : "dashboard";
    state.ui.activeView = view;

    VIEWS.forEach((v) => {
      const el = document.getElementById(`view-${v}`);
      if (!el) return;
      el.hidden = v !== view;
    });

    qa(".navbtn").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-view") === view);
    });

    // Render selected view
    try {
      if (view === "dashboard") renderDashboard();
      else if (view === "team") renderTeam();
      else if (view === "log") renderLog();
      else if (view === "nutrition") renderNutrition();
      else if (view === "workouts") renderWorkouts();
      else if (view === "periodization") renderPeriodization();
      else if (view === "analytics") renderAnalytics();
      else if (view === "settings") renderSettings();
    } catch {
      // customer-safe: show a friendly message in that view
      const host = document.getElementById(`view-${view}`);
      if (host) {
        host.innerHTML = `
          <div class="card">
            <div class="cardhead"><h2>We hit a snag</h2><span class="muted">Try again</span></div>
            <div class="callout">
              Something didn’t load correctly on this device. Please refresh the page.
            </div>
          </div>
        `;
      }
    }

    saveState();
    hideSplashNow();
  }

  function wireNav() {
    qa(".navbtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const v = btn.getAttribute("data-view") || "dashboard";
        showView(v);
      });
    });
  }

  // -----------------------------
  // Render: Dashboard (never empty)
  // -----------------------------
  function renderDashboard() {
    const coachWrap = $("coachDashWrap");
    const athleteWrap = $("athleteDashWrap");
    if (!coachWrap || !athleteWrap) return;

    const role = state.ui.role || "coach";
    const athletes = getAthletes();

    // Coach summary cards (Week 1–2 placeholder — customer safe)
    coachWrap.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Coach Summary</h2><span class="muted">Week overview</span></div>
        <div class="mini">
          <div class="minihead">Team</div>
          <div class="minibody">
            <b>${escHTML(state.team?.name || "Default")}</b>
            <span class="pilltag" style="margin-left:8px">${athletes.length} athlete${athletes.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div class="mini" style="margin-top:10px">
          <div class="minihead">Next step</div>
          <div class="minibody small muted">
            Add athletes in <b>Team</b>, then log a session in <b>Log</b>. This unlocks weekly summaries in the next milestone.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="cardhead"><h2>Quick Actions</h2><span class="muted">Setup</span></div>
        <div class="row gap wrap">
          <button class="btn" id="dashGoTeam">Add athlete</button>
          <button class="btn ghost" id="dashSeedDemo">One-click demo</button>
          <button class="btn ghost" id="dashSwitchRole">Switch to Athlete view</button>
        </div>
      </div>
    `;

    $("dashGoTeam")?.addEventListener("click", () => showView("team"));
    $("dashSeedDemo")?.addEventListener("click", () => { seedDemo(true); });
    $("dashSwitchRole")?.addEventListener("click", () => {
      state.ui.role = "athlete";
      saveState();
      toast("Switched to Athlete view");
      renderDashboard();
    });

    // Athlete dashboard (Week 1–2 placeholder, non-empty)
    const athletePanel = `
      <div class="card">
        <div class="cardhead"><h2>Athlete Home</h2><span class="muted">Today</span></div>
        ${
          athletes.length
            ? `<div class="callout">
                 <b>Next milestone adds:</b> Today’s Workout + Quick Log + Nutrition Target.
               </div>
               <div class="mini" style="margin-top:12px">
                 <div class="minihead">Right now</div>
                 <div class="minibody small muted">
                   Use <b>Log</b> to record today’s session minutes + intensity (sRPE). That powers your PerformanceIQ scoring.
                 </div>
               </div>
               <div class="row gap wrap" style="margin-top:12px">
                 <button class="btn" id="athGoLog">Quick Log</button>
                 <button class="btn ghost" id="athSwitchRole">Switch to Coach view</button>
               </div>`
            : `<div class="callout">
                 No athletes yet. Ask your coach to add you, or click demo mode.
               </div>
               <div class="row gap wrap" style="margin-top:12px">
                 <button class="btn ghost" id="athSeedDemo">Load demo</button>
               </div>`
        }
      </div>
    `;
    athleteWrap.innerHTML = athletePanel;

    $("athGoLog")?.addEventListener("click", () => showView("log"));
    $("athSwitchRole")?.addEventListener("click", () => {
      state.ui.role = "coach";
      saveState();
      toast("Switched to Coach view");
      renderDashboard();
    });
    $("athSeedDemo")?.addEventListener("click", () => { seedDemo(true); });

    // Role visibility: keep both areas present but “feel” role-based
    coachWrap.style.display = role === "coach" ? "" : "none";
    athleteWrap.style.display = role === "athlete" ? "" : "none";
  }

  // -----------------------------
  // Render: Team (never empty)
  // -----------------------------
  function renderTeam() {
    const host = $("view-team");
    if (!host) return;

    const athletes = getAthletes();

    host.innerHTML = `
      <div class="grid2">
        <div class="card">
          <div class="cardhead"><h2>Roster</h2><span class="muted">Athletes</span></div>

          <div class="row gap wrap">
            <div class="field">
              <label>Full name</label>
              <input id="athName" type="text" placeholder="e.g., Jordan Smith" />
            </div>
            <div class="field">
              <label>Position</label>
              <input id="athPos" type="text" placeholder="PG / SG / SF / PF / C" />
            </div>
            <div class="field">
              <label>Height (in)</label>
              <input id="athHt" type="number" min="40" max="96" />
            </div>
            <div class="field">
              <label>Weight (lb)</label>
              <input id="athWt" type="number" min="60" max="400" />
            </div>
            <div class="field">
              <label>&nbsp;</label>
              <button class="btn" id="btnAddAthlete">Add</button>
            </div>
          </div>

          <div class="list" id="rosterList" style="margin-top:12px"></div>
        </div>

        <div class="card">
          <div class="cardhead"><h2>Team</h2><span class="muted">Settings</span></div>
          <div class="row gap wrap">
            <div class="field grow">
              <label>Team name</label>
              <input id="teamName" type="text" placeholder="Default" />
            </div>
            <div class="field">
              <label>&nbsp;</label>
              <button class="btn" id="btnSaveTeam">Save</button>
            </div>
          </div>

          <hr class="sep"/>

          <div class="mini">
            <div class="minihead">Demo</div>
            <div class="minibody small muted">Use demo for training, screenshots, and walkthroughs.</div>
            <div class="row gap wrap" style="margin-top:10px">
              <button class="btn ghost" id="btnSeedDemo2">One-click demo seed</button>
              <button class="btn danger" id="btnResetLocal">Reset local data</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // populate
    const roster = $("rosterList");
    if (roster) {
      roster.innerHTML = athletes.length
        ? athletes.map((a) => `
            <div class="item">
              <div>
                <div><b>${escHTML(a.name || "—")}</b> <span class="muted small">${escHTML(a.position || "")}</span></div>
                <div class="muted small">Ht: ${escHTML(a.heightIn ?? "—")} in • Wt: ${escHTML(a.weightLb ?? "—")} lb</div>
              </div>
              <button class="btn danger" data-del="${escHTML(a.id)}">Remove</button>
            </div>
          `).join("")
        : `<div class="callout">No athletes yet. Add one above or use demo seed.</div>`;

      qa("[data-del]", roster).forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-del");
          if (!id) return;
          if (!confirm("Remove athlete and their local logs?")) return;
          state.athletes = state.athletes.filter((x) => x.id !== id);
          delete state.logs.training[id];
          delete state.logs.readiness[id];
          delete state.logs.nutrition[id];
          if (state.ui.lastAthleteId === id) state.ui.lastAthleteId = "";
          saveState();
          toast("Removed.");
          renderTeam();
        });
      });
    }

    // team name
    $("teamName").value = state.team?.name || "Default";
    $("btnSaveTeam")?.addEventListener("click", () => {
      state.team.name = ($("teamName")?.value || "Default").trim() || "Default";
      saveState();
      toast("Saved team settings");
      renderDashboard();
    });

    // add athlete
    $("btnAddAthlete")?.addEventListener("click", () => {
      const name = ($("athName")?.value || "").trim();
      const pos = ($("athPos")?.value || "").trim();
      const ht = toNum($("athHt")?.value, null);
      const wt = toNum($("athWt")?.value, null);

      if (!name) return toast("Enter athlete full name.");
      const a = { id: uid("ath"), name, position: pos, heightIn: ht, weightLb: wt };
      state.athletes.push(a);
      ensureLogBucket("training", a.id);
      ensureLogBucket("readiness", a.id);
      ensureLogBucket("nutrition", a.id);
      state.ui.lastAthleteId = a.id;

      saveState();
      toast("Added athlete");
      renderTeam();
      renderDashboard();
    });

    $("btnSeedDemo2")?.addEventListener("click", () => seedDemo(true));
    $("btnResetLocal")?.addEventListener("click", () => {
      if (!confirm("Reset all local data on this device?")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      state = defaultState();
      saveState();
      toast("Reset complete");
      showView("dashboard");
    });
  }

  // -----------------------------
  // Render: Log (Week 1–2 simple, never empty)
  // -----------------------------
  function renderLog() {
    const host = $("view-log");
    if (!host) return;

    const athletes = getAthletes();

    host.innerHTML = `
      <div class="grid2">
        <div class="card">
          <div class="cardhead"><h2>Training Log</h2><span class="muted">sRPE × minutes</span></div>

          <div class="row gap wrap">
            <div class="field">
              <label>Athlete</label>
              <select id="logAthlete"></select>
            </div>
            <div class="field">
              <label>Date</label>
              <input id="logDate" type="date" />
            </div>
            <div class="field">
              <label>Minutes</label>
              <input id="logMin" type="number" min="0" max="600" value="60" />
            </div>
            <div class="field">
              <label>sRPE (0–10)</label>
              <input id="logRpe" type="number" min="0" max="10" step="1" value="6" />
            </div>
            <div class="field">
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
            <div class="field">
              <label>&nbsp;</label>
              <button class="btn" id="btnSaveTraining">Save Session</button>
            </div>
          </div>

          <div class="row gap wrap" style="margin-top:8px">
            <div class="field grow">
              <label>Notes</label>
              <input id="logNotes" type="text" placeholder="optional" />
            </div>
          </div>

          <div class="mini" style="margin-top:12px">
            <div class="minihead">Computed</div>
            <div class="minibody mono small" id="logComputed">Load: —</div>
          </div>

          <div class="list" id="trainingList" style="margin-top:12px"></div>
        </div>

        <div class="card">
          <div class="cardhead"><h2>Readiness</h2><span class="muted">Daily check-in</span></div>

          ${
            athletes.length
              ? `<div class="callout">
                   Week 1–2: readiness logging appears in the next milestone when Athlete Mode is enabled.
                 </div>`
              : `<div class="callout">Add athletes first in <b>Team</b>.</div>`
          }

          <div class="mini" style="margin-top:12px">
            <div class="minihead">Why this matters</div>
            <div class="minibody small muted">
              Training load + readiness trends power the risk and deload suggestions in later milestones.
            </div>
          </div>
        </div>
      </div>
    `;

    // Empty-state safety
    const sel = $("logAthlete");
    fillAthleteSelect(sel, state.ui.lastAthleteId || "");

    const dateEl = $("logDate");
    if (dateEl && !safeISO(dateEl.value)) dateEl.value = todayISO();

    function updateComputed() {
      const m = clamp(toNum($("logMin")?.value, 0), 0, 600);
      const r = clamp(toNum($("logRpe")?.value, 0), 0, 10);
      $("logComputed").textContent = `Load: ${Math.round(m * r)}`;
    }
    $("logMin")?.addEventListener("input", updateComputed);
    $("logRpe")?.addEventListener("input", updateComputed);
    updateComputed();

    // Save session
    $("btnSaveTraining")?.addEventListener("click", () => {
      const athleteId = $("logAthlete")?.value || "";
      if (!athleteId) return toast("Add an athlete first.");
      const dateISO = safeISO($("logDate")?.value) || todayISO();
      const minutes = clamp(toNum($("logMin")?.value, 0), 0, 600);
      const rpe = clamp(toNum($("logRpe")?.value, 0), 0, 10);
      const type = String($("logType")?.value || "practice");
      const notes = ($("logNotes")?.value || "").trim();

      ensureLogBucket("training", athleteId);
      const sess = {
        id: uid("sess"),
        dateISO,
        minutes,
        rpe,
        type,
        notes,
        load: Math.round(minutes * rpe)
      };
      const list = getTraining(athleteId);
      list.unshift(sess);
      state.logs.training[athleteId] = list.slice(0, 200);

      state.ui.lastAthleteId = athleteId;
      $("logNotes").value = "";
      saveState();
      toast("Saved session");
      renderLog();
    });

    // List sessions
    const listHost = $("trainingList");
    if (!listHost) return;

    const athleteId = $("logAthlete")?.value || "";
    if (!athleteId) {
      listHost.innerHTML = `<div class="callout">Add athletes in <b>Team</b>.</div>`;
      return;
    }

    const sessions = getTraining(athleteId).slice(0, 20);
    listHost.innerHTML = sessions.length
      ? sessions.map((s) => `
          <div class="item">
            <div>
              <div><b>${escHTML(s.dateISO)}</b> • ${escHTML(s.type)} • ${escHTML(s.minutes)} min • sRPE ${escHTML(s.rpe)}</div>
              <div class="muted small">Load: <b>${escHTML(s.load)}</b>${s.notes ? ` • ${escHTML(s.notes)}` : ""}</div>
            </div>
            <button class="btn danger" data-del="${escHTML(s.id)}">Delete</button>
          </div>
        `).join("")
      : `<div class="callout">No sessions yet.</div>`;

    qa("[data-del]", listHost).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-del");
        if (!id) return;
        state.logs.training[athleteId] = getTraining(athleteId).filter((x) => x.id !== id);
        saveState();
        toast("Deleted");
        renderLog();
      });
    });
  }

  // -----------------------------
  // Week 1–2 placeholders for other views (non-empty)
  // -----------------------------
  function renderNutrition() {
    const host = $("view-nutrition");
    if (!host) return;
    host.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Elite Nutrition</h2><span class="muted">Coming online next milestone</span></div>
        <div class="callout">
          Nutrition tracking + meal planning will appear after Athlete Mode is enabled (Week 3–4).
        </div>
      </div>
    `;
  }

  function renderWorkouts() {
    const host = $("view-workouts");
    if (!host) return;
    host.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Workouts</h2><span class="muted">Week 3–6</span></div>
        <div class="callout">
          Week 1–2 locks the UI foundation. Next milestone adds Standard/Advanced workouts + sport engine.
        </div>
      </div>
    `;
  }

  function renderPeriodization() {
    const host = $("view-periodization");
    if (!host) return;
    host.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Periodization</h2><span class="muted">Week 5–6</span></div>
        <div class="callout">
          Periodization templates are enabled after the workout library is integrated.
        </div>
      </div>
    `;
  }

  function renderAnalytics() {
    const host = $("view-analytics");
    if (!host) return;
    host.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Analytics</h2><span class="muted">Hidden from athletes later</span></div>
        <div class="callout">
          Analytics phase comes after we generate real data and weekly summaries (Week 7–8).
        </div>
      </div>
    `;
  }

  function renderSettings() {
    const host = $("view-settings");
    if (!host) return;

    host.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Settings</h2><span class="muted">Device + experience</span></div>

        <div class="grid2">
          <div class="mini">
            <div class="minihead">Mode</div>
            <div class="minibody small muted">
              Switch between Coach and Athlete experiences. Athlete mode stays clutter-free.
            </div>
            <div class="row gap wrap" style="margin-top:10px">
              <button class="btn" id="btnRoleCoach">Coach</button>
              <button class="btn ghost" id="btnRoleAthlete">Athlete</button>
            </div>
            <div class="small muted" style="margin-top:10px" id="roleState">—</div>
          </div>

          <div class="mini">
            <div class="minihead">Device</div>
            <div class="minibody mono small" id="deviceState">—</div>
          </div>

          <div class="mini">
            <div class="minihead">Local storage</div>
            <div class="minibody small muted">
              Data is stored on this device (offline-first).
            </div>
            <div class="row gap wrap" style="margin-top:10px">
              <button class="btn danger" id="btnWipe">Wipe local data</button>
            </div>
          </div>

          <div class="mini">
            <div class="minihead">App info</div>
            <div class="minibody mono small" id="appInfo">—</div>
          </div>
        </div>
      </div>
    `;

    $("roleState").textContent = `Current role: ${state.ui.role === "athlete" ? "Athlete" : "Coach"}`;
    $("deviceState").textContent = `Mobile layout: ${device.mobile ? "ON (bottom nav)" : "OFF (sidebar)"}`;

    $("appInfo").textContent =
      `PerformanceIQ v${APP_VERSION}\n` +
      `Storage key: ${STORAGE_KEY}\n` +
      `Updated: ${new Date(state.meta.updatedAtMs || Date.now()).toLocaleString()}\n` +
      `Athletes: ${state.athletes.length}`;

    $("btnRoleCoach")?.addEventListener("click", () => {
      state.ui.role = "coach";
      saveState();
      toast("Coach view enabled");
      renderDashboard();
      renderSettings();
    });
    $("btnRoleAthlete")?.addEventListener("click", () => {
      state.ui.role = "athlete";
      saveState();
      toast("Athlete view enabled");
      renderDashboard();
      renderSettings();
    });

    $("btnWipe")?.addEventListener("click", () => {
      if (!confirm("Wipe ALL local data on this device? This cannot be undone.")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      state = defaultState();
      saveState();
      toast("Local data wiped");
      showView("dashboard");
    });
  }

  // -----------------------------
  // Demo seed (Week 1–2 safe)
  // -----------------------------
  function seedDemo(showToast) {
    // Seed a tiny dataset that guarantees screens are populated.
    if (!state.athletes.length) {
      const a1 = { id: uid("ath"), name: "Jordan Smith", position: "PG", heightIn: 70, weightLb: 155 };
      const a2 = { id: uid("ath"), name: "Cam Johnson", position: "SG", heightIn: 72, weightLb: 165 };
      state.athletes.push(a1, a2);
      ensureLogBucket("training", a1.id);
      ensureLogBucket("training", a2.id);
      state.ui.lastAthleteId = a1.id;

      // add a couple sessions
      const d = todayISO();
      state.logs.training[a1.id] = [{ id: uid("sess"), dateISO: d, minutes: 60, rpe: 6, type: "practice", notes: "Demo", load: 360 }];
      state.logs.training[a2.id] = [{ id: uid("sess"), dateISO: d, minutes: 45, rpe: 7, type: "skills", notes: "Demo", load: 315 }];
    }

    saveState();
    if (showToast) toast("Demo loaded");
    renderDashboard();
    // If currently in Team view, rerender it too
    if (state.ui.activeView === "team") renderTeam();
    if (state.ui.activeView === "log") renderLog();
  }

  // -----------------------------
  // Header actions (seed/export/import/auth modal exists in HTML)
  // -----------------------------
  function wireTopbar() {
    $("btnSeed")?.addEventListener("click", () => seedDemo(true));

    $("btnExport")?.addEventListener("click", () => {
      try {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `performanceiq_export_${todayISO()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast("Exported");
      } catch {
        toast("Export failed.");
      }
    });

    $("fileImport")?.addEventListener("change", (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || ""));
          state = normalizeState(parsed);
          saveState();
          toast("Imported");
          showView("dashboard");
        } catch {
          toast("Import failed.");
        } finally {
          e.target.value = "";
        }
      };
      reader.readAsText(file);
    });

    // Auth modal wiring (UI only for Week 1–2; cloud lock comes later)
    $("btnAuth")?.addEventListener("click", () => {
      const m = $("authModal");
      if (m) m.hidden = false;
    });
    $("btnCloseAuth")?.addEventListener("click", () => {
      const m = $("authModal");
      if (m) m.hidden = true;
    });
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function boot() {
    // team pill
    const teamPill = $("activeTeamPill");
    if (teamPill) teamPill.textContent = `Team: ${state.team?.name || "Default"}`;

    // cloud pill (Week 1–2 local only)
    const cloudPill = $("cloudPill");
    if (cloudPill) cloudPill.textContent = `Cloud: Local`;

    wireNav();
    wireTopbar();

    // Make sure at least dashboard shows something
    const initial = state.ui.activeView || "dashboard";
    showView(initial);
    hideSplashNow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
