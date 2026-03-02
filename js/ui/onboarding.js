// /js/ui/onboarding.js
// Resilient onboarding: does NOT rely on dom.js caching.
// Binds click + touch handlers for mobile, and safely persists state.

import { Storage } from '../services/storage.js';
import { toast } from '../services/toast.js';
import { STATE, ATHLETES, saveState, saveAthletes, setAthletes } from '../state/state.js';
import { applySportTheme } from './sportTheme.js';

export const STORAGE_KEY_ONBOARDED = 'piq_onboarded_v2';

let _bound = false;
let _onAfterFinish = null;

function $(id) {
  return document.getElementById(id);
}

function showModal() {
  const modal = $('onboardingModal');
  if (!modal) return;
  modal.style.display = 'flex';
  modal.style.pointerEvents = 'auto';
}

function hideModal() {
  const modal = $('onboardingModal');
  if (!modal) return;
  modal.style.display = 'none';
  modal.style.pointerEvents = 'none';
}

function isModalOpen() {
  const modal = $('onboardingModal');
  if (!modal) return false;
  return getComputedStyle(modal).display !== 'none';
}

function safeUUID() {
  try {
    if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {}
  return `a_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeSport(val) {
  return String(val || 'basketball').trim().toLowerCase();
}

function makeAthlete(name) {
  const n = String(name || '').trim();
  return {
    id: safeUUID(),
    name: n || 'Athlete',
    position: '',
    year: '',
    tags: [],
    // Keep these keys generic so views don’t crash if they expect them
    metrics: {
      piq: 0,
      readiness: 0,
      acwr: 1.0,
      soreness: 0,
      sleep: 0,
      stress: 0
    },
    history: {
      wellness: [],
      sessions: []
    },
    created_at: new Date().toISOString()
  };
}

function bindTap(el, handler) {
  if (!el) return;
  // click
  el.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handler(e);
  });

  // touch (mobile reliability)
  el.addEventListener(
    'touchend',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      handler(e);
    },
    { passive: false }
  );
}

function renderRosterChips(names) {
  const host = $('onboardRosterChips');
  if (!host) return;

  host.innerHTML = '';
  if (!names.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'opacity:.7;font-size:12px;padding:6px 0;';
    empty.textContent = 'No athletes added yet.';
    host.appendChild(empty);
    return;
  }

  names.forEach((nm, idx) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.style.cssText = 'margin:4px 6px 0 0; cursor:pointer;';
    chip.textContent = `✕ ${nm}`;

    bindTap(chip, () => {
      names.splice(idx, 1);
      renderRosterChips(names);
    });

    host.appendChild(chip);
  });
}

function setOnboarded(flag) {
  try {
    Storage.set(STORAGE_KEY_ONBOARDED, flag ? '1' : '0');
  } catch {
    // If storage fails, still allow UI to proceed
  }
}

export function closeOnboardingIfOpen() {
  if (isModalOpen()) hideModal();
}

export function maybeShowOnboarding() {
  let seen = false;
  try {
    seen = !!Storage.get(STORAGE_KEY_ONBOARDED);
  } catch {
    seen = false;
  }
  if (!seen) showModal();
}

export function initOnboarding(opts = {}) {
  if (_bound) return;
  _bound = true;

  _onAfterFinish = typeof opts.onAfterFinish === 'function' ? opts.onAfterFinish : null;

  const modal = $('onboardingModal');
  if (!modal) {
    // Modal missing in HTML -> do nothing (don’t block app)
    return;
  }

  const btnClose = $('btnCloseOnboarding');
  const btnSkip = $('btnSkipOnboarding');
  const btnFinish = $('btnFinishOnboarding');
  const btnAdd = $('btnOnboardAddAthlete');

  const inputTeam = $('onboardTeamName');
  const inputSport = $('onboardSport');
  const inputSeason = $('onboardSeason');

  const inputAthlete = $('onboardAthleteName');

  // local roster buffer for the wizard UI
  const rosterNames = [];

  // Pre-fill from STATE if present
  if (inputTeam && STATE.teamName) inputTeam.value = STATE.teamName;
  if (inputSport && STATE.sport) inputSport.value = String(STATE.sport).toLowerCase();
  if (inputSeason && STATE.season) inputSeason.value = STATE.season;

  // Render existing athletes as chips (optional)
  if (Array.isArray(ATHLETES) && ATHLETES.length) {
    ATHLETES.slice(0, 12).forEach(a => {
      if (a && a.name) rosterNames.push(String(a.name));
    });
  }
  renderRosterChips(rosterNames);

  // Close / Skip simply hides modal and marks onboarded
  const close = () => {
    setOnboarded(true);
    hideModal();
    toast('Onboarding skipped ✓');
  };

  bindTap(btnClose, close);
  bindTap(btnSkip, close);

  // Add athlete
  const addAthlete = () => {
    const nm = String(inputAthlete?.value || '').trim();
    if (!nm) return;
    rosterNames.push(nm);
    if (inputAthlete) inputAthlete.value = '';
    renderRosterChips(rosterNames);
  };

  bindTap(btnAdd, addAthlete);

  // Enter key adds athlete
  if (inputAthlete) {
    inputAthlete.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addAthlete();
      }
    });
  }

  // Finish setup
  bindTap(btnFinish, () => {
    // Update state from inputs
    const teamName = String(inputTeam?.value || '').trim();
    const sport = normalizeSport(inputSport?.value || STATE.sport);
    const season = String(inputSeason?.value || STATE.season || 'Pre-Season');

    if (teamName) STATE.teamName = teamName;
    STATE.sport = sport;
    STATE.season = season;

    // Apply sport theme immediately
    try { applySportTheme(sport); } catch {}

    // Create roster if provided (only overwrite if user actually added names)
    const cleaned = rosterNames.map(s => String(s).trim()).filter(Boolean);

    if (cleaned.length) {
      const athletes = cleaned.map(makeAthlete);
      setAthletes(athletes);
      try { saveAthletes(); } catch {}
    }

    try { saveState(); } catch {}

    setOnboarded(true);
    hideModal();

    toast('Setup complete ✓');

    if (_onAfterFinish) {
      try { _onAfterFinish(); } catch {}
    }
  });
}
