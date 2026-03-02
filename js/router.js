// /js/router.js
import { STATE, saveState } from "./state/state.js";

const VIEW_MAP = {
  dashboard: "view-dashboard",
  athletes: "view-athletes",
  train: "view-train",
  analytics: "view-analytics",
  schedule: "view-schedule",
  wellness: "view-wellness",
  nutrition: "view-nutrition",
  settings: "view-settings",
};

export function switchView(viewId, { onEnter } = {}) {
  const key = VIEW_MAP[viewId] ? viewId : "dashboard";
  const targetId = VIEW_MAP[key];

  Object.values(VIEW_MAP).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("active", id === targetId);
  });

  document.querySelectorAll(".nav-btn[data-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === key);
  });

  STATE.currentView = key;
  try { saveState(); } catch {}

  // set hash for deep link
  try { location.hash = `#${key}`; } catch {}

  if (typeof onEnter === "function") onEnter(key);
}

export function initRouter({ onEnter } = {}) {
  // initial hash
  const hash = (location.hash || "").replace("#", "").trim();
  if (hash) switchView(hash, { onEnter });

  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").replace("#", "").trim();
    if (h) switchView(h, { onEnter });
  });
}
