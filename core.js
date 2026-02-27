// core.js — v7.0.0 (Week 9–10)
// Automation Layer + Athlete Mode "Today" + Cloud write-back stubs
// Requires: riskEngine, analyticsEngine, workoutEngine, periodizationEngine, automationEngine, cloudSync

(function () {
  "use strict";
  if (window.__PIQ_CORE_V7__) return;
  window.__PIQ_CORE_V7__ = true;

  const STORAGE_KEY = "piq_state_v7";

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
  function uuid() { return "a" + Math.random().toString(16).slice(2) + Date.now().toString(16); }
  function key(athleteId, dateISO) { return athleteId + "|" + dateISO; }

  function defaultState() {
    return {
      ui: {
        activeView: "dashboard",
        role: "coach",           // coach | athlete
        activeAthleteId: null,
        advancedMode: false
      },
      athletes: [],
      sessionsByAthlete: {},     // `${athleteId}|${date}` -> [{minutes,rpe,load,type,notes,at}]
      readinessByAthlete: {},    // `${athleteId}|${date}` -> {sleepHours,soreness,at}
      nutritionByAthlete: {},    // `${athleteId}|${date}` -> {adherence,notes,at}
      periodization: { currentWeek: 1 },
      app: { version: "7.0.0" }
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
    if (!state.ui.activeAthleteId) setActiveAthlete(state.athletes[0].id);
    const a = state.athletes.find(x => x.id === state.ui.activeAthleteId);
    if (!a) { setActiveAthlete(state.athletes[0].id); return state.athletes[0]; }
    return a;
  }

  function getDailyLoad(athleteId, dateISO) {
    const arr = state.sessionsByAthlete[key(athleteId, dateISO)] || [];
    let total = 0;
    for (let i = 0; i < arr.length; i++) total += Number(arr[i].load || 0);
    return total;
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
    return { sleepHours: rec.sleepHours ?? null, soreness: rec.soreness ?? null };
  }

  // ---------- UI bits
  function pill(label, tone) {
    const t = tone ? ` ${tone}` : "";
    return `<span class="pill${t}">${esc(label)}</span>`;
  }

  function callout(tone, title, body) {
    const c = tone ? ` ${tone}` : "";
    return `<div class="callout${c}"><b>${esc(title)}</b> — ${esc(body)}</div>`;
  }

  function sparkline(values) {
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

  // ---------- Cloud write-back wrappers (no-op if not configured)
  async function cloudWriteTraining(athleteId, dateISO, sessionRow) {
    if (!window.cloudSync || !window.cloudSync.hasClient || !window.cloudSync.hasClient()) return;
    // Map to expected table fields
    const row = {
      athlete_id: athleteId,
      date: dateISO,
      minutes: sessionRow.minutes,
      rpe: sessionRow.rpe,
      load: sessionRow.load,
      type: sessionRow.type,
      notes: sessionRow.notes || ""
    };
    await window.cloudSync.writeTrainingSession(row);
  }

  async function cloudWriteReadiness(athleteId, dateISO, rec) {
    if (!window.cloudSync || !window.cloudSync.hasClient || !window.cloudSync.hasClient()) return;
    const row = {
      athlete_id: athleteId,
      date: dateISO,
      sleep_hours: rec.sleepHours ?? null,
      soreness: rec.soreness ?? null
    };
    await window.cloudSync.writeReadiness(row);
  }

  async function cloudWriteNutrition(athleteId, dateISO, rec) {
    if (!window.cloudSync || !window.cloudSync.hasClient || !window.cloudSync.hasClient()) return;
    const row = {
      athlete_id: athleteId,
      date: dateISO,
      adherence: rec.adherence ?? null,
      notes: rec.notes || ""
    };
    await window.cloudSync.writeNutrition(row);
  }

  // ---------- Demo seed
  function seedDemo() {
    const a1 = { id: uuid(), name: "Jordan Smith", sport: "basketball", pos: "PG" };
    const a2 = { id: uuid(), name: "Avery Johnson", sport: "football", pos: "WR" };
    state.athletes = [a1, a2];
    setActiveAthlete(a1.id);

    const end = todayISO();
    for (let i = 0; i < 21; i++) {
      const d = window.analyticsEngine.addDays(end, -i);
      const load1 = i % 3 === 0 ? 0 : (i % 2 === 0 ? 360 : 540);
      const load2 = i % 4 === 0 ? 0 : (i % 2 === 0 ? 420 : 620);

      if (load1 > 0) state.sessionsByAthlete[key(a1.id, d)] = [{ minutes: 60, rpe: Math.round(load1 / 60), load: load1, type: "practice", notes: "", at: Date.now() }];
      if (load2 > 0) state.sessionsByAthlete[key(a2.id, d)] = [{ minutes: 70, rpe: Math.round(load2 / 70), load: load2, type: "practice", notes: "", at: Date.now() }];

      state.readinessByAthlete[key(a1.id, d)] = { sleepHours: 7.5, soreness: (i % 5) + 2, at: Date.now() };
      state.readinessByAthlete[key(a2.id, d)] = { sleepHours: 7.0, soreness: (i % 6) + 2, at: Date.now() };

      state.nutritionByAthlete[key(a1.id, d)] = { adherence: 78 - (i % 7) * 2, notes: "", at: Date.now() };
      state.nutritionByAthlete[key(a2.id, d)] = { adherence: 82 - (i % 6) * 2, notes: "", at: Date.now() };
    }

    saveState();
    renderDashboard();
    renderTeam();
  }

  // ---------- DASHBOARD
  function renderDashboard() {
    const hostCoach = $("coachDashWrap");
    const hostAth = $("athleteDashWrap");
    if (!hostCoach || !hostAth) return;

    const role = state.ui.role;
    const a = ensureActiveAthlete();
    const asOf = todayISO();

    // COACH: Summary cards for all athletes + automation badges + deload prompt
    if (role === "coach") {
      const cards = state.athletes.map(at => {
        const snap = window.automationEngine.computeSnapshot(state, at.id, asOf);
        const badges = window.automationEngine.pickTopBadges(snap)
          .map(b => pill(b.label, b.tone)).join(" ");

        const week = window.automationEngine.weeklySummary(state, at.id, asOf);
        const prompt = window.automationEngine.buildDeloadPrompt(state, at.id, snap);

        return `
          <div class="card">
            <div class="cardhead">
              <h2 style="margin:0">Coach Summary</h2>
              <span class="muted">${esc(at.name)} • ${esc(at.sport || "sport")}</span>
            </div>

            <div class="row gap wrap">
              ${badges}
            </div>

            ${prompt ? `
              <div class="mini" style="margin-top:10px">
                <div class="minihead">${esc(prompt.title)}</div>
                <div class="minibody small">
                  ${esc(prompt.body)}
                  <div class="row gap wrap" style="margin-top:10px">
                    <button class="btn ghost small" data-dismiss="${esc(prompt.id)}">${esc(prompt.actionLabel)}</button>
                  </div>
                </div>
              </div>
            ` : ""}

            <div class="grid2" style="margin-top:12px">
              <div class="mini">
                <div class="minihead">Weekly summary (7d)</div>
                <div class="minibody small">
                  <b>Load:</b> ${Math.round(week.totalLoad7)}<br/>
                  <b>ACWR:</b> ${snap.acwr.toFixed(2)}<br/>
                  <b>Nutrition avg:</b> ${week.nutAvg != null ? week.nutAvg + "%" : "—"}
                </div>
              </div>
              <div class="mini">
                <div class="minihead">7d Load trend</div>
                <div class="minibody">${sparkline(snap.daily7)}</div>
              </div>
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

      hostCoach.querySelectorAll("[data-dismiss]").forEach(btn => {
        btn.onclick = () => {
          const id = btn.getAttribute("data-dismiss");
          window.automationEngine.dismissPrompt(id, window.analyticsEngine.addDays(todayISO(), 7));
          renderDashboard();
          renderTeam();
        };
      });

      hostAth.innerHTML = "";
      return;
    }

    // ATHLETE: “Today” (workout + nutrition + quick log)
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

    const snap = window.automationEngine.computeSnapshot(state, a.id, asOf);
    const phase = window.periodizationEngine.getCurrentPhase(state.periodization.currentWeek);
    const workout = window.workoutEngine.generateWorkout({
      sport: a.sport || "basketball",
      advanced: state.ui.advancedMode,
      phase
    });

    const loadBanner =
      snap.acwr >= 1.5 ? callout("danger", "Load Spike", `ACWR ${snap.acwr.toFixed(2)} — reduce volume today.`) :
      snap.acwr >= 1.3 ? callout("warn", "Elevated Load", `ACWR ${snap.acwr.toFixed(2)} — prioritize recovery.`) :
      callout("ok", "Load Normal", `ACWR ${snap.acwr.toFixed(2)} — stay consistent.`);

    const nutToday = getNutritionAdherence(a.id, asOf);
    const nutBanner =
      (nutToday != null && nutToday < 70) ? callout("warn", "Nutrition Warning", `Adherence ${Math.round(nutToday)}% — increase protein + fluids.`) :
      (nutToday != null) ? callout("ok", "Nutrition On Track", `Adherence ${Math.round(nutToday)}%`) :
      callout("", "Nutrition Not Logged", "Log nutrition adherence for better recommendations.");

    const todayLoad = getDailyLoad(a.id, asOf);
    const estLoad = Math.round(workout.minutes * workout.rpe);

    hostAth.innerHTML = `
      <div class="card">
        <div class="cardhead">
          <h2 style="margin:0">Today</h2>
          <span class="muted">${esc(a.name)} • ${esc(a.sport || "")} • ${esc(window.periodizationEngine.PHASES[phase].label)}</span>
        </div>

        ${loadBanner}
        ${nutBanner}

        <div class="grid2" style="margin-top:12px">
          <div class="mini">
            <div class="minihead">Today’s Workout</div>
            <div class="minibody small">
              <b>Target:</b> ${workout.minutes} min @ sRPE ${workout.rpe}<br/>
              <span class="muted">Est. load: ${estLoad} • Logged today: ${todayLoad}</span>
              <div class="row gap wrap" style="margin-top:10px">
                <button class="btn" id="btnToWorkouts">View Workout</button>
                <button class="btn ghost" id="btnToggleMode">${state.ui.advancedMode ? "Switch Standard" : "Switch Advanced"}</button>
              </div>
            </div>
          </div>

          <div class="mini">
            <div class="minihead">Quick Log</div>
            <div class="minibody small">
              <div class="row gap wrap">
                <button class="btn small" data-quick="practice">Practice</button>
                <button class="btn small" data-quick="lift">Lift</button>
                <button class="btn small" data-quick="skills">Skills</button>
                <button class="btn small" data-quick="conditioning">Conditioning</button>
                <button class="btn small" data-quick="game">Game</button>
                <button class="btn ghost small" id="btnToLog">Open Log</button>
              </div>

              <div class="row gap wrap" style="margin-top:12px">
                <button class="btn ghost small" id="btnQuickReadiness">Log Readiness</button>
                <button class="btn ghost small" id="btnQuickNutrition">Log Nutrition</button>
              </div>

              <div class="small muted" style="margin-top:8px">
                Risk: ${snap.band.label} (${snap.risk}) • Deload: ${snap.deload.suggest ? "Suggested" : "No"}
              </div>
            </div>
          </div>
        </div>

        ${snap.deload.suggest ? `
          <div class="mini" style="margin-top:12px">
            <div class="minihead">Suggested Deload</div>
            <div class="minibody small">
              ${esc(snap.deload.reason)}
              <div class="muted small">Tip: reduce minutes ~30–40% and keep sRPE ≤ 5 today.</div>
            </div>
          </div>
        ` : ""}

      </div>
    `;

    $("btnToWorkouts").onclick = () => showView("workouts");
    $("btnToLog").onclick = () => showView("log");
    $("btnToggleMode").onclick = () => { state.ui.advancedMode = !state.ui.advancedMode; saveState(); renderDashboard(); };

    // Quick log uses workout target minutes/rpe as defaults
    hostAth.querySelectorAll("[data-quick]").forEach(btn => {
      btn.onclick = async () => {
        const type = btn.getAttribute("data-quick");
        const minutes = workout.minutes;
        const rpe = workout.rpe;
        const load = Math.round(minutes * rpe);
        const sess = { minutes, rpe, load, type, notes: "Quick log", at: Date.now() };

        const k = key(a.id, asOf);
        const arr = state.sessionsByAthlete[k] || [];
        arr.push(sess);
        state.sessionsByAthlete[k] = arr;
        saveState();

        // optional cloud write-back
        await cloudWriteTraining(a.id, asOf, sess);

        renderDashboard();
      };
    });

    $("btnQuickReadiness").onclick = async () => {
      const sleep = Number(prompt("Sleep hours (e.g., 7.5):", "7.5") || "");
      const sore = Number(prompt("Soreness 0–10:", "3") || "");
      if (!Number.isFinite(sleep) || !Number.isFinite(sore)) return;

      state.readinessByAthlete[key(a.id, asOf)] = { sleepHours: sleep, soreness: sore, at: Date.now() };
      saveState();
      await cloudWriteReadiness(a.id, asOf, { sleepHours: sleep, soreness: sore });
      renderDashboard();
    };

    $("btnQuickNutrition").onclick = async () => {
      const adh = Number(prompt("Nutrition adherence 0–100:", "80") || "");
      if (!Number.isFinite(adh)) return;

      state.nutritionByAthlete[key(a.id, asOf)] = { adherence: Math.max(0, Math.min(100, adh)), notes: "Quick log", at: Date.now() };
      saveState();
      await cloudWriteNutrition(a.id, asOf, { adherence: Math.max(0, Math.min(100, adh)), notes: "Quick log" });
      renderDashboard();
    };
  }

  // ---------- TEAM
  function renderTeam() {
    const host = $("view-team");
    if (!host) return;

    const asOf = todayISO();

    const rows = state.athletes.map(a => {
      const snap = window.automationEngine.computeSnapshot(state, a.id, asOf);
      const badges = window.automationEngine.pickTopBadges(snap).slice(0, 3)
        .map(b => pill(b.label, b.tone)).join(" ");

      return `
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div class="row between">
            <div>
              <b>${esc(a.name)}</b> <span class="muted small">• ${esc(a.sport || "—")} • ${esc(a.pos || "")}</span>
            </div>
            <div class="row gap wrap">
              <button class="btn ghost small" data-pick="${a.id}">Set Active</button>
              <button class="btn danger small" data-del="${a.id}">Remove</button>
            </div>
          </div>
          <div class="row gap wrap" style="margin-top:8px">${badges}</div>
        </div>
      `;
    }).join("");

    host.innerHTML = `
      <div class="card">
        <div class="cardhead">
          <h2>Team</h2>
          <span class="muted">Roster + sport + auto badges</span>
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
      renderDashboard();
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

  // ---------- LOG (same as Week 7–8, but cloud write-back on save)
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

        <div class="mini" style="margin-top:12px">
          <div class="minihead">Today total load</div>
          <div class="minibody"><b>${loadToday}</b></div>
        </div>

        <div style="margin-top:12px">
          ${list || `<div class="muted">No sessions logged for this date.</div>`}
        </div>
      </div>
    `;

    $("logAth").onchange = () => {
      setActiveAthlete($("logAth").value);
      saveState();
      renderLog();
      renderDashboard();
      renderTeam();
    };

    $("btnSaveSess").onclick = async () => {
      const athId = $("logAth").value;
      if (!athId) return alert("Add an athlete first.");
      const dateISO = $("logDate").value || todayISO();
      const minutes = Math.max(0, Number($("logMin").value || 0));
      const rpe = Math.max(0, Math.min(10, Number($("logRpe").value || 0)));
      const type = $("logType").value || "practice";
      const notes = ($("logNotes").value || "").trim();
      const load = Math.round(minutes * rpe);

      const sess = { minutes, rpe, load, type, notes, at: Date.now() };
      const k = key(athId, dateISO);
      const arr = state.sessionsByAthlete[k] || [];
      arr.push(sess);
      state.sessionsByAthlete[k] = arr;

      saveState();
      await cloudWriteTraining(athId, dateISO, sess);

      renderLog();
      renderDashboard();
      renderTeam();
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
        renderTeam();
      };
    });
  }

  // ---------- NUTRITION (kept lightweight; quick log exists in athlete dashboard)
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
          <span class="muted">Adherence drives automation warnings</span>
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
            ${Number(rec.adherence || 0) < 70 ? `<b class="danger">Below target</b> — triggers nutrition warning.` : `<span class="muted">On track</span>`}
          </div>
        </div>
      </div>
    `;

    $("nutAth").onchange = () => {
      setActiveAthlete($("nutAth").value);
      saveState();
      renderNutrition();
      renderDashboard();
      renderTeam();
    };

    $("btnSaveNut").onclick = async () => {
      const athId = $("nutAth").value;
      if (!athId) return alert("Add an athlete first.");
      const dateISO = $("nutDate").value || todayISO();
      const adherence = Math.max(0, Math.min(100, Number($("nutAdh").value || 0)));
      const notes = ($("nutNotes").value || "").trim();
      const rec = { adherence, notes, at: Date.now() };
      state.nutritionByAthlete[key(athId, dateISO)] = rec;
      saveState();

      await cloudWriteNutrition(athId, dateISO, rec);

      renderNutrition();
      renderDashboard();
      renderTeam();
    };
  }

  // ---------- WORKOUTS (unchanged; uses sport + phase + advanced toggle)
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

  // ---------- PERIODIZATION
  function renderPeriodization() {
    const host = $("view-periodization");
    if (!host) return;

    const week = state.periodization.currentWeek;
    const phase = window.periodizationEngine.getCurrentPhase(week);
    const p = window.periodizationEngine.PHASES[phase];

    const a = ensureActiveAthlete();
    let baseline = 0;
    if (a) {
      const snap = window.automationEngine.computeSnapshot(state, a.id, todayISO());
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

  // ---------- ANALYTICS (coach-only but still renders)
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
    const days21 = window.analyticsEngine.dateRange(end, 21);

    const loadSeries = days21.map(d => getDailyLoad(a.id, d));
    const nutSeries = days21.map(d => getNutritionAdherence(a.id, d) ?? 0);
    const riskSeries = days21.map(d => window.automationEngine.computeSnapshot(state, a.id, d).risk);

    const snapNow = window.automationEngine.computeSnapshot(state, a.id, end);

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

  // ---------- SETTINGS
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
            <div class="minibody small muted">Coach sees analytics. Athlete sees Today-first dashboard.</div>
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
            <div class="minihead">Cloud</div>
            <div class="minibody small">
              Status: <b>${window.cloudSync && window.cloudSync.hasClient && window.cloudSync.hasClient() ? "Connected" : "Local-only"}</b><br/>
              <span class="muted">Write-back enabled only if Supabase client is configured.</span>
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

    $("btnRoleCoach").onclick = () => { state.ui.role = "coach"; saveState(); renderSettings(); renderDashboard(); renderTeam(); };
    $("btnRoleAth").onclick = () => { state.ui.role = "athlete"; saveState(); renderSettings(); renderDashboard(); renderTeam(); };

    const setAth = $("setAth");
    if (setAth) {
      setAth.onchange = () => {
        setActiveAthlete(setAth.value);
        saveState();
        renderSettings();
        renderDashboard();
        renderTeam();
      };
    }

    $("btnSeedLocal").onclick = () => seedDemo();

    $("btnWipe").onclick = () => {
      if (!confirm("Wipe all local data?")) return;
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      saveState();

      renderDashboard();
      renderTeam();
      renderLog();
      renderNutrition();
      renderWorkouts();
      renderPeriodization();
      renderAnalytics();
      renderSettings();
    };
  }

  // ---------- Boot
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

    // Ensure every view has content (no empty)
    renderDashboard();
    renderTeam();
    renderLog();
    renderNutrition();
    renderWorkouts();
    renderPeriodization();
    renderAnalytics();
    renderSettings();

    showView(state.ui.activeView || "dashboard");
    hideSplash();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
