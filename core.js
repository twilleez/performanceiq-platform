// core.js — v2.1.0 (production UX, no trap screens, mobile onboarding dropdown, safe cloud UX)
// UPDATED: Expanded “Strength” sections with detailed exercise menus (sets/reps + options)
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

  // ---------- Local meta for UX ----------
  const metaKey = "piq_meta_v2";
  function loadMeta() {
    try { return JSON.parse(localStorage.getItem(metaKey) || "null") || {}; } catch { return {}; }
  }
  function saveMeta(m) { localStorage.setItem(metaKey, JSON.stringify(m || {})); }
  let meta = loadMeta();
  meta.lastLocalSaveAt = meta.lastLocalSaveAt || null;
  meta.lastCloudSyncAt = meta.lastCloudSyncAt || null;
  meta.syncState = meta.syncState || "off"; // off | ready | syncing | synced | error
  saveMeta(meta);

  // ---------- Cloud config ----------
  const cloudKey = "piq_cloud_v2";
  function loadCloudCfg() {
    try { return JSON.parse(localStorage.getItem(cloudKey) || "null"); } catch { return null; }
  }
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
  // Single truth: Local Saved | Syncing | Synced | Sync off | Sync error
  function setDataStatus(kind, detail) {
    const dot = $("saveDot");
    const txt = $("saveText");
    if (!dot || !txt) return;

    const map = {
      local: { label: "Local saved", color: "var(--ok)" },
      saving: { label: "Saving…", color: "var(--warn)" },
      syncing: { label: "Syncing…", color: "var(--brand)" },
      synced: { label: "Synced", color: "var(--ok)" },
      off: { label: "Sync off", color: "rgba(255,255,255,.35)" },
      error: { label: "Sync error", color: "var(--danger)" }
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

  // ---------- Drawer (Account) ----------
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
    } catch {
      return null;
    }
  }

  async function refreshCloudPill() {
    const pill = $("cloudPill");
    if (!pill) return;

    if (!sb) {
      pill.textContent = "Cloud: Local";
      return;
    }
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

    // Nutrition targets preview (auto)
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

  // NEW: helper to keep Strength sections consistent and richer
  function strengthMenu(opts) {
    // opts: { focus: "lower"|"upper"|"full", sportKey: string }
    // Keep it readable in a single list item (UI is a simple ordered list)
    const base = {
      lower: [
        "A1) Split Squat (rear-foot elevated optional) — 3×6–10/leg (slow down, drive up)",
        "A2) Romanian Deadlift — 3×6–10 (hips back, shins vertical, flat back)",
        "B1) Front Squat / Goblet Squat — 3×5–8 (brace, elbows up)",
        "B2) Hamstring: Nordic regression / slider curls — 2–3×6–10",
        "C) Calves: seated + straight-leg — 2×12–20 each",
        "Finisher: Core anti-rotation (Pallof) — 2×10–14/side"
      ],
      upper: [
        "A1) Bench / DB Press — 3×5–10 (controlled, full range)",
        "A2) Row (chest-supported / cable) — 3×8–12 (squeeze shoulder blade)",
        "B1) Overhead Press / Landmine Press — 3×6–10",
        "B2) Pull-ups / Lat pulldown — 3×6–12",
        "C) Shoulders: lateral raise — 2×12–20",
        "D) Arms: curls + triceps — 2×10–15 each"
      ],
      full: [
        "A1) Trap Bar Deadlift / Hinge — 3×4–8 (fast up, clean form)",
        "A2) DB Bench / Push-ups weighted — 3×6–12",
        "B1) Split Squat / Step-up — 3×6–10/leg",
        "B2) Row / Pulldown — 3×8–12",
        "C) Core: dead bug / plank — 2–3 sets (quality reps)"
      ]
    };

    // Sport-specific swaps to feel “real”
    const sportTweaks = {
      basketball: "Swap option: add 2×6–8 pogo→split squat contrast OR 2×5 jump squats (light).",
      football: "Swap option: add 3×5 heavy push (sled) OR 3×3–5 power clean (advanced).",
      soccer: "Swap option: add 2×6–8 Copenhagen planks OR 2×8–12 adductor machine.",
      baseball: "Swap option: add 2×8–12 single-arm cable row + 2×8–12 face pulls (scap).",
      volleyball: "Swap option: add 2×6–8 trap bar jumps (light) OR 2×5 box squat (speed).",
      track: "Swap option: add 3×3–5 heavy hinge + 2×6 single-leg RDL for stiffness."
    };

    const lines = (base[opts.focus] || base.full).slice();
    const tweak = sportTweaks[opts.sportKey];
    if (tweak) lines.push(tweak);

    return "Strength (menu): " + lines.join(" • ");
  }

  function sportWorkoutCard(sport) {
    const map = {
      basketball: {
        title: "Basketball Session (60–75 min)",
        list: [
          "Warm-up: ankle/hip mobility + pogo hops (10 min)",
          "Speed/Agility: 5-10-5 + closeout slides (12 min)",
          strengthMenu({ focus: "lower", sportKey: "basketball" }),
          "Plyos: approach jumps + lateral bounds (10 min)",
          "Conditioning: tempo runs or court suicides (8–10 min)",
          "Cool-down: breathing + calves/hips (5 min)"
        ]
      },
      football: {
        title: "Football Session (60–75 min)",
        list: [
          "Warm-up: thoracic/hip + skips (10 min)",
          "Acceleration: 10–20 yd sprints (10 min)",
          strengthMenu({ focus: "full", sportKey: "football" }),
          "Power: medball throws + broad jumps (10 min)",
          "Conditioning: short burst intervals (8–10 min)",
          "Cool-down: hamstrings/hips (5 min)"
        ]
      },
      soccer: {
        title: "Soccer Session (60–75 min)",
        list: [
          "Warm-up: adductors/ankles + A-skips (10 min)",
          "Speed: flying 10s + change of direction (12 min)",
          strengthMenu({ focus: "lower", sportKey: "soccer" }),
          "Plyos: pogo series + decel drops (10 min)",
          "Conditioning: repeated sprint ability (10 min)",
          "Cool-down: calves/adductors (5 min)"
        ]
      },
      baseball: {
        title: "Baseball Session (55–70 min)",
        list: [
          "Warm-up: shoulders/hips + band work (10 min)",
          "Power: medball rotational throws (10 min)",
          strengthMenu({ focus: "upper", sportKey: "baseball" }),
          "Sprint: 10–30 yd accelerations (10 min)",
          "Arm care: cuff + scap work (8 min)",
          "Cool-down: breathing (3–5 min)"
        ]
      },
      volleyball: {
        title: "Volleyball Session (60–75 min)",
        list: [
          "Warm-up: ankles/hips + jumps prep (10 min)",
          "Jump work: approach jumps + landing mechanics (12 min)",
          strengthMenu({ focus: "lower", sportKey: "volleyball" }),
          "Power: lateral bounds + block jumps (10 min)",
          "Conditioning: short court shuttles (8–10 min)",
          "Cool-down: calves/quads (5 min)"
        ]
      },
      track: {
        title: "Track Session (55–75 min)",
        list: [
          "Warm-up: mobility + drills (10–12 min)",
          "Speed: sprint work by event (12–18 min)",
          strengthMenu({ focus: "full", sportKey: "track" }),
          "Plyos: low contacts + stiffness (8–10 min)",
          "Conditioning: tempo/strides (8–12 min)",
          "Cool-down: hamstrings/hips (5 min)"
        ]
      }
    };
    return map[sport] || map.basketball;
  }

  function renderTrain() {
    const sport = state.profile?.sport || "basketball";
    const role = state.profile?.role || "coach";
    const card = sportWorkoutCard(sport);

    const subMap = {
      coach: "Coach view: recommended team session template.",
      athlete: "Athlete view: your session for today.",
      parent: "Parent view: understand what the athlete is doing today."
    };

    const trainSub = $("trainSub");
    if (trainSub) trainSub.textContent = subMap[role] || subMap.coach;

    const body = $("trainBody");
    if (body) {
      body.innerHTML = `
        <div class="mini">
          <div class="minihead">${card.title}</div>
          <div class="minibody">
            <ol style="margin:0; padding-left:18px">
              ${card.list.map(x => `<li style="margin:8px 0">${x}</li>`).join("")}
            </ol>
          </div>
        </div>
      `;
    }
  }

  function renderProfile() {
    const role = state.profile?.role || "coach";
    const sport = state.profile?.sport || "basketball";

    const cloudCard = $("cloudCardBody");
    if (cloudCard) {
      // Customer-safe cloud status (no URLs/keys in the main view)
      const status =
        !sb ? { title: "Sync off", desc: "This device is saving locally." } :
        { title: "Sync available", desc: "Sign in from Account to sync across devices." };

      cloudCard.innerHTML = `
        <div class="mini">
          <div class="minihead">Cloud</div>
          <div class="minibody">
            <b>${status.title}</b><br/>
            ${status.desc}
            <div style="margin-top:10px" class="small muted">Tip: Account → Cloud setup (Admin)</div>
          </div>
        </div>
      `;
    }

    const body = $("profileBody");
    if (body) {
      body.innerHTML = `
        <div class="mini">
          <div class="minihead">Preferences</div>
          <div class="minibody">
            Role: <b>${role}</b><br/>
            Sport: <b>${sport}</b><br/>
            <span class="small muted">Edit in Account → Role & Sport.</span>
          </div>
        </div>
      `;
    }
  }

  const renderMap = { home: renderHome, team: renderTeam, train: renderTrain, profile: renderProfile };

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
    // Respect current meta + cloud configuration
    const cfg = loadCloudCfg();
    if (!cfg || !cfg.url || !cfg.anon) {
      setDataStatus("off");
      return;
    }
    if (!sb) {
      // Config exists but SB didn't init (invalid url/key or library missing)
      setDataStatus("error");
      return;
    }
    // SB exists
    if (meta.syncState === "synced" && meta.lastCloudSyncAt) {
      setDataStatus("synced", timeAgo(meta.lastCloudSyncAt));
    } else if (meta.syncState === "syncing") {
      setDataStatus("syncing");
    } else {
      setDataStatus("local", timeAgo(meta.lastLocalSaveAt));
    }
  }

  // ---------- Cloud (never blocks UI) ----------
  async function cloudTest() {
    const msg = $("cloudMsg");
    if (!sb) {
      if (msg) msg.textContent = "Cloud is off (local-only).";
      setDataStatus("off");
      return;
    }
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      if (msg) msg.textContent = data?.session ? "Cloud OK (signed in)." : "Cloud OK (sign in to sync).";
      setDataStatus(data?.session ? "local" : "local");
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
    try { await sb.auth.signOut(); } catch { /* best-effort */ }
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

      // 1) Always try user_state
      const { error } = await sb
        .from("piq_user_state")
        .upsert({ user_id: session.user.id, state, updated_at: updatedAt }, { onConflict: "user_id" });

      if (error) throw error;

      // 2) Team state is OPTIONAL — if table is missing, skip without breaking
      const teamId = state.team?.active_team_id;
      if (teamId) {
        const { error: tErr } = await sb
          .from("piq_team_state")
          .upsert({ team_id: teamId, state, updated_at: updatedAt }, { onConflict: "team_id" });

        if (tErr) {
          // If table doesn't exist, skip quietly (do not trap users)
          if (!isMissingRelationError(tErr)) throw tErr;
        }
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

  // ---------- Micro-tours (auto once per tab per role) ----------
  const toursKey = "piq_tours_v2";
  function loadTours() {
    try { return JSON.parse(localStorage.getItem(toursKey) || "null") || {}; } catch { return {}; }
  }
  function saveTours(t) { localStorage.setItem(toursKey, JSON.stringify(t || {})); }
  let tours = loadTours();

  function tourScript(role, tab) {
    const scripts = {
      home: {
        coach: "Home: quick snapshot + next coach actions.",
        athlete: "Home: your daily snapshot + next action.",
        parent: "Home: quick view of athlete targets + next steps."
      },
      team: {
        coach: "Team: roster + team settings live here.",
        athlete: "Team: join a team when cloud invites are enabled.",
        parent: "Team: see team context and access controls."
      },
      train: {
        coach: "Train: templates + training tools per sport.",
        athlete: "Train: today’s session and logging tools.",
        parent: "Train: understand what training looks like today."
      },
      profile: {
        coach: "Profile: preferences + help. Cloud setup is in Account.",
        athlete: "Profile: preferences + help. Cloud setup is in Account.",
        parent: "Profile: preferences + help. Cloud setup is in Account."
      }
    };
    return scripts?.[tab]?.[role] || "Tip: explore each tab to get started.";
  }

  function autoTourFor(tab) {
    const role = state.profile?.role || "coach";
    tours[role] = tours[role] || {};
    if (tours[role][tab]) return; // already shown once
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

  function resetAllTours() {
    tours = {};
    saveTours(tours);
    toast("Micro-tours reset.");
  }

  // ---------- Onboarding (dropdown modal, no prompt) ----------
  function ensureRoleOnboarding() {
    if (state.profile?.role) return;

    // Build lightweight modal via JS (no HTML edits required)
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

    // Preselect defaults if present
    if (state.profile?.sport) sportSel.value = state.profile.sport;

    btn.addEventListener("click", () => {
      state.profile.role = roleSel.value;
      state.profile.sport = sportSel.value;
      persist("Preferences saved");
      overlay.remove();
      // Tour immediately for Home
      tours = loadTours(); // refresh
      autoTourFor("home");
      showView("home");
    });
  }

  // ---------- Boot bindings ----------
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
    // Role/sport selects inside drawer (if present)
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

    // Micro-tours
    $("btnRunTour")?.addEventListener("click", runTourForCurrentTab);
    $("btnResetTours")?.addEventListener("click", resetAllTours);

    // Cloud inputs (Admin) — still allowed, but messages are customer-safe
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
      toast("Tip: Choose role + sport. Cloud is optional. Local mode always works.", 2800);
    });
  }

  function boot() {
    // Init SB best-effort
    sb = initSupabaseIfPossible();

    // Bind
    bindNav();
    bindDrawer();
    bindAccountControls();

    // Pills
    setTeamPill();
    refreshCloudPill();

    // Set initial status
    const cfg = loadCloudCfg();
    if (!cfg || !cfg.url || !cfg.anon) setDataStatus("off");
    else if (!sb) setDataStatus("error");
    else setDataStatus("local", timeAgo(meta.lastLocalSaveAt));

    // Ensure onboarding (dropdown modal)
    ensureRoleOnboarding();

    // Show initial view
    const initial = state.ui?.view || "home";
    showView(initial);
  }

  // Boot on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
