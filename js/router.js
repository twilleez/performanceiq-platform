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

function normalizeViewId(raw) {
  const v = String(raw || "").trim();
  if (!v) return "";
  // supports "#analytics" and "#/analytics"
  return v.startsWith("/") ? v.slice(1) : v;
}

export function switchView(viewId, { onEnter } = {}) {
  const keyRaw = normalizeViewId(viewId);
  const key = VIEW_MAP[keyRaw] ? keyRaw : "dashboard";
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

  // set hash for deep link (use #/key so your existing links stay consistent)
  try { location.hash = `#/${key}`; } catch {}

  if (typeof onEnter === "function") onEnter(key);
}

export function initRouter({ onEnter } = {}) {
  const hash = normalizeViewId((location.hash || "").replace("#", ""));
  if (hash) switchView(hash, { onEnter });

  window.addEventListener("hashchange", () => {
    const h = normalizeViewId((location.hash || "").replace("#", ""));
    if (h) switchView(h, { onEnter });
  });
}
