import { Storage } from '../services/storage.js';
import { STORAGE_KEY_STATE, STORAGE_KEY_ATHLETES } from './keys.js';
import { DEFAULT_ATHLETES } from '../data/demo.js';

export const STATE = loadState();
export let ATHLETES = loadAthletes();

function baseState() {
  return {
    role: 'coach',
    sport: 'basketball',
    injuries: [],
    teamName: 'Westview Varsity Basketball',
    season: 'Pre-Season',
    currentView: 'dashboard',
    selectedAthleteId: null,
    sessionLibrary: []
  };
}

export function loadState() {
  const s = Storage.getJSON(STORAGE_KEY_STATE, null);
  return Object.assign(baseState(), (s && typeof s === 'object') ? s : {});
}

export function saveState() {
  // do not persist selectedAthleteId (ephemeral)
  const { selectedAthleteId: _x, ...toSave } = STATE;
  Storage.setJSON(STORAGE_KEY_STATE, toSave);
}

export function loadAthletes() {
  const s = Storage.getJSON(STORAGE_KEY_ATHLETES, null);
  if (Array.isArray(s) && s.length) return s;
  return DEFAULT_ATHLETES.map(a => ({ ...a }));
}

export function saveAthletes() {
  Storage.setJSON(STORAGE_KEY_ATHLETES, ATHLETES);
}

export function setAthletes(next) {
  ATHLETES = Array.isArray(next) ? next : [];
  saveAthletes();
}
