// core.js — v2.4.0 (Phase 0 + skill microblocks + injury-friendly templates + "Today" workflow + QA grader)
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

  // ---------- Meta ----------
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

  // ---------- Utilities ----------
  function toast(msg, ms = 2200) {
    const t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.hidden = true; }, ms);
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

  // ---------- Undo ----------
  let undoTimer = null;
  let undoAction = null;
  function showUndoToast(label, onUndo, ms = 6000) {
    const t = $("undoToast");
    if (!t) {
      undoAction = onUndo;
      clearTimeout(undoTimer);
      undoTimer = setTimeout(() => { undoAction = null; }, ms);
      return;
    }
    t.hidden = false;
    t.innerHTML = `<div style="flex:1">${label}</div><button id="btnUndoNow">Undo</button>`;
    const btn = $("btnUndoNow");
    btn?.addEventListener("click", () => { try { onUndo?.(); } catch{} hideUndoToast(); toast("Undone"); });
    undoAction = onUndo;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { undoAction = null; hideUndoToast(); }, ms);
  }
  function hideUndoToast() { const t = $("undoToast"); if (!t) return; t.hidden = true; t.innerHTML = ""; }

  // ---------- Save status pill ----------
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
    views.forEach(v => { const el = document.querySelector(`#view-${v}`); if (el) el.hidden = (v !== view); });
    state.ui.view = view;
    persist(null, { silentToast: true });
    setActiveNav(view);
    render(view);
    autoTourFor(view);
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
      setDataStatus("local", timeAgo(meta.lastLocalSaveAt));
    } catch {
      setDataStatus("error");
    }
    if (msg && !opts.silentToast) toast(msg);
  }

  // ---------- Autosave ----------
  let autosaveTimer = null;
  function startAutosave() { clearInterval(autosaveTimer); autosaveTimer = setInterval(() => { try { persist(null, { silentToast: true }); } catch {} }, 30000); }

  // ---------- Skill microblocks (sport specific) ----------
  function skillMicroblocksFor(sport) {
    const map = {
      basketball: [
        { name: "Ball Handling: Stationary - 3 ball circles", duration: "3 min", focus: "control" },
        { name: "Ball Handling: Two-ball alternating", duration: "4 min", focus: "coordination" },
        { name: "Shooting: Form reps (close)", duration: "6 min", focus: "mechanics" },
        { name: "Shooting: Spot-up triples (game pace)", duration: "8 min", focus: "rhythm" },
        { name: "Footwork: Closeout + retreat", duration: "4 min", focus: "defense" }
      ],
      football: [
        { name: "Route running: Stem + break", duration: "8 min", focus: "timing" },
        { name: "Catching: Hands only drills", duration: "6 min", focus: "soft hands" },
        { name: "Coverage release vs press", duration: "6 min", focus: "agility" }
      ],
      soccer: [
        { name: "Dribbling: cone weave", duration: "8 min", focus: "touch" },
        { name: "Shooting: 1v0 accuracy", duration: "6 min", focus: "placement" },
        { name: "Passing: wall reps", duration: "5 min", focus: "weight" }
      ],
      baseball: [
        { name: "Throwing: Wrist/Arm path warmup", duration: "6 min", focus: "arm health" },
        { name: "Footwork: fielding > throw", duration: "8 min", focus: "mechanics" },
        { name: "Throwing: long toss (controlled)", duration: "8 min", focus: "arm prep" }
      ],
      volleyball: [
        { name: "Approach: footwork + rhythm", duration: "6 min", focus: "timing" },
        { name: "Blocking: hand position reps", duration: "5 min", focus: "mechanics" },
        { name: "Spike: approach + contact", duration: "6 min", focus: "power" }
      ],
      track: [
        { name: "Stride: A/B drills", duration: "6 min", focus: "technique" },
        { name: "Starts: falling + drive", duration: "6 min", focus: "explosiveness" },
        { name: "Turns: curve control", duration: "6 min", focus: "economy" }
      ]
    };
    return map[sport] || map.basketball;
  }

  // ---------- Injury-friendly templates (per sport) ----------
  // Each returns a full session template tailored to common injuries.
  function injuryFriendlyTemplate({ sport, injury, level }) {
    // injury: "knee"|"ankle"|"shoulder"|"back" or null
    // level: "standard"|"advanced"
    const base = {
      basketball: () => ({
        title: `Basketball — ${injury ? (injury+"-friendly") : "standard"} session`,
        blocks: [
          { title: "Warm-up", items: ["Breathing + light bike (5 min)", "T-spine + hip mobility (5 min)"] },
          { title: "Skill Microblock", items: skillMicroblocksFor("basketball").slice(0,2).map(x=>x.name) }
        ]
      }),
      football: () => ({
        title: `Football — ${injury ? (injury+"-friendly") : "standard"} session`,
        blocks: [
          { title: "Warm-up", items: ["Thoracic/hip mobility (6 min)", "Band lateral walks (2×20)"] },
          { title: "Route microblock", items: skillMicroblocksFor("football").map(x=>x.name) }
        ]
      }),
      soccer: () => ({
        title: `Soccer — ${injury ? (injury+"-friendly") : "standard"} session`,
        blocks: [
          { title: "Warm-up", items: ["Adductor flow + ankle mobility (6 min)"] },
          { title: "Ball microblock", items: skillMicroblocksFor("soccer").slice(0,2).map(x=>x.name) }
        ]
      }),
      baseball: () => ({
        title: `Baseball — ${injury ? (injury+"-friendly") : "standard"} session`,
        blocks: [
          { title: "Warm-up", items: ["Shoulder band rotations + sleeper stretch (6 min)", "Arm care throws (progressive)"] },
          { title: "Throwing microblock", items: skillMicroblocksFor("baseball").map(x=>x.name) }
        ]
      }),
      volleyball: () => ({
        title: `Volleyball — ${injury ? (injury+"-friendly") : "standard"} session`,
        blocks: [
          { title: "Warm-up", items: ["Ankle stability + band pull-aparts (6 min)"] },
          { title: "Jump prep microblock", items: skillMicroblocksFor("volleyball").map(x=>x.name) }
        ]
      }),
      track: () => ({
        title: `Track — ${injury ? (injury+"-friendly") : "standard"} session`,
        blocks: [
          { title: "Warm-up", items: ["Drills + mobility (8 min)"] },
          { title: "Start/stride microblock", items: skillMicroblocksFor("track").map(x=>x.name) }
        ]
      })
    };

    const template = (base[sport] || base.basketball)();
    // Adjust for specific injuries:
    if (injury === "knee") {
      // favor low-impact, strength > plyo
      template.blocks.push({ title: "Knee-friendly strength", items: ["RFESS (bodyweight to light)", "Swiss ball hamstring curls (eccentric)" ] });
    } else if (injury === "ankle") {
      template.blocks.push({ title: "Ankle-friendly work", items: ["Single-leg balance progression", "Isometric calf holds", "Pool or bike option"] });
    } else if (injury === "shoulder") {
      template.blocks.push({ title: "Shoulder prehab", items: ["Band external rotation", "Scap retraction + serratus work", "Avoid heavy overhead pressing"] });
    } else if (injury === "back") {
      template.blocks.push({ title: "Back-safe work", items: ["Hinge regressions: glute bridge", "Anti-extension core work (Pallof)", "Avoid heavy loaded flexion"] });
    } else {
      template.blocks.push({ title: "Strength / Conditioning", items: ["Trap bar deadlift (light to moderate)", "Load-managed conditioning: bike/row intervals"] });
    }

    if (level === "advanced") {
      template.blocks.push({ title: "Advanced microblock", items: ["Complex: medball + loaded carry superset", "Explosive eccentric pairings"] });
    } else {
      template.blocks.push({ title: "Accessory", items: ["Core stability", "Glute activation", "Calf maintenance"] });
    }

    return template;
  }

  // ---------- Session builder (exposed to Train UI) ----------
  function baseWarmupBlocks({ sport, sessionType, injuries }) {
    const inj = injuries || [];
    const universal = [
      "Breathing reset: 4 slow breaths (1 min)",
      "Tissue temp: brisk walk / light bike (2–3 min)",
      "Mobility: ankles + hips + T-spine (3–4 min)"
    ];
    const sportExtras = {
      basketball: ["Footwork: closeout slides (2×15s)"],
      football: ["Accel prep: falling starts (3×10yd)"],
      soccer: ["Groin/adductor flow (2×8/side)"],
      baseball: ["Throwing progression (light)"],
      volleyball: ["Approach footwork (3×3)"],
      track: ["Drill: A/B skips (2–3 min)"]
    };
    return [...universal, ...(sportExtras[sport] || sportExtras.basketball)];
  }

  // exercise library (small)
  function exerciseLibrary() {
    return {
      lower: [
        { name: "RFESS", avoid: ["knee"], subs: ["Step-up (box)"] },
        { name: "Trap Bar Deadlift", avoid: ["back"], subs: ["RDL (DB)"] }
      ],
      upper: [
        { name: "DB Bench (neutral)", avoid: ["shoulder"], subs: ["Landmine press"] },
        { name: "Chest-supported row", avoid: [], subs: ["Band row"] }
      ],
      power: [
        { name: "Medball rotational toss", avoid: ["shoulder"], subs: ["Scoop toss (light)"] }
      ]
    };
  }

  // ---------- Session log & small helper ----------
  function safeNum(x, d = 0) { const n = Number(x); return Number.isFinite(n) ? n : d; }
  function addSessionLog({ dateISO, sport, sessionType, level, minutes, srpe, injuries, planTitle }) {
    const id = `s_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    const mins = Math.max(0, Math.round(safeNum(minutes, 0)));
    const r = Math.max(0, Math.min(10, safeNum(srpe, 0)));
    const load = Math.round(mins * r);
    state.sessions.unshift({ id, date: dateISO, sport, sessionType, level, minutes: mins, srpe: r, load, injuries: injuries || [], planTitle });
    if (state.sessions.length > 400) state.sessions = state.sessions.slice(0, 400);
    persist("Session saved");
  }

  // Delete with undo
  function deleteSessionUndoable(id) {
    const idx = state.sessions.findIndex(s => s.id === id);
    if (idx < 0) return;
    const removed = state.sessions[idx];
    state.sessions.splice(idx, 1);
    persist(null, { silentToast: true });
    render("train");
    showUndoToast("Session deleted.", () => {
      state.sessions.splice(Math.min(idx, state.sessions.length), 0, removed);
      persist(null, { silentToast: true });
      render("train");
    });
  }

  // render session history
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
                <div style="font-weight:900">${(s.planTitle||s.sessionType||"session").toUpperCase()} • ${s.sport} • ${s.level}</div>
                <div class="small muted">${(s.date||"").slice(0,10)} • ${s.minutes} min • sRPE ${s.srpe} • Load ${s.load}</div>
              </div>
              <button class="btn danger" data-del="${s.id}" title="Delete (undo available)">Delete</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
    container.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); deleteSessionUndoable(btn.getAttribute("data-del")); });
    });
  }

  // ---------- Build session template UI helper ----------
  function buildSessionTemplateUI({ sport, sessionType, level, injuries, substitutionsOn }) {
    // injuries: []
    const inj = injuries || [];
    const template = injuryFriendlyTemplate({ sport, injury: inj[0] || null, level }); // pick first injury tag for template
    const warmup = baseWarmupBlocks({ sport, sessionType, injuries: inj });
    const micro = skillMicroblocksFor(sport);
    return { template, warmup, micro };
  }

  // ---------- Today single-button workflow ----------
  // Flow: Generate → Start timer → Log → Done
  let todayTimer = { running: false, startAt: null, elapsedMs: 0, timerId: null, generatedPlan: null };
  function todayGenerate() {
    const sport = state.profile?.sport || "basketball";
    const injuries = state.profile?.injuries || [];
    const level = state.profile?.level || "standard";
    const sessionType = "skill"; // default for Today plan - quick skill microblock + mobility
    const built = buildSessionTemplateUI({ sport, sessionType, level, injuries, substitutionsOn: true });
    todayTimer.generatedPlan = { sport, sessionType, level, plan: built.template, warmup: built.warmup, micro: built.micro.slice(0,2) };
    renderHome(); // refresh UI
    toast("Today plan generated");
    return todayTimer.generatedPlan;
  }
  function todayStart() {
    if (!todayTimer.generatedPlan) { todayGenerate(); }
    if (todayTimer.running) return;
    todayTimer.running = true;
    todayTimer.startAt = Date.now();
    todayTimer.timerId = setInterval(() => {
      todayTimer.elapsedMs = Date.now() - todayTimer.startAt;
      const secs = Math.floor(todayTimer.elapsedMs/1000);
      $("todayTimer").textContent = `Running • ${secs}s elapsed`;
    }, 800);
    toast("Timer started");
  }
  function todayLogAndDone() {
    if (!todayTimer.generatedPlan) { toast("No plan to log — generate first."); return; }
    if (!todayTimer.running) { // log with zero minutes if not started
      addSessionLog({
        dateISO: new Date().toISOString(),
        sport: todayTimer.generatedPlan.sport,
        sessionType: todayTimer.generatedPlan.sessionType,
        level: todayTimer.generatedPlan.level,
        minutes: 0,
        srpe: 0,
        injuries: state.profile?.injuries || [],
        planTitle: todayTimer.generatedPlan.plan.title || "Today (gen)"
      });
      toast("Logged (0 min)");
      todayTimer.generatedPlan = null;
      renderHome();
      return;
    }
    // stop timer and log
    clearInterval(todayTimer.timerId);
    todayTimer.running = false;
    const minutes = Math.max(0, Math.round((Date.now() - todayTimer.startAt)/60000));
    addSessionLog({
      dateISO: new Date().toISOString(),
      sport: todayTimer.generatedPlan.sport,
      sessionType: todayTimer.generatedPlan.sessionType,
      level: todayTimer.generatedPlan.level,
      minutes,
      srpe: 6,
      injuries: state.profile?.injuries || [],
      planTitle: todayTimer.generatedPlan.plan.title || "Today (gen)"
    });
    toast(`Logged ${minutes} min`);
    todayTimer.generatedPlan = null;
    $("todayTimer").textContent = `No timer running`;
    renderHome();
  }
  function todayButtonHandler() {
    // changes behavior depending on state
    if (!todayTimer.generatedPlan) {
      todayGenerate();
      $("todayButton").textContent = "Start timer";
      return;
    }
    if (!todayTimer.running) {
      todayStart();
      $("todayButton").textContent = "Done (log)";
      return;
    }
    // running -> log and done
    todayLogAndDone();
    $("todayButton").textContent = "Generate → Start → Log";
  }

  // ---------- Render Home with Today panel ----------
  function renderHome() {
    const role = state.profile?.role || "coach";
    const sport = state.profile?.sport || "basketball";
    const homeSub = $("homeSub");
    if (homeSub) homeSub.textContent = `${role} view • Sport: ${sport}`;

    const targets = window.nutritionEngine?.macroTargets
      ? window.nutritionEngine.macroTargets({
          weight_lbs: state.profile?.weight_lbs || 160,
          goal: state.profile?.goal || "maintain",
          activity: state.profile?.activity || "med"
        })
      : { calories: "—", protein_g: "—", carbs_g: "—", fat_g: "—" };

    const today = $("todayBlock");
    if (today) {
      const plan = todayTimer.generatedPlan;
      today.innerHTML = `
        <div class="small muted">Auto today plan + quick log</div>
        <div style="margin-top:8px" class="mono small">
          ${plan ? `<b>${plan.plan.title}</b><br/>${(plan.micro||[]).map(m=>m.name||m).join(" • ")}<br/>` : `No plan generated`}
        </div>
      `;
    }
    $("todayTimer") && ($("todayTimer").textContent = todayTimer.running ? "Running…" : "No timer running");
    // set button label according to state
    const btn = $("todayButton");
    if (btn) {
      if (!todayTimer.generatedPlan) btn.textContent = "Generate → Start → Log";
      else if (!todayTimer.running) btn.textContent = "Start timer";
      else btn.textContent = "Done (log)";
      btn.onclick = todayButtonHandler;
    }
  }

  // ---------- Render Team ----------
  function renderTeam() {
    const teams = state.team?.teams || [];
    const body = $("teamBody");
    if (!body) return;
    if (!teams.length) {
      body.innerHTML = `<div class="mini"><div class="minihead">No teams yet</div><div class="minibody">You can test locally. For shared teams + invites, enable Cloud in Account.</div></div>`;
      return;
    }
    body.innerHTML = `<div class="mini"><div class="minihead">Teams</div><div class="minibody">${teams.map(t=>`<div style="padding:8px 0;border-top:1px solid var(--line)"><b>${t.name}</b><div class="small muted">${t.sport||""}</div></div>`).join("")}</div></div>`;
  }

  // ---------- Render Train (session builder + injury templates) ----------
  function renderTrain() {
    const sport = state.profile?.sport || "basketball";
    const role = state.profile?.role || "coach";
    const trainSub = $("trainSub");
    if (trainSub) trainSub.textContent = (role === "coach") ? "Coach view: build today’s session template (then log sRPE load)." : "Athlete view: today’s plan + quick logging.";

    const body = $("trainBody");
    if (!body) return;

    const uiKey = "piq_train_ui_v2";
    const ui = (() => { try { return JSON.parse(localStorage.getItem(uiKey) || "null") || {}; } catch { return {}; } })();
    ui.sessionType = ui.sessionType || "strength";
    ui.level = ui.level || "standard";
    ui.subs = (typeof ui.subs === "boolean") ? ui.subs : true;
    ui.injuries = Array.isArray(ui.injuries) ? ui.injuries : [];

    function saveUI() { localStorage.setItem(uiKey, JSON.stringify(ui)); }

    const built = buildSessionTemplateUI({ sport, sessionType: ui.sessionType, level: ui.level, injuries: ui.injuries, substitutionsOn: ui.subs });

    // Injury-friendly templates selector
    const injuryTemplate = injuryFriendlyTemplate({ sport, injury: ui.injuries[0] || null, level: ui.level });

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

          <div class="field" style="margin-top:10px">
            <label>Injury / sensitivity filters</label>
            <div class="chips" id="piqInjuryChips">
              ${[["knee","Knee"],["ankle","Ankle"],["shoulder","Shoulder"],["back","Back"]].map(([k,label])=>`<label class="chip"><input type="checkbox" data-inj="${k}" ${ui.injuries.includes(k)?"checked":""} /><span>${label}</span></label>`).join("")}
            </div>
          </div>

          <div class="row between" style="margin-top:12px">
            <div class="small muted">Show substitutions</div>
            <label class="chip"><input type="checkbox" id="piqSubs" ${ui.subs?"checked":""} /><span>${ui.subs?"On":"Off"}</span></label>
          </div>

          <div class="hr"></div>

          <div class="minihead" style="margin-bottom:6px">Quick log (sRPE + minutes)</div>
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
              ${built.warmup.map(x=>`<li style="margin:8px 0">${x}</li>`).join("")}
            </ol>
          </div>
          <div style="margin-top:12px" class="minihead">Skill microblocks</div>
          <div class="minibody">
            <ol style="margin:0; padding-left:18px">
              ${built.micro.map(m=>`<li style="margin:8px 0">${m.name||m}</li>`).join("")}
            </ol>
          </div>
        </div>
      </div>

      <div class="mini" style="margin-top:12px">
        <div class="minihead">${injuryTemplate.title}</div>
        <div class="minibody">
          ${injuryTemplate.blocks.map(b=>`<div style="margin-top:10px"><div style="font-weight:900">${b.title}</div><ul>${b.items.map(it=>`<li>${it}</li>`).join("")}</ul></div>`).join("")}
        </div>
      </div>

      <div id="piqHistory" style="margin-top:12px"></div>
    `;

    const st = $("piqSessionType"), lv = $("piqLevel"), subs = $("piqSubs");
    if (st) st.value = ui.sessionType;
    if (lv) lv.value = ui.level;

    st?.addEventListener("change", () => { ui.sessionType = st.value; saveUI(); render("train"); });
    lv?.addEventListener("change", () => { ui.level = lv.value; saveUI(); render("train"); });
    subs?.addEventListener("change", () => { ui.subs = !!subs.checked; saveUI(); render("train"); });

    document.querySelectorAll("[data-inj]").forEach(cb => {
      cb.addEventListener("change", () => {
        const k = cb.getAttribute("data-inj");
        ui.injuries = ui.injuries || [];
        if (cb.checked) { if (!ui.injuries.includes(k)) ui.injuries.push(k); }
        else ui.injuries = ui.injuries.filter(x=>x!==k);
        saveUI();
        render("train");
      });
    });

    $("piqResetFilters")?.addEventListener("click", () => { ui.injuries=[]; ui.subs=true; saveUI(); render("train"); toast("Filters reset"); });

    $("piqSaveSession")?.addEventListener("click", () => {
      const mins = safeNum($("piqMinutes")?.value, 30);
      const srpe = safeNum($("piqSrpe")?.value, 6);
      addSessionLog({
        dateISO: new Date().toISOString(),
        sport,
        sessionType: ui.sessionType,
        level: ui.level,
        minutes: mins,
        srpe,
        injuries: ui.injuries,
        planTitle: `${sport} ${ui.sessionType} (${ui.level})`
      });
      render("train");
    });

    const hist = $("piqHistory");
    if (hist) renderSessionHistory(hist);
  }

  // ---------- Profile render ----------
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
          Injuries: <b>${(state.profile?.injuries||[]).join(", ") || "none"}</b><br/>
          <span class="small muted">Edit in Account → Role & Sport.</span>
        </div>
      </div>
      <div style="margin-top:12px">
        <div class="minihead">Profile quick actions</div>
        <div class="minibody">
          <button class="btn" id="btnAddInjury">Add injury tag</button>
        </div>
      </div>
    `;
    $("btnAddInjury")?.addEventListener("click", () => {
      const tag = prompt("Enter injury tag (knee|ankle|shoulder|back)");
      if (!tag) return;
      state.profile.injuries = state.profile.injuries || [];
      if (!state.profile.injuries.includes(tag)) state.profile.injuries.push(tag);
      persist("Injury added");
      renderProfile();
    });
  }

  // ---------- Render dispatcher ----------
  const renderMap = { home: renderHome, team: renderTeam, train: renderTrain, profile: renderProfile };
  function render(view) { setTeamPill(); renderMap[view]?.(); applyStatusFromMeta(); }

  // ---------- Cloud (kept best-effort, non-blocking) ----------
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
    try { const { data } = await sb.auth.getSession(); pill.textContent = data?.session ? "Cloud: Signed in" : "Cloud: Ready"; } catch { pill.textContent = "Cloud: Ready"; }
  }

  // ---------- Cloud push/pull (kept) ----------
  function isMissingRelationError(err) { const m = String(err?.message || err || ""); return m.includes("Could not find the table") || m.includes("relation") || m.includes("schema cache"); }
  async function pushToCloud() {
    const syncMsg = $("syncMsg"); if (syncMsg) syncMsg.textContent = "Syncing…"; setDataStatus("syncing");
    const { data: sess } = sb ? await sb.auth.getSession() : { data: null };
    if (!sess?.session) { applyStatusFromMeta(); return; }
    try {
      const updatedAt = new Date().toISOString();
      const { error } = await sb.from("piq_user_state").upsert({ user_id: sess.session.user.id, state, updated_at: updatedAt }, { onConflict: "user_id" });
      if (error) throw error;
      meta.lastCloudSyncAt = updatedAt; meta.syncState = "synced"; saveMeta(meta);
      if (syncMsg) syncMsg.textContent = "Synced.";
      toast("Cloud sync complete"); setDataStatus("synced", timeAgo(meta.lastCloudSyncAt));
    } catch {
      meta.syncState = "error"; saveMeta(meta);
      if (syncMsg) syncMsg.textContent = "Sync failed. Local mode still works.";
      toast("Sync failed (local mode still works)"); setDataStatus("error");
    }
    await refreshCloudPill();
  }
  async function pullFromCloud() {
    const syncMsg = $("syncMsg"); if (syncMsg) syncMsg.textContent = "Syncing…"; setDataStatus("syncing");
    const { data: sess } = sb ? await sb.auth.getSession() : { data: null };
    if (!sess?.session) { applyStatusFromMeta(); return; }
    try {
      const { data, error } = await sb.from("piq_user_state").select("state").eq("user_id", sess.session.user.id).maybeSingle();
      if (error) throw error;
      if (data?.state) {
        const prev = JSON.parse(JSON.stringify(state));
        state = data.state;
        state.sessions = Array.isArray(state.sessions) ? state.sessions : [];
        persist(null, { silentToast: true });
        showUndoToast("Pulled from cloud.", () => { state = prev; persist(null, { silentToast: true }); render(state.ui?.view || "home"); });
        render(state.ui.view || "home");
      }
      meta.lastCloudSyncAt = new Date().toISOString(); meta.syncState = "synced"; saveMeta(meta);
      if (syncMsg) syncMsg.textContent = "Updated."; toast("Pulled from cloud"); setDataStatus("synced", timeAgo(meta.lastCloudSyncAt));
    } catch {
      meta.syncState = "error"; saveMeta(meta);
      if (syncMsg) syncMsg.textContent = "Pull failed. Local mode still works.";
      toast("Pull failed (local mode still works)"); setDataStatus("error");
    }
    await refreshCloudPill();
  }

  function applyStatusFromMeta() {
    const cfg = loadCloudCfg();
    if (!cfg || !cfg.url || !cfg.anon) { setDataStatus("off"); return; }
    if (!sb) { setDataStatus("error"); return; }
    if (meta.syncState === "synced" && meta.lastCloudSyncAt) setDataStatus("synced", timeAgo(meta.lastCloudSyncAt));
    else if (meta.syncState === "syncing") setDataStatus("syncing");
    else setDataStatus("local", timeAgo(meta.lastLocalSaveAt));
  }

  // ---------- Confirm reset modal ----------
  function openHardResetModal(onConfirm) {
    const overlay = document.createElement("div");
    overlay.className = "piq-confirm-backdrop";
    overlay.innerHTML = `
      <div class="piq-confirm" role="dialog" aria-modal="true" aria-label="Confirm reset">
        <div class="piq-confirm-head">
          <div class="piq-confirm-title" style="color:var(--danger)">Seed Demo / Reset (Danger)</div>
          <div class="piq-confirm-sub">This clears local data on this device. Cloud data is NOT deleted.</div>
        </div>
        <div class="piq-confirm-body">
          <div class="piq-confirm-steps">
            <div class="small muted" style="margin-bottom:10px">Step 1: Read. Step 2: Type <b>RESET</b>. Step 3: Check the final box.</div>
            <div class="mini" style="margin-bottom:10px"><div class="minihead">Warning</div><div class="minibody">• Local sessions & preferences will be removed. • Cloud remains untouched. Export first if you want a backup.</div></div>
            <div class="field"><label>Type RESET to confirm</label><input id="piqResetType" type="text" placeholder="RESET" /></div>
            <label class="chip" style="margin-top:10px; width:100%"><input id="piqResetCheck" type="checkbox" /><span>I understand all local data will be lost</span></label>
            <div class="row between" style="margin-top:12px"><button class="btn ghost" id="piqResetCancel">Cancel</button><button class="btn danger" id="piqResetDo" disabled>Reset now</button></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const type = overlay.querySelector("#piqResetType");
    const chk = overlay.querySelector("#piqResetCheck");
    const btn = overlay.querySelector("#piqResetDo");
    const cancel = overlay.querySelector("#piqResetCancel");
    function update() { btn.disabled = ((type.value||"").trim().toUpperCase() !== "RESET") || !chk.checked; }
    type.addEventListener("input", update); chk.addEventListener("change", update);
    cancel.addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    btn.addEventListener("click", () => { overlay.remove(); onConfirm?.(); });
  }

  // ---------- Data management: export/import/reset ----------
  function exportFile(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function resetLocalWithUndo() {
    const prev = JSON.parse(JSON.stringify(state));
    try {
      localStorage.removeItem("piq_local_state_v2");
      state = window.dataStore.load();
      persist(null, { silentToast: true });
      render("home");
      showUndoToast("Local data reset.", () => { state = prev; persist(null, { silentToast: true }); render(state.ui?.view || "home"); });
      toast("Reset complete");
    } catch { toast("Reset failed"); }
  }
  function importJSONWithUndo(text) {
    const prev = JSON.parse(JSON.stringify(state));
    try {
      window.dataStore.importJSON(text);
      state = window.dataStore.load();
      persist(null, { silentToast: true });
      render("home");
      showUndoToast("Import complete (overwrote local).", () => { state = prev; persist(null, { silentToast: true }); render(state.ui?.view || "home"); });
      toast("Imported");
    } catch { toast("Import failed"); }
  }

  // ---------- Bindings ----------
  function bindNav() {
    document.querySelectorAll("[data-view]").forEach(btn => { if (btn.classList.contains("navbtn") || btn.classList.contains("tab")) btn.addEventListener("click", () => showView(btn.dataset.view)); });
    $("qaTrain")?.addEventListener("click", () => showView("train"));
    $("qaTeam")?.addEventListener("click", () => showView("team"));
  }
  function bindDrawer() {
    $("btnAccount")?.addEventListener("click", openDrawer);
    $("btnCloseDrawer")?.addEventListener("click", closeDrawer);
    $("drawerBackdrop")?.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  }
  function openDrawer() { const backdrop = $("drawerBackdrop"); const drawer = $("accountDrawer"); if (!backdrop || !drawer) return; backdrop.hidden=false; drawer.classList.add("open"); drawer.setAttribute("aria-hidden","false"); }
  function closeDrawer() { const backdrop = $("drawerBackdrop"); const drawer = $("accountDrawer"); if (!backdrop || !drawer) return; backdrop.hidden=true; drawer.classList.remove("open"); drawer.setAttribute("aria-hidden","true"); }

  function bindAccountControls() {
    const roleSelect = $("roleSelect"); const sportSelect = $("sportSelect");
    if (roleSelect) roleSelect.value = state.profile?.role || "coach";
    if (sportSelect) sportSelect.value = state.profile?.sport || "basketball";

    $("btnSaveProfile")?.addEventListener("click", () => {
      state.profile.role = roleSelect?.value || state.profile.role || "coach";
      state.profile.sport = sportSelect?.value || state.profile.sport || "basketball";
      persist("Preferences saved"); render(state.ui.view || "home");
    });

    $("btnRunTour")?.addEventListener("click", runTourForCurrentTab);

    const cfg = loadCloudCfg();
    if (cfg?.url) { const el = $("sbUrl"); if (el) el.value = cfg.url; }
    if (cfg?.anon) { const el = $("sbAnon"); if (el) el.value = cfg.anon; }

    $("btnSaveCloud")?.addEventListener("click", async () => {
      const url = ($("sbUrl")?.value || "").trim(); const anon = ($("sbAnon")?.value || "").trim(); const cloudMsg = $("cloudMsg");
      if (!validSupabaseUrl(url) || !anon) { if (cloudMsg) cloudMsg.textContent = "Cloud setup failed. (Local mode still works.)"; setDataStatus("off"); return; }
      saveCloudCfg({ url, anon }); if (cloudMsg) cloudMsg.textContent = "Cloud settings saved."; sb = initSupabaseIfPossible();
      await refreshCloudPill(); applyStatusFromMeta(); toast("Cloud saved");
    });

    $("btnTestCloud")?.addEventListener("click", cloudTest);
    $("btnSignIn")?.addEventListener("click", signIn);
    $("btnSignUp")?.addEventListener("click", signUp);
    $("btnSignOut")?.addEventListener("click", signOut);
    $("btnPush")?.addEventListener("click", pushToCloud);
    $("btnPull")?.addEventListener("click", pullFromCloud);

    $("btnHelp")?.addEventListener("click", () => { toast("Tip: Data Management is in Account. Destructive actions have Undo.", 2800); });

    // Data management
    $("btnExport")?.addEventListener("click", () => {
      try {
        const json = window.dataStore.exportJSON();
        exportFile(`performanceiq-export-${new Date().toISOString().slice(0,10)}.json`, json);
        $("dataMsg") && ($("dataMsg").textContent = "Exported JSON file.");
        toast("Exported");
      } catch { $("dataMsg") && ($("dataMsg").textContent = "Export failed."); toast("Export failed"); }
    });

    $("fileImport")?.addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      try { const text = await f.text(); importJSONWithUndo(text); $("dataMsg") && ($("dataMsg").textContent = "Imported (Undo available)."); } catch { $("dataMsg") && ($("dataMsg").textContent = "Import failed."); } finally { e.target.value = ""; }
    });

    $("btnResetLocal")?.addEventListener("click", () => {
      openHardResetModal(() => { resetLocalWithUndo(); $("dataMsg") && ($("dataMsg").textContent = "Reset performed (Undo available)."); });
    });

    // QA grade
    $("btnRunGrade")?.addEventListener("click", () => {
      const report = runQaGrade();
      $("gradeReport").textContent = report.summary;
      console.log("QA GRADE REPORT", report);
    });
  }

  // ---------- Auth helpers (kept minimal) ----------
  async function cloudTest() {
    const msg = $("cloudMsg");
    if (!sb) { if (msg) msg.textContent = "Cloud is off (local-only)."; setDataStatus("off"); return; }
    try { const { data, error } = await sb.auth.getSession(); if (error) throw error; if (msg) msg.textContent = data?.session ? "Cloud OK (signed in)." : "Cloud OK (sign in to sync)."; setDataStatus("local"); } catch { if (msg) msg.textContent = "Cloud test failed. (Local mode still works.)"; setDataStatus("error"); } await refreshCloudPill();
  }
  function getAuthCredentials() { const email = ($("authEmail")?.value || "").trim(); const pass = ($("authPass")?.value || "").trim(); return { email, pass }; }
  async function signIn() {
    const authMsg = $("authMsg"); if (!sb) { if (authMsg) authMsg.textContent = "Cloud is off. Use Cloud setup first."; return; }
    const { email, pass } = getAuthCredentials(); if (!email || !pass) { if (authMsg) authMsg.textContent = "Enter email + password."; return; }
    try { const { error } = await sb.auth.signInWithPassword({ email, password: pass }); if (error) throw error; if (authMsg) authMsg.textContent = "Signed in."; toast("Signed in"); } catch { if (authMsg) authMsg.textContent = "Sign in failed."; toast("Sign in failed"); } await refreshCloudPill(); applyStatusFromMeta();
  }
  async function signUp() {
    const authMsg = $("authMsg"); if (!sb) { if (authMsg) authMsg.textContent = "Cloud is off. Use Cloud setup first."; return; }
    const { email, pass } = getAuthCredentials(); if (!email || !pass) { if (authMsg) authMsg.textContent = "Enter email + password."; return; }
    try { const { error } = await sb.auth.signUp({ email, password: pass }); if (error) throw error; if (authMsg) authMsg.textContent = "Account created. Sign in."; toast("Account created"); } catch { if (authMsg) authMsg.textContent = "Could not create account."; toast("Sign up failed"); } await refreshCloudPill();
  }
  async function signOut() {
    const authMsg = $("authMsg"); if (!sb) return; try { await sb.auth.signOut(); } catch {} if (authMsg) authMsg.textContent = "Signed out."; toast("Signed out"); await refreshCloudPill(); applyStatusFromMeta();
  }

  // ---------- Tours (kept lightweight) ----------
  const toursKey = "piq_tours_v2";
  function loadTours() { try { return JSON.parse(localStorage.getItem(toursKey) || "null") || {}; } catch { return {}; } }
  function saveTours(t) { localStorage.setItem(toursKey, JSON.stringify(t || {})); }
  let tours = loadTours();
  function tourScript(role, tab) {
    const scripts = {
      home: { coach: "Home: phase + nutrition targets + Today workflow.", athlete: "Home: your snapshot + quick Today workflow.", parent: "Home: quick view of targets and training direction." },
      team: { coach: "Team: roster + access.", athlete: "Team: join team (cloud) when enabled.", parent: "Team: see team context." },
      train: { coach: "Train: choose session type + filters + log sRPE load.", athlete: "Train: follow plan and save your session.", parent: "Train: see plan and what it trains." },
      profile: { coach: "Profile: preferences + injuries.", athlete: "Profile: preferences + injuries.", parent: "Profile: preferences + injuries." }
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
    const active = document.querySelector(".navbtn.active")?.dataset.view || document.querySelector(".bottomnav .tab.active")?.dataset.view || state.ui.view || "home";
    const role = state.profile?.role || "coach";
    toast(tourScript(role, active), 2600);
  }

  // ---------- Onboarding ----------
  function ensureRoleOnboarding() {
    if (state.profile?.role && state.profile?.sport) return;
    const overlay = document.createElement("div");
    overlay.className = "piq-modal-backdrop";
    overlay.innerHTML = `
      <div class="piq-modal" role="dialog" aria-modal="true" aria-label="Choose role">
        <div class="piq-modal-head"><div class="piq-modal-title">Welcome to PerformanceIQ</div><div class="piq-modal-sub">Choose your role and sport to personalize the app.</div></div>
        <div class="piq-modal-body">
          <div class="field"><label>Role</label><select id="piqRolePick"><option value="coach">Coach</option><option value="athlete">Athlete</option><option value="parent">Parent</option></select></div>
          <div class="field" style="margin-top:10px"><label>Sport</label><select id="piqSportPick"><option value="basketball">Basketball</option><option value="football">Football</option><option value="soccer">Soccer</option><option value="baseball">Baseball</option><option value="volleyball">Volleyball</option><option value="track">Track</option></select></div>
          <div class="row between" style="margin-top:14px"><div class="small muted">You can change this anytime in Account.</div><div class="row gap"><button class="btn ghost" id="piqSkipBtn">Skip</button><button class="btn" id="piqStartBtn">Continue</button></div></div>
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
    function finish() { persist("Preferences saved"); overlay.remove(); autoTourFor("home"); showView("home"); }
    btn.addEventListener("click", () => { state.profile.role = roleSel.value; state.profile.sport = sportSel.value; finish(); });
    skip.addEventListener("click", () => { state.profile.role = state.profile.role || roleSel.value || "coach"; state.profile.sport = state.profile.sport || sportSel.value || "basketball"; finish(); });
  }

  // ---------- Boot ----------
  function boot() {
    sb = initSupabaseIfPossible();
    bindNav(); bindDrawer(); bindAccountControls();
    setTeamPill(); refreshCloudPill();
    const cfg = loadCloudCfg();
    if (!cfg || !cfg.url || !cfg.anon) setDataStatus("off");
    else if (!sb) setDataStatus("error");
    else setDataStatus("local", timeAgo(meta.lastLocalSaveAt));
    ensureRoleOnboarding();
    const initial = state.ui?.view || "home";
    showView(initial);
    startAutosave();
    hideSplash();
  }

  function hideSplash() { const s = $("splash"); if (!s) return; s.classList.add("hidden"); setTimeout(() => s.setAttribute("aria-hidden","true"), 250); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  // ---------- QA grader (small automated checks) ----------
  function runQaGrade() {
    const issues = [];
    // P0 items
    // 1) Data Management in drawer
    if (!$("btnExport") || !$("fileImport") || !$("btnResetLocal")) issues.push("Data Management controls missing");
    // 2) Undo toast element exists
    if (!$("undoToast")) issues.push("Undo toast element missing");
    // 3) Autosave timer running
    if (!autosaveTimer) issues.push("Autosave not active");
    // 4) Today workflow hooks
    if (!$("todayButton") || !$("todayTimer")) issues.push("Today workflow UI missing");
    // 5) Skill microblocks exist for selected sport
    const sport = state.profile?.sport || "basketball";
    const micro = skillMicroblocksFor(sport);
    if (!micro || !micro.length) issues.push("Skill microblocks missing for sport: " + sport);
    // 6) Injury templates exist
    const tpl = injuryFriendlyTemplate({ sport, injury: null, level: "standard" });
    if (!tpl || !tpl.blocks || !tpl.blocks.length) issues.push("Injury-friendly templates missing for sport: " + sport);

    // Grade logic
    const passed = (issues.length === 0);
    const grade = passed ? "A" : (issues.length <= 2 ? "B" : "C");
    const summary = passed ? "PASS — Grade A: all checks OK" : `WARN — Grade ${grade}: ${issues.length} issue(s): ${issues.join("; ")}`;
    return { grade, summary, issues, timestamp: new Date().toISOString() };
  }

  // expose small helpers for testing in console
  window.__PIQ = window.__PIQ || {};
  window.__PIQ.runQaGrade = runQaGrade;
  window.__PIQ.today = { generate: todayGenerate, start: todayStart, log: todayLogAndDone };
})();
