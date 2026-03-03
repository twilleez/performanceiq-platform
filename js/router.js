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
  settings: "view-settings"
};

function normalizeView(viewId) {
  const id = String(viewId || "").trim();
  return VIEW_MAP[id] ? id : "dashboard";
}

export function switchView(viewId, { onEnter } = {}) {
  const key = normalizeView(viewId);
  const targetId = VIEW_MAP[key];

  // Toggle view containers
  Object.values(VIEW_MAP).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("active", id === targetId);
  });

  // Toggle nav buttons
  document.querySelectorAll(".nav-btn[data-view], .mnav-btn[data-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === key);
  });

  // Persist only if changed
  if (STATE.currentView !== key) {
    STATE.currentView = key;
    try { saveState(); } catch {}
  } else {
    // still ensure it's set for safety
    STATE.currentView = key;
  }

  // Set hash only if different (prevents redundant work)
  try {
    const nextHash = `#${key}`;
    if (location.hash !== nextHash) location.hash = nextHash;
  } catch {}

  if (typeof onEnter === "function") onEnter(key);
}

export function initRouter({ onEnter } = {}) {
  const goHash = () => {
    const h = String(location.hash || "").replace("#", "").trim();
    switchView(h || "dashboard", { onEnter });
  };

  // Initial route
  goHash();

  // Listen for deep-link / back-forward
  window.addEventListener("hashchange", goHash);
}
