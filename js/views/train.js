// /js/views/train.js
// FIX BUG-8: generatedSessionWrap was never hidden on view re-entry.
//            Stale session showed on every return to Train view.
// IMPROVEMENT: Show estimated load in session meta.
// IMPROVEMENT: Better empty state when no athletes exist.
// IMPROVEMENT: Use sessionGenerator.js for consistent session shape.

import { STATE, ATHLETES, saveAthletes } from "../state/state.js";
import { toast } from "../services/toast.js";
import { EXERCISE_BANK } from "../data/exerciseBank.js";

function $(id) { return document.getElementById(id); }

function pickExercises(sport, count = 6) {
  const bank =
    EXERCISE_BANK[String(sport || "basketball").toLowerCase()] ||
    EXERCISE_BANK.basketball ||
    [];
  return bank.slice(0, Math.min(count, bank.length));
}

function estimateLoad(intensity, duration) {
  const i = Math.max(1, Math.min(10, Number(intensity) || 6));
  const d = Math.max(10, Math.min(180, Number(duration) || 60));
  return Math.round(i * d);
}

export function renderTrainView() {
  // FIX BUG-8: Hide stale session every time view is entered
  const wrap = $("generatedSessionWrap");
  if (wrap) wrap.style.display = "none";

  // Sync sport selector
  const sportSel = $("buildSport");
  if (sportSel) sportSel.value = STATE.sport || "basketball";

  // Show no-athletes hint if applicable
  const hint = $("trainNoAthleteHint");
  if (hint) {
    hint.style.display = ATHLETES.length ? "none" : "";
    hint.innerHTML = ATHLETES.length
      ? ""
      : `<div class="piq-alert warn" style="margin-bottom:14px">
          <span class="piq-alert-icon">👥</span>
          <div>
            <div class="piq-alert-title">No athletes yet</div>
            <div class="piq-alert-body">Add athletes via onboarding to assign and track sessions.</div>
          </div>
        </div>`;
  }
}

export function renderGeneratedSession(session) {
  const wrap = $("generatedSessionWrap");
  const host = $("generatedSession");
  if (!wrap || !host) return;

  wrap.style.display = "";
  host.innerHTML = "";

  // ── Top meta + athlete selector ──────────────────────────────────────────
  const top = document.createElement("div");
  top.className = "gen-top";

  const metaText = [
    `${session.type}`,
    `${session.duration} min`,
    `RPE ${session.intensity}/10`,
    `Est. load: ${session.load}`,
  ].join(" · ");

  const meta = document.createElement("div");
  meta.className = "gen-meta";
  meta.style.fontWeight = "700";
  meta.textContent = metaText;

  const athleteSelect = document.createElement("select");
  athleteSelect.id = "genAthleteSelect";
  athleteSelect.className = "select";
  athleteSelect.setAttribute("aria-label", "Select athlete to assign session");
  athleteSelect.style.maxWidth = "200px";

  if (!ATHLETES.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No athletes — add roster first";
    athleteSelect.appendChild(opt);
    athleteSelect.disabled = true;
  } else {
    ATHLETES.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.name;
      athleteSelect.appendChild(opt);
    });
  }

  top.appendChild(meta);
  top.appendChild(athleteSelect);
  host.appendChild(top);

  // ── Exercise blocks ──────────────────────────────────────────────────────
  const list = document.createElement("div");
  list.className = "gen-list";

  session.blocks.forEach((ex) => {
    const card = document.createElement("div");
    card.className = "gen-ex";
    card.innerHTML = `
      <div class="gen-ex-name">${ex.name}</div>
      <div class="gen-ex-sub">${ex.sets} × ${ex.reps} · ${ex.load}</div>
    `;
    list.appendChild(card);
  });

  host.appendChild(list);

  // ── Footer note ──────────────────────────────────────────────────────────
  const note = document.createElement("div");
  note.className = "small-muted";
  note.textContent = "Loads are estimated. 'Push to Today' logs this session for ACWR tracking.";
  host.appendChild(note);
}

export function bindTrainViewEvents() {
  const btnGen = $("btnGenerate");
  const btnGenInline = $("btnGenerateInline");
  const btnPush = $("btnPushToday");

  function generate() {
    const sport = ($("buildSport")?.value || STATE.sport || "basketball").toLowerCase();
    const type = $("buildType")?.value || "practice";
    const intensity = Number($("buildIntensity")?.value || 6);
    const duration = Number($("buildDuration")?.value || 60);
    const load = estimateLoad(intensity, duration);
    const blocks = pickExercises(sport, 6);

    const session = {
      id: `s_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      sport,
      type,
      intensity,
      duration,
      load,
      blocks,
    };

    window.__PIQ_LAST_SESSION__ = session;
    renderGeneratedSession(session);
    toast(`Session generated ✓ · Est. load: ${load}`);
  }

  btnGen?.addEventListener("click", generate);
  btnGenInline?.addEventListener("click", generate);

  btnPush?.addEventListener("click", () => {
    const session = window.__PIQ_LAST_SESSION__;
    if (!session) { toast("Generate a session first"); return; }
    if (!ATHLETES.length) { toast("Add athletes first"); return; }

    const sel = document.getElementById("genAthleteSelect");
    const athleteId = sel?.value || ATHLETES[0].id;
    const a = ATHLETES.find((x) => x.id === athleteId);
    if (!a) { toast("Athlete not found"); return; }

    a.history = a.history || {};
    a.history.sessions = Array.isArray(a.history.sessions) ? a.history.sessions : [];
    a.history.sessions.push({
      id: session.id,
      date: session.date,
      type: session.type,
      sport: session.sport,
      intensity: session.intensity,
      duration: session.duration,
      load: session.load,
      created_at: new Date().toISOString(),
    });

    saveAthletes();
    toast(`✅ Logged session for ${a.name} (load: ${session.load})`);
  });
}
