// core.js — CLEAN, VALID, BOOT-SAFE (with real role chooser)
(function () {
  "use strict";

  if (window.__PIQ_CORE_LOADED__) return;
  window.__PIQ_CORE_LOADED__ = true;

  const STORAGE_KEY = "piq_state_v1";
  const TRIAL_DAYS = 30;
  const LICENSE_MONTHS = 12;

  const $ = (id) => document.getElementById(id);

  function hideSplashNow() {
    const s = $("splash");
    if (!s) return;
    s.classList.add("hidden");
    s.style.display = "none";
    try { s.remove(); } catch {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  function defaultState() {
    return {
      role: "athlete",
      trial: { startedAtMs: Date.now(), activated: false, licenseKey: "", licenseUntilMs: 0 },
      profile: { sport: "basketball", level: "youth", days: 4 }
    };
  }

  const state = loadState() || defaultState();

  // ---- REAL role chooser so boot.js never fails ----
  window.showRoleChooser = function () {
    const mount = $("onboard");
    if (!mount) {
      alert("Missing #onboard container in index.html.");
      return;
    }

    mount.style.display = "block";
    mount.innerHTML = `
      <div class="modalBack">
        <div class="modal">
          <h3>Choose your role</h3>
          <div class="small">Required to continue.</div>
          <div class="hr"></div>

          <div class="row">
            <div class="field">
              <label for="obRole">Role</label>
              <select id="obRole">
                <option value="athlete">Athlete</option>
                <option value="coach">Coach</option>
                <option value="parent">Parent</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div class="btnRow">
            <button class="btn" id="obSave" type="button">Save & Continue</button>
          </div>
        </div>
      </div>
    `;

    const roleSel = $("obRole");
    roleSel.value = (localStorage.getItem("role") || state.role || "athlete");

    $("obSave").addEventListener("click", () => {
      const role = roleSel.value;
      state.role = role;

      // ✅ Write to localStorage so boot gate passes
      try { localStorage.setItem("role", role); } catch {}

      saveState(state);

      // Close modal + remove splash
      mount.style.display = "none";
      mount.innerHTML = "";
      hideSplashNow();

      // Continue app start
      if (typeof window.startApp === "function") window.startApp();
    });
  };

  // ---- Minimal start hook (boot.js calls this if role exists) ----
  window.startApp = window.startApp || function () {
    // For now just prove the app can start without crashing
    console.log("PerformanceIQ core loaded successfully. Role:", state.role);

    // If there is no role saved, show chooser immediately
    const roleSaved = (localStorage.getItem("role") || "").trim();
    if (!roleSaved) window.showRoleChooser();
  };
})();
