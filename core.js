// core.js (TOP — COPY/PASTE)
(function () {
  "use strict";

  // Prevent double-init if core.js is accidentally loaded twice
  if (window.__PIQ_CORE_LOADED__) return;
  window.__PIQ_CORE_LOADED__ = true;

  // OPTIONAL safety stub (remove later if you implement a real chooser)
  window.showRoleChooser = window.showRoleChooser || function () {
    alert("Role chooser not implemented yet.");
  };

  const STORAGE_KEY = "piq_state_v1";
  const TRIAL_DAYS = 30, LICENSE_MONTHS = 12;

  const $ = (id) => document.getElementById(id) || null;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  const nowMs = () => Date.now();
  const daysBetween = (a, b) => Math.floor((b - a) / (1000 * 60 * 60 * 24));

  function addMonths(date, months) {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() < day) d.setDate(0);
    return d;
  }

  function normalizeKey(k) {
    return String(k || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function validKey(k) {
    const nk = normalizeKey(k);
    if (nk.length !== 12) return false;
    const body = nk.slice(0, 10), chk = nk.slice(10);
    let sum = 0;
    for (const ch of body) sum += ch.charCodeAt(0);
    const expected = String(sum % 97).padStart(2, "0");
    return chk === expected;
  }

  // ...KEEP PASTING THE REST OF YOUR core.js HERE...
  // (do NOT add another "use strict" or another guard)

})();
