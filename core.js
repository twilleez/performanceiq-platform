// core.js — PRODUCTION-READY REPLACEMENT (FULL FILE)
// Boot-safe + Splash-safe + Offline-first + Optional Supabase sync (state + logs + metrics)
// Includes: working tab system + working Profile + Program (structured) + Log (hydration) + Performance + Dashboard + Settings
// Upgrades: Readiness Engine v2 (trend velocity + individual baselines + injury severity tiers + sleep quality 60/40 + red-flag overrides)
// Upgrades: Auto program progression multipliers (Week 2/3/4 load increases) + Readiness→Progression modifier
// UI Update (requested): Log tab now captures Sleep Quality (1–10) + Injury Pain (0–10). Hydration remains categorical (no fractions).
(function () {
  "use strict";

  if (window.__PIQ_CORE_LOADED__) return;
  window.__PIQ_CORE_LOADED__ = true;

  const STORAGE_KEY = "piq_state_v1";
  const CLOUD_PUSH_DEBOUNCE_MS = 800;
  const SPLASH_FAILSAFE_MS = 2000;
  const MAX_ERROR_QUEUE_SIZE = 50;

  const ROLES = Object.freeze({
    ATHLETE: "athlete",
    COACH: "coach",
    PARENT: "parent",
    ADMIN: "admin"
  });

  const SPORTS = Object.freeze({
    BASKETBALL: "basketball",
    FOOTBALL: "football",
    BASEBALL: "baseball",
    VOLLEYBALL: "volleyball",
    SOCCER: "soccer"
  });

  const HYDRATION_LEVELS = Object.freeze({
    LOW: "low",
    OK: "ok",
    GOOD: "good",
    GREAT: "great"
  });

  const errorQueue = [];
  function logError(context, error) {
    const entry = { context, message: error?.message || String(error), ts: Date.now() };
    errorQueue.push(entry);
    if (errorQueue.length > MAX_ERROR_QUEUE_SIZE) errorQueue.shift();
    console.warn(`[${context}]`, error);
  }

  const $ = (id) => document.getElementById(id) || null;

  function sanitizeHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  const numOrNull = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

  const parseInputNumOrNull = (id) => {
    const el = $(id);
    const raw = (el?.value || "").trim();
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const todayISO = () => new Date().toISOString().slice(0, 10);

  function debounce(fn, delay) {
    let timer = null;
    return function debounced(...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
      return timer;
    };
  }

  function safeDateISO(d) {
    const s = String(d || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }

  function isoToMs(iso) {
    const d = safeDateISO(iso);
    if (!d) return null;
    const ms = Date.parse(d);
    return Number.isFinite(ms) ? ms : null;
  }

  function daysBetweenISO(aISO, bISO) {
    const a = isoToMs(aISO);
    const b = isoToMs(bISO);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return (b - a) / (1000 * 60 * 60 * 24);
  }

  function __loadLocalRaw() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      logError("loadLocalRaw", e);
      return null;
    }
  }

  function __saveLocal(stateObj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateObj));
      return true;
    } catch (e) {
      logError("saveLocal", e);
      return false;
    }
  }

  function defaultState() {
    const now = Date.now();
    return {
      meta: { updatedAtMs: now, lastSyncedAtMs: 0, version: 0 },
      role: "",
      profile: {
        sport: SPORTS.BASKETBALL,
        days: 4,
        name: "",
        baselines: {
          wellnessAvg: null,
          energyAvg: null,
          vertAvg: null,
          sprint10Avg: null,
          codAvg: null,
          sleepHoursAvg: null,
          sleepQualityAvg: null
        }
      },
      trial: { startedAtMs: now, activated: false, licenseKey: "", licenseUntilMs: 0 },
      week: null,
      logs: [],
      tests: [],
      team: { name: "", roster: [], attendance: [], board: "", compliance: "off" },
      _ui: { activeTab: "profile" }
    };
  }

  function normalizeState(s) {
    const d = defaultState();
    if (!s || typeof s !== "object") return d;

    s.meta = s.meta && typeof s
