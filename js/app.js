// /js/app.js
import { cacheDOM, dom } from "./ui/dom.js";
import { installInteractions } from "./ui/interactions.js";
import { getThemePref, applyTheme, toggleTheme } from "./ui/theme.js";
import { applySportTheme } from "./ui/sportTheme.js";
import { confirmModal } from "./ui/modal.js";

import { Storage } from "./services/storage.js";
import { toast } from "./services/toast.js";

import { STATE, ATHLETES, loadState, saveState, saveAthletes, setAthletes } from "./state/state.js";
import { STORAGE_KEY_TOUR, STORAGE_KEY_ATHLETES } from "./state/keys.js";

import { switchView, initRouter } from "./router.js";

import { renderDashboard } from "./views/dashboard.js";
import { renderAthletesView, bindAthletesViewEvents } from "./views/athletes.js";
import { renderTrainView, bindTrainViewEvents } from "./views/train.js";
import { renderAnalytics } from "./views/analytics.js";
import { renderSchedule } from "./views/schedule.js";
import { renderWellness, bindWellnessEvents } from "./views/wellness.js";
import { renderNutrition, bindNutritionEvents } from "./views/nutrition.js";

import { initOnboarding, maybeShowOnboarding, closeOnboardingIfOpen } from "./ui/onboarding.js";
import { createTodayTour } from "./ui/tour.js";

/* ---------------------------
   Loader
---------------------------- */
function showLoader() {
  if (dom.loadingScreen) {
    dom.loadingScreen.style.display = "flex";
    dom.loadingScreen.style.pointerEvents = "auto";
  }
}
function hideLoader() {
  if (dom.loadingScreen) {
    dom.loadingScreen.style.display = "none";
    dom.loadingScreen.style.pointerEvents = "none";
  }
}

/* ---------------------------
   Navigation
---------------------------- */
function onEnter(viewId) {
  if (viewId === "dashboard") renderDashboard();
  if (viewId === "athletes") renderAthletesView(dom.athleteSearch?.value || "");
  if (viewId === "train") renderTrainView();
  if (viewId === "analytics") renderAnalytics();
  if (viewId === "schedule") renderSchedule(dom.fullEventList);
  if (viewId === "wellness") renderWellness();
  if (viewId === "nutrition") renderNutrition();
  if (viewId === "settings") { /* settings are native HTML */ }
}

function navigate(viewId) {
  switchView(viewId, { onEnter });
}

function bindNav() {
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.view));
  });
}

/* ---------------------------
   Search
---------------------------- */
function bindSearch() {
  dom.athleteSearch?.addEventListener("input", (e) => {
    const val = e.target.value;
    if (STATE.currentView !== "athletes") navigate("athletes");
    renderAthletesView(val);
  });
}

/* ---------------------------
   Settings
---------------------------- */
function bindSettings() {
  if (dom.settingTeamName) dom.settingTeamName.value = STATE.teamName;
  if (dom.settingSeason) dom.settingSeason.value = STATE.season;
  if (dom.settingSport) dom.settingSport.value = STATE.sport;
  if (dom.settingTheme) dom.settingTheme.value = getThemePref();

  dom.btnSaveSettings?.addEventListener("click", () => {
    STATE.teamName = (dom.settingTeamName?.value || "").trim() || STATE.teamName;
    STATE.season = (dom.settingSeason?.value || "").trim() || STATE.season;
    STATE.sport = String(dom.settingSport?.value || STATE.sport).toLowerCase();

    applySportTheme(STATE.sport);
    saveState();
    renderDashboard();
    toast("Settings saved ✓");
  });
}

/* ---------------------------
   Export / Import / Reset with schema validation
---------------------------- */
function bindDataManagement() {
  dom.btnExportData?.addEventListener("click", () => {
    try {
      const blob = new Blob(
        [JSON.stringify({ athletes: ATHLETES, state: STATE, exportedAt: new Date().toISOString() }, null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `piq-backup-${Date.now()}.json` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Backup downloaded ✓");
    } catch (e) {
      toast("Export failed: " + e.message);
    }
  });

  dom.btnImportData?.addEventListener("click", () => dom.importFileInput?.click());

  dom.importFileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const p = JSON.parse(evt.target.result);
        const athletes = Array.isArray(p?.athletes) ? p.athletes : null;
        if (!athletes) {
          toast("Import failed — missing athletes array");
          return;
        }
        // schema validate
        const ok = athletes.every(a => a && typeof a.id === "string" && typeof a.name === "string");
        if (!ok) {
          toast("Import failed — invalid athlete schema");
          return;
        }
        setAthletes(athletes);
        if (p?.state && typeof p.state === "object") Object.assign(STATE, p.state);
        saveState();
        saveAthletes();
        applySportTheme(STATE.sport);
        renderDashboard();
        toast(`Imported ${ATHLETES.length} athletes ✓`);
      } catch (err) {
        toast("Import failed — invalid JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  dom.btnResetData?.addEventListener("click", async () => {
    const ok = await confirmModal({
      title: "Reset data?",
      message: "This will remove your local athletes and settings on this device.",
      confirmText: "Reset",
      cancelText: "Cancel"
    });
    if (!ok) return;

    try {
      Storage.remove(STORAGE_KEY_ATHLETES);
      Storage.remove("piq_state_v3");
    } catch {}
    location.reload();
  });
}

/* ---------------------------
   Top actions
---------------------------- */
function bindTopActions() {
  dom.btnRefresh?.addEventListener("click", () => { renderDashboard(); toast("Refreshed ↺"); });
  dom.btnExport?.addEventListener("click", () => toast("Report export requires PDF wiring — coming soon 📤"));
  dom.btnExportAnalytics?.addEventListener("click", () => toast("PDF export coming in next phase 📄"));
}

/* ---------------------------
   Main init
---------------------------- */
export async function initApp() {
  showLoader();
  cacheDOM();
  installInteractions();

  // Load state safely
  try {
    loadState();
  } catch (err) {
    toast("Storage error — running in recovery mode", { timeout: 6000 });
  }

  // Theme + sport
  applyTheme(getThemePref());
  dom.btnTheme?.addEventListener("click", toggleTheme);
  dom.settingTheme?.addEventListener("change", (e) => applyTheme(e.target.value));
  applySportTheme(STATE.sport);

  // Bind UI
  bindNav();
  bindSearch();
  bindSettings();
  bindDataManagement();
  bindTopActions();

  bindTrainViewEvents();
  bindAthletesViewEvents();
  bindWellnessEvents();
  bindNutritionEvents();

  // Onboarding + tour
  initOnboarding({
    onAfterFinish: () => {
      renderDashboard();
      navigate("dashboard");
    }
  });

  const TodayTour = createTodayTour({ navigate });
  TodayTour.bindKeyboardShortcuts();

  // Allow onboarding (or other UI) to trigger the tour without importing tour.js again.
  window.addEventListener("piq:tour", () => {
    try { navigate("dashboard"); } catch {}
    try { TodayTour.maybeShow(); } catch {}
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeOnboardingIfOpen();
  });

  // Router
  initRouter({ onEnter });

  // First render
  renderDashboard();
  navigate(STATE.currentView || "dashboard");

  // Show onboarding once if not seen
  maybeShowOnboarding();
  TodayTour.maybeShow?.();

  // Let loader be visible briefly (prevents "no loader" complaint)
  await new Promise(r => setTimeout(r, 250));
  hideLoader();
}
