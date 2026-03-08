// /js/app.js
// Single entrypoint is js/boot.js which calls initApp() from this module.
//
// FIX BUG-14: initRouter now called BEFORE navigate() so hash in URL overrides default view.
// FIX BUG-5:  Added hard loader failsafe timeout in case module loading fails.
// IMP-9:      Debounced search input (150ms) to avoid hammering DOM on every keystroke.
// IMP-12:     Loader hides after render, not after artificial delay.

import { cacheDOM, dom } from "./ui/dom.js";
import { installInteractions } from "./ui/interactions.js";
import { getThemePref, applyTheme, toggleTheme } from "./ui/theme.js";
import { applySportTheme } from "./ui/sportTheme.js";
import { confirmModal } from "./ui/modal.js";

import { Storage, exportPrintableReport } from "./services/storage.js";
import { toast } from "./services/toast.js";

import {
  STATE,
  ATHLETES,
  loadState,
  saveState,
  saveAthletes,
  setAthletes,
  validateBackupPayload,
} from "./state/state.js";
import { STORAGE_KEY_STATE, STORAGE_KEY_ATHLETES } from "./state/keys.js";

import { switchView, initRouter } from "./router.js";

import { renderDashboard } from "./views/dashboard.js";
import { renderAthleteDashboard } from "./views/athleteDashboard.js";

// ... keep all your helper functions here (renderDashboardForRole, navigate, bindNav, etc)
// IMPORTANT: do not run init logic at top-level.

export async function initApp() {
  // Everything that used to run at module load should be inside this function.

  // FIX BUG-5: Hard failsafe — loader MUST hide within 4s regardless
  const loaderFailsafe = setTimeout(hideLoader, 4000);

  showLoader();

  cacheDOM();
  installInteractions();
  installGlobalErrorHooks();

  try {
    loadState();
  } catch {
    toast("Storage error — running in recovery mode", { timeout: 6000 });
  }

  applyTheme(getThemePref());
  dom.btnTheme?.addEventListener("click", toggleTheme);
  dom.settingTheme?.addEventListener("change", (e) => applyTheme(e.target.value));
  applySportTheme(STATE.sport);

  bindNav();
  bindDelegatedActions();
  bindSearch();
  bindSettings();
  bindDataManagement();
  bindTopActions();

  bindTrainViewEvents();
  bindAthletesViewEvents();
  bindWellnessEvents();
  bindNutritionEvents();

  applyRoleVisibility();

  initOnboarding({
    onAfterFinish: () => {
      renderDashboardForRole();
      applyRoleVisibility();
      navigate("dashboard");
    },
  });

  document.getElementById("btnShowOnboarding")?.addEventListener("click", () => {
    try {
      window.dispatchEvent(new Event("piq:showOnboarding"));
    } catch {}
  });

  const TodayTour = createTodayTour({ navigate });
  TodayTour.bindKeyboardShortcuts();

  window.addEventListener("piq:tour", () => {
    try {
      navigate("dashboard");
    } catch {}
    try {
      TodayTour.maybeShow();
    } catch {}
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeOnboardingIfOpen();
  });

  // FIX BUG-14: initRouter BEFORE navigate() so URL hash overrides default
  initRouter({ onEnter });

  // First render
  renderDashboardForRole();
  applyRoleVisibility();

  const startView = STATE.currentView || "dashboard";
  navigate(startView);

  maybeShowOnboarding();
  TodayTour.maybeShow?.();

  // IMP-12: Hide loader after render, not artificial delay
  clearTimeout(loaderFailsafe);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => hideLoader());
  });
}
