// /js/ui/onboarding.js
import { Storage } from "../services/storage.js";
import { toast } from "../services/toast.js";
import { STATE, ATHLETES, saveState, saveAthletes, setAthletes } from "../state/state.js";
import { applySportTheme } from "./sportTheme.js";
import { STORAGE_KEY_ONBOARDED } from "../state/keys.js";

let _bound = false;
let _onAfterFinish = null;

function $(id) { return document.getElementById(id); }

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

function isOpen() {
  const m = $("onboardingModal");
  return !!m && getComputedStyle(m).display !== "none";
}

function markOnboarded() {
  try { Storage.set(STORAGE_KEY_ONBOARDED, "1"); } catch {}
}

function safeUUID() {
  try { if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID(); } catch {}
  return `a_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeSport(v) { return String(v || "basketball").trim().toLowerCase(); }

function bindTap(el, handler) {
  if (!el) return;
  // Pointer events solve mobile issues without double-firing click + touchend.
  el.addEventListener("pointerup", (e) => {
    // Do not block inputs; only prevent default for buttons.
    if (el.tagName === "BUTTON") e.preventDefault();
    handler(e);
  });
}

function createAthlete(name) {
  const nm = String(name || "").trim() || "Athlete";
  return {
    id: safeUUID(),
    name: nm,
    position: "",
    year: "",
    tags: [],
    metrics: {},
    history: { wellness: [], sessions: [] },
    created_at: new Date().toISOString()
  };
}

function initTeamRosterVariant() {
  const modal = $("onboardingModal");

  const btnClose = $("btnCloseOnboarding");
  const btnSkip = $("btnSkipOnboarding");
  const btnFinish = $("btnFinishOnboarding");

  const btnAdd = $("btnOnboardAddAthlete");
  const btnNext1 = $("btnOnboardNext1");
  const btnNext2 = $("btnOnboardNext2");
  const btnBack2 = $("btnOnboardBack2");
  const btnTour = $("btnOnboardTour");
  const btnImport = $("btnOnboardImport");

  const step1 = $("onboardStep1");
  const step2 = $("onboardStep2");
  const step3 = $("onboardStep3");

  const inputTeam = $("onboardTeamName");
  const inputSport = $("onboardSport");
  const inputSeason = $("onboardSeason");

  const inputTeamVisible = $("onboardTeamNameVisible");
  const inputAthlete = $("onboardAthleteName");

  const chipHost = $("onboardRosterChips");
  const emptyRoster = $("onboardEmptyRoster");

  const exists = !!(modal && (step1 || step2 || step3 || btnFinish || btnAdd || inputTeam || inputSport || inputSeason));
  if (!exists) return false;

  const rosterNames = [];
  let currentStep = 2;

  if (inputTeam && STATE.teamName) inputTeam.value = STATE.teamName;
  if (inputSport && STATE.sport) inputSport.value = normalizeSport(STATE.sport);
  if (inputSeason && STATE.season) inputSeason.value = STATE.season;
  if (inputTeamVisible) inputTeamVisible.value = (STATE.teamName || "");

  function setHiddenFromVisible() {
    if (inputTeam && inputTeamVisible) inputTeam.value = inputTeamVisible.value;
  }

  function renderChips() {
    if (!chipHost) return;
    chipHost.innerHTML = "";
    const has = rosterNames.length > 0;
    if (emptyRoster) emptyRoster.style.display = has ? "none" : "";

    rosterNames.forEach((nm, idx) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = `✕ ${nm}`;
      bindTap(chip, () => {
        rosterNames.splice(idx, 1);
        renderChips();
      });
      chipHost.appendChild(chip);
    });
  }

  function updateProgressUI(n) {
    const nodes = Array.from(document.querySelectorAll(".ob-step[data-ob-step]"));
    const lines = Array.from(document.querySelectorAll(".ob-step-line"));
    const circles = Array.from(document.querySelectorAll(".ob-step-circle[data-ob-circle]"));

    nodes.forEach((el) => {
      const step = Number(el.getAttribute("data-ob-step"));
      el.classList.remove("done", "active", "idle");
      if (step < n) el.classList.add("done");
      else if (step === n) el.classList.add("active");
      else el.classList.add("idle");
    });

    lines.forEach((line, i) => {
      line.classList.remove("line-done", "line-idle");
      line.classList.add((i + 2) <= n ? "line-done" : "line-idle");
    });

    circles.forEach((c) => {
      const step = Number(c.getAttribute("data-ob-circle"));
      c.textContent = step < n ? "✓" : String(step);
    });
  }

  function setStep(n) {
    currentStep = n;
    if (step1) step1.style.display = n === 1 ? "" : "none";
    if (step2) step2.style.display = n === 2 ? "" : "none";
    if (step3) step3.style.display = n === 3 ? "" : "none";
    updateProgressUI(n);
  }

  function closeWizard() {
    markOnboarded();
    hide();
    toast("Onboarding closed ✓");
  }

  function addAthlete() {
    const nm = String(inputAthlete?.value || "").trim();
    if (!nm) { toast("Enter an athlete name"); return; }
    rosterNames.push(nm);
    if (inputAthlete) inputAthlete.value = "";
    renderChips();
  }

  function finish() {
    setHiddenFromVisible();

    const teamName = String(inputTeam?.value || "").trim();
    const sport = normalizeSport(inputSport?.value || STATE.sport);
    const season = String(inputSeason?.value || STATE.season || "Pre-Season");

    if (teamName) STATE.teamName = teamName;
    STATE.sport = sport;
    STATE.season = season;

    try { applySportTheme(sport); } catch {}

    const cleaned = rosterNames.map(s => String(s).trim()).filter(Boolean);
    if (cleaned.length) {
      setAthletes(cleaned.map(createAthlete));
      try { saveAthletes(); } catch {}
    }

    try { saveState(); } catch {}
    markOnboarded();
    hide();
    toast("Setup complete ✓");
    if (_onAfterFinish) { try { _onAfterFinish(); } catch {} }
  }

  bindTap(btnClose, closeWizard);
  bindTap(btnSkip, closeWizard);
  bindTap(btnFinish, finish);

  bindTap(btnNext1, () => { setHiddenFromVisible(); setStep(2); });
  bindTap(btnBack2, () => setStep(1));
  bindTap(btnNext2, () => setStep(3));

  document.querySelectorAll(".ob-step[data-ob-step]").forEach((btn) => {
    bindTap(btn, () => {
      const step = Number(btn.getAttribute("data-ob-step") || "1");
      setHiddenFromVisible();
      setStep(step);
    });
  });

  bindTap(btnAdd, addAthlete);

  inputAthlete?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); addAthlete(); }
  });

  inputTeamVisible?.addEventListener("input", setHiddenFromVisible);

  document.querySelectorAll("[data-onboard-sport]").forEach((chip) => {
    bindTap(chip, () => {
      const val = String(chip.getAttribute("data-onboard-sport") || "").toLowerCase();
      chip.closest(".ob-chip-row")?.querySelectorAll(".ob-chip")?.forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      if (inputSport) inputSport.value = normalizeSport(val);
    });
  });

  document.querySelectorAll("[data-onboard-season]").forEach((card) => {
    bindTap(card, () => {
      document.querySelectorAll(".ob-season").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      if (inputSeason) inputSeason.value = String(card.getAttribute("data-onboard-season") || "Pre-Season");
    });
  });

  bindTap(btnImport, () => toast("CSV import is coming next phase"));

  bindTap(btnTour, () => {
    markOnboarded();
    hide();
    try { window.dispatchEvent(new CustomEvent("piq:tour")); } catch {}
    toast("Tour starting…");
  });

  if (modal) {
    bindTap(modal, (e) => { if (e?.target === modal) closeWizard(); });
  }

  renderChips();
  setStep(currentStep);
  return true;
}

export function initOnboarding(opts = {}) {
  if (_bound) return;
  _bound = true;

  _onAfterFinish = typeof opts.onAfterFinish === "function" ? opts.onAfterFinish : null;
  if (!$("onboardingModal")) return;

  initTeamRosterVariant();
}

export function maybeShowOnboarding() {
  let seen = false;
  try { seen = !!Storage.get(STORAGE_KEY_ONBOARDED); } catch { seen = false; }

  const hasAthletes = Array.isArray(ATHLETES) && ATHLETES.length > 0;
  if (!seen || !hasAthletes) show();
}

export function closeOnboardingIfOpen() {
  if (isOpen()) hide();
}
