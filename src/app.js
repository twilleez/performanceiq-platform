import { STATE, setLoading, setError, setToast, isCoach } from "./state/state.js";
import { onAuthChange, signIn, signUp, signInWithMagicLink, signOut } from "./services/auth.js";
import { getProfile }                 from "./services/profiles.js";
import { getTodaysWorkout, createWorkout, saveWorkoutProgress, completeWorkout } from "./services/workouts.js";
import { getTodaysReadiness, saveReadiness, getReadinessTrend } from "./services/readiness.js";
import { getPersonalRecords }         from "./services/prs.js";
import { getAthleteTeam }             from "./services/teams.js";
import { getSwapOptions, swapExercise, markSetDone, buildWorkoutPayload } from "./features/trainingEngine.js";
import { renderScreen }               from "./router.js";
import { authView }                   from "./views/auth.js";
import { readinessSheet, setLoggingSheet, swapSheet, detailSheet, videoSheet } from "./views/sheets.js";

const app = document.getElementById("app");

// ─── Scroll preservation ──────────────────────────────────────────────────────
let _scrollY = 0;
const saveScroll    = () => { _scrollY = window.scrollY; };
const restoreScroll = () => requestAnimationFrame(() => window.scrollTo(0, _scrollY));

// ─── Load all data for current user ──────────────────────────────────────────
async function loadData(userId) {
  setLoading(true);
  try {
    const [profile, workout, readiness, prs, trend, team] = await Promise.all([
      getProfile(userId),
      getTodaysWorkout(userId),
      getTodaysReadiness(userId),
      getPersonalRecords(userId),
      getReadinessTrend(userId, 14),
      getAthleteTeam(userId),
    ]);
    STATE.profile        = profile;
    STATE.workout        = workout;
    STATE.readiness      = readiness;
    STATE.prs            = prs;
    STATE.readinessTrend = trend;
    STATE.team           = team;
    STATE.ui.error       = null;
  } catch (e) {
    setError("Failed to load your data. Check your connection.");
    console.error(e);
  } finally {
    setLoading(false);
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  if (!STATE.session) {
    app.innerHTML = authView(STATE);
    bindAuth();
    return;
  }

  if (STATE.ui.loading) {
    app.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center"><div class="muted">Loading…</div></div>`;
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
    toast;

  bindUI();
  restoreScroll();
}

// ─── Nav helpers ──────────────────────────────────────────────────────────────
function navBtn(key, label) {
  return `<button class="nav-btn${STATE.ui.tab === key ? " active" : ""}" data-nav="${key}">${label}</button>`;
}
function teamNavBtn(key, label) {
  return `<button class="nav-btn${STATE.ui.teamTab === key ? " active" : ""}" data-team-nav="${key}">${label}</button>`;
}
function nowBar() {
  if (STATE.ui.tab !== "session" || isCoach()) return "";
  return `
    <div class="now-bar">
      <div><strong>${STATE.workout?.title ?? "Session"}</strong><div class="muted small">Active</div></div>
      <div class="row">
        <button class="sm" data-action="end-session">Finish</button>
      </div>
    </div>`;
}
function bottomNav() {
  if (isCoach()) {
    return `<div class="bottom-nav">
      ${teamNavBtn("team-home","Home")}${teamNavBtn("schedule","Schedule")}
      ${teamNavBtn("roster","Roster")}${teamNavBtn("activity","Activity")}
    </div>`;
  }
  return `<div class="bottom-nav">
    ${navBtn("today","Today")}${navBtn("session","Train")}
    ${navBtn("progress","Progress")}${navBtn("profile","Profile")}
  </div>`;
}

// ─── Auth binding ─────────────────────────────────────────────────────────────
function bindAuth() {
  const $ = id => document.getElementById(id);

  $("btn-signin")?.addEventListener("click", async () => {
    try {
      await signIn({ email: $("auth-email").value, password: $("auth-password").value });
      // onAuthChange will re-render
    } catch (e) {
      setError(e.message);
      render();
    }
  });

  $("btn-signup")?.addEventListener("click", async () => {
    // Show role step first
    $("auth-email-form").hidden = true;
    $("signup-role-step").hidden = false;

    const doSignup = async (role) => {
      try {
        await signUp({
          email:    $("auth-email").value,
          password: $("auth-password").value,
          name:     $("auth-email").value.split("@")[0],
          role,
        });
        setToast("Account created! Check your email to confirm.", "success");
        $("signup-role-step").hidden = true;
        $("auth-email-form").hidden = false;
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
    try {
      await signInWithMagicLink({ email: $("auth-email").value });
      $("magic-sent").hidden = false;
    } catch (e) {
      setError(e.message);
      render();
    }
  });
}

// ─── Main UI binding ──────────────────────────────────────────────────────────
function bindUI() {
  const on = (sel, fn) =>
    document.querySelectorAll(sel).forEach(el =>
      el.addEventListener("click", e => fn(e.currentTarget))
    );

  // Navigation
  on("[data-nav]", btn => { saveScroll(); STATE.ui.tab = btn.dataset.nav; render(); });
  on("[data-team-nav]", btn => { saveScroll(); STATE.ui.teamTab = btn.dataset.teamNav; STATE.mode = "team"; render(); });

  // Session
  on("[data-action='start-session']", () => { STATE.ui.tab = "session"; render(); });
  on("[data-action='end-session']",   async () => {
    if (STATE.workout) {
      await completeWorkout(STATE.workout.id, STATE.workout.exercises);
      setToast("Session complete. Great work.", "success");
      await loadData(STATE.session.user.id);
    }
    STATE.ui.tab = "today";
    render();
  });

  // Sign out
  on("[data-action='sign-out']", async () => {
    await signOut();
    // onAuthChange will handle the rest
  });

  // Readiness
  on("[data-action='open-readiness']",  () => { STATE.ui.activeReadinessSheet = true;  render(); });
  on("[data-action='close-readiness']", () => { STATE.ui.activeReadinessSheet = false; render(); });
  on("[data-action='save-readiness']",  async () => {
    const sleepEl     = document.getElementById("ri-sleep");
    const sorenessEl  = document.getElementById("ri-soreness");
    const hydrationEl = document.getElementById("ri-hydration");
    try {
      const updated = await saveReadiness(STATE.session.user.id, {
        score:       STATE.readiness?.score ?? 75,
        sleep:       parseFloat(sleepEl?.value)  || STATE.readiness?.sleep_hrs,
        soreness:    sorenessEl?.value  || STATE.readiness?.soreness,
        hydration:   hydrationEl?.value || STATE.readiness?.hydration,
        bodyBattery: STATE.readiness?.body_battery ?? 70,
        hrv:         STATE.readiness?.hrv ?? "",
      });
      STATE.readiness = updated;
      STATE.ui.activeReadinessSheet = false;
      setToast("Check-in saved.", "success");
    } catch (e) {
      setError("Could not save check-in.");
    }
    render();
  });

  // Set logging
  on("[data-action='open-sets']",      btn => { STATE.ui.activeSetExerciseId = btn.dataset.ex; render(); });
  on("[data-action='close-set-sheet']",()  => { STATE.ui.activeSetExerciseId = null;            render(); });
  on("[data-action='toggle-set']",     async btn => {
    if (!STATE.workout) return;
    markSetDone(STATE.workout, btn.dataset.ex, Number(btn.dataset.set));
    render(); // optimistic
    await saveWorkoutProgress(STATE.workout.id, STATE.workout.exercises);
  });

  // Swap
  on("[data-action='swap']",              btn => { STATE.ui.activeSwapExerciseId = btn.dataset.ex; render(); });
  on("[data-action='close-swap-sheet']",  ()  => { STATE.ui.activeSwapExerciseId = null;            render(); });
  on("[data-action='pick-swap']",         async btn => {
    swapExercise(STATE.workout, STATE.ui.activeSwapExerciseId, btn.dataset.new);
    STATE.ui.activeSwapExerciseId = null;
    render();
    await saveWorkoutProgress(STATE.workout.id, STATE.workout.exercises);
  });

  // Detail
  on("[data-action='detail']",              btn => { STATE.ui.activeDetailExerciseId = btn.dataset.ex; render(); });
  on("[data-action='close-detail-sheet']",  ()  => { STATE.ui.activeDetailExerciseId = null;            render(); });

  // Video
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

  // Auto-generate workout
  on("[data-action='auto-workout']", async () => {
    const readinessScore = STATE.readiness?.score ?? 75;
    const payload = buildWorkoutPayload(STATE.profile.sport, readinessScore);
    try {
      const created = await createWorkout(STATE.session.user.id, payload);
      STATE.workout = created;
      setToast("Workout generated.", "success");
    } catch (e) {
      setError("Could not generate workout.");
    }
    render();
  });
}

// ─── Auth state listener (entry point) ───────────────────────────────────────
onAuthChange(async session => {
  STATE.session = session;
  if (session) {
    render(); // show loading state immediately
    await loadData(session.user.id);
  }
  render();
});
