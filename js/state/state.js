// /js/state/state.js
import { Storage } from "../services/storage.js";
import { STORAGE_KEY_STATE, STORAGE_KEY_ATHLETES } from "./keys.js";

function nowISO() { return new Date().toISOString(); }

export const STATE = {
  meta: { updated_at: nowISO(), version: "3.0.0" },
  currentView: "dashboard",
  teamName: "Coach Davis",
  sport: "basketball",
  season: "Pre-Season",
  theme: "dark",
  role: "coach", // coach|athlete|admin
  events: [],

  // Elite add-ons (optional)
  periodization: { active: null }, // generated 4-week block
  nutrition: { targets: null, logs: [] }
};

export let ATHLETES = [];

function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }

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
  const bad = p.athletes.find(a => !validateAthlete(a));
  if (bad) return { ok: false, reason: "One or more athlete records are invalid (missing id/name)" };
  if (p.state && !isObj(p.state)) return { ok: false, reason: "state must be an object if present" };
  return { ok: true };
}

export function setAthletes(list) {
  ATHLETES = Array.isArray(list) ? list.filter(validateAthlete) : [];
}

export function loadState() {
  const s = Storage.getJSON(STORAGE_KEY_STATE, null);
  if (s && isObj(s)) {
    Object.assign(STATE, s);
  }
  const a = Storage.getJSON(STORAGE_KEY_ATHLETES, []);
  setAthletes(a);
}

export function saveState() {
  STATE.meta = { updated_at: nowISO(), version: STATE.meta?.version || "3.0.0" };
  Storage.setJSON(STORAGE_KEY_STATE, STATE);
}

export function saveAthletes() {
  Storage.setJSON(STORAGE_KEY_ATHLETES, ATHLETES);
}
