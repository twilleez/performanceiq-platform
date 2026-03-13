import { STATE, setLoading, setError, setToast, clearError, isCoach, isSolo } from "./state/state.js";
import { isSupabaseConfigured }                         from "./services/supabase.js";
import { onAuthChange, signIn, signUp, signInWithMagicLink, signOut } from "./services/auth.js";
import { getProfile, updateProfile }                    from "./services/profiles.js";
import { getTodaysWorkout, createWorkout, saveWorkoutProgress, completeWorkout, getRecentWorkouts } from "./services/workouts.js";
import { getTodaysReadiness, saveReadiness, getReadinessTrend } from "./services/readiness.js";
import { getPersonalRecords }                           from "./services/prs.js";
import { getAthleteTeam, getTeamReadiness }             from "./services/teams.js";
import {
  soloGetProfile, soloSaveProfile,
  soloGetTodaysReadiness, soloSaveReadiness, soloGetReadinessTrend,
  soloGetTodaysWorkout, soloCreateWorkout, soloSaveWorkoutProgress,
  soloCompleteWorkout, soloGetRecentWorkouts, soloGetPRs, soloClearAll,
} from "./state/soloStore.js";
import { getSwapOptions, swapExercise, markSetDone, buildWorkoutPayload } from "./features/trainingEngine.js";
import { renderScreen }   from "./router.js";
import { authView }       from "./views/auth.js";
import { readinessSheet, setLoggingSheet, swapSheet, detailSheet, videoSheet, onboardingSheet } from "./views/sheets.js";

const app = document.getElementById("app");

// ─── Scroll preservation ──────────────────────────────────────────────────────
let _scrollY = 0;
const saveScroll    = () => { _scrollY = window.scrollY; };
const restoreScroll = () => requestAnimationFrame(() => window.scrollTo(0, _scrollY));

// ─── Load data ────────────────────────────────────────────────────────────────
async function loadData(userId) {
  setLoading(true);
  try {
    if (isSolo()) {
      // Solo mode: pull everything from localStorage
      STATE.profile        = soloGetProfile();
      STATE.workout        = soloGetTodaysWorkout();
      STATE.readiness      = soloGetTodaysReadiness();
      STATE.prs            = soloGetPRs();
      STATE.readinessTrend = soloGetReadinessTrend(14);
      STATE.recentWorkouts = soloGetRecentWorkouts(30);
      STATE.team           = null;
      STATE.teamReadiness  = [];
    } else {
      // Connected mode: Supabase
      const [profile, workout, readiness, prs, trend, recentWorkouts, team] = await Promise.all([
        getProfile(userId),
        getTodaysWorkout(userId),
        getTodaysReadiness(userId),
        getPersonalRecords(userId),
        getReadinessTrend(userId, 14),
        getRecentWorkouts(userId, 30),
        getAthleteTeam(userId),
      ]);
      STATE.profile        = profile;
      STATE.workout        = workout;
      STATE.readiness      = readiness;
      STATE.prs            = prs;
      STATE.readinessTrend = trend;
      STATE.recentWorkouts = recentWorkouts;
      STATE.team           = team;

      // Coach: also load team readiness
      if (isCoach() && team) {
        STATE.teamReadiness = await getTeamReadiness(team.id).catch(() => []);
      }
    }
    STATE.ui.error = null;
  } catch (e) {
    setError("Failed to load data. Check your connection.");
    console.error("loadData error:", e);
  } finally {
    setLoading(false);
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  try {
    // Show auth if not logged in AND not solo
    if (!STATE.session && !isSolo()) {
      app.innerHTML = authView(STATE);
      bindAuth();
      return;
    }

    // Show onboarding if no profile yet
    if (!STATE.profile && !STATE.ui.loading) {
      if (!STATE.ui.onboardingStep) STATE.ui.onboardingStep = 1;
      if (!STATE.ui.onboardingDraft) STATE.ui.onboardingDraft = {};
      app.innerHTML = onboardingSheet(STATE);
      bindOnboarding();
      return;
    }

    if (STATE.ui.loading) {
      app.innerHTML = `
        <div style="min-height:100vh;display:grid;place-items:center;flex-direction:column;gap:12px">
          <div class="loading-spinner"></div>
          <div class="muted" style="margin-top:12px">Loading your data…</div>
        </div>`;
      return;
    }

    const swapOptions = STATE.ui.activeSwapExerciseId
      ? getSwapOptions(STATE.ui.activeSwapExerciseId, STATE.profile?.sport ?? "basketball")
      : [];

    const toast = STATE.ui.toast
      ? `<div class="toast toast-${STATE.ui.toast.type}">${STATE.ui.toast.msg}</div>`
      : "";

    app.innerHTML =
      `<div class="app-shell">${renderScreen(STATE)}${nowBar()}${bottomNav()}</div>` +
      readinessSheet(STATE) +
      setLoggingSheet(STATE) +
      swapSheet(STATE, swapOptions) +
      detailSheet(STATE) +
      videoSheet(STATE) +
      onboardingSheet(STATE) +
      toast;

    bindUI();
    restoreScroll();
  } catch (e) {
    console.error("Render error:", e);
    app.innerHTML = `
      <div style="min-height:100vh;display:grid;place-items:center;padding:20px">
        <div class="card" style="max-width:400px;text-align:center;padding:28px">
          <div style="font-size:40px;margin-bottom:12px">⚠️</div>
          <div class="title-md" style="margin-bottom:8px">Something went wrong</div>
          <div class="muted" style="font-size:13px;margin-bottom:16px">${e.message}</div>
          <button onclick="window.location.reload()">Reload App</button>
        </div>
      </div>`;
  }
}

// ─── Nav helpers ──────────────────────────────────────────────────────────────
function navBtn(key, icon, label) {
  const active = STATE.ui.tab === key;
  return `<button class="nav-btn${active ? " active" : ""}" data-nav="${key}">
    <span style="font-size:18px">${icon}</span>
    <span>${label}</span>
  </button>`;
}

function teamNavBtn(key, icon, label) {
  const active = STATE.ui.teamTab === key;
  return `<button class="nav-btn${active ? " active" : ""}" data-team-nav="${key}">
    <span style="font-size:18px">${icon}</span>
    <span>${label}</span>
  </button>`;
}

function nowBar() {
  if (STATE.ui.tab !== "session" || isCoach() || !STATE.workout) return "";
  return `
    <div class="now-bar">
      <div>
        <strong style="font-size:14px">${STATE.workout.title}</strong>
        <div class="muted small">Active session</div>
      </div>
      <button class="sm" data-action="end-session" style="background:rgba(52,211,153,.15);color:#34d399;border:1px solid rgba(52,211,153,.3)">
        Finish
      </button>
    </div>`;
}

function bottomNav() {
  if (isCoach()) {
    return `<nav class="bottom-nav">
      ${teamNavBtn("team-home",  "🏠", "Home")}
      ${teamNavBtn("schedule",   "📅", "Schedule")}
      ${teamNavBtn("roster",     "👥", "Roster")}
      ${teamNavBtn("activity",   "📊", "Activity")}
    </nav>`;
  }
  return `<nav class="bottom-nav">
    ${navBtn("today",    "🏠", "Today")}
    ${navBtn("session",  "🏋️", "Train")}
    ${navBtn("progress", "📈", "Progress")}
    ${navBtn("profile",  "👤", "Profile")}
  </nav>`;
}

// ─── Auth binding ─────────────────────────────────────────────────────────────
function bindAuth() {
  const $ = id => document.getElementById(id);

  $("btn-signin")?.addEventListener("click", async () => {
    clearError();
    try {
      await signIn({ email: $("auth-email").value, password: $("auth-password").value });
    } catch (e) {
      setError(e.message);
      render();
    }
  });

  $("btn-signup")?.addEventListener("click", () => {
    $("auth-email-form").hidden = true;
    $("signup-role-step").hidden = false;

    const doSignup = async role => {
      try {
        await signUp({
          email:    $("auth-email").value,
          password: $("auth-password").value,
          name:     $("auth-email").value.split("@")[0],
          role,
        });
        setToast("Account created! Check your email.", "success");
        $("signup-role-step").hidden = true;
        $("auth-email-form").hidden  = false;
        render();
      } catch (e) {
        setError(e.message);
        render();
      }
    };

    $("btn-role-athlete")?.addEventListener("click", () => doSignup("athlete"));
    $("btn-role-coach")?.addEventListener("click",   () => doSignup("coach"));
  });

  $("btn-magic")?.addEventListener("click", async () => {
    clearError();
    try {
      await signInWithMagicLink({ email: $("auth-email").value });
      $("magic-sent").hidden = false;
    } catch (e) {
      setError(e.message);
      render();
    }
  });

  $("btn-solo")?.addEventListener("click", () => {
    STATE.mode = "solo";
    STATE.ui.onboardingStep  = 1;
    STATE.ui.onboardingDraft = {};
    render();
  });
}

// ─── Onboarding binding ───────────────────────────────────────────────────────
function bindOnboarding() {
  const draft = STATE.ui.onboardingDraft;

  // Sport picker buttons
  document.querySelectorAll("[data-ob-sport]").forEach(btn => {
    btn.addEventListener("click", () => {
      draft.sport = btn.dataset.obSport;
      render();
    });
  });

  // Goal picker
  document.querySelectorAll("[data-ob-goal]").forEach(btn => {
    btn.addEventListener("click", () => {
      draft.goal = btn.dataset.obGoal;
      render();
    });
  });

  // Role picker
  document.querySelectorAll("[data-ob-role]").forEach(btn => {
    btn.addEventListener("click", () => {
      draft.role = btn.dataset.obRole;
      render();
    });
  });

  // Equipment multi-select
  document.querySelectorAll("[data-ob-equip]").forEach(btn => {
    btn.addEventListener("click", () => {
      const equip = draft.equipment ?? [];
      const item  = btn.dataset.obEquip;
      draft.equipment = equip.includes(item)
        ? equip.filter(e => e !== item)
        : [...equip, item];
      render();
    });
  });

  // Step navigation
  document.querySelector("[data-action='ob-step-2']")?.addEventListener("click", () => {
    const nameEl = document.getElementById("ob-name");
    if (nameEl) draft.name = nameEl.value.trim();
    if (!draft.name) { alert("Please enter your name."); return; }
    if (!draft.sport) { alert("Please select a sport."); return; }
    STATE.ui.onboardingStep = 2;
    render();
  });

  document.querySelector("[data-action='ob-step-1']")?.addEventListener("click", () => {
    STATE.ui.onboardingStep = 1;
    render();
  });

  document.querySelector("[data-action='ob-step-3']")?.addEventListener("click", () => {
    const posEl = document.getElementById("ob-position");
    if (posEl) draft.position = posEl.value;
    if (!draft.goal) { alert("Please select a goal."); return; }
    if (!draft.role) { draft.role = "athlete"; }
    STATE.ui.onboardingStep = 3;
    render();
  });

  document.querySelector("[data-action='ob-step-2']")?.addEventListener("click", () => {
    STATE.ui.onboardingStep = 2;
    render();
  });

  document.querySelector("[data-action='ob-finish']")?.addEventListener("click", async () => {
    const profile = {
      name:      draft.name      ?? "Athlete",
      sport:     draft.sport     ?? "basketball",
      position:  draft.position  ?? "",
      goal:      draft.goal      ?? "General Fitness",
      role:      draft.role      ?? "athlete",
      equipment: draft.equipment ?? [],
    };

    if (isSolo()) {
      STATE.profile = soloSaveProfile(profile);
    } else if (STATE.session) {
      try {
        STATE.profile = await updateProfile(STATE.session.user.id, profile);
      } catch (e) {
        STATE.profile = { ...profile, id: STATE.session.user.id };
      }
    }

    STATE.ui.onboardingStep  = null;
    STATE.ui.onboardingDraft = null;

    setToast(`Welcome, ${profile.name.split(" ")[0]}! 🎉`, "success");
    await loadData(STATE.session?.user?.id ?? "solo");
    render();
  });
}

// ─── Main UI binding ──────────────────────────────────────────────────────────
function bindUI() {
  const on = (sel, fn) =>
    document.querySelectorAll(sel).forEach(el =>
      el.addEventListener("click", e => { e.stopPropagation(); fn(e.currentTarget); })
    );

  // ── Navigation ──
  on("[data-nav]", btn => {
    saveScroll();
    STATE.ui.tab = btn.dataset.nav;
    render();
  });
  on("[data-team-nav]", btn => {
    saveScroll();
    STATE.ui.teamTab = btn.dataset.teamNav;
    STATE.mode = "team";
    render();
  });

  // ── Session ──
  on("[data-action='start-session']", () => { STATE.ui.tab = "session"; render(); });
  on("[data-action='end-session']", async () => {
    if (STATE.workout) {
      try {
        if (isSolo()) {
          soloCompleteWorkout(STATE.workout.id, STATE.workout.exercises);
        } else {
          await completeWorkout(STATE.workout.id, STATE.workout.exercises);
        }
        setToast("Session complete. Great work. 💪", "success");
        await loadData(STATE.session?.user?.id ?? "solo");
      } catch (e) {
        setError("Could not save session.");
      }
    }
    STATE.ui.tab = "today";
    render();
  });

  // ── Sign out ──
  on("[data-action='sign-out']", async () => {
    try { await signOut(); } catch {}
    STATE.session = null;
    STATE.profile = null;
    STATE.mode    = "solo";
    render();
  });

  // ── Sign in prompt (from solo mode) ──
  on("[data-action='sign-in-prompt']", () => {
    STATE.mode    = "connected";
    STATE.session = null;
    render();
  });

  // ── Readiness ──
  on("[data-action='open-readiness']", () => {
    STATE.ui.activeReadinessSheet = true;
    render();
  });
  on("[data-action='close-readiness']", () => {
    STATE.ui.activeReadinessSheet = false;
    render();
  });
  on("[data-action='save-readiness']", async () => {
    const sleepEl    = document.getElementById("ri-sleep");
    const sorenessEl = document.getElementById("ri-soreness");
    const hydraEl    = document.getElementById("ri-hydration");
    const batteryEl  = document.getElementById("ri-battery");

    const vals = {
      sleep:       parseFloat(sleepEl?.value)   || STATE.readiness?.sleep_hrs    || 7,
      soreness:    sorenessEl?.value             || STATE.readiness?.soreness     || "Low",
      hydration:   hydraEl?.value                || STATE.readiness?.hydration    || "On target",
      bodyBattery: parseInt(batteryEl?.value)    || STATE.readiness?.body_battery || 70,
      hrv:         STATE.readiness?.hrv ?? "",
      // Auto-score from the inputs (simplified algorithm)
      score: computeReadinessScore(
        parseFloat(sleepEl?.value) || 7,
        sorenessEl?.value || "Low",
        parseInt(batteryEl?.value) || 70
      ),
    };

    try {
      if (isSolo()) {
        STATE.readiness = soloSaveReadiness(vals);
        STATE.readinessTrend = soloGetReadinessTrend(14);
      } else {
        STATE.readiness = await saveReadiness(STATE.session.user.id, vals);
        STATE.readinessTrend = await getReadinessTrend(STATE.session.user.id, 14);
      }
      STATE.ui.activeReadinessSheet = false;
      setToast("Check-in saved. Score: " + vals.score, "success");
    } catch (e) {
      setError("Could not save check-in.");
    }
    render();
  });

  // ── Set logging ──
  on("[data-action='open-sets']", btn => {
    STATE.ui.activeSetExerciseId = btn.dataset.ex;
    render();
  });
  on("[data-action='close-set-sheet']", () => {
    STATE.ui.activeSetExerciseId = null;
    render();
  });
  on("[data-action='toggle-set']", async btn => {
    if (!STATE.workout) return;
    markSetDone(STATE.workout, btn.dataset.ex, Number(btn.dataset.set));
    render(); // optimistic
    try {
      if (isSolo()) {
        soloSaveWorkoutProgress(STATE.workout.id, STATE.workout.exercises);
      } else {
        await saveWorkoutProgress(STATE.workout.id, STATE.workout.exercises);
      }
    } catch {}
  });

  // ── Swap ──
  on("[data-action='swap']", btn => {
    STATE.ui.activeSwapExerciseId = btn.dataset.ex;
    render();
  });
  on("[data-action='close-swap-sheet']", () => {
    STATE.ui.activeSwapExerciseId = null;
    render();
  });
  on("[data-action='pick-swap']", async btn => {
    if (!STATE.workout) return;
    swapExercise(STATE.workout, STATE.ui.activeSwapExerciseId, btn.dataset.new);
    STATE.ui.activeSwapExerciseId = null;
    render();
    try {
      if (isSolo()) {
        soloSaveWorkoutProgress(STATE.workout.id, STATE.workout.exercises);
      } else {
        await saveWorkoutProgress(STATE.workout.id, STATE.workout.exercises);
      }
    } catch {}
  });

  // ── Detail ──
  on("[data-action='detail']", btn => {
    STATE.ui.activeDetailExerciseId = btn.dataset.ex;
    render();
  });
  on("[data-action='close-detail-sheet']", () => {
    STATE.ui.activeDetailExerciseId = null;
    render();
  });

  // ── Video ──
  on("[data-action='video']", btn => {
    STATE.ui.activeVideoUrl  = btn.dataset.url ?? null;
    STATE.ui.videoSheetOpen  = true;
    render();
  });
  on("[data-action='close-video-sheet']", () => {
    STATE.ui.videoSheetOpen = false;
    STATE.ui.activeVideoUrl = null;
    render();
  });

  // ── Generate workout ──
  on("[data-action='auto-workout']", async () => {
    const score   = STATE.readiness?.score ?? 75;
    const sport   = STATE.profile?.sport ?? "basketball";
    const payload = buildWorkoutPayload(sport, score);
    try {
      if (isSolo()) {
        STATE.workout = soloCreateWorkout(payload);
      } else {
        STATE.workout = await createWorkout(STATE.session.user.id, payload);
      }
      STATE.ui.tab = "session";
      setToast("Workout generated. Let's go.", "success");
    } catch (e) {
      setError("Could not generate workout.");
    }
    render();
  });

  // ── Save profile ──
  on("[data-action='save-profile']", async () => {
    const nameEl  = document.getElementById("p-name");
    const sportEl = document.getElementById("p-sport");
    const posEl   = document.getElementById("p-position");
    const goalEl  = document.getElementById("p-goal");

    const updates = {
      name:     nameEl?.value  || STATE.profile.name,
      sport:    sportEl?.value || STATE.profile.sport,
      position: posEl?.value   || STATE.profile.position,
      goal:     goalEl?.value  || STATE.profile.goal,
    };

    try {
      if (isSolo()) {
        STATE.profile = soloSaveProfile({ ...STATE.profile, ...updates });
      } else {
        STATE.profile = await updateProfile(STATE.session.user.id, updates);
      }
      setToast("Profile saved.", "success");
    } catch (e) {
      setError("Could not save profile.");
    }
    render();
  });

  // ── Reset solo data ──
  on("[data-action='reset-solo']", () => {
    if (!confirm("Clear ALL local data? This cannot be undone.")) return;
    soloClearAll();
    STATE.profile        = null;
    STATE.workout        = null;
    STATE.readiness      = null;
    STATE.prs            = [];
    STATE.readinessTrend = [];
    STATE.recentWorkouts = [];
    STATE.ui.onboardingStep  = 1;
    STATE.ui.onboardingDraft = {};
    render();
  });
}

// ─── Readiness auto-score ──────────────────────────────────────────────────────
function computeReadinessScore(sleepHrs, soreness, battery) {
  let score = 50;
  // Sleep contribution (up to 25 pts)
  score += Math.min(25, Math.round((sleepHrs / 9) * 25));
  // Soreness contribution (up to 25 pts — inverse)
  const sorenessMap = { "None": 25, "Low": 20, "Moderate": 10, "High": 0 };
  score += sorenessMap[soreness] ?? 15;
  // Battery contribution (up to 25 pts)
  score += Math.round((battery / 100) * 25) - 13; // centre around 0
  return Math.max(10, Math.min(99, score));
}

// ─── Entry point ─────────────────────────────────────────────────────────────
async function boot() {
  // Attempt Supabase auth first if configured
  if (isSupabaseConfigured) {
    onAuthChange(async session => {
      STATE.session = session;
      if (session) {
        STATE.mode = "connected";
        render(); // show loading immediately
        await loadData(session.user.id);
      }
      render();
    });
  } else {
    // No Supabase configured — check for saved solo profile
    const saved = soloGetProfile();
    if (saved) {
      STATE.mode = "solo";
      await loadData("solo");
    }
    render();
  }
}

boot();
