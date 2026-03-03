// /js/app.js
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
  validateBackupPayload
} from "./state/state.js";
import { STORAGE_KEY_STATE, STORAGE_KEY_ATHLETES } from "./state/keys.js";

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
  if (viewId === "schedule") renderSchedule(dom.fullEventList || null);
  if (viewId === "wellness") renderWellness();
  if (viewId === "nutrition") renderNutrition();
  if (viewId === "settings") { /* native HTML */ }
}

function applyRoleVisibility() {
  const role = String(STATE.role || "coach");
  const items = Array.from(document.querySelectorAll("[data-roles][data-view]"));

  items.forEach((el) => {
    const roles = String(el.getAttribute("data-roles") || "");
    const ok = roles
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(role);

    el.style.display = ok ? "" : "none";
  });

  const activeView = String(STATE.currentView || "dashboard");
  const activeBtn = document.querySelector(`[data-view="${activeView}"][data-roles]`);
  if (activeBtn && activeBtn.style.display === "none") {
    STATE.currentView = "dashboard";
    try { saveState(); } catch {}
  }
}

function navigate(viewId) {
  switchView(viewId, { onEnter });
  applyRoleVisibility();
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
   Safe state import (whitelist only)
---------------------------- */
function applyImportedState(raw) {
  if (!raw || typeof raw !== "object") return;

  const allowed = [
    "currentView",
    "teamName",
    "sport",
    "season",
    "theme",
    "role",
    "events",
    "periodization",
    "nutrition"
  ];

  allowed.forEach((k) => {
    if (k in raw) STATE[k] = raw[k];
  });
}

/* ---------------------------
   Export / Import / Reset
---------------------------- */
function bindDataManagement() {
  dom.btnExportData?.addEventListener("click", () => {
    try {
      const blob = new Blob(
        [JSON.stringify({ athletes: ATHLETES, state: STATE, exportedAt: new Date().toISOString() }, null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `piq-backup-${Date.now()}.json`
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Backup downloaded ✓");
    } catch (e) {
      toast("Export failed: " + (e?.message || "unknown error"));
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
        const v = validateBackupPayload(p);
        if (!v.ok) {
          toast("Import failed — " + (v.reason || "Invalid backup"));
          return;
        }

        setAthletes(p.athletes);
        applyImportedState(p.state);

        saveState();
        saveAthletes();
        applySportTheme(STATE.sport);

        renderDashboard();
        applyRoleVisibility();
        navigate(STATE.currentView || "dashboard");

        toast(`Imported ${ATHLETES.length} athletes ✓`);
      } catch {
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
      Storage.remove(STORAGE_KEY_STATE);
    } catch {}
    location.reload();
  });
}

/* ---------------------------
   Top actions
---------------------------- */
function bindTopActions() {
  dom.btnRefresh?.addEventListener("click", () => {
    renderDashboard();
    toast("Refreshed ↺");
  });

  const doExport = () => {
    try {
      exportPrintableReport({ state: STATE, athletes: ATHLETES });
      toast("Opening print dialog…");
    } catch (e) {
      toast(e?.message || "Export failed");
    }
  };

  dom.btnExport?.addEventListener("click", doExport);
  dom.btnExportAnalytics?.addEventListener("click", doExport);
}

/* ---------------------------
   Delegated actions
---------------------------- */
function bindDelegatedActions() {
  document.addEventListener("click", (e) => {
    const el = e.target?.closest?.("[data-action]");
    if (!el) return;

    const act = el.getAttribute("data-action");

    if (act === "export") {
      dom.btnExport?.click?.();
      return;
    }

    if (act === "logSession") {
      navigate("train");
      return;
    }

    if (act === "open-athlete") {
      const athleteId = el.getAttribute("data-athlete-id");
      if (!athleteId) return;

      navigate("athletes");

      setTimeout(() => {
        try {
          const card = document.querySelector(`[data-athlete-card-id="${CSS.escape(athleteId)}"]`);
          card?.click?.();
        } catch {}
      }, 0);
    }
  });
}

/* ---------------------------
   Elite: global error hooks
---------------------------- */
function installGlobalErrorHooks() {
  if (window.__PIQ_ERR_HOOKS__) return;
  window.__PIQ_ERR_HOOKS__ = true;

  window.addEventListener("error", (e) => {
    try { console.error("[PIQ] error", e.error || e.message || e); } catch {}
  });

  window.addEventListener("unhandledrejection", (e) => {
    try { console.error("[PIQ] unhandledrejection", e.reason || e); } catch {}
  });
}

/* ---------------------------
   Main init
---------------------------- */
export async function initApp() {
  showLoader();

  try {
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
        renderDashboard();
        applyRoleVisibility();
        navigate("dashboard");
      }
    });

    const TodayTour = createTodayTour({ navigate });
    TodayTour.bindKeyboardShortcuts();

    window.addEventListener("piq:tour", () => {
      try { navigate("dashboard"); } catch {}
      try { TodayTour.maybeShow(); } catch {}
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeOnboardingIfOpen();
    });

    initRouter({ onEnter });

    renderDashboard();
    applyRoleVisibility();
    navigate(STATE.currentView || "dashboard");

    maybeShowOnboarding();
    TodayTour.maybeShow?.();

    await new Promise((r) => setTimeout(r, 250));
  } finally {
    hideLoader();
  }
}
