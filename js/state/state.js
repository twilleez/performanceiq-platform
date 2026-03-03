// /js/state/state.js
import { Storage } from "../services/storage.js";
import { STORAGE_KEY_STATE, STORAGE_KEY_ATHLETES } from "./keys.js";

function nowISO() { return new Date().toISOString(); }
function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }

const VERSION = "3.0.0";
const ALLOWED_ROLES = new Set(["coach", "athlete", "admin"]);

function baseState() {
  return {
    meta: { updated_at: nowISO(), version: VERSION },
    currentView: "dashboard",
    teamName: "Coach Davis",
    sport: "basketball",
    season: "Pre-Season",
    theme: "dark",
    role: "coach", // coach|athlete|admin
    events: [],

    // Elite add-ons (optional)
    periodization: { active: null },
    nutrition: { targets: null, logs: [] }
  };
}

export const STATE = baseState();
export let ATHLETES = [];

export function validateAthlete(a) {
  if (!isObj(a)) return false;
  if (typeof a.id !== "string" || !a.id) return false;
  if (typeof a.name !== "string" || !a.name.trim()) return false;
  return true;
}

// Loose schema validation for imported backups (robustness)
export function validateBackupPayload(p) {
  if (!isObj(p)) return { ok: false, reason: "Backup is not an object" };
  if (!Array.isArray(p.athletes)) return { ok: false, reason: "Missing athletes[] array" };
  const bad = p.athletes.find((a) => !validateAthlete(a));
  if (bad) return { ok: false, reason: "One or more athlete records are invalid (missing id/name)" };
  if (p.state && !isObj(p.state)) return { ok: false, reason: "state must be an object if present" };
  return { ok: true };
}

export function setAthletes(list) {
  ATHLETES = Array.isArray(list) ? list.filter(validateAthlete) : [];
}

// --- Migration (safe no-op now, expandable later) ---
function migrateState(raw) {
  // raw is an object loaded from storage
  // If you later release 3.1.0 etc, add migration logic here.
  // For now: keep as-is.
  return raw;
}

// --- Sanitization: only accept expected fields & types ---
function sanitizeState(raw) {
  const base = baseState();
  if (!isObj(raw)) return base;

  const r = migrateState(raw);

  const out = base;

  // meta
  if (isObj(r.meta)) {
    const v = typeof r.meta.version === "string" ? r.meta.version : VERSION;
    out.meta = { updated_at: nowISO(), version: v };
  }

  // primitives
  if (typeof r.currentView === "string" && r.currentView.trim()) out.currentView = r.currentView.trim();
  if (typeof r.teamName === "string" && r.teamName.trim()) out.teamName = r.teamName.trim();
  if (typeof r.sport === "string" && r.sport.trim()) out.sport = r.sport.trim().toLowerCase();
  if (typeof r.season === "string" && r.season.trim()) out.season = r.season.trim();
  if (typeof r.theme === "string" && r.theme.trim()) out.theme = r.theme.trim();

  // role whitelist
  if (typeof r.role === "string") {
    const role = r.role.trim().toLowerCase();
    if (ALLOWED_ROLES.has(role)) out.role = role;
  }

  // arrays
  if (Array.isArray(r.events)) out.events = r.events;

  // objects
  if (isObj(r.periodization)) {
    out.periodization = { active: ("active" in r.periodization) ? r.periodization.active : null };
  }

  if (isObj(r.nutrition)) {
    out.nutrition = {
      targets: ("targets" in r.nutrition) ? r.nutrition.targets : null,
      logs: Array.isArray(r.nutrition.logs) ? r.nutrition.logs : []
    };
  }

  return out;
}

export function loadState() {
  // Load and sanitize state
  const rawState = Storage.getJSON(STORAGE_KEY_STATE, null);
  const clean = sanitizeState(rawState);
  Object.assign(STATE, clean);

  // Load athletes
  const rawAthletes = Storage.getJSON(STORAGE_KEY_ATHLETES, []);
  setAthletes(rawAthletes);
}

export function saveState() {
  STATE.meta = { updated_at: nowISO(), version: STATE.meta?.version || VERSION };
  Storage.setJSON(STORAGE_KEY_STATE, STATE);
}

export function saveAthletes() {
  Storage.setJSON(STORAGE_KEY_ATHLETES, ATHLETES);
}
