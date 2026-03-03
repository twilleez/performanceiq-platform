// /js/views/train.js
import { STATE, ATHLETES, saveAthletes } from "../state/state.js";
import { toast } from "../services/toast.js";
import { EXERCISE_BANK } from "../data/exerciseBank.js";

function $(id) { return document.getElementById(id); }

function pickExercises(sport, count = 6) {
  const bank = EXERCISE_BANK[String(sport || "basketball").toLowerCase()] || EXERCISE_BANK.basketball || [];
  return bank.slice(0, Math.min(count, bank.length));
}

export function renderTrainView() {
  const sportSel = $("buildSport");
  if (sportSel) sportSel.value = STATE.sport || "basketball";
}

export function renderGeneratedSession(session) {
  const wrap = $("generatedSessionWrap");
  const host = $("generatedSession");
  if (!wrap || !host) return;

  wrap.style.display = "";
  host.innerHTML = "";

  const top = document.createElement("div");
  top.className = "gen-top";

  const athleteSelect = document.createElement("select");
  athleteSelect.id = "genAthleteSelect";
  athleteSelect.className = "select";
  athleteSelect.setAttribute("aria-label", "Select athlete to assign session");

  if (!ATHLETES.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No athletes (add roster first)";
    athleteSelect.appendChild(opt);
    athleteSelect.disabled = true;
  } else {
    ATHLETES.forEach(a => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.name;
      athleteSelect.appendChild(opt);
    });
  }

  const meta = document.createElement("div");
  meta.className = "gen-meta";
  meta.textContent = `${session.type} · ${session.duration} min · RPE ${session.intensity}/10`;

  top.appendChild(meta);
  top.appendChild(athleteSelect);
  host.appendChild(top);

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

  const expl = document.createElement("div");
  expl.className = "small-muted";
  expl.textContent = "Loads are estimated. Push to Today logs a session load for ACWR.";
  host.appendChild(expl);
}

function estimateLoad(intensity, duration) {
  const i = Math.max(1, Math.min(10, Number(intensity) || 6));
  const d = Math.max(10, Math.min(180, Number(duration) || 60));
  return Math.round(i * d);
}

export function bindTrainViewEvents() {
  const btnGen = $("btnGenerate");
  const btnGenInline = $("btnGenerateInline");
  const btnPush = $("btnPushToday");

  function generate() {
    const sport = ($("buildSport")?.value || STATE.sport || "basketball").toLowerCase();
    const type = $("buildType")?.value || "practice";
    const intensity = Number($("buildIntensity")?.value || 6); // numeric now
    const duration = Number($("buildDuration")?.value || 60);

    const blocks = pickExercises(sport, 6);

    const session = {
      id: `s_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      sport,
      type,
      intensity,
      duration,
      load: estimateLoad(intensity, duration),
      blocks
    };

    window.__PIQ_LAST_SESSION__ = session;
    renderGeneratedSession(session);
    toast("Session generated ✓");
  }

  btnGen?.addEventListener("click", generate);
  btnGenInline?.addEventListener("click", generate);

  btnPush?.addEventListener("click", () => {
    const session = window.__PIQ_LAST_SESSION__;
    if (!session) { toast("Generate a session first"); return; }
    if (!ATHLETES.length) { toast("Add athletes first"); return; }

    const sel = document.getElementById("genAthleteSelect");
    const athleteId = sel?.value || ATHLETES[0].id;
    const a = ATHLETES.find(x => x.id === athleteId);
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
      created_at: new Date().toISOString()
    });

    saveAthletes();
    toast(`Logged session for ${a.name} ✓`);
  });
}
