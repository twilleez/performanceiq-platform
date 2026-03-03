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

function normalizeHash(raw) {
  const h = String(raw || "").replace("#", "").trim();
  // support "#/athletes" and "#athletes"
  return h.startsWith("/") ? h.slice(1) : h;
}

export function switchView(viewId, { onEnter } = {}) {
  const key = VIEW_MAP[viewId] ? viewId : "dashboard";
  const targetId = VIEW_MAP[key];

  Object.values(VIEW_MAP).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("active", id === targetId);
  });

  document.querySelectorAll(".nav-btn[data-view], .mnav-btn[data-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === key);
  });

  STATE.currentView = key;
  try { saveState(); } catch {}

  try { location.hash = `#/${key}`; } catch {}

  if (typeof onEnter === "function") onEnter(key);
}

export function initRouter({ onEnter } = {}) {
  const hash = normalizeHash(location.hash);
  if (hash) switchView(hash, { onEnter });

  window.addEventListener("hashchange", () => {
    const h = normalizeHash(location.hash);
    if (h) switchView(h, { onEnter });
  });
}
