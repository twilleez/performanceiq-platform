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
  try {
    saveState();
  } catch (err) {
    console.error("saveState failed:", err);
  }

  const desiredHash = `#/${key}`;
  if (location.hash !== desiredHash) {
    try {
      history.replaceState(null, "", desiredHash);
    } catch (err) {
      console.error("Failed to update hash:", err);
    }
  }

  try {
    if (typeof onEnter === "function") onEnter(key);
  } catch (err) {
    console.error(`onEnter failed for view "${key}":`, err);

    const fallback = document.getElementById(targetId);
    if (fallback) {
      fallback.innerHTML = `
        <div class="card" style="margin:16px;">
          <div class="card-header">
            <span class="card-title">View Error</span>
          </div>
          <div style="font-size:14px;color:var(--text-muted);">
            Failed to load <strong>${key}</strong>.
          </div>
          <pre style="margin-top:12px;white-space:pre-wrap;font-size:12px;color:var(--danger, #ff6b6b);">${escapeHtml(
            err?.message || String(err)
          )}</pre>
        </div>
      `;
    }
  }
}

export function initRouter({ onEnter } = {}) {
  const handleRoute = () => {
    const hash = normalizeHash(location.hash);
    switchView(hash || "dashboard", { onEnter });
  };

  handleRoute();
  window.addEventListener("hashchange", handleRoute);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
