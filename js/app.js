import { STATE, hydrateState, SCHEMA_VERSION } from "./state/state.js";
import { saveState } from "./services/storage.js";
import { getSwapOptions, swapExercise, markSetDone, autoGenerateWorkout } from "./features/trainingEngine.js";
import { renderScreen } from "./router.js";
import { authView } from "./views/auth.js";
import { readinessSheet, setLoggingSheet, swapSheet, detailSheet, videoSheet, historySheet } from "./views/sheets.js";

hydrateState();
const app = document.getElementById("app");
let _savedScrollY = 0;
function saveScroll(){ _savedScrollY = window.scrollY; }
function restoreScroll(){ requestAnimationFrame(() => window.scrollTo(0, _savedScrollY)); }
function navBtn(key, label) { return `<button class="nav-btn${STATE.ui.tab === key ? " active" : ""}" data-nav="${key}">${label}</button>`; }
function teamNavBtn(key, label) { return `<button class="nav-btn${STATE.ui.teamTab === key ? " active" : ""}" data-team-nav="${key}">${label}</button>`; }
function nowBar() { if (STATE.ui.tab !== "session" || STATE.mode !== "athlete") return ""; const workout = STATE.workouts.find(w => w.id === STATE.ui.activeWorkoutId) || STATE.workouts[0]; return `<div class="now-bar"><div><strong>${workout.title}</strong><div class="muted small">Session active</div></div><div class="row"><button class="secondary sm" data-action="auto-workout">Auto Workout</button><button class="sm" data-action="end-session">Finish</button></div></div>`; }
function bottomNav() { if (STATE.mode === "team") { return `<div class="bottom-nav">${teamNavBtn("team-home", "Home")}${teamNavBtn("schedule", "Schedule")}${teamNavBtn("roster", "Roster")}${teamNavBtn("activity", "Activity")}</div>`; } return `<div class="bottom-nav">${navBtn("today", "Today")}${navBtn("session", "Train")}${navBtn("progress", "Progress")}${navBtn("profile", "Profile")}</div>`; }
function render() { if (!STATE.session.loggedIn) { app.innerHTML = authView(); bindAuth(); return; } const swapOptions = STATE.ui.activeSwapExerciseId ? getSwapOptions(STATE.ui.activeSwapExerciseId, STATE.athlete.sport) : []; const main = `<div class="app-shell">${renderScreen(STATE)}${nowBar()}${bottomNav()}</div>`; app.innerHTML = main + readinessSheet(STATE) + setLoggingSheet(STATE) + swapSheet(STATE, swapOptions) + detailSheet(STATE) + videoSheet(STATE) + historySheet(STATE); bindUI(); saveState(STATE); restoreScroll(); }
function bindAuth() { document.getElementById("login-athlete").onclick = () => { STATE.session.loggedIn = true; STATE.session.user = document.getElementById("login-name").value.trim() || "Athlete"; STATE.mode = "athlete"; render(); }; document.getElementById("login-team").onclick = () => { STATE.session.loggedIn = true; STATE.session.user = document.getElementById("login-name").value.trim() || "Coach"; STATE.mode = "team"; render(); }; }
function bindUI() { const on = (sel, fn) => document.querySelectorAll(sel).forEach(el => el.addEventListener("click", e => fn(e.currentTarget)));
  on("[data-nav]", btn => { saveScroll(); STATE.ui.tab = btn.dataset.nav; render(); });
  on("[data-team-nav]", btn => { saveScroll(); STATE.ui.teamTab = btn.dataset.teamNav; STATE.mode = "team"; render(); });
  on("[data-action='open-team-tab']", btn => { STATE.mode = "team"; STATE.ui.teamTab = btn.dataset.teamtab; render(); });
  on("[data-action='start-session']", () => { STATE.ui.tab = "session"; render(); });
  on("[data-action='end-session']", () => { STATE.ui.tab = "today"; render(); });
  on("[data-action='open-readiness']", () => { STATE.ui.activeReadinessSheet = true; render(); });
  on("[data-action='close-readiness']", () => { STATE.ui.activeReadinessSheet = false; render(); });
  on("[data-action='save-readiness']", () => { const sleepEl = document.getElementById("ri-sleep"); const sorenessEl = document.getElementById("ri-soreness"); const hydrationEl = document.getElementById("ri-hydration"); if (sleepEl) STATE.athlete.sleep = parseFloat(sleepEl.value) || STATE.athlete.sleep; if (sorenessEl) STATE.athlete.soreness = sorenessEl.value; if (hydrationEl) STATE.athlete.hydration = hydrationEl.value; STATE.ui.activeReadinessSheet = false; render(); });
  on("[data-action='open-sets']", btn => { STATE.ui.activeSetExerciseId = btn.dataset.ex; render(); });
  on("[data-action='close-set-sheet']", () => { STATE.ui.activeSetExerciseId = null; render(); });
  on("[data-action='toggle-set']", btn => { const workout = STATE.workouts.find(w => w.id === STATE.ui.activeWorkoutId) || STATE.workouts[0]; markSetDone(workout, btn.dataset.ex, Number(btn.dataset.set)); render(); });
  on("[data-action='swap']", btn => { STATE.ui.activeSwapExerciseId = btn.dataset.ex; render(); });
  on("[data-action='close-swap-sheet']", () => { STATE.ui.activeSwapExerciseId = null; render(); });
  on("[data-action='pick-swap']", btn => { const workout = STATE.workouts.find(w => w.id === STATE.ui.activeWorkoutId) || STATE.workouts[0]; swapExercise(workout, STATE.ui.activeSwapExerciseId, btn.dataset.new); STATE.ui.activeSwapExerciseId = null; render(); });
  on("[data-action='detail']", btn => { STATE.ui.activeDetailExerciseId = btn.dataset.ex; render(); });
  on("[data-action='close-detail-sheet']", () => { STATE.ui.activeDetailExerciseId = null; render(); });
  on("[data-action='video']", btn => { STATE.ui.activeVideoUrl = btn.dataset.url || null; STATE.ui.videoSheetOpen = true; render(); });
  on("[data-action='close-video-sheet']", () => { STATE.ui.activeVideoUrl = null; STATE.ui.videoSheetOpen = false; render(); });
  on("[data-action='auto-workout']", () => { const w = autoGenerateWorkout(STATE.athlete.sport, STATE.athlete.readiness); STATE.workouts.unshift(w); STATE.ui.activeWorkoutId = w.id; render(); });
  on("[data-action='open-history']", () => { STATE.ui.activeHistorySheet = true; render(); });
  on("[data-action='close-history']", () => { STATE.ui.activeHistorySheet = false; render(); });
}
render();
