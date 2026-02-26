// core.js — v3.1.0 (Week 3–4)
// Adds: onboarding wizard, athlete Today page, quick log, nutrition targets + quick nutrition log
(function () {
  "use strict";
  if (window.__PIQ_CORE_V31__) return;
  window.__PIQ_CORE_V31__ = true;

  const APP_VERSION = "3.1.0";
  const STORAGE_KEY = "piq_state_v31";

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
  // Customer-safe toast
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
      toastTimer = setTimeout(() => (el.style.display = "none"), ms);
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
  setTimeout(() => hideSplashNow(), 2500);

  // -----------------------------
  // Device detection
  // -----------------------------
  function computeDeviceMode() {
    const mobile = window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
    document.body.classList.toggle("is-mobile", !!mobile);
    return { mobile };
  }
  let device = computeDeviceMode();
  window.addEventListener("resize", () => {
    device = computeDeviceMode();
    updateDevicePill();
  });

  function updateDevicePill() {
    const p = $("devicePill");
    if (!p) return;
    p.textContent = device.mobile ? "Device: Mobile" : "Device: Desktop";
  }

  // -----------------------------
  // State
  // -----------------------------
  function defaultState() {
    const now = Date.now();
    return {
      meta: { version: 1, appVersion: APP_VERSION, updatedAtMs: now },
      ui: {
        role: "coach",              // "coach" | "athlete"
        activeView: "dashboard",
        lastAthleteId: "",
        onboard: { step: 1, completed: false },
        device: { mobile: device.mobile }
      },
      team: { id: "local", name: "Default" },
      athletes: [],                 // {id,name,position,heightIn,weightLb}
      nutritionTargets: {},         // nutritionTargets[athleteId] = {protein,carbs,fat,waterOz}
      logs: {
        training: {},               // training[athleteId] = [{id,dateISO,minutes,rpe,type,notes,load}]
        nutrition: {}               // nutrition[athleteId] = [{id,dateISO,protein,carbs,fat,waterOz,notes}]
      },
      workouts: {
        levelByAthlete: {},         // "standard" | "advanced"
        libraryVersion: 1
      }
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return normalizeState(JSON.parse(raw));
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
    s.nutritionTargets = s.nutritionTargets && typeof s.nutritionTargets === "object" ? s.nutritionTargets : {};
    s.workouts = s.workouts && typeof s.workouts === "object" ? s.workouts : d.workouts;

    s.logs = s.logs && typeof s.logs === "object" ? s.logs : d.logs;
    if (!s.logs.training || typeof s.logs.training !== "object") s.logs.training = {};
    if (!s.logs.nutrition || typeof s.logs.nutrition !== "object") s.logs.nutrition = {};

    if (!s.ui.onboard || typeof s.ui.onboard !== "object") s.ui.onboard = { step: 1, completed: false };
    if (!s.ui.device || typeof s.ui.device !== "object") s.ui.device = { mobile: device.mobile };

    return s;
  }

  function saveState() {
    try {
      state.meta.updatedAtMs = Date.now();
      state.meta.appVersion = APP_VERSION;
      state.ui.device = { mobile: device.mobile };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      toast("Could not save on this device.");
    }
  }

  // -----------------------------
  // Utilities
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

  function ensureBucket(bucket, athleteId) {
    if (!athleteId) return;
    if (!state.logs[bucket][athleteId]) state.logs[bucket][athleteId] = [];
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

  function getTargets(athleteId) {
    const t = state.nutritionTargets[athleteId];
    if (t && typeof t === "object") return t;
    // sensible defaults if not set:
    return { protein: 150, carbs: 250, fat: 70, waterOz: 80 };
  }

  function setTargets(athleteId, t) {
    state.nutritionTargets[athleteId] = {
      protein: clamp(toNum(t.protein, 0), 0, 600),
      carbs: clamp(toNum(t.carbs, 0), 0, 1200),
      fat: clamp(toNum(t.fat, 0), 0, 300),
      waterOz: clamp(toNum(t.waterOz, 0), 0, 300),
    };
  }

  function sumNutritionForDate(athleteId, dateISO) {
    const list = Array.isArray(state.logs.nutrition[athleteId]) ? state.logs.nutrition[athleteId] : [];
    const sameDay = list.filter((x) => x.dateISO === dateISO);
    const sum = { protein: 0, carbs: 0, fat: 0, waterOz: 0 };
    sameDay.forEach((x) => {
      sum.protein += toNum(x.protein, 0);
      sum.carbs += toNum(x.carbs, 0);
      sum.fat += toNum(x.fat, 0);
      sum.waterOz += toNum(x.waterOz, 0);
    });
    return sum;
  }

  function adherencePct(actual, target) {
    if (!target) return 0;
    const pct = (actual / target) * 100;
    return clamp(Math.round(pct), 0, 200);
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

    qa(".navbtn").forEach((b) => b.classList.toggle("active", b.getAttribute("data-view") === view));

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
      const host = document.getElementById(`view-${view}`);
      if (host) {
        host.innerHTML = `
          <div class="card">
            <div class="cardhead"><h2>We hit a snag</h2><span class="muted">Try again</span></div>
            <div class="callout">Something didn’t load correctly. Please refresh.</div>
          </div>
        `;
      }
    }

    saveState();
    hideSplashNow();
  }

  function wireNav() {
    qa(".navbtn").forEach((btn) => {
      btn.addEventListener("click", () => showView(btn.getAttribute("data-view") || "dashboard"));
    });
  }

  // -----------------------------
  // Onboarding Wizard
  // -----------------------------
  function openOnboard() {
    const m = $("onboardModal");
    if (!m) return;
    m.hidden = false;
    renderWizard();
  }

  function closeOnboard() {
    const m = $("onboardModal");
    if (!m) return;
    m.hidden = true;
  }

  function setWizardStep(step) {
    state.ui.onboard.step = clamp(toNum(step, 1), 1, 3);
    saveState();
    renderWizard();
  }

  function renderWizard() {
    const body = $("wizBody");
    if (!body) return;

    const step = state.ui.onboard.step || 1;
    qa(".wizstep").forEach((s) => {
      const n = toNum(s.getAttribute("data-step"), 0);
      s.classList.toggle("active", n === step);
      s.classList.toggle("done", n < step);
    });

    $("btnWizBack").disabled = step <= 1;
    $("btnWizNext").textContent = step >= 3 ? "Finish" : "Next";

    if (step === 1) {
      body.innerHTML = `
        <div class="card" style="margin-bottom:0">
          <div class="cardhead"><h2>Choose your role</h2><span class="muted">Coach or Athlete</span></div>

          <div class="row gap wrap">
            <button class="btn" id="pickCoach">Coach</button>
            <button class="btn ghost" id="pickAthlete">Athlete</button>
          </div>

          <div class="mini" style="margin-top:12px">
            <div class="minihead">What changes?</div>
            <div class="minibody small muted">
              Coach view shows team setup + logs. Athlete view shows a clean “Today” experience with quick logging.
            </div>
          </div>
        </div>
      `;
      $("pickCoach")?.addEventListener("click", () => {
        state.ui.role = "coach";
        toast("Coach role selected");
        saveState();
        renderWizard();
      });
      $("pickAthlete")?.addEventListener("click", () => {
        state.ui.role = "athlete";
        toast("Athlete role selected");
        saveState();
        renderWizard();
      });
      return;
    }

    if (step === 2) {
      const athletes = getAthletes();
      const isCoach = state.ui.role !== "athlete";
      body.innerHTML = `
        <div class="card" style="margin-bottom:0">
          <div class="cardhead"><h2>${isCoach ? "Add an athlete" : "Select your athlete"}</h2><span class="muted">Roster</span></div>

          ${
            isCoach
              ? `
                <div class="row gap wrap">
                  <div class="field">
                    <label>Full name</label>
                    <input id="wizAthName" type="text" placeholder="e.g., Jordan Smith" />
                  </div>
                  <div class="field">
                    <label>Position</label>
                    <input id="wizAthPos" type="text" placeholder="PG / SG / SF / PF / C" />
                  </div>
                  <div class="field">
                    <label>&nbsp;</label>
                    <button class="btn" id="wizAddAth">Add</button>
                  </div>
                </div>
              `
              : `
                <div class="row gap wrap">
                  <div class="field grow">
                    <label>Your athlete</label>
                    <select id="wizPickAth"></select>
                  </div>
                  <div class="field">
                    <label>&nbsp;</label>
                    <button class="btn" id="wizUseAth">Use selected</button>
                  </div>
                </div>

                <div class="callout" style="margin-top:12px">
                  If you don’t see your name, ask your coach to add you in <b>Team</b> or use Demo Seed.
                </div>
              `
          }

          <div class="mini" style="margin-top:12px">
            <div class="minihead">Current roster</div>
            <div class="minibody" id="wizRoster"></div>
          </div>

          <div class="row gap wrap" style="margin-top:12px">
            <button class="btn ghost" id="wizSeed">Use demo roster</button>
          </div>
        </div>
      `;

      const rosterEl = $("wizRoster");
      if (rosterEl) {
        rosterEl.innerHTML = athletes.length
          ? athletes.map((a) => `<div class="pilltag">${escHTML(athleteLabel(a))}</div>`).join(" ")
          : `<span class="muted small">No athletes yet.</span>`;
      }

      $("wizSeed")?.addEventListener("click", () => seedDemo(true));

      if (isCoach) {
        $("wizAddAth")?.addEventListener("click", () => {
          const name = ($("wizAthName")?.value || "").trim();
          const pos = ($("wizAthPos")?.value || "").trim();
          if (!name) return toast("Enter athlete name.");
          const a = { id: uid("ath"), name, position: pos, heightIn: null, weightLb: null };
          state.athletes.push(a);
          ensureBucket("training", a.id);
          ensureBucket("nutrition", a.id);
          state.ui.lastAthleteId = a.id;

          // default targets
          if (!state.nutritionTargets[a.id]) setTargets(a.id, getTargets(a.id));

          saveState();
          toast("Athlete added");
          renderWizard();
        });
      } else {
        const sel = $("wizPickAth");
        fillAthleteSelect(sel, state.ui.lastAthleteId || "");
        $("wizUseAth")?.addEventListener("click", () => {
          const id = sel?.value || "";
          if (!id) return toast("No athlete found. Use demo or ask coach.");
          state.ui.lastAthleteId = id;
          if (!state.nutritionTargets[id]) setTargets(id, getTargets(id));
          saveState();
          toast("Athlete selected");
          renderWizard();
        });
      }
      return;
    }

    // step 3
    const athleteId = state.ui.lastAthleteId || "";
    const hasAth = !!athleteId;
    const t = hasAth ? getTargets(athleteId) : getTargets("_");
    body.innerHTML = `
      <div class="card" style="margin-bottom:0">
        <div class="cardhead"><h2>Defaults</h2><span class="muted">Nutrition targets</span></div>

        ${
          hasAth
            ? `<div class="callout">Targets apply to: <b>${escHTML(athleteLabel(getAthletes().find(a => a.id === athleteId)))}</b></div>`
            : `<div class="callout">No athlete selected yet. Go back and select one.</div>`
        }

        <div class="row gap wrap" style="margin-top:12px">
          <div class="field">
            <label>Protein (g)</label>
            <input id="wizTP" type="number" min="0" max="600" value="${escHTML(t.protein)}" />
          </div>
          <div class="field">
            <label>Carbs (g)</label>
            <input id="wizTC" type="number" min="0" max="1200" value="${escHTML(t.carbs)}" />
          </div>
          <div class="field">
            <label>Fat (g)</label>
            <input id="wizTF" type="number" min="0" max="300" value="${escHTML(t.fat)}" />
          </div>
          <div class="field">
            <label>Water (oz)</label>
            <input id="wizTW" type="number" min="0" max="300" value="${escHTML(t.waterOz)}" />
          </div>
          <div class="field">
            <label>&nbsp;</label>
            <button class="btn" id="wizSaveTargets">Save Targets</button>
          </div>
        </div>

        <div class="mini" style="margin-top:12px">
          <div class="minihead">Why targets?</div>
          <div class="minibody small muted">
            Week 5–6 will compute nutrition adherence and feed into deload + risk flags.
          </div>
        </div>
      </div>
    `;

    $("wizSaveTargets")?.addEventListener("click", () => {
      if (!hasAth) return toast("Select an athlete first.");
      setTargets(athleteId, {
        protein: $("wizTP")?.value,
        carbs: $("wizTC")?.value,
        fat: $("wizTF")?.value,
        waterOz: $("wizTW")?.value
      });
      saveState();
      toast("Targets saved");
    });
  }

  function wireWizardButtons() {
    $("btnOnboard")?.addEventListener("click", () => openOnboard());
    $("btnCloseOnboard")?.addEventListener("click", () => closeOnboard());

    $("btnWizBack")?.addEventListener("click", () => setWizardStep((state.ui.onboard.step || 1) - 1));
    $("btnWizNext")?.addEventListener("click", () => {
      const step = state.ui.onboard.step || 1;
      if (step < 3) return setWizardStep(step + 1);

      // Finish
      state.ui.onboard.completed = true;
      saveState();
      toast("Setup complete");
      closeOnboard();
      showView("dashboard");
    });

    $("btnWizSkip")?.addEventListener("click", () => {
      state.ui.onboard.completed = true;
      saveState();
      toast("Setup skipped");
      closeOnboard();
      showView("dashboard");
    });
  }

  // -----------------------------
  // Render: Dashboard
  // -----------------------------
  function renderDashboard() {
    const coachWrap = $("coachDashWrap");
    const athleteWrap = $("athleteDashWrap");
    if (!coachWrap || !athleteWrap) return;

    const role = state.ui.role || "coach";
    const athletes = getAthletes();
    const athleteId = state.ui.lastAthleteId || (athletes[0]?.id || "");
    if (athleteId && !state.ui.lastAthleteId) state.ui.lastAthleteId = athleteId;

    // Coach summary
    coachWrap.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Coach Summary</h2><span class="muted">Quick overview</span></div>
        <div class="mini">
          <div class="minihead">Team</div>
          <div class="minibody">
            <b>${escHTML(state.team?.name || "Default")}</b>
            <span class="pilltag" style="margin-left:8px">${athletes.length} athlete${athletes.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div class="mini" style="margin-top:10px">
          <div class="minihead">Next actions</div>
          <div class="minibody small muted">
            Add athletes in <b>Team</b>, then have athletes use <b>Dashboard → Today</b> to log quickly.
          </div>
        </div>
        <div class="row gap wrap" style="margin-top:12px">
          <button class="btn" id="dashGoTeam">Add athlete</button>
          <button class="btn ghost" id="dashGoLog">Go to Log</button>
          <button class="btn ghost" id="dashSeed">One-click demo</button>
          <button class="btn ghost" id="dashSwitchRole">Switch to Athlete view</button>
        </div>
      </div>

      <div class="card">
        <div class="cardhead"><h2>Adoption Checklist</h2><span class="muted">Week 3–4</span></div>
        <div class="list">
          <div class="item"><div><b>1</b> Run onboarding (role + athlete)</div><span class="pilltag">60 sec</span></div>
          <div class="item"><div><b>2</b> Set nutrition targets</div><span class="pilltag">30 sec</span></div>
          <div class="item"><div><b>3</b> Use Athlete “Today” quick log</div><span class="pilltag">daily</span></div>
        </div>
      </div>
    `;

    $("dashGoTeam")?.addEventListener("click", () => showView("team"));
    $("dashGoLog")?.addEventListener("click", () => showView("log"));
    $("dashSeed")?.addEventListener("click", () => seedDemo(true));
    $("dashSwitchRole")?.addEventListener("click", () => {
      state.ui.role = "athlete";
      saveState();
      toast("Switched to Athlete view");
      renderDashboard();
    });

    // Athlete Today Page
    const aObj = athletes.find((a) => a.id === athleteId) || athletes[0] || null;
    const dateISO = todayISO();
    const targets = athleteId ? getTargets(athleteId) : getTargets("_");
    const totals = athleteId ? sumNutritionForDate(athleteId, dateISO) : { protein: 0, carbs: 0, fat: 0, waterOz: 0 };

    const wLevel = state.workouts.levelByAthlete[athleteId] || "standard";
    const todaysWorkout = buildTodayWorkoutCard(aObj, wLevel);

    athleteWrap.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Athlete • Today</h2><span class="muted">${escHTML(dateISO)}</span></div>

        ${
          athletes.length
            ? `
            <div class="row gap wrap">
              <div class="field grow">
                <label>Athlete</label>
                <select id="athTodayPick"></select>
              </div>
              <div class="field">
                <label>Mode</label>
                <select id="athRolePick">
                  <option value="athlete">Athlete</option>
                  <option value="coach">Coach</option>
                </select>
              </div>
              <div class="field">
                <label>&nbsp;</label>
                <button class="btn ghost" id="athOpenOnboard">Onboarding</button>
              </div>
            </div>

            <div class="tilegrid" style="margin-top:12px">
              <div class="mini">
                <div class="minihead">Today’s Workout</div>
                <div class="minibody">${todaysWorkout}</div>
                <div class="row gap wrap" style="margin-top:10px">
                  <button class="btn" id="btnTodayQuickLog">Quick Log</button>
                  <button class="btn ghost" id="btnGoWorkouts">Workouts</button>
                </div>
              </div>

              <div class="mini">
                <div class="minihead">Today’s Nutrition Target</div>
                <div class="minibody mono small">
                  Protein: <b>${escHTML(targets.protein)}</b>g (now ${escHTML(totals.protein)}g)<br/>
                  Carbs: <b>${escHTML(targets.carbs)}</b>g (now ${escHTML(totals.carbs)}g)<br/>
                  Fat: <b>${escHTML(targets.fat)}</b>g (now ${escHTML(totals.fat)}g)<br/>
                  Water: <b>${escHTML(targets.waterOz)}</b>oz (now ${escHTML(totals.waterOz)}oz)
                </div>
                <div class="row gap wrap" style="margin-top:10px">
                  <button class="btn" id="btnTodayQuickNut">Quick Nutrition Log</button>
                  <button class="btn ghost" id="btnGoNutrition">Nutrition</button>
                </div>
              </div>
            </div>

            <div class="mini" style="margin-top:12px">
              <div class="minihead">Compliance snapshot</div>
              <div class="minibody mono small">
                Protein: ${adherencePct(totals.protein, targets.protein)}% •
                Carbs: ${adherencePct(totals.carbs, targets.carbs)}% •
                Fat: ${adherencePct(totals.fat, targets.fat)}% •
                Water: ${adherencePct(totals.waterOz, targets.waterOz)}%
              </div>
            </div>
          `
            : `
            <div class="callout">
              No athletes yet. Use <b>Seed Demo</b> or ask your coach to add you in <b>Team</b>.
            </div>
            <div class="row gap wrap" style="margin-top:12px">
              <button class="btn" id="btnAthSeedDemo">Load demo</button>
              <button class="btn ghost" id="btnAthOnboard">Onboarding</button>
            </div>
          `
        }
      </div>
    `;

    if (!athletes.length) {
      $("btnAthSeedDemo")?.addEventListener("click", () => seedDemo(true));
      $("btnAthOnboard")?.addEventListener("click", () => openOnboard());
    } else {
      const sel = $("athTodayPick");
      fillAthleteSelect(sel, athleteId);
      $("athRolePick").value = role === "athlete" ? "athlete" : "coach";

      sel?.addEventListener("change", () => {
        state.ui.lastAthleteId = sel.value;
        saveState();
        renderDashboard();
      });

      $("athRolePick")?.addEventListener("change", () => {
        state.ui.role = $("athRolePick").value === "coach" ? "coach" : "athlete";
        saveState();
        toast("Role updated");
        renderDashboard();
      });

      $("athOpenOnboard")?.addEventListener("click", () => openOnboard());
      $("btnGoNutrition")?.addEventListener("click", () => showView("nutrition"));
      $("btnGoWorkouts")?.addEventListener("click", () => showView("workouts"));

      $("btnTodayQuickLog")?.addEventListener("click", () => openQuickLogModal());
      $("btnTodayQuickNut")?.addEventListener("click", () => openQuickNutritionModal());
    }

    // Role visibility
    coachWrap.style.display = role === "coach" ? "" : "none";
    athleteWrap.style.display = role === "athlete" ? "" : "none";
  }

  function buildTodayWorkoutCard(athleteObj, level) {
    const name = athleteObj?.name ? escHTML(athleteObj.name) : "Athlete";
    const day = new Date().getDay(); // 0=Sun
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
      return `<b>Recovery / Mobility</b><br/><span class="muted small">Light movement, stretching, hydration.</span>`;
    }

    const base = [
      "Dynamic warm-up (8–10 min)",
      "Skill block: ball-handling (10 min)",
      "Shooting: form + game spots (20 min)",
      "Finishing: contact/angles (10 min)",
      "Cooldown + mobility (8 min)"
    ];

    const advancedAdds = [
      "Add: plyo primer (3×5 pogo + 3×3 jumps)",
      "Add: conditioning (6×30s hard / 60s easy)",
      "Add: competitive shooting (timed constraints)"
    ];

    const list = (level === "advanced")
      ? base.concat(advancedAdds)
      : base;

    return `
      <div><b>${level === "advanced" ? "Advanced" : "Standard"} Session</b> • <span class="muted small">${name}</span></div>
      <div class="small muted" style="margin-top:6px">${list.map(x => `• ${escHTML(x)}`).join("<br/>")}</div>
    `;
  }

  // -----------------------------
  // Team (same as before, never empty)
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
            <div class="minihead">Onboarding</div>
            <div class="minibody small muted">Run the wizard any time.</div>
            <div class="row gap wrap" style="margin-top:10px">
              <button class="btn ghost" id="btnRunOnboard">Open onboarding</button>
              <button class="btn ghost" id="btnSeedDemo2">One-click demo seed</button>
              <button class="btn danger" id="btnResetLocal">Reset local data</button>
            </div>
          </div>
        </div>
      </div>
    `;

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
          delete state.logs.nutrition[id];
          delete state.nutritionTargets[id];
          delete state.workouts.levelByAthlete[id];

          if (state.ui.lastAthleteId === id) state.ui.lastAthleteId = "";
          saveState();
          toast("Removed.");
          renderTeam();
          renderDashboard();
        });
      });
    }

    $("teamName").value = state.team?.name || "Default";
    $("btnSaveTeam")?.addEventListener("click", () => {
      state.team.name = ($("teamName")?.value || "Default").trim() || "Default";
      saveState();
      toast("Saved team settings");
      renderDashboard();
    });

    $("btnAddAthlete")?.addEventListener("click", () => {
      const name = ($("athName")?.value || "").trim();
      const pos = ($("athPos")?.value || "").trim();
      const ht = toNum($("athHt")?.value, null);
      const wt = toNum($("athWt")?.value, null);
      if (!name) return toast("Enter athlete full name.");

      const a = { id: uid("ath"), name, position: pos, heightIn: ht, weightLb: wt };
      state.athletes.push(a);
      ensureBucket("training", a.id);
      ensureBucket("nutrition", a.id);
      state.ui.lastAthleteId = a.id;

      if (!state.nutritionTargets[a.id]) setTargets(a.id, getTargets(a.id));
      if (!state.workouts.levelByAthlete[a.id]) state.workouts.levelByAthlete[a.id] = "standard";

      saveState();
      toast("Added athlete");
      renderTeam();
      renderDashboard();
    });

    $("btnRunOnboard")?.addEventListener("click", () => openOnboard());
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
  // Log (coach-friendly, never empty)
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
          <div class="cardhead"><h2>Week 3–4</h2><span class="muted">Athlete compliance boost</span></div>
          <div class="callout">
            Athletes should log from <b>Dashboard → Today</b> for highest compliance.
          </div>
          <div class="mini" style="margin-top:12px">
            <div class="minihead">Next milestone</div>
            <div class="minibody small muted">
              Week 5–6 adds interactive workouts + periodization integration.
            </div>
          </div>
        </div>
      </div>
    `;

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

    $("btnSaveTraining")?.addEventListener("click", () => {
      const athleteId = $("logAthlete")?.value || "";
      if (!athleteId) return toast("Add an athlete first.");
      const dateISO = safeISO($("logDate")?.value) || todayISO();
      const minutes = clamp(toNum($("logMin")?.value, 0), 0, 600);
      const rpe = clamp(toNum($("logRpe")?.value, 0), 0, 10);
      const type = String($("logType")?.value || "practice");
      const notes = ($("logNotes")?.value || "").trim();

      ensureBucket("training", athleteId);
      const sess = { id: uid("sess"), dateISO, minutes, rpe, type, notes, load: Math.round(minutes * rpe) };
      const list = Array.isArray(state.logs.training[athleteId]) ? state.logs.training[athleteId].slice() : [];
      list.unshift(sess);
      state.logs.training[athleteId] = list.slice(0, 250);

      state.ui.lastAthleteId = athleteId;
      $("logNotes").value = "";
      saveState();
      toast("Saved session");
      renderLog();
      renderDashboard();
    });

    const listHost = $("trainingList");
    const athleteId = $("logAthlete")?.value || "";
    if (!athleteId) {
      listHost.innerHTML = `<div class="callout">Add athletes in <b>Team</b>.</div>`;
      return;
    }
    const sessions = (Array.isArray(state.logs.training[athleteId]) ? state.logs.training[athleteId] : []).slice(0, 20);
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
        state.logs.training[athleteId] = sessions.filter((x) => x.id !== id)
          .concat((Array.isArray(state.logs.training[athleteId]) ? state.logs.training[athleteId] : []).filter(x => !sessions.some(y=>y.id===x.id)));
        saveState();
        toast("Deleted");
        renderLog();
        renderDashboard();
      });
    });
  }

  // -----------------------------
  // Nutrition view (targets + daily totals + quick add)
  // -----------------------------
  function renderNutrition() {
    const host = $("view-nutrition");
    if (!host) return;

    const athletes = getAthletes();
    const athleteId = state.ui.lastAthleteId || athletes[0]?.id || "";
    const d = todayISO();

    host.innerHTML = `
      <div class="grid2">
        <div class="card">
          <div class="cardhead"><h2>Nutrition</h2><span class="muted">Targets + quick log</span></div>

          <div class="row gap wrap">
            <div class="field">
              <label>Athlete</label>
              <select id="nutAth"></select>
            </div>
            <div class="field">
              <label>Date</label>
              <input id="nutDate" type="date" />
            </div>
            <div class="field">
              <label>&nbsp;</label>
              <button class="btn ghost" id="btnNutToday">Today</button>
            </div>
          </div>

          <div class="mini" style="margin-top:12px">
            <div class="minihead">Today totals</div>
            <div class="minibody mono small" id="nutTotals">—</div>
          </div>

          <div class="mini" style="margin-top:12px">
            <div class="minihead">Quick add</div>
            <div class="row gap wrap">
              <div class="field"><label>Protein</label><input id="qNP" type="number" min="0" max="300" value="30" /></div>
              <div class="field"><label>Carbs</label><input id="qNC" type="number" min="0" max="300" value="60" /></div>
              <div class="field"><label>Fat</label><input id="qNF" type="number" min="0" max="150" value="15" /></div>
              <div class="field"><label>Water (oz)</label><input id="qNW" type="number" min="0" max="120" value="16" /></div>
              <div class="field"><label>&nbsp;</label><button class="btn" id="btnAddNut">Add</button></div>
            </div>
            <div class="row gap wrap" style="margin-top:8px">
              <div class="field grow"><label>Notes</label><input id="qNNotes" type="text" placeholder="optional" /></div>
            </div>
          </div>

          <div class="list" id="nutList" style="margin-top:12px"></div>
        </div>

        <div class="card">
          <div class="cardhead"><h2>Targets</h2><span class="muted">Per athlete</span></div>

          <div class="callout">
            Set targets here — Athlete “Today” uses these automatically.
          </div>

          <div class="row gap wrap" style="margin-top:12px">
            <div class="field"><label>Protein (g)</label><input id="tP" type="number" min="0" max="600" /></div>
            <div class="field"><label>Carbs (g)</label><input id="tC" type="number" min="0" max="1200" /></div>
            <div class="field"><label>Fat (g)</label><input id="tF" type="number" min="0" max="300" /></div>
            <div class="field"><label>Water (oz)</label><input id="tW" type="number" min="0" max="300" /></div>
            <div class="field"><label>&nbsp;</label><button class="btn" id="btnSaveTargets">Save</button></div>
          </div>

          <div class="mini" style="margin-top:12px">
            <div class="minihead">Compliance</div>
            <div class="minibody mono small" id="nutCompliance">—</div>
          </div>
        </div>
      </div>
    `;

    const sel = $("nutAth");
    fillAthleteSelect(sel, athleteId);
    $("nutDate").value = d;

    function refreshNutritionPanels() {
      const id = $("nutAth")?.value || "";
      const dateISO = safeISO($("nutDate")?.value) || todayISO();
      if (!id) {
        $("nutTotals").textContent = "Add an athlete in Team.";
        $("nutList").innerHTML = `<div class="callout">No athlete selected.</div>`;
        return;
      }

      if (!state.nutritionTargets[id]) setTargets(id, getTargets(id));

      const targets = getTargets(id);
      const totals = sumNutritionForDate(id, dateISO);

      $("nutTotals").innerHTML =
        `Protein: <b>${totals.protein}</b>g • Carbs: <b>${totals.carbs}</b>g • Fat: <b>${totals.fat}</b>g • Water: <b>${totals.waterOz}</b>oz`;

      $("tP").value = targets.protein;
      $("tC").value = targets.carbs;
      $("tF").value = targets.fat;
      $("tW").value = targets.waterOz;

      $("nutCompliance").textContent =
        `Protein ${adherencePct(totals.protein, targets.protein)}% • ` +
        `Carbs ${adherencePct(totals.carbs, targets.carbs)}% • ` +
        `Fat ${adherencePct(totals.fat, targets.fat)}% • ` +
        `Water ${adherencePct(totals.waterOz, targets.waterOz)}%`;

      const list = Array.isArray(state.logs.nutrition[id]) ? state.logs.nutrition[id] : [];
      const items = list.filter(x => x.dateISO === dateISO).slice(0, 20);

      $("nutList").innerHTML = items.length
        ? items.map(x => `
          <div class="item">
            <div>
              <div><b>${escHTML(x.dateISO)}</b> • P ${escHTML(x.protein)} • C ${escHTML(x.carbs)} • F ${escHTML(x.fat)} • W ${escHTML(x.waterOz)}oz</div>
              <div class="muted small">${x.notes ? escHTML(x.notes) : ""}</div>
            </div>
            <button class="btn danger" data-ndel="${escHTML(x.id)}">Delete</button>
          </div>
        `).join("")
        : `<div class="callout">No nutrition entries for this date.</div>`;

      qa("[data-ndel]").forEach(btn => {
        btn.addEventListener("click", () => {
          const nid = btn.getAttribute("data-ndel");
          if (!nid) return;
          state.logs.nutrition[id] = list.filter(x => x.id !== nid);
          saveState();
          toast("Deleted");
          refreshNutritionPanels();
          renderDashboard();
        });
      });
    }

    sel?.addEventListener("change", () => {
      state.ui.lastAthleteId = sel.value;
      saveState();
      refreshNutritionPanels();
      renderDashboard();
    });

    $("nutDate")?.addEventListener("change", refreshNutritionPanels);
    $("btnNutToday")?.addEventListener("click", () => {
      $("nutDate").value = todayISO();
      refreshNutritionPanels();
    });

    $("btnSaveTargets")?.addEventListener("click", () => {
      const id = $("nutAth")?.value || "";
      if (!id) return toast("Select an athlete.");
      setTargets(id, { protein: $("tP").value, carbs: $("tC").value, fat: $("tF").value, waterOz: $("tW").value });
      saveState();
      toast("Targets saved");
      refreshNutritionPanels();
      renderDashboard();
    });

    $("btnAddNut")?.addEventListener("click", () => {
      const id = $("nutAth")?.value || "";
      if (!id) return toast("Select an athlete.");
      const dateISO = safeISO($("nutDate")?.value) || todayISO();
      ensureBucket("nutrition", id);

      const entry = {
        id: uid("nut"),
        dateISO,
        protein: clamp(toNum($("qNP").value, 0), 0, 300),
        carbs: clamp(toNum($("qNC").value, 0), 0, 300),
        fat: clamp(toNum($("qNF").value, 0), 0, 150),
        waterOz: clamp(toNum($("qNW").value, 0), 0, 120),
        notes: ($("qNNotes").value || "").trim()
      };

      const list = Array.isArray(state.logs.nutrition[id]) ? state.logs.nutrition[id].slice() : [];
      list.unshift(entry);
      state.logs.nutrition[id] = list.slice(0, 300);

      $("qNNotes").value = "";
      saveState();
      toast("Added");
      refreshNutritionPanels();
      renderDashboard();
    });

    refreshNutritionPanels();
  }

  // -----------------------------
  // Workouts (Week 3–4: level toggle per athlete)
  // -----------------------------
  function renderWorkouts() {
    const host = $("view-workouts");
    if (!host) return;

    const athletes = getAthletes();
    const athleteId = state.ui.lastAthleteId || athletes[0]?.id || "";
    const level = state.workouts.levelByAthlete[athleteId] || "standard";

    host.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Workouts</h2><span class="muted">Standard vs Advanced</span></div>

        <div class="row gap wrap">
          <div class="field">
            <label>Athlete</label>
            <select id="wAth"></select>
          </div>
          <div class="field">
            <label>Difficulty</label>
            <select id="wLevel">
              <option value="standard">Standard</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div class="field">
            <label>&nbsp;</label>
            <button class="btn" id="btnSaveWLvl">Save</button>
          </div>
        </div>

        <div class="mini" style="margin-top:12px">
          <div class="minihead">Preview: Today’s session</div>
          <div class="minibody" id="workoutPreview">—</div>
        </div>

        <div class="mini" style="margin-top:12px">
          <div class="minihead">Next milestone</div>
          <div class="minibody small muted">
            Week 5–6 upgrades this into a true interactive plan library with sport tailoring + sRPE write-back.
          </div>
        </div>
      </div>
    `;

    fillAthleteSelect($("wAth"), athleteId);
    $("wLevel").value = level;

    function refreshPreview() {
      const aId = $("wAth")?.value || "";
      const aObj = athletes.find(a => a.id === aId) || null;
      const lvl = $("wLevel")?.value || "standard";
      $("workoutPreview").innerHTML = buildTodayWorkoutCard(aObj, lvl);
    }

    $("wAth")?.addEventListener("change", () => {
      state.ui.lastAthleteId = $("wAth").value;
      saveState();
      $("wLevel").value = state.workouts.levelByAthlete[state.ui.lastAthleteId] || "standard";
      refreshPreview();
      renderDashboard();
    });

    $("wLevel")?.addEventListener("change", refreshPreview);

    $("btnSaveWLvl")?.addEventListener("click", () => {
      const aId = $("wAth")?.value || "";
      if (!aId) return toast("Select an athlete.");
      state.workouts.levelByAthlete[aId] = $("wLevel")?.value === "advanced" ? "advanced" : "standard";
      saveState();
      toast("Workout level saved");
      refreshPreview();
      renderDashboard();
    });

    refreshPreview();
  }

  // -----------------------------
  // Periodization / Analytics placeholders (non-empty)
  // -----------------------------
  function renderPeriodization() {
    const host = $("view-periodization");
    if (!host) return;
    host.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Periodization</h2><span class="muted">Week 5–6</span></div>
        <div class="callout">
          Coming next milestone: workout write-back → weekly load → planned vs actual.
        </div>
      </div>
    `;
  }

  function renderAnalytics() {
    const host = $("view-analytics");
    if (!host) return;
    host.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Analytics</h2><span class="muted">Week 7–8</span></div>
        <div class="callout">
          Coming later: weekly summary cards, trends, risk flags.
        </div>
      </div>
    `;
  }

  // -----------------------------
  // Settings
  // -----------------------------
  function renderSettings() {
    const host = $("view-settings");
    if (!host) return;

    host.innerHTML = `
      <div class="card">
        <div class="cardhead"><h2>Settings</h2><span class="muted">Device + experience</span></div>

        <div class="grid2">
          <div class="mini">
            <div class="minihead">Role</div>
            <div class="minibody small muted">Switch views anytime.</div>
            <div class="row gap wrap" style="margin-top:10px">
              <button class="btn" id="btnRoleCoach">Coach</button>
              <button class="btn ghost" id="btnRoleAthlete">Athlete</button>
              <button class="btn ghost" id="btnSettingsOnboard">Onboarding</button>
            </div>
            <div class="small muted" style="margin-top:10px" id="roleState">—</div>
          </div>

          <div class="mini">
            <div class="minihead">Device</div>
            <div class="minibody mono small" id="deviceState">—</div>
          </div>

          <div class="mini">
            <div class="minihead">Local storage</div>
            <div class="minibody small muted">Data is stored on this device (offline-first).</div>
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
    $("btnSettingsOnboard")?.addEventListener("click", () => openOnboard());

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
  // Week 3–4: Quick Modals (implemented using existing modal shell style)
  // -----------------------------
  function ensureTempModal(id, title) {
    let el = document.getElementById(id);
    if (el) return el;

    el = document.createElement("div");
    el.id = id;
    el.className = "modal";
    el.hidden = true;
    el.innerHTML = `
      <div class="modal-card">
        <div class="row between">
          <div>
            <div class="modal-title">${escHTML(title)}</div>
            <div class="small muted">Fast entry</div>
          </div>
          <button class="btn ghost" data-close="${escHTML(id)}">Close</button>
        </div>
        <div id="${escHTML(id)}_body" style="margin-top:12px"></div>
      </div>
    `;
    document.body.appendChild(el);

    el.addEventListener("click", (e) => {
      const tgt = e.target;
      if (tgt && tgt.getAttribute && tgt.getAttribute("data-close") === id) {
        el.hidden = true;
      }
    });

    return el;
  }

  function openQuickLogModal() {
    const athletes = getAthletes();
    const athleteId = state.ui.lastAthleteId || athletes[0]?.id || "";
    const m = ensureTempModal("__quickLogModal__", "Quick Training Log");
    const body = document.getElementById("__quickLogModal___body");
    if (!body) return;

    body.innerHTML = `
      <div class="row gap wrap">
        <div class="field grow">
          <label>Athlete</label>
          <select id="qLAth"></select>
        </div>
        <div class="field">
          <label>Date</label>
          <input id="qLDate" type="date" />
        </div>
      </div>

      <div class="row gap wrap" style="margin-top:10px">
        <div class="field">
          <label>Minutes</label>
          <input id="qLMin" type="number" min="0" max="600" value="60" />
        </div>
        <div class="field">
          <label>sRPE (0–10)</label>
          <input id="qLRpe" type="number" min="0" max="10" step="1" value="6" />
        </div>
        <div class="field">
          <label>Type</label>
          <select id="qLType">
            <option value="practice">Practice</option>
            <option value="lift">Lift</option>
            <option value="skills">Skills</option>
            <option value="conditioning">Conditioning</option>
            <option value="game">Game</option>
            <option value="recovery">Recovery</option>
          </select>
        </div>
      </div>

      <div class="mini" style="margin-top:12px">
        <div class="minihead">Computed</div>
        <div class="minibody mono small" id="qLComputed">Load: —</div>
      </div>

      <div class="row gap wrap" style="margin-top:12px">
        <button class="btn" id="btnQLSave">Save</button>
        <button class="btn ghost" id="btnQLGoLog">Open full Log</button>
      </div>
    `;

    fillAthleteSelect($("qLAth"), athleteId);
    $("qLDate").value = todayISO();

    function update() {
      const m = clamp(toNum($("qLMin").value, 0), 0, 600);
      const r = clamp(toNum($("qLRpe").value, 0), 0, 10);
      $("qLComputed").textContent = `Load: ${Math.round(m * r)}`;
    }
    $("qLMin").addEventListener("input", update);
    $("qLRpe").addEventListener("input", update);
    update();

    $("btnQLSave").addEventListener("click", () => {
      const id = $("qLAth").value || "";
      if (!id) return toast("Select an athlete.");
      const dateISO = safeISO($("qLDate").value) || todayISO();
      ensureBucket("training", id);

      const minutes = clamp(toNum($("qLMin").value, 0), 0, 600);
      const rpe = clamp(toNum($("qLRpe").value, 0), 0, 10);
      const type = $("qLType").value || "practice";

      const sess = { id: uid("sess"), dateISO, minutes, rpe, type, notes: "", load: Math.round(minutes * rpe) };
      const list = Array.isArray(state.logs.training[id]) ? state.logs.training[id].slice() : [];
      list.unshift(sess);
      state.logs.training[id] = list.slice(0, 250);

      state.ui.lastAthleteId = id;
      saveState();
      toast("Saved");
      m.hidden = true;
      renderDashboard();
    });

    $("btnQLGoLog").addEventListener("click", () => {
      m.hidden = true;
      showView("log");
    });

    m.hidden = false;
  }

  function openQuickNutritionModal() {
    const athletes = getAthletes();
    const athleteId = state.ui.lastAthleteId || athletes[0]?.id || "";
    const m = ensureTempModal("__quickNutModal__", "Quick Nutrition Log");
    const body = document.getElementById("__quickNutModal___body");
    if (!body) return;

    body.innerHTML = `
      <div class="row gap wrap">
        <div class="field grow">
          <label>Athlete</label>
          <select id="qNAth"></select>
        </div>
        <div class="field">
          <label>Date</label>
          <input id="qNDate" type="date" />
        </div>
      </div>

      <div class="row gap wrap" style="margin-top:10px">
        <div class="field"><label>Protein</label><input id="qNP" type="number" min="0" max="300" value="30" /></div>
        <div class="field"><label>Carbs</label><input id="qNC" type="number" min="0" max="300" value="60" /></div>
        <div class="field"><label>Fat</label><input id="qNF" type="number" min="0" max="150" value="15" /></div>
        <div class="field"><label>Water (oz)</label><input id="qNW" type="number" min="0" max="120" value="16" /></div>
      </div>

      <div class="row gap wrap" style="margin-top:10px">
        <div class="field grow"><label>Notes</label><input id="qNNotes" type="text" placeholder="optional" /></div>
      </div>

      <div class="row gap wrap" style="margin-top:12px">
        <button class="btn" id="btnQNSave">Save</button>
        <button class="btn ghost" id="btnQNGoNut">Open Nutrition</button>
      </div>
    `;

    fillAthleteSelect($("qNAth"), athleteId);
    $("qNDate").value = todayISO();

    $("btnQNSave").addEventListener("click", () => {
      const id = $("qNAth").value || "";
      if (!id) return toast("Select an athlete.");
      ensureBucket("nutrition", id);

      if (!state.nutritionTargets[id]) setTargets(id, getTargets(id));

      const entry = {
        id: uid("nut"),
        dateISO: safeISO($("qNDate").value) || todayISO(),
        protein: clamp(toNum($("qNP").value, 0), 0, 300),
        carbs: clamp(toNum($("qNC").value, 0), 0, 300),
        fat: clamp(toNum($("qNF").value, 0), 0, 150),
        waterOz: clamp(toNum($("qNW").value, 0), 0, 120),
        notes: ($("qNNotes").value || "").trim()
      };

      const list = Array.isArray(state.logs.nutrition[id]) ? state.logs.nutrition[id].slice() : [];
      list.unshift(entry);
      state.logs.nutrition[id] = list.slice(0, 300);

      state.ui.lastAthleteId = id;
      saveState();
      toast("Saved");
      m.hidden = true;
      renderDashboard();
    });

    $("btnQNGoNut").addEventListener("click", () => {
      m.hidden = true;
      showView("nutrition");
    });

    m.hidden = false;
  }

  // -----------------------------
  // Demo seed
  // -----------------------------
  function seedDemo(showToast) {
    if (!state.athletes.length) {
      const a1 = { id: uid("ath"), name: "Jordan Smith", position: "PG", heightIn: 70, weightLb: 155 };
      const a2 = { id: uid("ath"), name: "Cam Johnson", position: "SG", heightIn: 72, weightLb: 165 };
      state.athletes.push(a1, a2);
      ensureBucket("training", a1.id);
      ensureBucket("training", a2.id);
      ensureBucket("nutrition", a1.id);
      ensureBucket("nutrition", a2.id);

      state.ui.lastAthleteId = a1.id;

      setTargets(a1.id, { protein: 160, carbs: 260, fat: 70, waterOz: 90 });
      setTargets(a2.id, { protein: 150, carbs: 240, fat: 65, waterOz: 85 });

      state.workouts.levelByAthlete[a1.id] = "standard";
      state.workouts.levelByAthlete[a2.id] = "advanced";

      const d = todayISO();
      state.logs.training[a1.id] = [{ id: uid("sess"), dateISO: d, minutes: 60, rpe: 6, type: "practice", notes: "Demo", load: 360 }];
      state.logs.training[a2.id] = [{ id: uid("sess"), dateISO: d, minutes: 45, rpe: 7, type: "skills", notes: "Demo", load: 315 }];

      state.logs.nutrition[a1.id] = [{ id: uid("nut"), dateISO: d, protein: 40, carbs: 80, fat: 20, waterOz: 24, notes: "Demo" }];
      state.logs.nutrition[a2.id] = [{ id: uid("nut"), dateISO: d, protein: 35, carbs: 70, fat: 18, waterOz: 20, notes: "Demo" }];
    }

    saveState();
    if (showToast) toast("Demo loaded");
    renderDashboard();
    if (state.ui.activeView === "team") renderTeam();
    if (state.ui.activeView === "log") renderLog();
    if (state.ui.activeView === "nutrition") renderNutrition();
    if (state.ui.activeView === "workouts") renderWorkouts();
  }

  // -----------------------------
  // Topbar actions
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
          state = normalizeState(JSON.parse(String(reader.result || "")));
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
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function boot() {
    // pills
    const teamPill = $("activeTeamPill");
    if (teamPill) teamPill.textContent = `Team: ${state.team?.name || "Default"}`;

    const cloudPill = $("cloudPill");
    if (cloudPill) cloudPill.textContent = `Cloud: Local`;

    updateDevicePill();

    wireNav();
    wireTopbar();
    wireWizardButtons();

    $("btnOnboard")?.addEventListener("click", () => openOnboard());
    $("btnCloseOnboard")?.addEventListener("click", () => closeOnboard());

    // Auto-open onboarding if not completed
    if (!state.ui.onboard.completed) {
      openOnboard();
    }

    const initial = state.ui.activeView || "dashboard";
    showView(initial);
    hideSplashNow();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
