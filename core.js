// core.js — v3.0.0 (PRODUCTION UI, offline-first, optional cloud, no dev messaging)
// Includes: onboarding wizard, mode switch, coach summary cards, athlete dashboard,
// sport engine workouts, quick logs, analytics, risk flags, auto deload suggestions,
// mobile recess mode.

(function () {
  "use strict";

  const ENV = "prod"; // production: no dev help shown in UI

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const safeText = (el, txt) => { if (el) el.textContent = (txt == null ? "—" : String(txt)); };

  function isMobileDevice() {
    const w = window.innerWidth || 0;
    const touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
    return touch && w <= 820;
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }

  function weekNumber(d = new Date()) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date - yearStart) / 86400000) + 1)/7);
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  // ---------- App Boot ----------
  function boot() {
    // Device detect + recess mode
    const mobile = isMobileDevice();
    document.body.classList.toggle("is-mobile", mobile);

    const dpr = window.devicePixelRatio || 1;
    window.dataStore.setDevice({ isMobile: mobile, w: window.innerWidth, h: window.innerHeight, dpr });

    // Mobile bottom nav
    const mnav = $("#mnav");
    if (mnav) mnav.hidden = !mobile;

    // Wire UI
    wireNavigation();
    wireTopbar();
    wireAuthModal();
    wireOnboarding();

    // Initial render
    renderAll();

    // Splash out
    setTimeout(() => {
      const splash = $("#splash");
      if (splash) splash.classList.add("hidden");
    }, 450);

    // Re-render on resize/orientation
    window.addEventListener("resize", () => {
      const mobileNow = isMobileDevice();
      document.body.classList.toggle("is-mobile", mobileNow);
      window.dataStore.setDevice({ isMobile: mobileNow, w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 });
      const mn = $("#mnav");
      if (mn) mn.hidden = !mobileNow;
      renderAll();
    });
  }

  // ---------- Navigation ----------
  function wireNavigation() {
    const navButtons = $$(".navbtn");
    const mnavButtons = $$(".mnavbtn");

    function setActive(view) {
      $$(".view[data-view]").forEach(v => v.hidden = (v.id !== `view-${view}`));
      navButtons.forEach(b => b.classList.toggle("active", b.dataset.view === view));
      mnavButtons.forEach(b => b.classList.toggle("active", b.dataset.view === view));

      // View-specific renders
      if (view === "dashboard") renderDashboard();
      if (view === "team") renderTeam();
      if (view === "log") renderLog();
      if (view === "nutrition") renderNutrition();
      if (view === "workouts") renderWorkouts();
      if (view === "periodization") renderPeriodization();
      if (view === "analytics") renderAnalytics();
      if (view === "settings") renderSettings();
    }

    navButtons.forEach(b => b.addEventListener("click", () => setActive(b.dataset.view)));
    mnavButtons.forEach(b => b.addEventListener("click", () => setActive(b.dataset.view)));

    // Default view
    setActive("dashboard");
  }

  // ---------- Topbar ----------
  function wireTopbar() {
    const btnSeed = $("#btnSeed");
    const btnExport = $("#btnExport");
    const fileImport = $("#fileImport");
    const btnMode = $("#btnMode");

    if (btnMode) {
      btnMode.addEventListener("click", () => {
        const s = window.dataStore.getState();
        const next = (s.meta.mode === "coach") ? "athlete" : "coach";
        window.dataStore.setMode(next);
        renderAll();
      });
    }

    if (btnSeed) btnSeed.addEventListener("click", () => seedDemo());
    if (btnExport) btnExport.addEventListener("click", () => exportJSON());
    if (fileImport) fileImport.addEventListener("change", (e) => importJSON(e.target.files?.[0]));
  }

  // ---------- Auth Modal (safe/no dev text) ----------
  function wireAuthModal() {
    const btnAuth = $("#btnAuth");
    const modal = $("#authModal");
    const close = $("#btnCloseAuth");
    const btnSignIn = $("#btnSignIn");
    const btnSignUp = $("#btnSignUp");
    const btnSignOut = $("#btnSignOut");

    const email = $("#authEmail");
    const pass = $("#authPass");
    const msg = $("#authMsg");

    const stateBox = $("#authState");

    function open() { if (modal) modal.hidden = false; renderAuthState(); }
    function closeModal() { if (modal) modal.hidden = true; }

    if (btnAuth) btnAuth.addEventListener("click", open);
    if (close) close.addEventListener("click", closeModal);
    if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    async function renderAuthState() {
      const s = window.dataStore.getState();
      const client = window.dataStore.cloud.ensure();
      if (!client) {
        safeText(stateBox, "Cloud not configured on this device.");
        safeText(msg, "Add Supabase URL + Anon Key in Settings → Cloud.");
        return;
      }
      try {
        const { data } = await client.auth.getSession();
        const u = data?.session?.user;
        safeText(stateBox, u ? `Signed in as ${u.email}` : "Not signed in");
        safeText(msg, "—");
      } catch (e) {
        safeText(stateBox, "Auth unavailable.");
        safeText(msg, "—");
      }
    }

    async function signIn(isSignUp) {
      const client = window.dataStore.cloud.ensure();
      if (!client) { safeText(msg, "Cloud not configured."); return; }
      const em = (email?.value || "").trim();
      const pw = (pass?.value || "").trim();
      if (!em || !pw) { safeText(msg, "Enter email + password."); return; }

      try {
        safeText(msg, "Working…");
        const resp = isSignUp
          ? await client.auth.signUp({ email: em, password: pw })
          : await client.auth.signInWithPassword({ email: em, password: pw });

        const err = resp?.error;
        if (err) { safeText(msg, err.message || "Auth failed."); }
        else { safeText(msg, isSignUp ? "Check email to confirm (if required)." : "Signed in."); }
        await renderAuthState();
        renderCloudPill();
      } catch (e) {
        safeText(msg, "Auth error.");
      }
    }

    async function signOut() {
      const client = window.dataStore.cloud.ensure();
      if (!client) { safeText(msg, "Cloud not configured."); return; }
      try {
        await client.auth.signOut();
        safeText(msg, "Signed out.");
        await renderAuthState();
        renderCloudPill();
      } catch (e) {
        safeText(msg, "Sign out failed.");
      }
    }

    if (btnSignIn) btnSignIn.addEventListener("click", () => signIn(false));
    if (btnSignUp) btnSignUp.addEventListener("click", () => signIn(true));
    if (btnSignOut) btnSignOut.addEventListener("click", signOut);
  }

  // ---------- Onboarding ----------
  function wireOnboarding() {
    const modal = $("#onboardModal");
    const close = $("#btnCloseOnboard");
    const finish = $("#btnFinishOnboard");
    const demo = $("#btnDemoAthlete");
    const msg = $("#obMsg");

    function open() { if (modal) modal.hidden = false; }
    function closeModal() { if (modal) modal.hidden = true; safeText(msg, "—"); }

    if (close) close.addEventListener("click", closeModal);
    if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    function collect() {
      return {
        name: ($("#obName")?.value || "").trim(),
        sport: $("#obSport")?.value || "basketball",
        primary_focus: $("#obPrimary")?.value || "speed",
        secondary_focus: $("#obSecondary")?.value || "mobility",
        days_per_week: Number($("#obDays")?.value || 4),
        level: $("#obLevel")?.value || "high_school"
      };
    }

    function apply(profile) {
      if (!profile.name) profile.name = "Athlete";
      window.dataStore.setAthleteProfile(profile);
      safeText(msg, "Plan generated.");
      renderAll();
    }

    if (finish) finish.addEventListener("click", () => apply(collect()));
    if (demo) demo.addEventListener("click", () => {
      apply({
        name: "Demo Athlete",
        sport: "basketball",
        primary_focus: "speed",
        secondary_focus: "mobility",
        days_per_week: 4,
        level: "high_school"
      });
    });

    // Auto-open if no athlete profile name set
    const s = window.dataStore.getState();
    if (!s.athleteProfile.name) {
      setTimeout(open, 600);
    }
  }

  // ---------- Render helpers ----------
  function renderAll() {
    renderPills();
    renderCloudPill();
    renderDashboard();
    renderTeam();
    renderLog();
    renderNutrition();
    renderWorkouts();
    renderPeriodization();
    renderAnalytics();
    renderSettings();
  }

  function renderPills() {
    const s = window.dataStore.getState();
    const team = (s.team.teams || []).find(t => t.id === s.meta.activeTeamId) || s.team.teams?.[0];
    safeText($("#activeTeamPill"), `Team: ${team?.name || "Default"}`);
    safeText($("#modePill"), `Mode: ${s.meta.mode === "athlete" ? "Athlete" : "Coach"}`);
  }

  function renderCloudPill() {
    const on = window.dataStore.cloud.enabled();
    safeText($("#cloudPill"), on ? "Cloud: Ready" : "Cloud: Local");
  }

  // ---------- Dashboard ----------
  function computeRiskFlags() {
    const s = window.dataStore.getState();
    const logs = s.logs.workout_logs || [];
    const r = s.logs.readiness || [];
    const n = s.logs.nutrition || [];
    const t = todayISO();

    const todayW = logs.find(x => x.date === t);
    const todayR = r.find(x => x.date === t);
    const todayN = n.find(x => x.date === t);

    // Load spike detection: compare last 7 avg vs prev 7 avg (very simple)
    const sorted = logs.slice().sort((a,b) => (a.date < b.date ? 1 : -1));
    const last7 = sorted.slice(0, 7);
    const prev7 = sorted.slice(7, 14);
    const avg = (arr) => arr.length ? arr.reduce((sum,x)=>sum+Number(x.volume||0),0)/arr.length : 0;
    const a7 = avg(last7);
    const p7 = avg(prev7);
    const spike = (p7 > 0) ? (a7 / p7) : 1;

    // Suggested deload if spike big or readiness low or injury flag
    const readiness = Number(todayR?.readiness || todayR?.wellness || 0);
    const injury = !!todayW?.injury_flag || !!todayR?.injury_flag;

    const flags = [];
    if (spike >= 1.35) flags.push({ type:"warn", text:"Load spike detected" });
    if (readiness && readiness <= 4) flags.push({ type:"warn", text:"Low readiness today" });
    if (injury) flags.push({ type:"danger", text:"Injury flag" });

    const targets = window.nutritionEngine.calcTargets(s.athleteProfile);
    const adher = window.nutritionEngine.adherenceFromLog(targets, todayN);
    if (adher.flags.some(f => /Protein low|Calories low/.test(f))) {
      flags.push({ type:"warn", text:"Nutrition adherence low" });
    }

    const suggestDeload = (spike >= 1.35) || (readiness && readiness <= 4) || injury;

    return { flags, suggestDeload, spike: Number(spike.toFixed(2)), adherScore: adher.score };
  }

  function renderDashboard() {
    const s = window.dataStore.getState();
    const mode = s.meta.mode;

    const coachWrap = $("#coachDashWrap");
    const athleteWrap = $("#athleteDashWrap");
    if (!coachWrap || !athleteWrap) return;

    coachWrap.innerHTML = "";
    athleteWrap.innerHTML = "";

    const risk = computeRiskFlags();
    const wk = weekNumber(new Date());
    const phase = window.periodizationEngine.getCurrentPhase(wk);

    if (mode === "coach") {
      coachWrap.appendChild(cardSummary("Weekly Summary", [
        `Week: ${wk}`,
        `Phase: ${phase}`,
        `Load spike: ${risk.spike}×`,
        `Nutrition adherence: ${risk.adherScore}%`
      ], risk.flags));

      coachWrap.appendChild(cardSummary("Suggested Action", [
        risk.suggestDeload ? "Suggested deload: YES" : "Suggested deload: No",
        "Auto weekly summary: Enabled",
        "Auto risk badges: Enabled"
      ], risk.suggestDeload ? [{type:"warn", text:"Deload recommended"}] : [{type:"ok", text:"On track"}]));

      // Athlete dashboard preview card
      const profile = s.athleteProfile;
      coachWrap.appendChild(cardSummary("Athlete Profile", [
        `Sport: ${window.sportEngine.SPORT_LABELS[profile.sport] || profile.sport}`,
        `Focus: ${profile.primary_focus} + ${profile.secondary_focus}`,
        `Days/wk: ${profile.days_per_week}`,
        `Level: ${profile.level}`
      ], []));
    } else {
      // Athlete-only dashboard: no clutter
      const t = todayISO();
      const template = window.sportEngine.buildWeeklyTemplate({
        sport: s.athleteProfile.sport,
        daysPerWeek: s.athleteProfile.days_per_week,
        primary: s.athleteProfile.primary_focus,
        secondary: s.athleteProfile.secondary_focus,
        level: s.athleteProfile.level
      });
      const dayIndex = ((new Date().getDay() + 6) % 7) + 1; // Mon=1..Sun=7
      const session = template.days[(dayIndex - 1) % template.days.length] || template.days[0];

      const ex = window.sportEngine.exercisesForSession({ sport: template.sport, sessionTitle: session.title });
      athleteWrap.appendChild(cardAthleteToday(session.title, ex));

      const targets = window.nutritionEngine.calcTargets(s.athleteProfile);
      athleteWrap.appendChild(cardNutritionTarget(targets));

      const risk = computeRiskFlags();
      athleteWrap.appendChild(cardSummary("Today’s Flags", [
        risk.flags.length ? "Pay attention to the badges below." : "No alerts today."
      ], risk.flags.length ? risk.flags : [{type:"ok", text:"All clear"}]));
    }
  }

  function cardSummary(title, lines, badges) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="cardhead">
        <h3>${escapeHtml(title)}</h3>
        <div class="row gap wrap">${(badges||[]).map(b => `<span class="badge ${b.type}">${escapeHtml(b.text)}</span>`).join("")}</div>
      </div>
      <div class="minibody small">${lines.map(x => `<div>${escapeHtml(x)}</div>`).join("")}</div>
    `;
    return el;
  }

  function cardAthleteToday(title, ex) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="cardhead">
        <h3>Today’s Workout</h3>
        <span class="badge ok">${escapeHtml(title)}</span>
      </div>
      <div class="grid2">
        <div class="mini">
          <div class="minihead">Warm-up</div>
          <div class="minibody small">${ul(ex.warmup)}</div>
        </div>
        <div class="mini">
          <div class="minihead">Main</div>
          <div class="minibody small">${ul(ex.main)}</div>
        </div>
      </div>
      <div class="mini">
        <div class="minihead">Core</div>
        <div class="minibody small">${ul(ex.core)}</div>
      </div>
      <div class="row gap wrap" style="margin-top:12px">
        <button class="btn" id="btnQuickLogWorkout">Quick Log Workout</button>
        <button class="btn ghost" id="btnGoLog">Open Log</button>
      </div>
    `;
    setTimeout(() => {
      const q = $("#btnQuickLogWorkout");
      if (q) q.onclick = () => quickLogWorkout(title);
      const g = $("#btnGoLog");
      if (g) g.onclick = () => jumpTo("log");
    }, 0);
    return el;
  }

  function cardNutritionTarget(t) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="cardhead">
        <h3>Today’s Nutrition Target</h3>
        <span class="badge">${escapeHtml(`${t.calories} kcal`)}</span>
      </div>
      <div class="scoreWrap">
        <div class="scoreBig">
          <div class="scoreNum">${escapeHtml(String(t.calories))}</div>
          <div class="small muted mono">Calories</div>
        </div>
        <div class="scoreBars">
          ${barRow("Protein", t.protein_g)}
          ${barRow("Carbs", t.carbs_g)}
          ${barRow("Fat", t.fat_g)}
        </div>
      </div>
      <div class="row gap wrap">
        <button class="btn" id="btnQuickLogNutrition">Quick Log Nutrition</button>
      </div>
    `;
    setTimeout(() => {
      const b = $("#btnQuickLogNutrition");
      if (b) b.onclick = () => quickLogNutrition(t);
    }, 0);
    return el;
  }

  function barRow(label, value) {
    return `
      <div class="barRow">
        <div>${escapeHtml(label)}</div>
        <div class="bar"><div class="fill" style="width:100%"></div></div>
        <div>${escapeHtml(String(value))}</div>
      </div>
    `;
  }

  function ul(items) {
    return `<ul class="ul">${(items||[]).map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
  }

  // ---------- Team ----------
  function renderTeam() {
    const wrap = $("#view-team");
    if (!wrap) return;

    const s = window.dataStore.getState();
    const teams = s.team.teams || [];
    const active = s.meta.activeTeamId;

    wrap.innerHTML = `
      <h2>Team</h2>
      <div class="card">
        <div class="cardhead">
          <h3>Active Team</h3>
          <div class="row gap wrap">
            <button class="btn ghost" id="btnNewTeam">New Team</button>
          </div>
        </div>
        <div class="row gap wrap">
          <div class="field grow">
            <label>Select team</label>
            <select id="teamSelect">
              ${teams.map(t => `<option value="${escapeAttr(t.id)}" ${t.id===active?"selected":""}>${escapeHtml(t.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field grow">
            <label>Team sport</label>
            <select id="teamSport">
              ${Object.keys(window.sportEngine.SPORT_LABELS).map(k => `<option value="${k}">${escapeHtml(window.sportEngine.SPORT_LABELS[k])}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="small muted" style="margin-top:8px">Team membership management is cloud-controlled when enabled.</div>
      </div>
    `;

    const sel = $("#teamSelect");
    if (sel) {
      sel.onchange = () => {
        window.dataStore.setActiveTeam(sel.value);
        renderAll();
      };
    }

    const btnNew = $("#btnNewTeam");
    if (btnNew) {
      btnNew.onclick = () => {
        const name = prompt("Team name?");
        if (!name) return;
        window.dataStore.update(st => {
          const id = "local-" + Math.random().toString(16).slice(2);
          st.team.teams.push({ id, name, sport: "basketball" });
          st.meta.activeTeamId = id;
          return st;
        });
        renderAll();
      };
    }
  }

  // ---------- Log (FULL rendering) ----------
  function renderLog() {
    const wrap = $("#view-log");
    if (!wrap) return;

    const s = window.dataStore.getState();
    const logs = s.logs.workout_logs || [];
    const nlogs = s.logs.nutrition || [];
    const rlogs = s.logs.readiness || [];
    const date = todayISO();

    const todayW = logs.find(x => x.date === date);
    const todayN = nlogs.find(x => x.date === date);
    const todayR = rlogs.find(x => x.date === date);

    wrap.innerHTML = `
      <h2>Log</h2>

      <div class="grid2">
        <div class="card">
          <div class="cardhead">
            <h3>Quick Log — Workout</h3>
            <span class="badge">${escapeHtml(date)}</span>
          </div>

          <div class="grid2">
            <div class="field">
              <label>Volume (0–100)</label>
              <input id="wVol" type="number" min="0" max="100" value="${escapeAttr(String(todayW?.volume ?? 40))}">
            </div>
            <div class="field">
              <label>Practice Intensity (1–10)</label>
              <input id="wInt" type="number" min="1" max="10" value="${escapeAttr(String(todayW?.practice_intensity ?? 6))}">
            </div>
          </div>

          <div class="grid2" style="margin-top:10px">
            <div class="field">
              <label>Sleep Quality (1–10)</label>
              <input id="wSleep" type="number" min="1" max="10" value="${escapeAttr(String(todayW?.sleep_quality ?? 7))}">
            </div>
            <div class="field">
              <label>Injury Pain (0–10)</label>
              <input id="wPain" type="number" min="0" max="10" value="${escapeAttr(String(todayW?.injury_pain ?? 0))}">
            </div>
          </div>

          <div class="row gap wrap" style="margin-top:12px">
            <button class="btn" id="btnSaveWorkoutLog">Save Workout Log</button>
          </div>
          <div class="small muted" id="logMsgW" style="margin-top:8px">—</div>
        </div>

        <div class="card">
          <div class="cardhead">
            <h3>Quick Log — Readiness</h3>
            <span class="badge">${escapeHtml(date)}</span>
          </div>

          <div class="grid2">
            <div class="field">
              <label>Wellness (1–10)</label>
              <input id="rWell" type="number" min="1" max="10" value="${escapeAttr(String(todayR?.wellness ?? 7))}">
            </div>
            <div class="field">
              <label>Energy (1–10)</label>
              <input id="rEnergy" type="number" min="1" max="10" value="${escapeAttr(String(todayR?.energy ?? 7))}">
            </div>
          </div>

          <div class="grid2" style="margin-top:10px">
            <div class="field">
              <label>Hydration (1–10)</label>
              <input id="rHyd" type="number" min="1" max="10" value="${escapeAttr(String(todayR?.hydration ?? 7))}">
            </div>
            <div class="field">
              <label>Injury Flag</label>
              <select id="rInjury">
                <option value="0" ${(todayR?.injury_flag ? "" : "selected")}>No</option>
                <option value="1" ${(todayR?.injury_flag ? "selected" : "")}>Yes</option>
              </select>
            </div>
          </div>

          <div class="row gap wrap" style="margin-top:12px">
            <button class="btn" id="btnSaveReadiness">Save Readiness</button>
          </div>
          <div class="small muted" id="logMsgR" style="margin-top:8px">—</div>
        </div>
      </div>

      <div class="card">
        <div class="cardhead">
          <h3>Quick Log — Nutrition</h3>
          <span class="badge">${escapeHtml(date)}</span>
        </div>

        <div class="grid2">
          <div class="field">
            <label>Calories</label>
            <input id="nCal" type="number" min="0" value="${escapeAttr(String(todayN?.calories ?? 2200))}">
          </div>
          <div class="field">
            <label>Protein (g)</label>
            <input id="nPro" type="number" min="0" value="${escapeAttr(String(todayN?.protein_g ?? 140))}">
          </div>
        </div>

        <div class="grid2" style="margin-top:10px">
          <div class="field">
            <label>Carbs (g)</label>
            <input id="nCarb" type="number" min="0" value="${escapeAttr(String(todayN?.carbs_g ?? 260))}">
          </div>
          <div class="field">
            <label>Fat (g)</label>
            <input id="nFat" type="number" min="0" value="${escapeAttr(String(todayN?.fat_g ?? 70))}">
          </div>
        </div>

        <div class="row gap wrap" style="margin-top:12px">
          <button class="btn" id="btnSaveNutrition">Save Nutrition</button>
        </div>
        <div class="small muted" id="logMsgN" style="margin-top:8px">—</div>
      </div>

      <div class="card">
        <div class="cardhead">
          <h3>History</h3>
          <span class="badge">${escapeHtml(`${logs.length} workouts`)}</span>
        </div>

        <div class="table" id="histTable"></div>
      </div>
    `;

    // Bind save buttons
    $("#btnSaveWorkoutLog").onclick = () => {
      const row = {
        id: cryptoId(),
        date,
        volume: Number($("#wVol").value || 0),
        practice_intensity: Number($("#wInt").value || 0),
        sleep_quality: Number($("#wSleep").value || 0),
        injury_pain: Number($("#wPain").value || 0),
        injury_flag: Number($("#wPain").value || 0) >= 6 ? true : false,
        team_id: window.dataStore.getState().meta.activeTeamId,
        athlete_id: "local-athlete"
      };
      upsertLocalByDate("workout_logs", row);
      safeText($("#logMsgW"), "Saved.");
      renderAll();
    };

    $("#btnSaveReadiness").onclick = () => {
      const row = {
        id: cryptoId(),
        date,
        wellness: Number($("#rWell").value || 0),
        energy: Number($("#rEnergy").value || 0),
        hydration: Number($("#rHyd").value || 0),
        injury_flag: ($("#rInjury").value === "1"),
        team_id: window.dataStore.getState().meta.activeTeamId,
        athlete_id: "local-athlete"
      };
      upsertLocalByDate("readiness", row);
      safeText($("#logMsgR"), "Saved.");
      renderAll();
    };

    $("#btnSaveNutrition").onclick = () => {
      const row = {
        id: cryptoId(),
        date,
        calories: Number($("#nCal").value || 0),
        protein_g: Number($("#nPro").value || 0),
        carbs_g: Number($("#nCarb").value || 0),
        fat_g: Number($("#nFat").value || 0),
        team_id: window.dataStore.getState().meta.activeTeamId,
        athlete_id: "local-athlete"
      };
      upsertLocalByDate("nutrition", row);
      safeText($("#logMsgN"), "Saved.");
      renderAll();
    };

    renderHistoryTable();
  }

  function renderHistoryTable() {
    const s = window.dataStore.getState();
    const wrap = $("#histTable");
    if (!wrap) return;

    const rows = (s.logs.workout_logs || []).slice().sort((a,b)=> (a.date < b.date ? 1 : -1)).slice(0, 14);

    wrap.innerHTML = `
      <div class="trow head">
        <div>Date</div><div>Volume</div><div>Intensity</div><div>Sleep</div>
      </div>
      ${rows.map(r => `
        <div class="trow">
          <div class="mono">${escapeHtml(r.date || "—")}</div>
          <div>${escapeHtml(String(r.volume ?? "—"))}</div>
          <div>${escapeHtml(String(r.practice_intensity ?? "—"))}</div>
          <div>${escapeHtml(String(r.sleep_quality ?? "—"))}</div>
        </div>
      `).join("")}
    `;
  }

  function upsertLocalByDate(kind, row) {
    window.dataStore.update(s => {
      const arr = s.logs[kind] || (s.logs[kind] = []);
      const idx = arr.findIndex(x => x.date === row.date);
      if (idx >= 0) arr[idx] = { ...arr[idx], ...row };
      else arr.unshift(row);
      return s;
    });
  }

  // ---------- Nutrition View ----------
  function renderNutrition() {
    const wrap = $("#view-nutrition");
    if (!wrap) return;

    const s = window.dataStore.getState();
    const targets = window.nutritionEngine.calcTargets(s.athleteProfile);
    const today = todayISO();
    const todayLog = (s.logs.nutrition || []).find(x => x.date === today);
    const adher = window.nutritionEngine.adherenceFromLog(targets, todayLog);

    wrap.innerHTML = `
      <h2>Elite Nutrition</h2>
      <div class="card">
        <div class="cardhead">
          <h3>Targets</h3>
          <div class="row gap wrap">
            <span class="badge ${adher.score >= 80 ? "ok" : "warn"}">Adherence: ${escapeHtml(String(adher.score))}%</span>
          </div>
        </div>
        <div class="grid2">
          <div class="mini">
            <div class="minihead">Today</div>
            <div class="minibody small">
              <div><b>Calories:</b> ${escapeHtml(String(targets.calories))}</div>
              <div><b>Protein:</b> ${escapeHtml(String(targets.protein_g))}g</div>
              <div><b>Carbs:</b> ${escapeHtml(String(targets.carbs_g))}g</div>
              <div><b>Fat:</b> ${escapeHtml(String(targets.fat_g))}g</div>
            </div>
          </div>
          <div class="mini">
            <div class="minihead">Warnings</div>
            <div class="minibody small">
              ${adher.flags.length ? ul(adher.flags) : "<div class='muted'>No warnings.</div>"}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ---------- Workouts View (sport-tailored + exercises shown) ----------
  function renderWorkouts() {
    const wrap = $("#view-workouts");
    if (!wrap) return;

    const s = window.dataStore.getState();
    const profile = s.athleteProfile;

    const template = window.sportEngine.buildWeeklyTemplate({
      sport: profile.sport,
      daysPerWeek: profile.days_per_week,
      primary: profile.primary_focus,
      secondary: profile.secondary_focus,
      level: profile.level
    });

    wrap.innerHTML = `
      <h2>Workouts</h2>

      <div class="card">
        <div class="cardhead">
          <h3>Sport Engine Plan</h3>
          <span class="badge">${escapeHtml(template.sportLabel)}</span>
        </div>

        <div class="callout small muted">
          ${escapeHtml(template.notes)}
        </div>

        <div style="margin-top:12px" class="table">
          <div class="trow head">
            <div>Day</div><div>Session</div><div>Focus</div><div>Overlays</div>
          </div>
          ${template.days.map(d => `
            <div class="trow">
              <div class="mono">Day ${escapeHtml(String(d.dayIndex))}</div>
              <div>${escapeHtml(d.title)}</div>
              <div class="muted">${escapeHtml(profile.primary_focus)}</div>
              <div class="muted">${escapeHtml((d.overlays||[]).join(", "))}</div>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="card">
        <div class="cardhead">
          <h3>Session Exercises</h3>
          <div class="row gap wrap">
            <div class="field">
              <label>Choose session</label>
              <select id="sessionPick">
                ${template.days.map(d => `<option value="${escapeAttr(d.title)}">${escapeHtml(d.title)}</option>`).join("")}
              </select>
            </div>
            <button class="btn" id="btnShowSession">Show</button>
          </div>
        </div>

        <div id="sessionDetail" class="grid2"></div>
      </div>
    `;

    const pick = $("#sessionPick");
    const out = $("#sessionDetail");
    const show = () => {
      const title = pick?.value || template.days[0].title;
      const ex = window.sportEngine.exercisesForSession({ sport: template.sport, sessionTitle: title });
      out.innerHTML = `
        <div class="mini">
          <div class="minihead">Warm-up</div>
          <div class="minibody small">${ul(ex.warmup)}</div>
        </div>
        <div class="mini">
          <div class="minihead">Main</div>
          <div class="minibody small">${ul(ex.main)}</div>
        </div>
        <div class="mini">
          <div class="minihead">Core</div>
          <div class="minibody small">${ul(ex.core)}</div>
        </div>
        <div class="mini">
          <div class="minihead">Notes</div>
          <div class="minibody small muted">Log your volume + readiness after the session to keep risk flags accurate.</div>
        </div>
      `;
    };

    $("#btnShowSession").onclick = show;
    show();
  }

  // ---------- Periodization View ----------
  function renderPeriodization() {
    const wrap = $("#view-periodization");
    if (!wrap) return;

    const wk = weekNumber(new Date());
    const phase = window.periodizationEngine.getCurrentPhase(wk);

    wrap.innerHTML = `
      <h2>Periodization</h2>
      <div class="card">
        <div class="cardhead">
          <h3>Current Phase</h3>
          <span class="badge">${escapeHtml(phase)}</span>
        </div>
        <div class="minibody small">
          <div><b>Week:</b> ${escapeHtml(String(wk))}</div>
          <div class="muted">Volume is auto-adjusted based on phase (offline-first).</div>
        </div>
      </div>
    `;
  }

  // ---------- Analytics View (hardened client-side phase + cloud-ready) ----------
  function renderAnalytics() {
    const wrap = $("#view-analytics");
    if (!wrap) return;

    const s = window.dataStore.getState();
    const logs = s.logs.workout_logs || [];
    const r = s.logs.readiness || [];
    const n = s.logs.nutrition || [];
    const risk = computeRiskFlags();

    // Weekly summary (local)
    const last7 = logs.slice().sort((a,b)=> (a.date < b.date ? 1 : -1)).slice(0, 7);
    const totalVol = Math.round(last7.reduce((sum,x)=>sum+Number(x.volume||0),0));
    const avgInt = Math.round(last7.reduce((sum,x)=>sum+Number(x.practice_intensity||0),0) / Math.max(1,last7.length));
    const injDays = last7.filter(x => x.injury_flag).length;

    // Nutrition compliance (avg adherence over last 7)
    const targets = window.nutritionEngine.calcTargets(s.athleteProfile);
    const last7N = n.slice().sort((a,b)=> (a.date < b.date ? 1 : -1)).slice(0, 7);
    const avgAd = Math.round(last7N.reduce((sum,x)=>sum + window.nutritionEngine.adherenceFromLog(targets,x).score,0) / Math.max(1,last7N.length));

    // Readiness avg
    const last7R = r.slice().sort((a,b)=> (a.date < b.date ? 1 : -1)).slice(0, 7);
    const avgWell = Math.round(last7R.reduce((sum,x)=>sum+Number(x.wellness||0),0) / Math.max(1,last7R.length));

    wrap.innerHTML = `
      <h2>Analytics</h2>

      <div class="grid2">
        ${cardBlock("Auto Weekly Summary", [
          `7-day total volume: ${totalVol}`,
          `Avg intensity: ${avgInt}`,
          `Avg wellness: ${avgWell}`,
          `Nutrition adherence (avg): ${avgAd}%`
        ], risk.flags)}
        ${cardBlock("Automation Layer", [
          `Load spike: ${risk.spike}×`,
          `Suggested deload: ${risk.suggestDeload ? "YES" : "No"}`,
          `Injury flagged days (7d): ${injDays}`,
          `Nutrition warnings: ${risk.flags.some(f=>/Nutrition/.test(f.text)) ? "YES" : "No"}`
        ], risk.suggestDeload ? [{type:"warn",text:"Deload suggested"}] : [{type:"ok",text:"Stable"}])}
      </div>

      <div class="card">
        <div class="cardhead">
          <h3>Cloud-ready Reporting</h3>
          <span class="badge">Phase 3</span>
        </div>
        <div class="minibody small muted">
          When cloud is enabled, these same summaries can be fetched via SECURITY DEFINER RPCs (locked by RLS).
        </div>
      </div>
    `;
  }

  function cardBlock(title, lines, badges) { return outerHTML(cardSummary(title, lines, badges)); }
  function outerHTML(el) { const d=document.createElement("div"); d.appendChild(el); return d.innerHTML; }

  // ---------- Settings (no dev info; just configuration) ----------
  function renderSettings() {
    const wrap = $("#view-settings");
    if (!wrap) return;

    const s = window.dataStore.getState();
    const cfg = s.cloud;

    wrap.innerHTML = `
      <h2>Settings</h2>

      <div class="card">
        <div class="cardhead">
          <h3>Profile</h3>
          <div class="row gap wrap">
            <button class="btn ghost" id="btnOpenOnboard">Edit Onboarding</button>
          </div>
        </div>
        <div class="minibody small">
          <div><b>Name:</b> ${escapeHtml(s.athleteProfile.name || "—")}</div>
          <div><b>Sport:</b> ${escapeHtml(window.sportEngine.SPORT_LABELS[s.athleteProfile.sport] || s.athleteProfile.sport)}</div>
          <div><b>Focus:</b> ${escapeHtml(`${s.athleteProfile.primary_focus} + ${s.athleteProfile.secondary_focus}`)}</div>
          <div><b>Days/wk:</b> ${escapeHtml(String(s.athleteProfile.days_per_week))}</div>
        </div>
      </div>

      <div class="card">
        <div class="cardhead">
          <h3>Cloud</h3>
          <span class="badge">${window.dataStore.cloud.enabled() ? "Ready" : "Local-only"}</span>
        </div>

        <div class="grid2">
          <div class="field">
            <label>Supabase URL</label>
            <input id="sbUrl" type="text" placeholder="https://xxxxx.supabase.co" value="${escapeAttr(cfg.url || "")}">
          </div>
          <div class="field">
            <label>Anon Key</label>
            <input id="sbAnon" type="text" placeholder="ey..." value="${escapeAttr(cfg.anon || "")}">
          </div>
        </div>

        <div class="row gap wrap" style="margin-top:12px">
          <button class="btn" id="btnSaveCloud">Save Cloud</button>
          <button class="btn ghost" id="btnDisableCloud">Disable Cloud</button>
        </div>
        <div class="small muted" id="cloudMsg" style="margin-top:8px">—</div>
      </div>
    `;

    $("#btnOpenOnboard").onclick = () => { const m=$("#onboardModal"); if(m) m.hidden=false; };

    $("#btnSaveCloud").onclick = () => {
      const url = ($("#sbUrl")?.value || "").trim();
      const anon = ($("#sbAnon")?.value || "").trim();
      window.dataStore.update(st => {
        st.cloud.url = url;
        st.cloud.anon = anon;
        st.cloud.enabled = !!(url && anon);
        return st;
      });
      safeText($("#cloudMsg"), window.dataStore.cloud.enabled() ? "Cloud ready on this device." : "Saved (cloud not enabled).");
      renderCloudPill();
    };

    $("#btnDisableCloud").onclick = () => {
      window.dataStore.update(st => { st.cloud.enabled = false; return st; });
      safeText($("#cloudMsg"), "Cloud disabled (local-only).");
      renderCloudPill();
    };
  }

  // ---------- Quick log shortcuts ----------
  function quickLogWorkout(title) {
    const date = todayISO();
    upsertLocalByDate("workout_logs", {
      id: cryptoId(),
      date,
      volume: 50,
      practice_intensity: 7,
      sleep_quality: 7,
      injury_pain: 0,
      injury_flag: false,
      program_day: title,
      team_id: window.dataStore.getState().meta.activeTeamId,
      athlete_id: "local-athlete"
    });
    jumpTo("log");
  }

  function quickLogNutrition(targets) {
    const date = todayISO();
    upsertLocalByDate("nutrition", {
      id: cryptoId(),
      date,
      calories: targets.calories,
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fat_g: targets.fat_g,
      team_id: window.dataStore.getState().meta.activeTeamId,
      athlete_id: "local-athlete"
    });
    jumpTo("log");
  }

  function jumpTo(view) {
    const b = document.querySelector(`[data-view="${view}"]`);
    if (b) b.click();
  }

  // ---------- Demo seed ----------
  function seedDemo() {
    const t = todayISO();
    window.dataStore.update(s => {
      s.athleteProfile = {
        name: "Demo Athlete",
        sport: "basketball",
        primary_focus: "speed",
        secondary_focus: "mobility",
        days_per_week: 4,
        level: "high_school"
      };

      s.logs.workout_logs = [
        { id: cryptoId(), date: t, volume: 55, practice_intensity: 7, sleep_quality: 7, injury_pain: 0, injury_flag:false, team_id:s.meta.activeTeamId, athlete_id:"local-athlete" },
        { id: cryptoId(), date: shiftDate(-1), volume: 48, practice_intensity: 6, sleep_quality: 6, injury_pain: 1, injury_flag:false, team_id:s.meta.activeTeamId, athlete_id:"local-athlete" },
        { id: cryptoId(), date: shiftDate(-2), volume: 62, practice_intensity: 8, sleep_quality: 6, injury_pain: 2, injury_flag:false, team_id:s.meta.activeTeamId, athlete_id:"local-athlete" },
      ];
      s.logs.readiness = [
        { id: cryptoId(), date: t, wellness: 7, energy: 7, hydration: 7, injury_flag:false, team_id:s.meta.activeTeamId, athlete_id:"local-athlete" },
        { id: cryptoId(), date: shiftDate(-1), wellness: 6, energy: 6, hydration: 6, injury_flag:false, team_id:s.meta.activeTeamId, athlete_id:"local-athlete" },
      ];
      s.logs.nutrition = [
        { id: cryptoId(), date: t, calories: 2400, protein_g: 140, carbs_g: 260, fat_g: 70, team_id:s.meta.activeTeamId, athlete_id:"local-athlete" },
      ];
      return s;
    });
    renderAll();
  }

  function shiftDate(deltaDays) {
    const d = new Date();
    d.setDate(d.getDate() + deltaDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }

  // ---------- Import/Export ----------
  function exportJSON() {
    const s = window.dataStore.getState();
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `performanceiq-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  function importJSON(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result || "{}"));
        window.dataStore.setState(parsed);
        renderAll();
      } catch (e) {}
    };
    r.readAsText(file);
  }

  // ---------- Sanitizers ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }
  function cryptoId() {
    try {
      const a = new Uint8Array(16);
      crypto.getRandomValues(a);
      return Array.from(a).map(x=>x.toString(16).padStart(2,"0")).join("");
    } catch {
      return "id-" + Math.random().toString(16).slice(2);
    }
  }

  // ---------- Start ----------
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
