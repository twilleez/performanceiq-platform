// core.js — v6.0.0 (Week 7–8)
// Adds: ACWR, load spike banners, auto deload, weekly summaries, analytics charts
// Also ensures ALL views render (no empty screens) + seed demo + splash hides

(function () {
  "use strict";
  if (window.__PIQ_CORE_V6__) return;
  window.__PIQ_CORE_V6__ = true;

  const STORAGE_KEY = "piq_state_v6";

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));

  function iso(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString().slice(0, 10);
  }

  function todayISO() { return iso(new Date()); }

  function defaultState() {
    return {
      ui: {
        activeView: "dashboard",
        role: "coach",            // coach | athlete
        activeAthleteId: null,
        advancedMode: false
      },
      athletes: [],
      // sessionsByAthlete is keyed: `${athleteId}|${dateISO}` -> [ {minutes, rpe, load, type, notes} ]
      sessionsByAthlete: {},
      // readiness keyed: `${athleteId}|${dateISO}` -> { sleepHours, soreness }
      readinessByAthlete: {},
      // nutrition keyed: `${athleteId}|${dateISO}` -> { adherence (0-100), notes }
      nutritionByAthlete: {},
      periodization: { currentWeek: 1 },
      app: { version: "6.0.0" }
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function hideSplash() {
    const splash = $("splash");
    if (!splash) return;
    splash.classList.add("hidden");
    splash.setAttribute("aria-hidden", "true");
  }

  function navActive(view) {
    document.querySelectorAll(".navbtn").forEach(b => {
      const on = b.dataset.view === view;
      b.classList.toggle("active", on);
      b.setAttribute("aria-current", on ? "page" : "false");
    });
  }

  function showView(view) {
    document.querySelectorAll(".view").forEach(v => v.hidden = true);
    const el = document.getElementById("view-" + view);
    if (el) el.hidden = false;

    state.ui.activeView = view;
    saveState();
    navActive(view);

    // render on entry
    if (view === "dashboard") renderDashboard();
    if (view === "team") renderTeam();
    if (view === "log") renderLog();
    if (view === "nutrition") renderNutrition();
    if (view === "workouts") renderWorkouts();
    if (view === "periodization") renderPeriodization();
    if (view === "analytics") renderAnalytics();
    if (view === "settings") renderSettings();
  }

  function setActiveAthlete(id) {
    state.ui.activeAthleteId = id || null;
    saveState();
  }

  function ensureActiveAthlete() {
    if (state.athletes.length === 0) return null;
    if (!state.ui.activeAthleteId) {
      setActiveAthlete(state.athletes[0].id);
    }
    const a = state.athletes.find(x => x.id === state.ui.activeAthleteId);
    if (!a) {
      setActiveAthlete(state.athletes[0].id);
      return state.athletes[0];
    }
    return a;
  }

  function uuid() {
    return "a" + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  // ----- Data helpers
  function key(athleteId, dateISO) { return athleteId + "|" + dateISO; }

  function getDailyLoad(athleteId, dateISO) {
    const arr = state.sessionsByAthlete[key(athleteId, dateISO)] || [];
    let total = 0;
    for (let i = 0; i < arr.length; i++) total += Number(arr[i].load || 0);
    return total;
  }

  function dateRange(endISO, daysBack) {
    const out = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      out.push(window.analyticsEngine.addDays(endISO, -i));
    }
    return out;
  }

  function loadsForRange(athleteId, endISO, daysBack) {
    const days = dateRange(endISO, daysBack);
    return days.map(d => getDailyLoad(athleteId, d));
  }

  function getNutritionAdherence(athleteId, dateISO) {
    const rec = state.nutritionByAthlete[key(athleteId, dateISO)];
    if (!rec) return null;
    const n = Number(rec.adherence);
    return Number.isFinite(n) ? n : null;
  }

  function getReadiness(athleteId, dateISO) {
    const rec = state.readinessByAthlete[key(athleteId, dateISO)];
    if (!rec) return { sleepHours: null, soreness: null };
    return {
      sleepHours: rec.sleepHours ?? null,
      soreness: rec.soreness ?? null
    };
  }

  function computeRiskSnapshot(athleteId, asOfISO) {
    // Acute 7d load (sum)
    const daily7 = loadsForRange(athleteId, asOfISO, 7);
    const ms = window.riskEngine.monotonyAndStrain(daily7);

    const acute7 = ms.weeklyLoad;

    // Chronic 28d load (sum) -> weekly avg inside riskEngine
    const daily28 = loadsForRange(athleteId, asOfISO, 28);
    const chronic28 = daily28.reduce((a, b) => a + b, 0);

    const ac = window.riskEngine.computeACWR(acute7, chronic28);
    const r = getReadiness(athleteId, asOfISO);
    const nut = getNutritionAdherence(athleteId, asOfISO);

    const risk = window.riskEngine.riskIndex({
      acwr: ac.acwr,
      monotony: ms.monotony,
      sleepHours: r.sleepHours,
      soreness: r.soreness,
      nutritionAdherence: nut
    });

    const band = window.riskEngine.band(risk);
    const flags = window.riskEngine.buildFlags({
      acwr: ac.acwr,
      monotony: ms.monotony,
      strain: ms.strain,
      nutritionAdherence: nut
    });

    const deload = window.riskEngine.suggestedDeload({
      acwr: ac.acwr,
      monotony: ms.monotony,
      risk
    });

    return {
      daily7,
      acute7,
      chronic28,
      acwr: ac.acwr,
      monotony: ms.monotony,
      strain: ms.strain,
      risk,
      band,
      flags,
      deload
    };
  }

  // ----- UI components
  function badge(label, tone) {
    const cls = tone === "danger" ? "danger" : tone === "warn" ? "warn" : "ok";
    return `<span class="pill ${cls}">${esc(label)}</span>`;
  }

  function sparkline(values) {
    // Minimal SVG sparkline (values array numbers)
    const w = 240, h = 44, pad = 3;
    const v = (values || []).map(x => Number(x || 0));
    const max = Math.max(1, ...v);
    const min = Math.min(0, ...v);
    const span = Math.max(1, max - min);

    const pts = v.map((y, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(1, v.length - 1);
      const yy = h - pad - ((y - min) * (h - pad * 2)) / span;
      return `${x.toFixed(1)},${yy.toFixed(1)}`;
    }).join(" ");

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-hidden="true">
        <polyline fill="none" stroke="currentColor" stroke-width="2" points="${pts}"></polyline>
      </svg>
    `;
  }

  // ----- Seed demo
  function seedDemo() {
    const a1 = { id: uuid(), name: "Jordan Smith", sport: "basketball", pos: "PG" };
    const a2 = { id: uuid(), name: "Avery Johnson", sport: "football", pos: "WR" };
    state.athletes = [a1, a2];
    setActiveAthlete(a1.id);

    const end = todayISO();
    for (let i = 0; i < 21; i++) {
      const d = window.analyticsEngine.addDays(end, -i);
      // alternating loads
      const load1 = i % 3 === 0 ? 0 : (i % 2 === 0 ? 360 : 540);
      const load2 = i % 4 === 0 ? 0 : (i % 2 === 0 ? 420 : 620);

      if (load1 > 0) state.sessionsByAthlete[key(a1.id, d)] = [{ minutes: 60, rpe: load1 / 60, load: load1, type: "practice", notes: "" }];
      if (load2 > 0) state.sessionsByAthlete[key(a2.id, d)] = [{ minutes: 70, rpe: load2 / 70, load: load2, type: "practice", notes: "" }];

      state.readinessByAthlete[key(a1.id, d)] = { sleepHours: 7.5, soreness: (i % 5) + 2 };
      state.readinessByAthlete[key(a2.id, d)] = { sleepHours: 7.0, soreness: (i % 6) + 2 };

      state.nutritionByAthlete[key(a1.id, d)] = { adherence: 78 - (i % 7) * 2, notes: "" };
      state.nutritionByAthlete[key(a2.id, d)] = { adherence: 82 - (i % 6) * 2, notes: "" };
    }

    saveState();
    renderDashboard();
  }

  // ----- Renders
  function renderDashboard() {
    const hostCoach = $("coachDashWrap");
    const hostAth = $("athleteDashWrap");
    if (!hostCoach || !hostAth) return;

    const role = state.ui.role;
    const a = ensureActiveAthlete();

    // Coach summary cards (all athletes)
    if (role === "coach") {
      const cards = state.athletes.map(at => {
        const snap = computeRiskSnapshot(at.id, todayISO());
        const flagsTop = snap.flags.slice(0, 3).map(f => `<div class="small muted">• ${esc(f.label)} — ${esc(f.detail)}</div>`).join("");
        return `
          <div class="card">
            <div class="cardhead">
              <h2 style="margin:0">Coach Summary</h2>
              <span class="muted">${esc(at.name)} • ${esc(at.sport || "sport")}</span>
            </div>
            <div class="row gap wrap">
              ${badge(`Risk: ${snap.band.label} (${snap.risk})`, snap.band.color)}
              <span class="pill">ACWR: ${snap.acwr.toFixed(2)}</span>
              <span class="pill">7d Load: ${Math.round(snap.acute7)}</span>
              <span class="pill">Monotony: ${snap.monotony.toFixed(2)}</span>
            </div>
            <div class="mini" style="margin-top:10px">
              <div class="minihead">Auto flags</div>
              <div class="minibody small">${flagsTop || `<span class="muted">None</span>`}</div>
            </div>
            <div class="mini" style="margin-top:10px">
              <div class="minihead">Auto Suggested Deload</div>
              <div class="minibody small">
                ${snap.deload.suggest ? `<b>Suggested</b> — ${esc(snap.deload.reason)}` : `<span class="muted">Not needed</span>`}
              </div>
            </div>
            <div class="mini" style="margin-top:10px">
              <div class="minihead">7-day load trend</div>
              <div class="minibody">${sparkline(snap.daily7)}</div>
            </div>
          </div>
        `;
      }).join("");

      hostCoach.innerHTML = cards || `
        <div class="card">
          <div class="cardhead"><h2>Coach Dashboard</h2><span class="muted">No athletes yet</span></div>
          <div class="minibody muted">Go to Team → Add athlete, or click Seed Demo.</div>
        </div>
      `;
      hostAth.innerHTML = "";
      return;
    }

    // Athlete mode: clean, no clutter
    hostCoach.innerHTML = "";
    if (!a) {
      hostAth.innerHTML = `
        <div class="card">
          <div class="cardhead"><h2>Athlete Dashboard</h2><span class="muted">No athlete</span></div>
          <div class="minibody muted">Ask your coach to add you, or run Seed Demo.</div>
        </div>
      `;
      return;
    }

    const snap = computeRiskSnapshot(a.id, todayISO());
    const phase = window.periodizationEngine.getCurrentPhase(state.periodization.currentWeek);
    const w = window.workoutEngine.generateWorkout({ sport: a.sport || "basketball", advanced: state.ui.advancedMode, phase });

    const banner =
      snap.acwr >= 1.5 ? `<div class="callout danger"><b>Load Spike</b> — ACWR ${snap.acwr.toFixed(2)}. Consider lower volume today.</div>` :
      snap.acwr >= 1.3 ? `<div class="callout warn"><b>Elevated Load</b> — ACWR ${snap.acwr.toFixed(2)}. Prioritize recovery.</div>` :
      `<div class="callout ok"><b>Load Normal</b> — ACWR ${snap.acwr.toFixed(2)}.</div>`;

    hostAth.innerHTML = `
      <div class="card">
        <div class="cardhead">
          <h2 style="margin:0">Athlete Dashboard</h2>
          <span class="muted">${esc(a.name)} • ${esc(a.sport || "")}</span>
        </div>

        ${banner}

        <div class="row gap wrap" style="margin-top:10px">
          ${badge(`Risk: ${snap.band.label} (${snap.risk})`, snap.band.color)}
          <span class="pill">Phase: ${esc(window.periodizationEngine.PHASES[phase].label)}</span>
          <span class="pill">Today Load: ${getDailyLoad(a.id, todayISO())}</span>
        </div>

        <div class="grid2" style="margin-top:12px">
          <div class="mini">
            <div class="minihead">Today’s Workout</div>
            <div class="minibody small">
              <b>Target:</b> ${w.minutes} min @ sRPE ${w.rpe}<br/>
              <span class="muted">Tap Workouts to see full plan.</span>
            </div>
          </div>
          <div class="mini">
            <div class="minihead">Auto Suggested Deload</div>
            <div class="minibody small">
              ${snap.deload.suggest ? `<b>Suggested</b> — ${esc(snap.deload.reason)}` : `<span class="muted">Not needed</span>`}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderTeam() {
    const host = $("view-team");
    if (!host) return;

    const rows = state.athletes.map(a => `
      <div class="row between" style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <b>${esc(a.name)}</b> <span class="muted small">• ${esc(a.sport || "—")} • ${esc(a.pos || "")}</span>
        </div>
        <div class="row gap wrap">
          <button class="btn ghost small" data-pick="${a.id}">Set Active</button>
          <button class="btn danger small" data-del="${a.id}">Remove</button>
        </div>
      </div>
    `).join("");

    host.innerHTML = `
      <div class="card">
        <div class="cardhead">
          <h2>Team</h2>
          <span class="muted">Roster + sport selection</span>
        </div>

        <div class="row gap wrap">
          <div class="field grow">
            <label>Name</label>
            <input id="tName" type="text" placeholder="Athlete name" />
          </div>
          <div class="field">
            <label>Position</label>
            <input id="tPos" type="text" placeholder="PG/SG..." />
          </div>
          <div class="field">
            <label>Sport</label>
            <select id="tSport">
              <option value="basketball">Basketball</option>
              <option value="football">Football</option>
              <option value="soccer">Soccer</option>
            </select>
          </div>
          <div class="field">
            <label>&nbsp;</label>
            <button class="btn" id="btnAddAth">Add</button>
          </div>
        </div>

        <div style="margin-top:12px">
          ${rows || `<div class="muted">No athletes yet.</div>`}
        </div>
      </div>
    `;

    $("btnAddAth").onclick = () => {
      const name = ($("tName").value || "").trim();
      if (!name) return alert("Enter a name.");
      const pos = ($("tPos").value || "").trim();
      const sport = $("tSport").value || "basketball";
      const a = { id: uuid(), name, pos, sport };
      state.athletes.push(a);
      if (!state.ui.activeAthleteId) setActiveAthlete(a.id);
      saveState();
      renderTeam();
    };

    host.querySelectorAll("[data-pick]").forEach(b => {
      b.onclick = () => {
        setActiveAthlete(b.getAttribute("data-pick"));
        renderTeam();
        renderDashboard();
      };
    });

    host.querySelectorAll("[data-del]").forEach(b => {
      b.onclick = () => {
        const id = b.getAttribute("data-del");
        state.athletes = state.athletes.filter(x => x.id !== id);
        if (state.ui.activeAthleteId === id) state.ui.activeAthleteId = null;
        saveState();
        renderTeam();
        renderDashboard();
      };
    });
  }

  function renderLog() {
    const host = $("view-log");
    if (!host) return;

    const a = ensureActiveAthlete();
    const d = todayISO();

    const athleteOptions = state.athletes.map(x => `
      <option value="${x.id}" ${x.id === (a && a.id) ? "selected" : ""}>${esc(x.name)}</option>
    `).join("");

    const sessions = a ? (state.sessionsByAthlete[key(a.id, d)] || []) : [];
    const list = sessions.map((s, idx) => `
      <div class="row between" style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <b>${esc(s.type)}</b> <span class="muted small">• ${s.minutes} min • sRPE ${s.rpe} • Load ${s.load}</span>
          ${s.notes ? `<div class="small muted">${esc(s.notes)}</div>` : ""}
        </div>
        <button class="btn danger small" data-rm="${idx}">Delete</button>
      </div>
    `).join("");

    const loadToday = a ? getDailyLoad(a.id, d) : 0;
    const snap = a ? computeRiskSnapshot(a.id, d) : null;

    host.innerHTML = `
      <div class="card">
        <div class="cardhead">
          <h2>Log</h2>
          <span class="muted">sRPE × minutes → Load</span>
        </div>

        <div class="row gap wrap">
          <div class="field">
            <label>Athlete</label>
            <select id="logAth">${athleteOptions || `<option value="">No athletes</option>`}</select>
          </div>
          <div class="field">
            <label>Date</label>
            <input id="logDate" type="date" value="${d}" />
          </div>
          <div class="field">
            <label>Minutes</label>
            <input id="logMin" type="number" min="0" max="300" value="60" />
          </div>
          <div class="field">
            <label>sRPE</label>
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
          <div class="field grow">
            <label>Notes</label>
            <input id="logNotes" type="text" placeholder="optional" />
          </div>
          <div class="field">
            <label>&nbsp;</label>
            <button class="btn" id="btnSaveSess">Save</button>
          </div>
        </div>

        <div class="grid2" style="margin-top:12px">
          <div class="mini">
            <div class="minihead">Today total load</div>
            <div class="minibody"><b>${loadToday}</b></div>
          </div>
          <div class="mini">
            <div class="minihead">Auto flags</div>
            <div class="minibody small">
              ${snap ? (snap.flags.length ? snap.flags.map(f => `• ${esc(f.label)} <span class="muted">(${esc(f.detail)})</span>`).join("<br/>") : `<span class="muted">None</span>`) : `<span class="muted">—</span>`}
            </div>
          </div>
        </div>

        <div style="margin-top:12px">
          ${list || `<div class="muted">No sessions logged for this date.</div>`}
        </div>
      </div>
    `;

    const logAth = $("logAth");
    if (logAth) {
      logAth.onchange = () => {
        setActiveAthlete(logAth.value);
        saveState();
        renderLog();
        renderDashboard();
      };
    }

    $("btnSaveSess").onclick = () => {
      const athId = $("logAth").value;
      if (!athId) return alert("Add an athlete first.");
      const dateISO = $("logDate").value || todayISO();
      const minutes = Math.max(0, Number($("logMin").value || 0));
      const rpe = Math.max(0, Math.min(10, Number($("logRpe").value || 0)));
      const type = $("logType").value || "practice";
      const notes = ($("logNotes").value || "").trim();

      const load = Math.round(minutes * rpe);
      const k = key(athId, dateISO);
      const arr = state.sessionsByAthlete[k] || [];
      arr.push({ minutes, rpe, load, type, notes, at: Date.now() });
      state.sessionsByAthlete[k] = arr;

      saveState();
      renderLog();
      renderDashboard();
    };

    host.querySelectorAll("[data-rm]").forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.getAttribute("data-rm"));
        const athId = $("logAth").value;
        const dateISO = $("logDate").value || todayISO();
        const k = key(athId, dateISO);
        const arr = state.sessionsByAthlete[k] || [];
        arr.splice(idx, 1);
        state.sessionsByAthlete[k] = arr;
        saveState();
        renderLog();
        renderDashboard();
      };
    });
  }

  function renderNutrition() {
    const host = $("view-nutrition");
    if (!host) return;

    const a = ensureActiveAthlete();
    const d = todayISO();

    const athleteOptions = state.athletes.map(x => `
      <option value="${x.id}" ${a && x.id === a.id ? "selected" : ""}>${esc(x.name)}</option>
    `).join("");

    const rec = a ? (state.nutritionByAthlete[key(a.id, d)] || { adherence: 80, notes: "" }) : { adherence: 0, notes: "" };

    host.innerHTML = `
      <div class="card">
        <div class="cardhead">
          <h2>Elite Nutrition</h2>
          <span class="muted">Adherence drives risk flags</span>
        </div>

        <div class="row gap wrap">
          <div class="field">
            <label>Athlete</label>
            <select id="nutAth">${athleteOptions || `<option value="">No athletes</option>`}</select>
          </div>
          <div class="field">
            <label>Date</label>
            <input id="nutDate" type="date" value="${d}" />
          </div>
          <div class="field">
            <label>Adherence (0–100)</label>
            <input id="nutAdh" type="number" min="0" max="100" value="${Number(rec.adherence || 0)}" />
          </div>
          <div class="field grow">
            <label>Notes</label>
            <input id="nutNotes" type="text" value="${esc(rec.notes || "")}" placeholder="optional" />
          </div>
          <div class="field">
            <label>&nbsp;</label>
            <button class="btn" id="btnSaveNut">Save</button>
          </div>
        </div>

        <div class="mini" style="margin-top:12px">
          <div class="minihead">Auto warning</div>
          <div class="minibody small">
            ${Number(rec.adherence || 0) < 70 ? `<b class="danger">Below target</b> — this will trigger nutrition warning.` : `<span class="muted">On track</span>`}
          </div>
        </div>
      </div>
    `;

    $("nutAth").onchange = () => {
      setActiveAthlete($("nutAth").value);
      saveState();
      renderNutrition();
      renderDashboard();
    };

    $("btnSaveNut").onclick = () => {
      const athId = $("nutAth").value;
      if (!athId) return alert("Add an athlete first.");
      const dateISO = $("nutDate").value || todayISO();
      const adherence = Math.max(0, Math.min(100, Number($("nutAdh").value || 0)));
      const notes = ($("nutNotes").value || "").trim();
      state.nutritionByAthlete[key(athId, dateISO)] = { adherence, notes, at: Date.now() };
      saveState();
      renderNutrition();
      renderDashboard();
    };
  }

  function renderWorkouts() {
    const host = $("view-workouts");
    if (!host) return;

    const a = ensureActiveAthlete();
    if (!a) {
      host.innerHTML = `
        <div class="card">
          <div class="cardhead"><h2>Workouts</h2><span class="muted">No athlete</span></div>
          <div class="minibody muted">Add an athlete in Team or Seed Demo.</div>
        </div>
      `;
      return;
    }

    const phase = window.periodizationEngine.getCurrentPhase(state.periodization.currentWeek);
    const w = window.workoutEngine.generateWorkout({
      sport: a.sport || "basketball",
      advanced: state.ui.advancedMode,
      phase
    });

    host.innerHTML = `
      <div class="card">
        <div class="cardhead">
          <h2>Workouts</h2>
          <span class="muted">${esc(a.sport || "")} • ${esc(window.periodizationEngine.PHASES[phase].label)}</span>
        </div>

        <div class="grid2">
          <div class="mini">
            <div class="minihead">Today target</div>
            <div class="minibody small">
              <b>${w.minutes} min</b> @ <b>sRPE ${w.rpe}</b><br/>
              <span class="muted">Estimated load: ${Math.round(w.minutes * w.rpe)}</span>
            </div>
          </div>
          <div class="mini">
            <div class="minihead">Mode</div>
            <div class="minibody small">
              ${state.ui.advancedMode ? `<b>Advanced</b>` : `<b>Standard</b>`}
              <div class="row gap wrap" style="margin-top:10px">
                <button class="btn" id="btnToggleAdv">${state.ui.advancedMode ? "Switch to Standard" : "Switch to Advanced"}</button>
              </div>
            </div>
          </div>
        </div>

        <div class="mini" style="margin-top:12px">
          <div class="minihead">Exercises</div>
          <div class="minibody">
            <ul style="padding-left:18px">
              ${w.exercises.map(e => `<li>${esc(e)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </div>
    `;

    $("btnToggleAdv").onclick = () => {
      state.ui.advancedMode = !state.ui.advancedMode;
      saveState();
      renderWorkouts();
      renderDashboard();
    };
  }

  function renderPeriodization() {
    const host = $("view-periodization");
    if (!host) return;

    const week = state.periodization.currentWeek;
    const phase = window.periodizationEngine.getCurrentPhase(week);
    const p = window.periodizationEngine.PHASES[phase];

    const a = ensureActiveAthlete();
    let baseline = 0;
    if (a) {
      // baseline = chronic week avg from risk snapshot
      const snap = computeRiskSnapshot(a.id, todayISO());
      baseline = Math.round(snap.chronic28 / 4) || 0;
    }
    const target = window.periodizationEngine.weeklyTargetLoad({ baselineWeekLoad: baseline, weekNumber: week });

    host.innerHTML = `
      <div class="card">
        <div class="cardhead">
          <h2>Periodization</h2>
          <span class="muted">Week ${week}</span>
        </div>

        <div class="grid2">
          <div class="mini">
            <div class="minihead">Current phase</div>
            <div class="minibody small">
              <b>${esc(p.label)}</b><br/>
              <span class="muted">${esc(p.desc)}</span>
            </div>
          </div>
          <div class="mini">
            <div class="minihead">Weekly target load</div>
            <div class="minibody small">
              <b>${target.target}</b>
              <div class="muted">Baseline: ${baseline || "—"}</div>
            </div>
          </div>
        </div>

        <div class="row gap wrap" style="margin-top:12px">
          <button class="btn" id="btnNextWeek">Next Week</button>
          <button class="btn ghost" id="btnPrevWeek">Prev Week</button>
        </div>
      </div>
    `;

    $("btnNextWeek").onclick = () => {
      state.periodization.currentWeek += 1;
      saveState();
      renderPeriodization();
      renderWorkouts();
      renderDashboard();
    };
    $("btnPrevWeek").onclick = () => {
      state.periodization.currentWeek = Math.max(1, state.periodization.currentWeek - 1);
      saveState();
      renderPeriodization();
      renderWorkouts();
      renderDashboard();
    };
  }

  function renderAnalytics() {
    const host = $("view-analytics");
    if (!host) return;

    const a = ensureActiveAthlete();
    if (!a) {
      host.innerHTML = `
        <div class="card">
          <div class="cardhead"><h2>Analytics</h2><span class="muted">No athlete</span></div>
          <div class="minibody muted">Add an athlete in Team or Seed Demo.</div>
        </div>
      `;
      return;
    }

    const end = todayISO();
    const days21 = dateRange(end, 21);

    const loadSeries = days21.map(d => getDailyLoad(a.id, d));
    const nutSeries = days21.map(d => getNutritionAdherence(a.id, d) ?? 0);

    // risk series uses snapshots (lightweight enough for 21d)
    const riskSeries = days21.map(d => computeRiskSnapshot(a.id, d).risk);

    const snapNow = computeRiskSnapshot(a.id, end);

    host.innerHTML = `
      <div class="card">
        <div class="cardhead">
          <h2>Analytics</h2>
          <span class="muted">${esc(a.name)} • last 21 days</span>
        </div>

        <div class="grid2">
          <div class="mini">
            <div class="minihead">Load trend</div>
            <div class="minibody">${sparkline(loadSeries)}</div>
            <div class="small muted">7d load: ${Math.round(snapNow.acute7)} • ACWR: ${snapNow.acwr.toFixed(2)}</div>
          </div>

          <div class="mini">
            <div class="minihead">Risk trend</div>
            <div class="minibody">${sparkline(riskSeries)}</div>
            <div class="small muted">Current: ${snapNow.risk} (${esc(snapNow.band.label)})</div>
          </div>
        </div>

        <div class="mini" style="margin-top:12px">
          <div class="minihead">Nutrition compliance</div>
          <div class="minibody">${sparkline(nutSeries)}</div>
          <div class="small muted">Today: ${getNutritionAdherence(a.id, end) ?? "—"}%</div>
        </div>
      </div>
    `;
  }

  function renderSettings() {
    const host = $("view-settings");
    if (!host) return;

    const a = ensureActiveAthlete();
    const athleteOptions = state.athletes.map(x => `
      <option value="${x.id}" ${a && x.id === a.id ? "selected" : ""}>${esc(x.name)}</option>
    `).join("");

    host.innerHTML = `
      <div class="card">
        <div class="cardhead">
          <h2>Settings</h2>
          <span class="muted">v${esc(state.app.version)}</span>
        </div>

        <div class="grid2">
          <div class="mini">
            <div class="minihead">Role</div>
            <div class="minibody small muted">Coach sees analytics. Athlete sees clean dashboard.</div>
            <div class="row gap wrap" style="margin-top:10px">
              <button class="btn ${state.ui.role === "coach" ? "" : "ghost"}" id="btnRoleCoach">Coach</button>
              <button class="btn ${state.ui.role === "athlete" ? "" : "ghost"}" id="btnRoleAth">Athlete</button>
            </div>
          </div>

          <div class="mini">
            <div class="minihead">Active athlete</div>
            <div class="minibody small muted">Controls log + dashboards.</div>
            <div class="row gap wrap" style="margin-top:10px">
              <select id="setAth" ${state.athletes.length ? "" : "disabled"}>
                ${athleteOptions || `<option value="">No athletes</option>`}
              </select>
            </div>
          </div>

          <div class="mini">
            <div class="minihead">Demo</div>
            <div class="minibody small muted">One-click seed to validate UI.</div>
            <div class="row gap wrap" style="margin-top:10px">
              <button class="btn" id="btnSeedLocal">Seed Demo</button>
              <button class="btn danger" id="btnWipe">Wipe Local Data</button>
            </div>
          </div>

          <div class="mini">
            <div class="minihead">Debug</div>
            <div class="minibody mono small">
              Athletes: ${state.athletes.length}<br/>
              Active view: ${esc(state.ui.activeView)}<br/>
              Storage: ${esc(STORAGE_KEY)}
            </div>
          </div>
        </div>
      </div>
    `;

    $("btnRoleCoach").onclick = () => { state.ui.role = "coach"; saveState(); renderSettings(); renderDashboard(); };
    $("btnRoleAth").onclick = () => { state.ui.role = "athlete"; saveState(); renderSettings(); renderDashboard(); };

    const setAth = $("setAth");
    if (setAth) {
      setAth.onchange = () => {
        setActiveAthlete(setAth.value);
        saveState();
        renderSettings();
        renderDashboard();
      };
    }

    $("btnSeedLocal").onclick = () => seedDemo();

    $("btnWipe").onclick = () => {
      if (!confirm("Wipe all local data?")) return;
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      saveState();
      renderSettings();
      renderDashboard();
      renderTeam();
      renderLog();
      renderNutrition();
      renderWorkouts();
      renderPeriodization();
      renderAnalytics();
    };
  }

  // ----- Boot
  function wireTopbar() {
    const seedBtn = $("btnSeed");
    if (seedBtn) seedBtn.onclick = seedDemo;
  }

  function wireNav() {
    document.querySelectorAll(".navbtn").forEach(btn => {
      btn.onclick = () => showView(btn.dataset.view);
    });
  }

  function boot() {
    wireTopbar();
    wireNav();

    // first render all to avoid empty panes
    renderDashboard();
    renderTeam();
    renderLog();
    renderNutrition();
    renderWorkouts();
    renderPeriodization();
    renderAnalytics();
    renderSettings();

    // go to last view
    showView(state.ui.activeView || "dashboard");

    hideSplash();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
