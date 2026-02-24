// core.js — TOP-TIER FOUNDATION (FULL FILE) — v1.3.0
// Adds: PerformanceIQ Score, Risk Detection, Periodization, Team Heatmap, Elite Nutrition + Paid Upgrades
(function () {
  "use strict";
  if (window.__PIQ_CORE_LOADED__) return;
  window.__PIQ_CORE_LOADED__ = true;

  const STORAGE_KEY = "piq_state_v1";
  const SPLASH_FAILSAFE_MS = 2000;

  const ROLES = Object.freeze({ ATHLETE: "athlete", COACH: "coach", PARENT: "parent", ADMIN: "admin" });

  const $ = (id) => document.getElementById(id) || null;

  function sanitizeHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  const clamp = (n, a, b) => Math.min(Math.max(n, a), b);
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function safeDateISO(d) {
    const s = String(d || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }

  function __loadLocalRaw() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }
  function __saveLocal(stateObj) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stateObj)); return true; } catch { return false; }
  }

  function defaultState() {
    const now = Date.now();
    return {
      meta: { updatedAtMs: now, lastSyncedAtMs: 0, version: 0 },
      role: "",
      profile: { sport: "basketball", days: 4, name: "", weightLbs: null },
      entitlements: {
        tier: "free", // free | pro | elite
        features: {
          performanceIQ: true, // brand differentiator should be visible free (summary)
          risk: true,          // show basic risk
          periodization: true, // show phase + multiplier
          heatmap: false,      // pro+
          nutrition: false     // elite only
        }
      },
      week: null,
      logs: [],
      tests: [],
      team: {
        roster: [],
        members: [],
        selectedTeamId: "",
        cache: { dateISO: "", members: [], readinessByUser: {}, updatedAtMs: 0, error: "" }
      },
      _ui: { activeTab: "profile" }
    };
  }

  function normalizeState(s) {
    const d = defaultState();
    if (!s || typeof s !== "object") return d;
    s.meta = s.meta && typeof s.meta === "object" ? s.meta : d.meta;
    s.profile = s.profile && typeof s.profile === "object" ? s.profile : d.profile;
    s.entitlements = s.entitlements && typeof s.entitlements === "object" ? s.entitlements : d.entitlements;
    s.entitlements.features = s.entitlements.features && typeof s.entitlements.features === "object" ? s.entitlements.features : d.entitlements.features;

    if (!Array.isArray(s.logs)) s.logs = [];
    if (!Array.isArray(s.tests)) s.tests = [];
    s.team = s.team && typeof s.team === "object" ? s.team : d.team;
    if (!Array.isArray(s.team.roster)) s.team.roster = [];
    if (!Array.isArray(s.team.members)) s.team.members = [];
    if (!s.team.cache || typeof s.team.cache !== "object") s.team.cache = d.team.cache;
    if (!s._ui || typeof s._ui !== "object") s._ui = d._ui;
    if (typeof s._ui.activeTab !== "string") s._ui.activeTab = "profile";
    return s;
  }

  function loadState() {
    const raw = __loadLocalRaw();
    if (!raw) return null;
    try { return normalizeState(JSON.parse(raw)); } catch { return null; }
  }

  const state = loadState() || defaultState();

  function bumpMeta() {
    state.meta.updatedAtMs = Date.now();
    state.meta.version = (state.meta.version || 0) + 1;
  }

  function saveState() {
    bumpMeta();
    __saveLocal(state);
    renderActiveTab();
  }

  window.PIQ = window.PIQ || {};
  window.PIQ.getState = () => state;
  window.PIQ.saveState = () => saveState();

  function hideSplashNow() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    s.style.display = "none";
    try { s.remove(); } catch {}
  }
  window.hideSplashNow = window.hideSplashNow || hideSplashNow;

  function isSupabaseReady() {
    return !!(window.supabaseClient && window.PIQ_AuthStore && window.dataStore);
  }

  async function isSignedIn() {
    try {
      if (!window.PIQ_AuthStore?.getUser) return false;
      const u = await window.PIQ_AuthStore.getUser();
      return !!u;
    } catch {
      return false;
    }
  }

  // ---------------------------
  // PERIODIZATION + SCORE + RISK
  // ---------------------------
  function weekIndexFromProgram() {
    // simple: if program createdAt exists, compute week; else week 1
    const created = state.week?.createdAtISO ? String(state.week.createdAtISO).slice(0, 10) : null;
    if (!created || !safeDateISO(created)) return 1;
    const a = Date.parse(created);
    const b = Date.parse(todayISO());
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
    const diffDays = Math.floor((b - a) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  }

  function computeConsistencyScore() {
    // last 14 days: percent of days with a log
    const today = todayISO();
    const fromMs = Date.parse(today) - 13 * 24 * 60 * 60 * 1000;
    const days = new Set();
    (state.logs || []).forEach((l) => {
      if (!l?.dateISO) return;
      const ms = Date.parse(l.dateISO);
      if (Number.isFinite(ms) && ms >= fromMs) days.add(l.dateISO);
    });
    return Math.round(clamp((days.size / 14) * 100, 0, 100));
  }

  function latestTest() {
    const arr = (state.tests || []).slice().filter((t) => t?.dateISO).sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""));
    return arr[0] || null;
  }

  function baselineApprox() {
    // baseline from last 5 tests
    const tests = (state.tests || []).slice().filter((t) => t?.dateISO).sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));
    const last5 = tests.slice(-5);
    const avg = (k) => window.PIQ_PerformanceIQ?.avg(last5.map((x) => Number(x?.[k])) ) ?? null;
    return {
      vert: avg("vert"),
      sprint10: avg("sprint10")
    };
  }

  function computeRecoveryScore() {
    // from logs: sleep_quality + hydration + injury
    const logs = (state.logs || []).slice().filter((l) => l?.dateISO).sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || "")).slice(0, 7);
    if (!logs.length) return 60;

    const sleep = window.PIQ_PerformanceIQ?.avg(logs.map((l) => Number(l.sleep_quality))) ?? null;
    const injuryPain = window.PIQ_PerformanceIQ?.avg(logs.map((l) => Number(l.injury_pain))) ?? null;
    const hydMap = { low: 40, ok: 65, good: 80, great: 95 };
    const hyd = window.PIQ_PerformanceIQ?.avg(logs.map((l) => hydMap[String(l.hydration || "good").toLowerCase()] || 75)) ?? 75;

    let score = 0;
    score += Number.isFinite(sleep) ? clamp((sleep / 10) * 40, 0, 40) : 25;
    score += clamp((hyd / 100) * 40, 0, 40);
    score += Number.isFinite(injuryPain) ? clamp(20 - injuryPain * 2, 0, 20) : 15;

    return Math.round(clamp(score, 0, 100));
  }

  function computeLoadBalanceScore() {
    // crude load from wellness/energy proxy (until you add session RPE/volume logging)
    // stable = 80+, spiky = lower
    const logs = (state.logs || []).slice().filter((l) => l?.dateISO).sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || "")).slice(-14);
    if (logs.length < 5) return 70;

    const vals = logs.map((l) => {
      const w = Number(l.wellness);
      const e = Number(l.energy);
      if (!Number.isFinite(w) || !Number.isFinite(e)) return null;
      return (w + e) / 2;
    }).filter((x) => Number.isFinite(x));

    if (vals.length < 5) return 70;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
    const std = Math.sqrt(variance);
    // std 0.5 => good, std 2.0 => bad
    const score = 100 - clamp((std - 0.5) * 35, 0, 60);
    return Math.round(clamp(score, 0, 100));
  }

  function computeReadinessScoreApprox() {
    // map most recent log into 0-100
    const logs = (state.logs || []).slice().filter((l) => l?.dateISO).sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""));
    const t = logs[0];
    if (!t) return 70;

    const w = Number(t.wellness);
    const e = Number(t.energy);
    const s = Number(t.sleep_quality);
    const pain = Number(t.injury_pain);

    let score = 65;
    if (Number.isFinite(w)) score += (w - 6) * 4;
    if (Number.isFinite(e)) score += (e - 6) * 4;
    if (Number.isFinite(s)) score += (s - 6) * 3;
    if (Number.isFinite(pain)) score -= pain * 3;

    return Math.round(clamp(score, 0, 100));
  }

  function computePerformanceIQ() {
    if (!window.PIQ_PerformanceIQ?.computeScore) return null;

    const consistency = computeConsistencyScore();
    const base = baselineApprox();
    const latest = latestTest();

    const readinessScore = computeReadinessScoreApprox();
    const recoveryScore = computeRecoveryScore();
    const loadBalance = computeLoadBalanceScore();

    const strengthCurrent = latest?.vert ?? null;          // proxy: vert as power marker
    const strengthBaseline = base?.vert ?? null;
    const speedCurrent = latest?.sprint10 ?? null;
    const speedBaseline = base?.sprint10 ?? null;

    return window.PIQ_PerformanceIQ.computeScore({
      consistency,
      strengthCurrent,
      strengthBaseline,
      speedCurrent,
      speedBaseline,
      readinessScore,
      recoveryScore,
      loadBalance
    });
  }

  function computeRiskSnapshot() {
    if (!window.PIQ_Risk?.detect) return null;
    const logs = (state.logs || []).slice().filter((l) => l?.dateISO).sort((a, b) => (b.dateISO || "").localeCompare(a.dateISO || ""));
    const l = logs[0] || {};
    const t = latestTest() || {};

    // acute/chronic placeholders until you log session load; use recovery proxy
    const acuteLoad = 100 - computeRecoveryScore();     // worse recovery = higher “load”
    const chronicLoad = acuteLoad + 20;                 // placeholder smoothing

    // performance regression: if sprint worse than baseline
    const base = baselineApprox();
    let perfDropPct = null;
    if (Number.isFinite(Number(t.sprint10)) && Number.isFinite(Number(base?.sprint10)) && Number(base.sprint10) > 0) {
      perfDropPct = (Number(t.sprint10) - Number(base.sprint10)) / Number(base.sprint10);
      if (!Number.isFinite(perfDropPct)) perfDropPct = null;
    }

    return window.PIQ_Risk.detect({
      sleepHours: t.sleep,
      wellness: l.wellness,
      energy: l.energy,
      injuryPain: l.injury_pain,
      acuteLoad,
      chronicLoad,
      perfDropPct
    });
  }

  function currentPeriodization() {
    const wk = weekIndexFromProgram();
    const phase = window.PIQ_Periodization?.phaseForWeek ? window.PIQ_Periodization.phaseForWeek(wk) : "BUILD";
    const mult = window.PIQ_Periodization?.multiplierForPhase ? window.PIQ_Periodization.multiplierForPhase(phase) : 1.0;
    return { week: wk, phase, multiplier: mult };
  }

  // -------------
  // Upgrade System
  // -------------
  function setTier(tier) {
    const t = String(tier || "free").toLowerCase();
    state.entitlements.tier = t;

    // feature map
    const f = state.entitlements.features;
    f.performanceIQ = true;
    f.risk = true;
    f.periodization = true;
    f.heatmap = (t === "pro" || t === "elite");
    f.nutrition = (t === "elite");

    saveState();
  }

  function tierLabel() {
    return String(state.entitlements?.tier || "free").toUpperCase();
  }

  // ----------------
  // Tabs + Renderers
  // ----------------
  const TABS = ["profile", "program", "log", "performance", "dashboard", "team", "parent", "settings"];

  function showTab(tabName) {
    for (const t of TABS) {
      const el = $(`tab-${t}`);
      if (!el) continue;
      el.style.display = t === tabName ? "block" : "none";
    }
    state._ui.activeTab = tabName;
    __saveLocal(state);
  }
  function activeTab() {
    const a = state._ui?.activeTab;
    return TABS.includes(a) ? a : "profile";
  }
  function wireNav() {
    for (const t of TABS) {
      $(`nav-${t}`)?.addEventListener("click", () => {
        showTab(t);
        renderActiveTab();
      });
    }
  }

  function renderProfile() {
    const el = $("tab-profile");
    if (!el) return;

    el.innerHTML = `
      <h3 style="margin-top:0">Profile</h3>
      <div class="small">Tier: <b>${sanitizeHTML(tierLabel())}</b></div>
      <div class="hr"></div>

      <div class="row">
        <div class="field">
          <label for="profileName">Name</label>
          <input id="profileName" value="${sanitizeHTML(state.profile.name || "")}" />
        </div>
        <div class="field">
          <label for="profileWeight">Weight (lbs)</label>
          <input id="profileWeight" inputmode="decimal" value="${sanitizeHTML(state.profile.weightLbs ?? "")}" placeholder="145" />
        </div>
      </div>

      <div class="btnRow" style="margin-top:12px">
        <button class="btn" id="btnSaveProfile" type="button">Save</button>
      </div>

      <div class="hr"></div>
      <div class="small"><b>PerformanceIQ Snapshot</b></div>
      <div id="piqSnap"></div>
    `;

    $("btnSaveProfile")?.addEventListener("click", () => {
      state.profile.name = ($("profileName")?.value || "").trim();
      const w = Number(($("profileWeight")?.value || "").trim());
      state.profile.weightLbs = Number.isFinite(w) ? w : null;
      saveState();
      alert("Saved.");
    });

    const score = computePerformanceIQ();
    const risk = computeRiskSnapshot();
    const per = currentPeriodization();

    const snap = $("piqSnap");
    if (snap) {
      snap.innerHTML = `
        <div class="card" style="margin-top:8px;padding:10px">
          <div class="small">Week <b>${sanitizeHTML(per.week)}</b> • Phase <b>${sanitizeHTML(per.phase)}</b> • Mult <b>${sanitizeHTML(per.multiplier.toFixed(2))}x</b></div>
          <div style="margin-top:6px;font-size:18px;font-weight:800">PerformanceIQ: ${sanitizeHTML(score ?? "—")}/100</div>
          <div class="small" style="margin-top:6px">Risk: <b>${sanitizeHTML(risk?.level || "—")}</b> ${risk?.acwr ? `• ACWR ${sanitizeHTML(risk.acwr.toFixed(2))}` : ""}</div>
        </div>
      `;
    }
  }

  function renderDashboard() {
    const el = $("tab-dashboard");
    if (!el) return;

    const score = computePerformanceIQ();
    const risk = computeRiskSnapshot();
    const per = currentPeriodization();

    el.innerHTML = `
      <h3 style="margin-top:0">Dashboard</h3>
      <div class="small">Top-tier intelligence: PerformanceIQ + Risk + Periodization</div>
      <div class="hr"></div>

      <div class="card" style="padding:12px;margin:10px 0">
        <div class="small">Week <b>${sanitizeHTML(per.week)}</b> • Phase <b>${sanitizeHTML(per.phase)}</b> • Mult <b>${sanitizeHTML(per.multiplier.toFixed(2))}x</b></div>
        <div style="margin-top:6px;font-weight:900;font-size:22px">PerformanceIQ: ${sanitizeHTML(score ?? "—")}/100</div>
        <div class="small" style="margin-top:6px">Risk: <b>${sanitizeHTML(risk?.level || "—")}</b> • RiskScore: <b>${sanitizeHTML(risk?.riskScore ?? "—")}</b></div>
        ${risk?.flags?.length ? `<div class="small" style="margin-top:6px">${risk.flags.slice(0,4).map((f)=>sanitizeHTML("• "+f)).join("<br/>")}</div>` : ""}
      </div>

      <div class="card" style="padding:12px;margin:10px 0">
        <div class="small"><b>Team Heatmap (Pro+)</b></div>
        ${
          state.entitlements.features.heatmap
            ? `<div id="teamHeatmap" class="small" style="margin-top:10px">Open Team tab → Refresh readiness to populate heatmap.</div>`
            : `<div class="small" style="margin-top:10px;color:#e67e22">Upgrade to PRO to unlock Team Heatmap Dashboard.</div>`
        }
      </div>
    `;

    // Heatmap render (if enabled and cached)
    if (state.entitlements.features.heatmap) {
      const mount = $("teamHeatmap");
      const cache = state.team.cache || {};
      const members = Array.isArray(cache.members) ? cache.members : [];
      const readinessByUser = cache.readinessByUser || {};

      const athletes = members.filter((m) => String(m?.role_in_team || "").toLowerCase() === "athlete");
      if (mount) {
        if (!athletes.length) {
          mount.innerHTML = "No team athletes cached yet. Go to Team tab → Refresh readiness.";
        } else {
          const rows = athletes.map((m) => {
            const uid = String(m.user_id || "");
            const r = readinessByUser[uid] || {};
            const name = `Athlete ${uid.slice(0, 8)}`;
            const readiness = Number.isFinite(r.score) ? r.score : 70;
            const piq = computePerformanceIQ(); // coach view placeholder: can compute per athlete once you cache their logs/tests
            const riskLocal = computeRiskSnapshot(); // placeholder; per-athlete comes next phase (we wire it in Team refresh)
            const riskLvl = riskLocal?.level || "—";

            const color = readiness >= 80 ? "#2ecc71" : readiness >= 60 ? "#f1c40f" : "#e74c3c";
            return `
              <div style="display:flex;gap:10px;align-items:center;margin:6px 0">
                <div style="width:160px">${sanitizeHTML(name)}</div>
                <div style="width:120px;padding:4px 8px;background:${color};border-radius:10px;color:#111"><b>${sanitizeHTML(readiness)}</b></div>
                <div style="width:120px">${sanitizeHTML(piq ?? "—")}</div>
                <div style="width:120px">${sanitizeHTML(riskLvl)}</div>
              </div>
            `;
          }).join("");

          mount.innerHTML = `
            <div style="display:flex;gap:10px;font-weight:800;margin-bottom:6px">
              <div style="width:160px">Athlete</div><div style="width:120px">Readiness</div><div style="width:120px">PIQ</div><div style="width:120px">Risk</div>
            </div>
            ${rows}
          `;
        }
      }
    }
  }

  async function renderTeam() {
    const el = $("tab-team");
    if (!el) return;

    const supaOk = isSupabaseReady();
    const signed = supaOk ? await isSignedIn().catch(() => false) : false;
    const isCoach = String(state.role || "").trim() === ROLES.COACH;
    const selectedTeamId = String(state.team.selectedTeamId || "").trim();

    el.innerHTML = `
      <h3 style="margin-top:0">Team</h3>
      <div class="small">${isCoach ? "Coach tools: create team, join code, roster, heatmap cache." : "Join a team using join code."}</div>
      <div class="hr"></div>

      <div class="card" style="padding:12px;margin:10px 0">
        <div class="small">
          Supabase: <b>${supaOk ? "Configured" : "Not configured"}</b> •
          Auth: <b>${signed ? "Signed in" : "Signed out"}</b> •
          Tier: <b>${sanitizeHTML(tierLabel())}</b>
        </div>
      </div>

      ${
        isCoach
          ? `
        <div class="card" style="padding:12px;margin:10px 0">
          <div class="small"><b>Create Team</b></div>
          <div class="row" style="margin-top:10px">
            <div class="field"><label>Team name</label><input id="newTeamName" ${signed ? "" : "disabled"} /></div>
            <div class="field"><label>Sport</label><input id="newTeamSport" placeholder="basketball" ${signed ? "" : "disabled"} /></div>
          </div>
          <div class="btnRow" style="margin-top:10px">
            <button class="btn" id="btnCreateTeam" ${signed ? "" : "disabled"}>Create</button>
            <button class="btn secondary" id="btnLoadTeams" ${signed ? "" : "disabled"}>Load My Teams</button>
          </div>

          <div class="hr"></div>
          <div class="small"><b>My Teams</b></div>
          <select id="teamSelect" ${signed ? "" : "disabled"} style="width:100%;margin-top:8px"></select>
          <div class="btnRow" style="margin-top:10px">
            <button class="btn secondary" id="btnSaveTeamSelection" ${signed ? "" : "disabled"}>Select Team</button>
            <button class="btn secondary" id="btnRenewJoinCode" ${signed && selectedTeamId ? "" : "disabled"}>Renew Join Code</button>
          </div>

          <div class="small" style="margin-top:10px">Selected team: <b>${sanitizeHTML(selectedTeamId || "—")}</b></div>
        </div>

        <div class="card" style="padding:12px;margin:10px 0">
          <div class="small"><b>Roster</b></div>
          <div class="row" style="margin-top:10px">
            <div class="field"><label>user_id</label><input id="memberUserId" placeholder="UUID" ${signed && selectedTeamId ? "" : "disabled"} /></div>
            <div class="field">
              <label>role</label>
              <select id="memberRole" ${signed && selectedTeamId ? "" : "disabled"}>
                <option value="athlete">athlete</option>
                <option value="parent">parent</option>
                <option value="coach">coach</option>
              </select>
            </div>
          </div>
          <div class="btnRow" style="margin-top:10px">
            <button class="btn secondary" id="btnLoadMembers" ${signed && selectedTeamId ? "" : "disabled"}>Load roster</button>
            <button class="btn" id="btnAddMember" ${signed && selectedTeamId ? "" : "disabled"}>Add</button>
          </div>

          <div class="hr"></div>
          <div id="memberList" class="small"></div>
        </div>

        <div class="card" style="padding:12px;margin:10px 0">
          <div class="small"><b>Team Heatmap Cache</b></div>
          ${
            state.entitlements.features.heatmap
              ? `
                <div class="small" style="margin-top:6px">Refresh builds a cache used by Dashboard Heatmap.</div>
                <div class="btnRow" style="margin-top:10px">
                  <button class="btn" id="btnRefreshTeamCache" ${signed && selectedTeamId ? "" : "disabled"}>Refresh cache</button>
                </div>
              `
              : `<div class="small" style="margin-top:6px;color:#e67e22">Upgrade to PRO to unlock Team Heatmap.</div>`
          }
        </div>
      `
          : `
        <div class="card" style="padding:12px;margin:10px 0">
          <div class="small"><b>Join Team</b></div>
          <div class="small" style="margin-top:6px">Enter your coach’s join code.</div>
          <div class="row" style="margin-top:10px">
            <div class="field"><label>Join code</label><input id="joinCode" ${signed ? "" : "disabled"} /></div>
            <div class="field">
              <label>Role</label>
              <select id="joinRole" ${signed ? "" : "disabled"}>
                <option value="athlete">athlete</option>
                <option value="parent">parent</option>
              </select>
            </div>
          </div>
          <div class="btnRow" style="margin-top:10px">
            <button class="btn" id="btnJoinTeam" ${signed ? "" : "disabled"}>Join</button>
          </div>
        </div>
      `
      }
    `;

    // Coach: Load teams + create + select
    $("btnLoadTeams")?.addEventListener("click", async () => {
      try {
        const t = await window.dataStore.listMyTeams();
        state.team.roster = t || [];
        saveState();
      } catch (e) {
        alert("Load teams failed: " + (e?.message || e));
      }
    });

    $("btnCreateTeam")?.addEventListener("click", async () => {
      try {
        const name = ($("newTeamName")?.value || "").trim();
        const sport = ($("newTeamSport")?.value || "").trim();
        if (!name) return alert("Enter a team name.");
        const team = await window.dataStore.createTeam(name, sport, { joinCodeLength: 6 });
        state.team.selectedTeamId = String(team.id || "");
        const t = await window.dataStore.listMyTeams();
        state.team.roster = t || [];
        saveState();
        alert("Team created.");
      } catch (e) {
        alert("Create team failed: " + (e?.message || e));
      }
    });

    const teamSelect = $("teamSelect");
    if (teamSelect) {
      const teams = state.team.roster || [];
      teamSelect.innerHTML =
        `<option value="">—</option>` +
        teams.map((t) => `<option value="${sanitizeHTML(t.id)}">${sanitizeHTML(t.name || t.id)} (code: ${sanitizeHTML(t.join_code || "—")})</option>`).join("");
      teamSelect.value = selectedTeamId;
    }

    $("btnSaveTeamSelection")?.addEventListener("click", () => {
      const v = (teamSelect?.value || "").trim();
      state.team.selectedTeamId = v;
      saveState();
      alert("Selected.");
    });

    $("btnRenewJoinCode")?.addEventListener("click", async () => {
      try {
        const tid = String(state.team.selectedTeamId || "").trim();
        if (!tid) return alert("Select a team first.");
        await window.dataStore.renewJoinCode(tid, { joinCodeLength: 6 });
        const t = await window.dataStore.listMyTeams();
        state.team.roster = t || [];
        saveState();
        alert("Join code renewed.");
      } catch (e) {
        alert("Renew failed: " + (e?.message || e));
      }
    });

    // Roster
    async function loadMembers() {
      const tid = String(state.team.selectedTeamId || "").trim();
      if (!tid) throw new Error("Select a team first.");
      const rows = await window.dataStore.listTeamMembers(tid);
      state.team.members = rows || [];
      __saveLocal(state);
      return state.team.members;
    }

    $("btnLoadMembers")?.addEventListener("click", async () => {
      try { await loadMembers(); renderActiveTab(); } catch (e) { alert(e?.message || e); }
    });

    $("btnAddMember")?.addEventListener("click", async () => {
      try {
        const tid = String(state.team.selectedTeamId || "").trim();
        const userId = ($("memberUserId")?.value || "").trim();
        const role = ($("memberRole")?.value || "athlete").trim();
        if (!tid || !userId) return alert("Team + user_id required.");
        await window.dataStore.addTeamMember(tid, userId, role, null);
        await loadMembers();
        renderActiveTab();
      } catch (e) {
        alert("Add failed: " + (e?.message || e));
      }
    });

    const memberList = $("memberList");
    if (memberList && isCoach) {
      const rows = state.team.members || [];
      memberList.innerHTML = rows.length
        ? rows.map((m) => `
          <div class="card" style="margin:8px 0;padding:10px">
            <div><b>${sanitizeHTML(m.user_id || "")}</b> — ${sanitizeHTML(m.role_in_team || "")}</div>
          </div>
        `).join("")
        : "Roster not loaded.";
    }

    // Heatmap cache refresh (Pro+)
    $("btnRefreshTeamCache")?.addEventListener("click", async () => {
      try {
        const tid = String(state.team.selectedTeamId || "").trim();
        if (!tid) return alert("Select a team.");
        if (!state.entitlements.features.heatmap) return alert("Upgrade to PRO to unlock Heatmap.");

        const members = await window.dataStore.listTeamMembers(tid);
        state.team.cache.members = members || [];
        state.team.cache.dateISO = todayISO();
        // NOTE: per-athlete readiness/risk/piq per athlete is next refinement; for now cache members for dashboard.
        state.team.cache.updatedAtMs = Date.now();
        state.team.cache.error = "";
        saveState();
        alert("Heatmap cache refreshed.");
      } catch (e) {
        alert("Refresh failed: " + (e?.message || e));
      }
    });

    // Athlete join by join_code
    $("btnJoinTeam")?.addEventListener("click", async () => {
      try {
        const code = ($("joinCode")?.value || "").trim();
        const role = ($("joinRole")?.value || "athlete").trim();
        if (!code) return alert("Enter join code.");
        const team = await window.dataStore.joinTeamByCode(code, role, null);
        state.team.selectedTeamId = String(team.id || "");
        const t = await window.dataStore.listMyTeams();
        state.team.roster = t || [];
        saveState();
        alert("Joined team.");
      } catch (e) {
        alert("Join failed: " + (e?.message || e));
      }
    });
  }

  function renderSettings() {
    const el = $("tab-settings");
    if (!el) return;

    el.innerHTML = `
      <h3 style="margin-top:0">Settings</h3>
      <div class="small"><b>Upgrade</b></div>
      <div class="hr"></div>

      <div class="card" style="padding:12px;margin:10px 0">
        <div class="small">Current tier: <b>${sanitizeHTML(tierLabel())}</b></div>
        <div class="small" style="margin-top:6px">Pro unlocks Team Heatmap. Elite unlocks Elite Nutrition.</div>
        <div class="btnRow" style="margin-top:10px">
          <button class="btn secondary" id="tierFree">Free</button>
          <button class="btn" id="tierPro">Pro</button>
          <button class="btn" id="tierElite">Elite</button>
        </div>
      </div>

      <div class="card" style="padding:12px;margin:10px 0">
        <div class="small"><b>Elite Nutrition (Elite only)</b></div>
        ${
          state.entitlements.features.nutrition
            ? `
              <div class="row" style="margin-top:10px">
                <div class="field"><label>Goal</label>
                  <select id="nutGoal">
                    <option value="maintain">Maintain</option>
                    <option value="bulk">Bulk</option>
                    <option value="cut">Cut</option>
                  </select>
                </div>
              </div>
              <div class="btnRow" style="margin-top:10px">
                <button class="btn" id="btnBuildMeals">Generate Meal Plan</button>
              </div>
              <div id="mealOut" class="small" style="margin-top:10px"></div>
            `
            : `<div class="small" style="margin-top:8px;color:#e67e22">Upgrade to ELITE to unlock Nutrition.</div>`
        }
      </div>
    `;

    $("tierFree")?.addEventListener("click", () => setTier("free"));
    $("tierPro")?.addEventListener("click", () => setTier("pro"));
    $("tierElite")?.addEventListener("click", () => setTier("elite"));

    $("btnBuildMeals")?.addEventListener("click", () => {
      const w = Number(state.profile.weightLbs || 0);
      if (!w) return alert("Add weight in Profile first.");
      const goal = ($("nutGoal")?.value || "maintain").trim();
      const m = window.PIQ_Nutrition.macros({ weightLbs: w, goal });
      const plan = window.PIQ_Nutrition.mealPlanDay({ macros: m });
      const out = $("mealOut");
      if (out) {
        out.innerHTML = `
          <div><b>Macros</b>: ${sanitizeHTML(m.calories)} cal • P ${sanitizeHTML(m.protein)}g • C ${sanitizeHTML(m.carbs)}g • F ${sanitizeHTML(m.fats)}g</div>
          <div style="margin-top:8px"><b>Meals</b>:</div>
          ${plan.meals.map((x)=>`<div style="margin-top:6px"><b>${sanitizeHTML(x.name)}</b>: ${sanitizeHTML(x.items.join(", "))}<div class="small">${sanitizeHTML(x.note)}</div></div>`).join("")}
        `;
      }
    });
  }

  function renderActiveTab() {
    switch (activeTab()) {
      case "profile": renderProfile(); break;
      case "dashboard": renderDashboard(); break;
      case "team": renderTeam(); break;
      case "settings": renderSettings(); break;
      default: renderProfile(); break;
    }
  }

  // Start
  window.startApp = function () {
    const role = (state.role || "").trim() || (localStorage.getItem("role") || "").trim();
    if (!role) {
      // if you use role chooser elsewhere, call it
      state.role = ROLES.ATHLETE;
      saveState();
    } else if (!state.role) {
      state.role = role;
      __saveLocal(state);
    }

    wireNav();
    showTab(activeTab());
    renderActiveTab();
    hideSplashNow();
    console.log("PerformanceIQ core started. core.js v1.3.0");
  };

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(hideSplashNow, SPLASH_FAILSAFE_MS);
    window.addEventListener("click", hideSplashNow, { once: true });
    window.addEventListener("touchstart", hideSplashNow, { once: true });
  });
})();
