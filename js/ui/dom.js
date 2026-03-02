// /js/ui/dom.js
export const dom = {};

export function cacheDOM() {
  const byId = (id) => document.getElementById(id);

  // global
  dom.loadingScreen = byId("loadingScreen");
  dom.toastContainer = byId("toastContainer");

  // topbar
  dom.btnTheme = byId("btnTheme");
  dom.btnRefresh = byId("btnRefresh");
  dom.btnExport = byId("btnExport");
  dom.athleteSearch = byId("athleteSearch");

  // pills
  dom.pillOnlineText = byId("pillOnlineText");
  dom.pillSeason = byId("pillSeason");
  dom.pillGame = byId("pillGame");
  dom.pillGameText = byId("pillGameText");

  // data mgmt
  dom.btnExportData = byId("btnExportData");
  dom.btnImportData = byId("btnImportData");
  dom.btnResetData = byId("btnResetData");
  dom.importFileInput = byId("importFileInput");

  // settings
  dom.settingRole = byId("settingRole");
  dom.settingTeamName = byId("settingTeamName");
  dom.settingSport = byId("settingSport");
  dom.settingSeason = byId("settingSeason");
  dom.settingTheme = byId("settingTheme");
  dom.btnSaveSettings = byId("btnSaveSettings");

  // train
  dom.btnGenerate = byId("btnGenerate");
  dom.btnGenerateInline = byId("btnGenerateInline");
  dom.btnPushToday = byId("btnPushToday");

  // analytics export
  dom.btnExportAnalytics = byId("btnExportAnalytics");

  // wellness/nutrition
  dom.btnSaveWellness = byId("btnSaveWellness");
  dom.btnSaveNutrition = byId("btnSaveNutrition");

  // views
  dom.views = {
    dashboard: byId("view-dashboard"),
    athletes: byId("view-athletes"),
    train: byId("view-train"),
    analytics: byId("view-analytics"),
    schedule: byId("view-schedule"),
    wellness: byId("view-wellness"),
    nutrition: byId("view-nutrition"),
    settings: byId("view-settings"),
  };
}
