// core.js — v2.0.0 (production UX, no trap screens)
(function () {
  "use strict";
  if (window.__PIQ_CORE__) return;
  window.__PIQ_CORE__ = true;

  const $ = (id) => document.getElementById(id);

  // ---------- State ----------
  let state = window.dataStore.load();

  const cloudKey = "piq_cloud_v2";
  function loadCloudCfg() {
    try { return JSON.parse(localStorage.getItem(cloudKey) || "null"); } catch { return null; }
  }
  function saveCloudCfg(cfg) {
    localStorage.setItem(cloudKey, JSON.stringify(cfg));
  }

  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 860px)").matches;
  }

  // ---------- UI helpers ----------
  let toastTimer = null;
  function toast(msg, ms = 2200) {
    const t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  function setSavePill(saved) {
    const dot = $("saveDot");
    const txt = $("saveText");
    if (!dot || !txt) return;
    dot.style.background = saved ? "var(--ok)" : "var(--warn)";
    txt.textContent = saved ? "Saved" : "Saving…";
  }

  // ---------- Navigation ----------
  const views = ["home", "team", "train", "profile"];

  function setActiveNav(view) {
    // desktop
    document.querySelectorAll(".navbtn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    // mobile
    document.querySelectorAll(".bottomnav .tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
  }

  function showView(view) {
    views.forEach(v => {
      const el = document.querySelector(`#view-${v}`);
      if (el) el.hidden = (v !== view);
    });
    setActiveNav(view);
    render(view);
  }

  // ---------- Drawer (Account) ----------
  function openDrawer() {
    $("drawerBackdrop").hidden = false;
    $("accountDrawer").classList.add("open");
    $("accountDrawer").setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    $("drawerBackdrop").hidden = true;
    $("accountDrawer").classList.remove("open");
    $("accountDrawer").setAttribute("aria-hidden", "true");
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
      const client = window.supabase.createClient(cfg.url.trim(), cfg.anon.trim(), {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return client;
    } catch {
      return null;
    }
  }

  async function refreshSessionLabel() {
    if (!sb) {
      $("cloudPill").textContent = "Cloud: Local";
      return;
    }
    try {
      const { data } = await sb.auth.getSession();
      const has = !!data?.session;
      $("cloudPill").textContent = has ? "Cloud: Signed in" : "Cloud: Ready";
    } catch {
      $("cloudPill").textContent = "Cloud: Ready";
    }
  }

  // ---------- Rendering ----------
  function setTeamPill() {
    const teamName = (state.team?.teams || []).find(t => t.id === state.team?.active_team_id)?.name;
    $("teamPill").textContent = `Team: ${teamName || "—"}`;
  }

  function renderHome() {
    const role = state.profile?.role || "coach";
    const sport = state.profile?.sport || "basketball";
    $("homeSub").textContent = role === "coach"
      ? `Coach view • Sport: ${sport}`
      : role === "athlete"
        ? `Athlete view • Sport: ${sport}`
        : `Parent view • Sport: ${sport}`;

    const targets = window.nutritionEngine.macroTargets({
      weight_lbs: state.profile?.weight_lbs || 160,
      goal: state.profile?.goal || "maintain",
      activity: state.profile?.activity || "med"
    });

    $("todayBlock").innerHTML = `
      <div class="small muted">Nutrition targets (auto)</div>
      <div style="margin-top:8px" class="mono small">
        Calories: ${targets.calories}<br/>
        Protein: ${targets.protein_g}g • Carbs: ${targets.carbs_g}g • Fat: ${targets.fat_g}g
      </div>
    `;
  }

  function renderTeam() {
    const teams = state.team?.teams || [];
    const body = $("teamBody");

    if (!teams.length) {
      body.innerHTML = `
        <div class="mini">
          <div class="minihead">No teams yet</div>
          <div class="minibody">Create or join a team once cloud is enabled, or stay local-only for solo testing.</div>
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

  function sportWorkoutCard(sport) {
    const map = {
      basketball: {
        title: "Basketball Session (60–75 min)",
        list: [
          "Warm-up: ankle/hip mobility + pogo hops (10 min)",
          "Speed/Agility: 5-10-5 + closeout slides (12 min)",
          "Strength: split squats, RDL, push press (20 min)",
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
          "Strength: trap bar or squat, bench, rows (25 min)",
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
          "Strength: split squat, Nordic regressions, rows (20 min)",
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
          "Strength: hinge, squat pattern, pull (20 min)",
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
          "Strength: squat pattern, RDL, presses (22 min)",
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
          "Strength: hinge + single-leg + pulls (18–22 min)",
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

    $("trainSub").textContent = role === "coach"
      ? "Coach view: recommended team session template."
      : role === "athlete"
        ? "Athlete view: your session for today."
        : "Parent view: understand what the athlete is doing today.";

    $("trainBody").innerHTML = `
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

  function renderProfile() {
    const role = state.profile?.role || "coach";
    const sport = state.profile?.sport || "basketball";
    $("profileBody").innerHTML = `
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

  function render(view) {
    setTeamPill();
    if (view === "home") renderHome();
    if (view === "team") renderTeam();
    if (view === "train") renderTrain();
    if (view === "profile") renderProfile();
  }

  // ---------- Persistence ----------
  function persist(msg) {
    setSavePill(false);
    window.dataStore.save(state);
    setSavePill(true);
    if (msg) toast(msg);
  }

  // ---------- Cloud actions (never blocks UI) ----------
  async function cloudTest() {
    if (!sb) {
      $("cloudMsg").textContent = "Cloud is not configured yet.";
      return;
    }
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      $("cloudMsg").textContent = data?.session ? "Cloud ready (signed in)." : "Cloud ready (sign in to sync).";
    } catch {
      $("cloudMsg").textContent = "Cloud test failed. Check URL + key.";
    }
    await refreshSessionLabel();
  }

  async function signIn() {
    if (!sb) { $("authMsg").textContent = "Set cloud URL + key first."; return; }
    const email = ($("authEmail").value || "").trim();
    const pass = ($("authPass").value || "").trim();
    if (!email || !pass) { $("authMsg").textContent = "Enter email + password."; return; }

    try {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      $("authMsg").textContent = "Signed in.";
      await refreshSessionLabel();
      toast("Signed in");
    } catch {
      $("authMsg").textContent = "Sign in failed. Check your credentials.";
    }
  }

  async function signUp() {
    if (!sb) { $("authMsg").textContent = "Set cloud URL + key first."; return; }
    const email = ($("authEmail").value || "").trim();
    const pass = ($("authPass").value || "").trim();
    if (!email || !pass) { $("authMsg").textContent = "Enter email + password."; return; }

    try {
      const { error } = await sb.auth.signUp({ email, password: pass });
      if (error) throw error;
      $("authMsg").textContent = "Account created. Sign in.";
      toast("Account created");
    } catch {
      $("authMsg").textContent = "Could not create account. Try a different email/password.";
    }
  }

  async function signOut() {
    if (!sb) return;
    try {
      await sb.auth.signOut();
      $("authMsg").textContent = "Signed out.";
    } catch {
      $("authMsg").textContent = "Signed out.";
    }
    await refreshSessionLabel();
    toast("Signed out");
  }

  async function pushToCloud() {
    $("syncMsg").textContent = "Syncing…";
    if (!sb) { $("syncMsg").textContent = "Cloud not configured."; return; }

    try {
      const { data: sess } = await sb.auth.getSession();
      if (!sess?.session) { $("syncMsg").textContent = "Sign in to sync."; return; }

      // Push user state (table exists in your schema list: piq_user_state)
      // We store the entire local state per user.
      const payload = { state, updated_at: new Date().toISOString() };

      const { error } = await sb
        .from("piq_user_state")
        .upsert({ user_id: sess.session.user.id, state: payload.state, updated_at: payload.updated_at }, { onConflict: "user_id" });

      if (error) throw error;

      // Push team state (this is where you were failing; requires piq_team_state table)
      const teamId = state.team?.active_team_id;
      if (teamId) {
        const { error: tErr } = await sb
          .from("piq_team_state")
          .upsert({ team_id: teamId, state: state, updated_at: payload.updated_at }, { onConflict: "team_id" });
        if (tErr) throw tErr;
      }

      $("syncMsg").textContent = "Synced.";
      toast("Cloud sync complete");
      await refreshSessionLabel();
    } catch {
      // Friendly message, not technical
      $("syncMsg").textContent = "Couldn’t sync right now. You can keep using local mode.";
      toast("Sync failed (local mode still works)");
    }
  }

  async function pullFromCloud() {
    $("syncMsg").textContent = "Syncing…";
    if (!sb) { $("syncMsg").textContent = "Cloud not configured."; return; }

    try {
      const { data: sess } = await sb.auth.getSession();
      if (!sess?.session) { $("syncMsg").textContent = "Sign in to sync."; return; }

      const { data, error } = await sb
        .from("piq_user_state")
        .select("state")
        .eq("user_id", sess.session.user.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.state) {
        state = data.state;
        persist();
        render(document.querySelector(".navbtn.active")?.dataset.view || "home");
      }

      $("syncMsg").textContent = "Updated.";
      toast("Pulled from cloud");
      await refreshSessionLabel();
    } catch {
      $("syncMsg").textContent = "Couldn’t pull right now. Your local data is safe.";
      toast("Pull failed (local mode still works)");
    }
  }

  // ---------- Micro tours (hook only; can expand per tab) ----------
  function runTourForCurrentTab() {
    const active = document.querySelector(".navbtn.active")?.dataset.view
      || document.querySelector(".bottomnav .tab.active")?.dataset.view
      || "home";

    const scripts = {
      home: "Home shows today’s snapshot and quick actions.",
      team: "Team is where you manage roster and access.",
      train: "Train provides sport-based sessions and logging (next).",
      profile: "Profile holds role, sport, and preferences."
    };
    toast(scripts[active] || "Tour not available.");
  }

  // ---------- Boot ----------
  function bindNav() {
    document.querySelectorAll("[data-view]").forEach(btn => {
      if (btn.classList.contains("navbtn") || btn.classList.contains("tab")) {
        btn.addEventListener("click", () => showView(btn.dataset.view));
      }
    });

    $("qaTrain").addEventListener("click", () => showView("train"));
    $("qaTeam").addEventListener("click", () => showView("team"));
  }

  function bindDrawer() {
    $("btnAccount").addEventListener("click", openDrawer);
    $("btnCloseDrawer").addEventListener("click", closeDrawer);
    $("drawerBackdrop").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer;
    });
  }

  function bindAccountControls() {
    // Profile
    $("roleSelect").value = state.profile?.role || "coach";
    $("sportSelect").value = state.profile?.sport || "basketball";

    $("btnSaveProfile").addEventListener("click", () => {
      state.profile = state.profile || {};
      state.profile.role = $("roleSelect").value;
      state.profile.sport = $("sportSelect").value;
      persist("Preferences saved");
      render("home");
    });

    $("btnRunTour").addEventListener("click", runTourForCurrentTab);

    // Cloud cfg
    const cfg = loadCloudCfg();
    if (cfg?.url) $("sbUrl").value = cfg.url;
    if (cfg?.anon) $("sbAnon").value = cfg.anon;

    $("btnSaveCloud").addEventListener("click", async () => {
      const url = ($("sbUrl").value || "").trim();
      const anon = ($("sbAnon").value || "").trim();
      if (!validSupabaseUrl(url) || !anon) {
        $("cloudMsg").textContent = "Please enter a valid Supabase URL and anon key.";
        return;
      }
      saveCloudCfg({ url, anon });
      $("cloudMsg").textContent = "Saved.";
      sb = initSupabaseIfPossible();
      await refreshSessionLabel();
      toast("Cloud saved");
    });

    $("btnTestCloud").addEventListener("click", cloudTest);

    // Auth
    $("btnSignIn").addEventListener("click", signIn);
    $("btnSignUp").addEventListener("click", signUp);
    $("btnSignOut").addEventListener("click", signOut);

    // Sync
    $("btnPush").addEventListener("click", pushToCloud);
    $("btnPull").addEventListener("click", pullFromCloud);

    // Help
    $("btnHelp").addEventListener("click", () => {
      toast("Tip: Use Account to set role + sport. Cloud sync is optional.");
    });
  }

  function hideSplash() {
    const s = $("splash");
    if (s) s.style.display = "none";
  }

  function init() {
    setSavePill(true);

    // Supabase (optional)
    sb = initSupabaseIfPossible();
    refreshSessionLabel();

    // Default active team
    if (!state.team) state.team = { active_team_id: null, teams: [] };
    if (!state.profile) state.profile = { role: "coach", sport: "basketball" };

    bindNav();
    bindDrawer();
    bindAccountControls();

    // Default view
    showView("home");

    // Splash end
    setTimeout(hideSplash, 450);
  }

  init();
})();
