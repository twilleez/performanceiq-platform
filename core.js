// core.js — v2.2.0 (Train upgrade: interactive strength library + std/adv + save sessions + sRPE load + sport tailoring)
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
  state.training_sessions = Array.isArray(state.training_sessions) ? state.training_sessions : [];

  // ---------- Local meta for UX ----------
  const metaKey = "piq_meta_v2";
  function loadMeta() { try { return JSON.parse(localStorage.getItem(metaKey) || "null") || {}; } catch { return {}; } }
  function saveMeta(m) { localStorage.setItem(metaKey, JSON.stringify(m || {})); }
  let meta = loadMeta();
  meta.lastLocalSaveAt = meta.lastLocalSaveAt || null;
  meta.lastCloudSyncAt = meta.lastCloudSyncAt || null;
  meta.syncState = meta.syncState || "off"; // off|ready|syncing|synced|error
  saveMeta(meta);

  // ---------- Cloud config ----------
  const cloudKey = "piq_cloud_v2";
  function loadCloudCfg() { try { return JSON.parse(localStorage.getItem(cloudKey) || "null"); } catch { return null; } }
  function saveCloudCfg(cfg) { localStorage.setItem(cloudKey, JSON.stringify(cfg)); }

  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 860px)").matches;
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function toast(msg, ms = 2200) {
    const t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  // ---------- Data status pill ----------
  function setDataStatus(kind, detail) {
    const dot = $("saveDot");
    const txt = $("saveText");
    if (!dot || !txt) return;

    const map = {
      local:   { label: "Local saved", color: "var(--ok)" },
      saving:  { label: "Saving…",     color: "var(--warn)" },
      syncing: { label: "Syncing…",    color: "var(--brand)" },
      synced:  { label: "Synced",      color: "var(--ok)" },
      off:     { label: "Sync off",    color: "rgba(255,255,255,.35)" },
      error:   { label: "Sync error",  color: "var(--danger)" }
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

  // ---------- Navigation ----------
  const views = ["home", "team", "train", "profile"];

  function setActiveNav(view) {
    document.querySelectorAll(".navbtn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
      btn.setAttribute("aria-current", btn.dataset.view === view ? "page" : "false");
    });
    document.querySelectorAll(".bottomnav .tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
      btn.setAttribute("aria-current", btn.dataset.view === view ? "page" : "false");
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

  // ---------- Drawer ----------
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

  // ---------- Supabase ----------
  let sb = null;
  function validSupabaseUrl(u) {
    return typeof u === "string" && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(u.trim());
  }
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

  // ---------- Team pill ----------
  function setTeamPill() {
    const pill = $("teamPill");
    if (!pill) return;
    const teamName = (state.team?.teams || []).find(t => t.id === state.team?.active_team_id)?.name;
    pill.textContent = `Team: ${teamName || "—"}`;
  }

  // ---------- Helpers ----------
  function uid() {
    return "id_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function clamp(n, a, b) { n = Number(n); if (!isFinite(n)) n = a; return Math.min(b, Math.max(a, n)); }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  function getWeekIndexFrom(dateISO) {
    // week count since Jan 1 (simple, stable; can be replaced later)
    const d = new Date(dateISO + "T00:00:00");
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = Math.floor((d - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diff / 7) + 1);
  }

  function getPhaseLabel(dateISO) {
    const week = getWeekIndexFrom(dateISO);
    const p = window.periodizationEngine?.getCurrentPhase ? window.periodizationEngine.getCurrentPhase(week) : null;
    return p || "ACCUMULATION";
  }

  function phaseIntensityHint(phase) {
    const map = {
      ACCUMULATION: "Build volume • technique focus",
      INTENSIFICATION: "Heavier • lower volume",
      DELOAD: "Reduce load • recover",
      PEAK: "Sharp • explosive"
    };
    return map[phase] || "Training phase";
  }

  // ---------- Sport Strength Library ----------
  // Philosophy (practical): movement patterns + sport-specific emphasis:
  // - Lower: squat/hinge/single-leg
  // - Upper: push/pull + shoulder health
  // - Power: jump/throw/olympic-derivative
  // - Trunk: anti-rotation/anti-extension
  // Standard = simpler; Advanced = more complex/higher intensity.
  function strengthLibrary(sport) {
    const common = {
      lower: [
        { key:"split_squat", name:"Rear-Foot Elevated Split Squat", cue:"Knee tracks toes • torso tall" },
        { key:"front_squat", name:"Front Squat (or Goblet)", cue:"Brace • full depth control" },
        { key:"trap_bar", name:"Trap Bar Deadlift (or DB RDL)", cue:"Hips back • drive floor" },
        { key:"rdl", name:"Romanian Deadlift", cue:"Hamstrings • neutral spine" },
        { key:"step_up", name:"Step-Ups (knee drive)", cue:"Full foot • controlled down" },
        { key:"calf_iso", name:"Calf Isometrics + Tib Raises", cue:"Stiff ankle • jump health" }
      ],
      upper: [
        { key:"bench", name:"Bench Press (or DB Press)", cue:"Shoulders packed • controlled" },
        { key:"oh_press", name:"Overhead Press (or Landmine)", cue:"Ribs down • glutes tight" },
        { key:"row", name:"Chest-Supported Row", cue:"Pull elbows • squeeze back" },
        { key:"pullup", name:"Pull-ups (or Lat Pulldown)", cue:"Full hang • no swing" },
        { key:"facepull", name:"Face Pulls / Band Pull-Aparts", cue:"Scap health • posture" },
        { key:"carry", name:"Farmer Carries", cue:"Tall posture • slow steps" }
      ],
      power: [
        { key:"mb_slam", name:"Med Ball Slams", cue:"Fast intent • full body" },
        { key:"mb_throw", name:"Med Ball Chest Pass", cue:"Explode • stick landing" },
        { key:"box_jump", name:"Box Jump (or Snap Down)", cue:"Land quiet • knee control" },
        { key:"broad_jump", name:"Broad Jump", cue:"Swing arms • stick landing" },
        { key:"pogo", name:"Pogo Hops (stiffness)", cue:"Quick contacts • tall" }
      ],
      trunk: [
        { key:"pallof", name:"Pallof Press", cue:"Anti-rotation • ribs down" },
        { key:"deadbug", name:"Dead Bug", cue:"Low back stays down" },
        { key:"side_plank", name:"Side Plank", cue:"Stack hips • long line" },
        { key:"anti_ext", name:"Ab Wheel / Body Saw", cue:"No sag • brace" }
      ]
    };

    const sportMods = {
      basketball: {
        focus: ["Jump power", "Single-leg strength", "Ankle/foot stiffness", "Deceleration"],
        add: {
          lower: [
            { key:"skater_squat", name:"Skater Squat (assisted)", cue:"Knee control • balance" }
          ],
          power: [
            { key:"approach_jump", name:"Approach Jumps (3–5 reps)", cue:"Max intent • full rest" },
            { key:"decel_drop", name:"Decel Drops (low box)", cue:"Soft land • hips back" }
          ]
        }
      },
      football: {
        focus: ["Acceleration", "Hip power", "Upper strength", "Neck/shoulder resilience"],
        add: {
          upper: [
            { key:"incline_db", name:"Incline DB Press", cue:"Drive up • stable" }
          ],
          power: [
            { key:"sled_push", name:"Sled Push (if available)", cue:"45° angle • drive" }
          ]
        }
      },
      soccer: {
        focus: ["Hamstring resilience", "Adductor strength", "Repeat sprint", "Single-leg control"],
        add: {
          lower: [
            { key:"nordic", name:"Nordic Curl (regression)", cue:"Slow eccentric" },
            { key:"copenhagens", name:"Copenhagen Plank (adductors)", cue:"Short lever first" }
          ]
        }
      },
      baseball: {
        focus: ["Rotational power", "Shoulder health", "Hip-shoulder separation", "Sprint bursts"],
        add: {
          power: [
            { key:"mb_rot", name:"Med Ball Rotational Throws", cue:"Rotate fast • brace" }
          ],
          upper: [
            { key:"scap_push", name:"Scap Push-ups", cue:"Protract/retract control" },
            { key:"cuff", name:"External Rotations (band/cable)", cue:"Elbow tucked • slow" }
          ]
        }
      },
      volleyball: {
        focus: ["Jump volume tolerance", "Landing mechanics", "Shoulder health", "Lateral power"],
        add: {
          power: [
            { key:"block_jump", name:"Block Jumps (3–5 reps)", cue:"Quick hands • soft land" },
            { key:"lat_bounds", name:"Lateral Bounds", cue:"Stick landing • control" }
          ],
          upper: [
            { key:"yb_t", name:"Y/T Raises (lower traps)", cue:"Light • perfect form" }
          ]
        }
      },
      track: {
        focus: ["Max velocity", "Posterior chain", "Stiffness", "Elastic power"],
        add: {
          lower: [
            { key:"hip_thrust", name:"Hip Thrust", cue:"Full lockout • ribs down" }
          ],
          power: [
            { key:"bounds", name:"Bounding (low volume)", cue:"Elastic • tall posture" }
          ]
        }
      }
    };

    const mod = sportMods[sport] || sportMods.basketball;

    // merge safely
    const lib = JSON.parse(JSON.stringify(common));
    Object.keys(mod.add || {}).forEach(cat => {
      lib[cat] = (lib[cat] || []).concat(mod.add[cat]);
    });

    return { focus: mod.focus, lib };
  }

  // ---------- Strength prescriptions ----------
  function prescriptionFor(exKey, difficulty, phase) {
    // Defaults by difficulty + phase (simple but realistic):
    // Standard: 3x6-10, Advanced: 4-5x3-6 for main lifts depending on phase.
    const isDeload = phase === "DELOAD";
    const isPeak = phase === "PEAK";
    const adv = difficulty === "advanced";

    // main-lift style keys
    const main = ["front_squat","trap_bar","rdl","bench","oh_press","pullup","row","hip_thrust","incline_db"];
    const power = ["box_jump","broad_jump","pogo","mb_slam","mb_throw","mb_rot","approach_jump","block_jump","lat_bounds","bounds","sled_push","decel_drop"];

    if (power.includes(exKey)) {
      const reps = isDeload ? "2–3 reps" : (isPeak ? "2–4 reps" : "3–5 reps");
      const sets = adv ? (isDeload ? 2 : 3) : (isDeload ? 2 : 3);
      return { sets, reps, note: "Max intent • full rest" };
    }

    if (main.includes(exKey)) {
      if (isDeload) return { sets: adv ? 2 : 2, reps: adv ? "3–5" : "5–8", note: "Easy quality • leave reps in tank" };
      if (isPeak)   return { sets: adv ? 3 : 3, reps: adv ? "3–5" : "4–6", note: "Fast reps • crisp technique" };
      // accumulation/intensification: keep simple
      return adv
        ? { sets: 4, reps: phase === "INTENSIFICATION" ? "3–6" : "4–8", note: "Heavy but clean • stop before grind" }
        : { sets: 3, reps: phase === "INTENSIFICATION" ? "4–6" : "6–10", note: "Smooth reps • full range" };
    }

    // accessory / trunk
    if (isDeload) return { sets: 2, reps: "8–12", note: "Light • perfect reps" };
    return adv
      ? { sets: 3, reps: "8–15", note: "Controlled tempo • no sloppy reps" }
      : { sets: 2, reps: "10–15", note: "Easy quality • feel the target muscle" };
  }

  // ---------- Rendering ----------
  function renderHome() {
    const role = state.profile?.role || "coach";
    const sport = state.profile?.sport || "basketball";
    const subMap = {
      coach: `Coach view • Sport: ${sport}`,
      athlete: `Athlete view • Sport: ${sport}`,
      parent: `Parent view • Sport: ${sport}`
    };
    const homeSub = $("homeSub");
    if (homeSub) homeSub.textContent = subMap[role] || subMap.coach;

    const targets = window.nutritionEngine?.macroTargets
      ? window.nutritionEngine.macroTargets({
          weight_lbs: state.profile?.weight_lbs || 160,
          goal: state.profile?.goal || "maintain",
          activity: state.profile?.activity || "med"
        })
      : { calories: "—", protein_g: "—", carbs_g: "—", fat_g: "—" };

    const today = $("todayBlock");
    if (today) {
      today.innerHTML = `
        <div class="small muted">Nutrition targets (auto)</div>
        <div style="margin-top:8px" class="mono small">
          Calories: ${targets.calories}<br/>
          Protein: ${targets.protein_g}g • Carbs: ${targets.carbs_g}g • Fat: ${targets.fat_g}g
        </div>
        <hr class="sep"/>
        <div class="small muted">Today’s training</div>
        <div class="mono small" style="margin-top:8px">
          Sport: ${sport}<br/>
          Phase: ${getPhaseLabel(todayISO())}
        </div>
      `;
    }
  }

  function renderTeam() {
    const teams = state.team?.teams || [];
    const body = $("teamBody");
    if (!body) return;

    if (!teams.length) {
      body.innerHTML = `
        <div class="mini">
          <div class="minihead">No teams yet</div>
          <div class="minibody">You can test locally. For shared teams + invites, enable Cloud in Account.</div>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div class="mini">
        <div class="minihead">Teams</div>
        <div class="minibody">
          ${teams.map(t => `
            <div class="row between" style="padding:8px 0; border-top: 1px solid var(--line)">
              <div><b>${t.name}</b><div class="small muted">${t.sport || ""}</div></div>
              <button class="btn ghost" data-setteam="${t.id}">Set Active</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    body.querySelectorAll("[data-setteam]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.team.active_team_id = btn.getAttribute("data-setteam");
        persist("Team updated");
        setTeamPill();
        toast("Active team updated");
      });
    });
  }

  // ---- Train: interactive, expand/collapse, logging ----
  function renderTrain() {
    const sport = state.profile?.sport || "basketball";
    const role = state.profile?.role || "coach";
    const date = todayISO();
    const phase = getPhaseLabel(date);

    const libPack = strengthLibrary(sport);
    const focus = libPack.focus || [];
    const lib = libPack.lib || {};
    const trainSub = $("trainSub");
    if (trainSub) {
      const subMap = {
        coach: "Coach view: build a session template + save a team session.",
        athlete: "Athlete view: follow the session and log your effort.",
        parent: "Parent view: see what training includes today."
      };
      trainSub.textContent = subMap[role] || subMap.coach;
    }

    const body = $("trainBody");
    if (!body) return;

    // difficulty stored per user
    state.profile.train_level = state.profile.train_level || "standard";

    // last sessions for this sport
    const recent = (state.training_sessions || [])
      .filter(s => s && s.sport === sport)
      .slice()
      .sort((a,b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 6);

    body.innerHTML = `
      <div class="mini">
        <div class="minihead">Today’s focus</div>
        <div class="chips">
          ${focus.map(x => `<span class="chip">${x}</span>`).join("")}
          <span class="chip">Phase: ${phase}</span>
        </div>
        <div class="small muted" style="margin-top:10px">${phaseIntensityHint(phase)}</div>
      </div>

      <div class="mini" style="margin-top:12px">
        <div class="row between wrap gap">
          <div>
            <div class="minihead">Strength library</div>
            <div class="small muted">Tap an exercise to see sets/reps + cues. Add to session.</div>
          </div>

          <div class="row gap wrap">
            <div class="toggle" role="tablist" aria-label="Training level">
              <button id="lvlStd" type="button" class="${state.profile.train_level === "standard" ? "active" : ""}">Standard</button>
              <button id="lvlAdv" type="button" class="${state.profile.train_level === "advanced" ? "active" : ""}">Advanced</button>
            </div>
            <button class="btn ghost" id="btnClearDraft" type="button">Clear draft</button>
          </div>
        </div>

        <div id="strengthAcc" class="acc" style="margin-top:10px"></div>
      </div>

      <div class="mini" style="margin-top:12px" id="draftWrap">
        <div class="row between wrap gap">
          <div>
            <div class="minihead">Session draft</div>
            <div class="small muted">Build today’s session by adding exercises.</div>
          </div>
          <div class="row gap wrap">
            <button class="btn ghost" id="btnAutoBuild" type="button">Auto-build</button>
          </div>
        </div>

        <div id="draftList" style="margin-top:10px"></div>

        <hr class="sep"/>

        <div class="grid2">
          <div class="field">
            <label>Minutes</label>
            <input id="trainMin" type="number" min="10" max="180" value="75"/>
          </div>
          <div class="field">
            <label>sRPE (0–10)</label>
            <input id="trainSrpe" type="number" min="0" max="10" step="1" value="6"/>
          </div>
        </div>

        <div class="field" style="margin-top:10px">
          <label>Notes (optional)</label>
          <textarea id="trainNotes" placeholder="What felt good, what was hard, any pain/tightness…"></textarea>
        </div>

        <div class="row between wrap gap" style="margin-top:12px">
          <div class="mono small muted" id="loadPreview">Load: —</div>
          <button class="btn" id="btnSaveSession" type="button">Save session</button>
        </div>
      </div>

      <div class="mini" style="margin-top:12px">
        <div class="minihead">Recent sessions</div>
        <div class="small muted">Your last saved sessions for ${sport}.</div>
        <div id="recentSessions" style="margin-top:10px"></div>
      </div>
    `;

    // Draft state stored in memory + persisted into localStorage quickly
    const draftKey = "piq_train_draft_v2";
    function loadDraft() {
      try {
        const d = JSON.parse(localStorage.getItem(draftKey) || "null");
        if (!d || typeof d !== "object") return { items: [], sport, date };
        if (!Array.isArray(d.items)) d.items = [];
        return d;
      } catch {
        return { items: [], sport, date };
      }
    }
    function saveDraft(d) {
      localStorage.setItem(draftKey, JSON.stringify(d || { items: [] }));
    }

    let draft = loadDraft();
    if (draft.sport !== sport) draft = { items: [], sport, date };
    saveDraft(draft);

    function calcLoad() {
      const minutes = clamp($("trainMin")?.value, 0, 300);
      const srpe = clamp($("trainSrpe")?.value, 0, 10);
      return Math.round(minutes * srpe);
    }

    function renderDraft() {
      const wrap = $("draftList");
      if (!wrap) return;

      if (!draft.items.length) {
        wrap.innerHTML = `<div class="small muted">No exercises added yet. Use the library above or Auto-build.</div>`;
      } else {
        wrap.innerHTML = `
          <div class="exercise-grid">
            ${draft.items.map((it, idx) => `
              <div class="ex-box">
                <div class="ex-title">${it.name}</div>
                <div class="ex-meta">${it.category} • ${it.sets} sets • ${it.reps} reps<br/><span class="muted">${it.note || ""}</span></div>
                <div class="ex-actions">
                  <button type="button" data-edit="${idx}">Edit</button>
                  <button type="button" data-remove="${idx}">Remove</button>
                </div>
              </div>
            `).join("")}
          </div>
        `;

        wrap.querySelectorAll("[data-remove]").forEach(btn => {
          btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-remove"));
            if (!isFinite(idx)) return;
            draft.items.splice(idx, 1);
            saveDraft(draft);
            renderDraft();
          });
        });

        wrap.querySelectorAll("[data-edit]").forEach(btn => {
          btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-edit"));
            const it = draft.items[idx];
            if (!it) return;

            const sets = prompt("Sets:", String(it.sets ?? 3));
            if (sets === null) return;
            const reps = prompt("Reps:", String(it.reps ?? "6–10"));
            if (reps === null) return;
            const note = prompt("Note / cue:", String(it.note ?? ""));
            if (note === null) return;

            it.sets = clamp(sets, 1, 10);
            it.reps = String(reps).trim() || it.reps;
            it.note = String(note).trim();
            saveDraft(draft);
            renderDraft();
          });
        });
      }

      const lp = $("loadPreview");
      if (lp) lp.textContent = `Load: ${calcLoad()} (minutes × sRPE)`;

      $("trainMin")?.addEventListener("input", () => {
        const lp2 = $("loadPreview");
        if (lp2) lp2.textContent = `Load: ${calcLoad()} (minutes × sRPE)`;
      });
      $("trainSrpe")?.addEventListener("input", () => {
        const lp2 = $("loadPreview");
        if (lp2) lp2.textContent = `Load: ${calcLoad()} (minutes × sRPE)`;
      });
    }

    function pickExerciseToDraft(item, category) {
      const difficulty = state.profile.train_level || "standard";
      const pres = prescriptionFor(item.key, difficulty, phase);
      draft.items.push({
        key: item.key,
        name: item.name,
        category,
        sets: pres.sets,
        reps: pres.reps,
        note: `${item.cue ? item.cue + " • " : ""}${pres.note || ""}`.trim()
      });
      saveDraft(draft);
      renderDraft();
      toast("Added to session");
    }

    function renderAccordion() {
      const acc = $("strengthAcc");
      if (!acc) return;

      const difficulty = state.profile.train_level || "standard";

      const categories = [
        { key: "power", title: "Power & Jumps", desc: "Explosive work first. Low fatigue, high intent." },
        { key: "lower", title: "Lower Body", desc: "Squat/hinge/single-leg foundations." },
        { key: "upper", title: "Upper Body", desc: "Push/pull + shoulder health." },
        { key: "trunk", title: "Trunk & Core", desc: "Anti-rotation + bracing." }
      ];

      acc.innerHTML = categories.map((c, i) => {
        const list = (lib[c.key] || []).slice();
        const opened = i === 0; // first open
        return `
          <div class="acc-item">
            <button class="acc-head" type="button" data-acc="${c.key}">
              <span>${c.title} <small>• ${c.desc}</small></span>
              <span class="muted">${opened ? "—" : "+"}</span>
            </button>
            <div class="acc-body" ${opened ? "" : "hidden"} data-body="${c.key}">
              <div class="exercise-grid">
                ${list.map(ex => {
                  const pres = prescriptionFor(ex.key, difficulty, phase);
                  return `
                    <div class="ex-box">
                      <div class="ex-title">${ex.name}</div>
                      <div class="ex-meta">
                        ${pres.sets} sets • ${pres.reps}<br/>
                        <span class="muted">${ex.cue || ""}</span><br/>
                        <span class="muted">${pres.note || ""}</span>
                      </div>
                      <div class="ex-actions">
                        <button class="primary" type="button" data-add="${c.key}:${ex.key}">Add to session</button>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          </div>
        `;
      }).join("");

      // expand/collapse
      acc.querySelectorAll("[data-acc]").forEach(btn => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-acc");
          const bodyEl = acc.querySelector(`[data-body="${key}"]`);
          if (!bodyEl) return;
          const isHidden = bodyEl.hasAttribute("hidden");
          if (isHidden) bodyEl.removeAttribute("hidden");
          else bodyEl.setAttribute("hidden", "");
          // update symbol
          const sym = btn.querySelector("span.muted");
          if (sym) sym.textContent = isHidden ? "—" : "+";
        });
      });

      // add buttons
      acc.querySelectorAll("[data-add]").forEach(btn => {
        btn.addEventListener("click", () => {
          const v = btn.getAttribute("data-add") || "";
          const [cat, exKey] = v.split(":");
          const list = lib[cat] || [];
          const ex = list.find(x => x.key === exKey);
          if (!ex) return;
          pickExerciseToDraft(ex, cat);
        });
      });
    }

    function autoBuildSession() {
      // Simple smart build (good default):
      // 1) Power (2)
      // 2) Main lower (2)
      // 3) Upper push/pull (2)
      // 4) Trunk (1)
      const order = [
        ["power", 2],
        ["lower", 2],
        ["upper", 2],
        ["trunk", 1]
      ];

      draft.items = [];
      order.forEach(([cat, n]) => {
        const list = (lib[cat] || []).slice();
        for (let i = 0; i < Math.min(n, list.length); i++) {
          pickExerciseToDraft(list[i], cat);
        }
      });

      // Slightly adjust suggested minutes for deload/peak
      const minEl = $("trainMin");
      if (minEl) {
        const base = 75;
        const adj = (phase === "DELOAD") ? 55 : (phase === "PEAK") ? 65 : 75;
        minEl.value = String(adj || base);
      }
      renderDraft();
      toast("Auto-built session");
    }

    function bindLevelToggle() {
      const stdBtn = $("lvlStd");
      const advBtn = $("lvlAdv");
      if (!stdBtn || !advBtn) return;

      stdBtn.addEventListener("click", () => {
        state.profile.train_level = "standard";
        persist(null, { silentToast: true });
        stdBtn.classList.add("active");
        advBtn.classList.remove("active");
        renderAccordion();
        renderDraft();
        toast("Standard level");
      });

      advBtn.addEventListener("click", () => {
        state.profile.train_level = "advanced";
        persist(null, { silentToast: true });
        advBtn.classList.add("active");
        stdBtn.classList.remove("active");
        renderAccordion();
        renderDraft();
        toast("Advanced level");
      });
    }

    function bindDraftControls() {
      $("btnClearDraft")?.addEventListener("click", () => {
        if (!confirm("Clear the session draft?")) return;
        draft.items = [];
        saveDraft(draft);
        renderDraft();
      });

      $("btnAutoBuild")?.addEventListener("click", autoBuildSession);

      $("btnSaveSession")?.addEventListener("click", () => {
        if (!draft.items.length) {
          toast("Add exercises first");
          return;
        }
        const minutes = clamp($("trainMin")?.value, 0, 300);
        const srpe = clamp($("trainSrpe")?.value, 0, 10);
        const load = Math.round(minutes * srpe);

        const session = {
          id: uid(),
          date,
          sport,
          difficulty: state.profile.train_level || "standard",
          minutes,
          srpe,
          load,
          phase,
          focus: focus.slice(0, 6),
          exercises: draft.items.slice(0, 60),
          notes: String($("trainNotes")?.value || "").trim(),
          created_at: new Date().toISOString()
        };

        state.training_sessions.unshift(session);
        // cap to keep local storage healthy
        state.training_sessions = state.training_sessions.slice(0, 250);

        persist("Session saved");
        // clear draft after save
        draft.items = [];
        saveDraft(draft);
        renderTrain(); // rerender to refresh recents
        toast("Saved");
      });
    }

    function renderRecents() {
      const el = $("recentSessions");
      if (!el) return;

      if (!recent.length) {
        el.innerHTML = `<div class="small muted">No saved sessions yet. Save your first one above.</div>`;
        return;
      }

      el.innerHTML = `
        <div class="acc">
          ${recent.map(s => `
            <div class="acc-item">
              <button class="acc-head" type="button" data-sess="${s.id}">
                <span>${s.date} • ${s.difficulty} • Load ${s.load}</span>
                <span class="muted">+</span>
              </button>
              <div class="acc-body" hidden data-sessbody="${s.id}">
                <div class="small muted">Phase: ${s.phase || "—"} • Minutes: ${s.minutes} • sRPE: ${s.srpe}</div>
                <div style="margin-top:10px" class="exercise-grid">
                  ${(s.exercises || []).slice(0, 10).map(ex => `
                    <div class="ex-box">
                      <div class="ex-title">${ex.name}</div>
                      <div class="ex-meta">${ex.sets} sets • ${ex.reps}<br/><span class="muted">${ex.note || ""}</span></div>
                    </div>
                  `).join("")}
                </div>
                ${(s.exercises || []).length > 10 ? `<div class="small muted" style="margin-top:8px">+ ${(s.exercises || []).length - 10} more</div>` : ""}
                ${s.notes ? `<div class="small muted" style="margin-top:10px">Notes: ${escapeHtml(s.notes)}</div>` : ""}
                <div class="row gap wrap" style="margin-top:12px">
                  <button class="btn ghost" type="button" data-delete="${s.id}">Delete</button>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      `;

      el.querySelectorAll("[data-sess]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-sess");
          const body = el.querySelector(`[data-sessbody="${id}"]`);
          const sym = btn.querySelector("span.muted");
          if (!body) return;
          const hidden = body.hasAttribute("hidden");
          if (hidden) body.removeAttribute("hidden");
          else body.setAttribute("hidden", "");
          if (sym) sym.textContent = hidden ? "—" : "+";
        });
      });

      el.querySelectorAll("[data-delete]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-delete");
          if (!id) return;
          if (!confirm("Delete this session?")) return;
          state.training_sessions = (state.training_sessions || []).filter(s => s.id !== id);
          persist("Deleted");
          renderTrain();
        });
      });
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (m) => ({
        "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
      }[m]));
    }

    // bind
    bindLevelToggle();
    renderAccordion();
    renderDraft();
    renderRecents();
    bindDraftControls();
  }

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
          Training level: <b>${state.profile.train_level || "standard"}</b><br/>
          <span class="small muted">Edit in Account → Role & Sport.</span>
        </div>
      </div>

      <div class="mini" style="margin-top:12px">
        <div class="minihead">Training history</div>
        <div class="minibody">
          Saved sessions: <b>${(state.training_sessions || []).length}</b>
          <div class="small muted" style="margin-top:6px">Train tab logs minutes × sRPE = load.</div>
        </div>
      </div>
    `;
  }

  const renderMap = {
    home: renderHome,
    team: renderTeam,
    train: renderTrain,
    profile: renderProfile
  };

  function render(view) {
    setTeamPill();
    renderMap[view]?.();
    applyStatusFromMeta();
  }

  // ---------- Persistence ----------
  function persist(msg, opts = {}) {
    setDataStatus("saving");
    try {
      window.dataStore?.save?.(state);
      meta.lastLocalSaveAt = new Date().toISOString();
      saveMeta(meta);
      setDataStatus(sb ? (meta.syncState === "synced" ? "synced" : "local") : "local", timeAgo(meta.lastLocalSaveAt));
    } catch {
      setDataStatus("error");
    }
    if (msg && !opts.silentToast) toast(msg);
  }

  function applyStatusFromMeta() {
    const cfg = loadCloudCfg();
    if (!cfg || !cfg.url || !cfg.anon) { setDataStatus("off"); return; }
    if (!sb) { setDataStatus("error"); return; }
    if (meta.syncState === "synced" && meta.lastCloudSyncAt) setDataStatus("synced", timeAgo(meta.lastCloudSyncAt));
    else if (meta.syncState === "syncing") setDataStatus("syncing");
    else setDataStatus("local", timeAgo(meta.lastLocalSaveAt));
  }

  // ---------- Cloud (best-effort, never traps UI) ----------
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
    applyStatusFromMeta();
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

  async function getAuthedSession() {
    const syncMsg = $("syncMsg");
    if (!sb) { if (syncMsg) syncMsg.textContent = "Cloud is off (local-only)."; return null; }
    const { data: sess } = await sb.auth.getSession();
    if (!sess?.session) { if (syncMsg) syncMsg.textContent = "Sign in to sync."; return null; }
    return sess.session;
  }

  function isMissingRelationError(err) {
    const m = String(err?.message || err || "");
    return m.includes("Could not find the table") || m.includes("relation") || m.includes("schema cache");
  }

  async function pushToCloud() {
    const syncMsg = $("syncMsg");
    if (syncMsg) syncMsg.textContent = "Syncing…";
    setDataStatus("syncing");

    const session = await getAuthedSession();
    if (!session) { applyStatusFromMeta(); return; }

    try {
      const updatedAt = new Date().toISOString();
      const { error } = await sb
        .from("piq_user_state")
        .upsert({ user_id: session.user.id, state, updated_at: updatedAt }, { onConflict: "user_id" });
      if (error) throw error;

      const teamId = state.team?.active_team_id;
      if (teamId) {
        const { error: tErr } = await sb
          .from("piq_team_state")
          .upsert({ team_id: teamId, state, updated_at: updatedAt }, { onConflict: "team_id" });
        if (tErr && !isMissingRelationError(tErr)) throw tErr;
      }

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

    const session = await getAuthedSession();
    if (!session) { applyStatusFromMeta(); return; }

    try {
      const { data, error } = await sb
        .from("piq_user_state")
        .select("state")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error) throw error;

      if (data?.state) {
        state = data.state;
        state.profile = state.profile || {};
        state.team = state.team || { teams: [], active_team_id: null };
        state.ui = state.ui || { view: "home" };
        state.training_sessions = Array.isArray(state.training_sessions) ? state.training_sessions : [];
        persist(null, { silentToast: true });

        const activeView =
          document.querySelector(".navbtn.active")?.dataset.view ||
          document.querySelector(".bottomnav .tab.active")?.dataset.view ||
          state.ui.view ||
          "home";

        render(activeView);
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

  // ---------- Micro-tours ----------
  const toursKey = "piq_tours_v2";
  function loadTours() { try { return JSON.parse(localStorage.getItem(toursKey) || "null") || {}; } catch { return {}; } }
  function saveTours(t) { localStorage.setItem(toursKey, JSON.stringify(t || {})); }
  let tours = loadTours();

  function tourScript(role, tab) {
    const scripts = {
      home: {
        coach: "Home: daily snapshot + quick actions.",
        athlete: "Home: your targets + next action.",
        parent: "Home: quick view of today’s plan."
      },
      team: {
        coach: "Team: roster + team setup.",
        athlete: "Team: join teams when invites are enabled.",
        parent: "Team: see team context."
      },
      train: {
        coach: "Train: build a session from the strength library and save it.",
        athlete: "Train: tap exercises, follow sets/reps, then log minutes × sRPE.",
        parent: "Train: see what training includes and how hard it was."
      },
      profile: {
        coach: "Profile: preferences + history. Cloud is in Account.",
        athlete: "Profile: preferences + history. Cloud is in Account.",
        parent: "Profile: preferences + history. Cloud is in Account."
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
      state.ui.view ||
      "home";
    const role = state.profile?.role || "coach";
    toast(tourScript(role, active), 2600);
  }

  // ---------- Onboarding ----------
  function ensureRoleOnboarding() {
    if (state.profile?.role) return;

    const overlay = document.createElement("div");
    overlay.className = "piq-modal-backdrop";
    overlay.innerHTML = `
      <div class="piq-modal" role="dialog" aria-modal="true" aria-label="Choose role">
        <div class="piq-modal-head">
          <div class="piq-modal-title">Welcome to PerformanceIQ</div>
          <div class="piq-modal-sub">Choose your role to personalize the app.</div>
        </div>
        <div class="piq-modal-body">
          <div class="field">
            <label>Role</label>
            <select id="piqRolePick">
              <option value="coach">Coach</option>
              <option value="athlete">Athlete</option>
              <option value="parent">Parent</option>
            </select>
          </div>

          <div class="field" style="margin-top:10px">
            <label>Sport</label>
            <select id="piqSportPick">
              <option value="basketball">Basketball</option>
              <option value="football">Football</option>
              <option value="soccer">Soccer</option>
              <option value="baseball">Baseball</option>
              <option value="volleyball">Volleyball</option>
              <option value="track">Track</option>
            </select>
          </div>

          <div class="row between" style="margin-top:14px">
            <div class="small muted">You can change this anytime in Account.</div>
            <button class="btn" id="piqStartBtn">Continue</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const roleSel = overlay.querySelector("#piqRolePick");
    const sportSel = overlay.querySelector("#piqSportPick");
    const btn = overlay.querySelector("#piqStartBtn");

    btn.addEventListener("click", () => {
      state.profile.role = roleSel.value;
      state.profile.sport = sportSel.value;
      state.profile.train_level = state.profile.train_level || "standard";
      persist("Preferences saved");
      overlay.remove();
      tours = loadTours();
      autoTourFor("home");
      showView("home");
    });
  }

  // ---------- Bindings ----------
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
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
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

    $("btnHelp")?.addEventListener("click", () => {
      toast("Tip: Train → build a session → log minutes × sRPE. Cloud is optional.", 2800);
    });
  }

  // ---------- Boot ----------
  function boot() {
    sb = initSupabaseIfPossible();

    bindNav();
    bindDrawer();
    bindAccountControls();

    setTeamPill();
    refreshCloudPill();

    const cfg = loadCloudCfg();
    if (!cfg || !cfg.url || !cfg.anon) setDataStatus("off");
    else if (!sb) setDataStatus("error");
    else setDataStatus("local", timeAgo(meta.lastLocalSaveAt));

    ensureRoleOnboarding();

    const initial = state.ui?.view || "home";
    showView(initial);

    // Hide splash (if present)
    const splash = $("splash");
    if (splash) {
      splash.style.display = "none";
      splash.setAttribute("aria-hidden", "true");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
