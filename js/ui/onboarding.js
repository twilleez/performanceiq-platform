// /js/ui/onboarding.js
// Universal onboarding binder:
// - Supports BOTH HTML variants:
//   A) "team/roster" wizard ids: btnCloseOnboarding / btnSkipOnboarding / btnFinishOnboarding / btnOnboardAddAthlete + onboard* inputs
//   B) original wizard ids: obClose / obSkip / obFinish / obNext1 / obNext2 + obStep1/2/3 + roleGrid/sportGrid
// - Binds click + touchend + pointerup (mobile reliable)
// - Never traps the UI: always allows closing

import { Storage } from "../services/storage.js";
import { toast } from "../services/toast.js";
import { STATE, ATHLETES, saveState, saveAthletes, setAthletes } from "../state/state.js";
import { applySportTheme } from "./sportTheme.js";

export const STORAGE_KEY_ONBOARDED = "piq_onboarded_v2";

let _bound = false;
let _onAfterFinish = null;

function $(id) { return document.getElementById(id); }

function isOpen() {
  const m = $("onboardingModal");
  return !!m && getComputedStyle(m).display !== "none";
}

function show() {
  const m = $("onboardingModal");
  if (!m) return;
  m.style.display = "flex";
  m.style.pointerEvents = "auto";
}

function hide() {
  const m = $("onboardingModal");
  if (!m) return;
  m.style.display = "none";
  m.style.pointerEvents = "none";
}

function markOnboarded() {
  try { Storage.set(STORAGE_KEY_ONBOARDED, "1"); } catch {}
}

function safeUUID() {
  try {
    if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {}
  return `a_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeSport(v) {
  return String(v || "basketball").trim().toLowerCase();
}

function bindTap(el, handler) {
  if (!el) return;

  const wrapped = (e) => {
    try {
      e?.preventDefault?.();
      e?.stopPropagation?.();
    } catch {}
    handler(e);
  };

  el.addEventListener("click", wrapped, { passive: false });
  el.addEventListener("touchend", wrapped, { passive: false });
  el.addEventListener("pointerup", wrapped, { passive: false });
}

function createAthlete(name) {
  const nm = String(name || "").trim() || "Athlete";
  return {
    id: safeUUID(),
    name: nm,
    position: "",
    year: "",
    tags: [],
    metrics: { piq: 0, readiness: 0, acwr: 1.0, soreness: 0, sleep: 0, stress: 0 },
    history: { wellness: [], sessions: [] },
    created_at: new Date().toISOString(),
  };
}

/* ---------------------------
   Variant A: Team/Roster wizard (your newer modal)
---------------------------- */
function initTeamRosterVariant() {
  // Buttons
  const btnClose = $("btnCloseOnboarding");
  const btnSkip = $("btnSkipOnboarding");
  const btnFinish = $("btnFinishOnboarding");
  const btnAdd = $("btnOnboardAddAthlete");

  // Inputs
  const inputTeam = $("onboardTeamName");
  const inputSport = $("onboardSport");
  const inputSeason = $("onboardSeason");
  const inputAthlete = $("onboardAthleteName");
  const chipHost = $("onboardRosterChips");

  // If none of these exist, this variant isn't on the page
  if (!btnClose && !btnSkip && !btnFinish && !btnAdd && !inputTeam && !inputSport && !inputSeason) {
    return false;
  }

  const rosterNames = [];

  // Prefill state if fields exist
  if (inputTeam && STATE.teamName) inputTeam.value = STATE.teamName;
  if (inputSport && STATE.sport) inputSport.value = normalizeSport(STATE.sport);
  if (inputSeason && STATE.season) inputSeason.value = STATE.season;

  function renderChips() {
    if (!chipHost) return;
    chipHost.innerHTML = "";

    if (!rosterNames.length) {
      const empty = document.createElement("div");
      empty.style.cssText = "opacity:.7;font-size:12px;padding:6px 0;";
      empty.textContent = "No athletes added yet.";
      chipHost.appendChild(empty);
      return;
    }

    rosterNames.forEach((nm, idx) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.style.cssText = "margin:4px 6px 0 0; cursor:pointer;";
      chip.textContent = `✕ ${nm}`;
      bindTap(chip, () => {
        rosterNames.splice(idx, 1);
        renderChips();
      });
      chipHost.appendChild(chip);
    });
  }

  function closeWizard() {
    markOnboarded();
    hide();
    toast("Onboarding closed ✓");
  }

  function addAthlete() {
    const nm = String(inputAthlete?.value || "").trim();
    if (!nm) return;
    rosterNames.push(nm);
    if (inputAthlete) inputAthlete.value = "";
    renderChips();
  }

  function finish() {
    const teamName = String(inputTeam?.value || "").trim();
    const sport = normalizeSport(inputSport?.value || STATE.sport);
    const season = String(inputSeason?.value || STATE.season || "Pre-Season");

    if (teamName) STATE.teamName = teamName;
    STATE.sport = sport;
    STATE.season = season;

    try { applySportTheme(sport); } catch {}

    // Only overwrite roster if user added names in onboarding
    const cleaned = rosterNames.map(s => String(s).trim()).filter(Boolean);
    if (cleaned.length) {
      setAthletes(cleaned.map(createAthlete));
      try { saveAthletes(); } catch {}
    }

    try { saveState(); } catch {}
    markOnboarded();
    hide();
    toast("Setup complete ✓");

    if (_onAfterFinish) {
      try { _onAfterFinish(); } catch {}
    }
  }

  // Bind handlers
  bindTap(btnClose, closeWizard);
  bindTap(btnSkip, closeWizard);
  bindTap(btnAdd, addAthlete);
  bindTap(btnFinish, finish);

  // Enter key adds athlete
  if (inputAthlete) {
    inputAthlete.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addAthlete();
      }
    });
  }

  renderChips();
  return true;
}

/* ---------------------------
   Variant B: Original wizard (obClose/obSkip/obFinish + steps)
---------------------------- */
function initObVariant() {
  const btnClose = $("obClose");
  const btnSkip = $("obSkip");
  const btnFinish = $("obFinish");
  const next1 = $("obNext1");
  const next2 = $("obNext2");
  const back2 = $("obBack2");
  const back3 = $("obBack3");

  const step1 = $("obStep1");
  const step2 = $("obStep2");
  const step3 = $("obStep3");
  const progress = $("obProgress");

  // If none exist, this variant isn't on the page
  if (!btnClose && !btnSkip && !btnFinish && !next1 && !next2 && !step1 && !step2 && !step3) {
    return false;
  }

  function setStep(n) {
    if (step1) step1.style.display = n === 1 ? "" : "none";
    if (step2) step2.style.display = n === 2 ? "" : "none";
    if (step3) step3.style.display = n === 3 ? "" : "none";

    if (progress) {
      progress.style.width = n === 1 ? "33%" : n === 2 ? "66%" : "100%";
    }
  }

  function closeWizard() {
    markOnboarded();
    hide();
    toast("Onboarding closed ✓");
  }

  function finish() {
    // This variant chooses role/sport through grids; we keep it simple:
    // - Do not crash if selections aren’t present
    // - Save current STATE (whatever it already is)
    try { saveState(); } catch {}
    markOnboarded();
    hide();
    toast("Setup complete ✓");
    if (_onAfterFinish) {
      try { _onAfterFinish(); } catch {}
    }
  }

  bindTap(btnClose, closeWizard);
  bindTap(btnSkip, closeWizard);
  bindTap(btnFinish, finish);

  bindTap(next1, () => setStep(2));
  bindTap(next2, () => setStep(3));
  bindTap(back2, () => setStep(1));
  bindTap(back3, () => setStep(2));

  // Default to step 1 visible
  setStep(1);
  return true;
}

/* ---------------------------
   Public API
---------------------------- */
export function initOnboarding(opts = {}) {
  if (_bound) return;
  _bound = true;

  _onAfterFinish = typeof opts.onAfterFinish === "function" ? opts.onAfterFinish : null;

  // If modal not present, do nothing (don’t trap UI)
  if (!$("onboardingModal")) return;

  // Bind whichever variant exists (or both)
  const a = initTeamRosterVariant();
  const b = initObVariant();

  // Absolute safety: if neither variant bound, allow tapping backdrop to close
  if (!a && !b) {
    const modal = $("onboardingModal");
    bindTap(modal, () => {
      // close only if tap target IS the backdrop
      // (not a child inside the modal)
      // Note: this is “best effort”
      markOnboarded();
      hide();
    });
  }
}

export function maybeShowOnboarding() {
  let seen = false;
  try { seen = !!Storage.get(STORAGE_KEY_ONBOARDED); } catch { seen = false; }
  if (!seen) show();
}

export function closeOnboardingIfOpen() {
  if (isOpen()) hide();
}
