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

function renderAthleteTrainView() {
  const mount = $("trainAthleteMount");
  const builder = $("trainCoachBuilder");
  if (builder) builder.style.display = "none";
  if (!mount) return;
  mount.style.display = "";
  mount.innerHTML = "";

  const a = STATE.athleteId ? ATHLETES.find(x => x.id === STATE.athleteId) : null;
  if (!a) {
    mount.innerHTML = `<div class="athlete-hero" style="flex-direction:column;gap:8px">
      <div style="font-size:22px">⚙️</div>
      <div style="font-weight:700">Link your profile in Settings to see your sessions.</div>
      <button class="btn btn-sm" onclick="document.querySelector('[data-view=settings]')?.click()">Settings →</button>
    </div>`;
    return;
  }

  const sessions = (a.history?.sessions || []).slice(-10).reverse();

  // Header + log button
  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px";
  header.innerHTML = `
    <div>
      <div style="font-size:18px;font-weight:800">${a.name}'s Sessions</div>
      <div style="font-size:13px;color:var(--muted)">${sessions.length} recent sessions</div>
    </div>
    <button class="btn btn-sm" id="btnAthleteLogSession">+ Log Session</button>`;
  mount.appendChild(header);

  // Quick-log form (hidden by default)
  const logForm = document.createElement("div");
  logForm.id = "athleteQuickLog";
  logForm.style.display = "none";
  logForm.className = "panel";
  logForm.style.marginBottom = "16px";
  logForm.innerHTML = `
    <div class="panel-header"><div class="panel-title">Log Today's Session</div></div>
    <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group">
        <div class="form-label">Type</div>
        <select class="form-select" id="alType">
          <option value="practice">Practice</option>
          <option value="strength">Strength</option>
          <option value="speed">Speed</option>
          <option value="conditioning">Conditioning</option>
          <option value="recovery">Recovery</option>
          <option value="competition">Competition</option>
        </select>
      </div>
      <div class="form-group">
        <div class="form-label">Duration (min)</div>
        <input class="form-input" id="alDuration" type="number" min="10" max="240" value="60" />
      </div>
      <div class="form-group">
        <div class="form-label">Intensity (RPE 1–10)</div>
        <input class="form-input" id="alIntensity" type="number" min="1" max="10" value="6" />
      </div>
      <div class="form-group" style="display:flex;align-items:flex-end">
        <button class="btn" id="btnSaveAthleteSession" style="width:100%">Save Session</button>
      </div>
    </div>`;
  mount.appendChild(logForm);

  // Sessions list
  if (!sessions.length) {
    const empty = document.createElement("div");
    empty.style.cssText = "text-align:center;padding:40px;color:var(--muted)";
    empty.innerHTML = `<div style="font-size:32px;margin-bottom:8px">🏋️</div><div>No sessions yet. Log your first one!</div>`;
    mount.appendChild(empty);
  } else {
    sessions.forEach(s => {
      const intensity = Number(s.intensity || 0);
      const dotClass = intensity >= 8 ? "high" : intensity >= 5 ? "med" : "low";
      const card = document.createElement("div");
      card.className = "athlete-train-card";
      card.innerHTML = `
        <div class="athlete-train-dot ${dotClass}"></div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px;text-transform:capitalize">${s.type || "Session"}</div>
          <div style="font-size:12px;color:var(--muted)">${s.date || ""} · ${s.duration ?? "—"} min · RPE ${s.intensity ?? "—"}/10</div>
        </div>
        <div>
          <div style="font-family:var(--font-display);font-size:26px;font-weight:900;line-height:1">${s.load ?? "—"}</div>
          <div style="font-size:10px;color:var(--muted);text-align:right">load</div>
        </div>`;
      mount.appendChild(card);
    });
  }

  // Toggle log form
  document.getElementById("btnAthleteLogSession")?.addEventListener("click", () => {
    const f = document.getElementById("athleteQuickLog");
    if (f) f.style.display = f.style.display === "none" ? "" : "none";
  });

  // Save quick log
  document.getElementById("btnSaveAthleteSession")?.addEventListener("click", () => {
    const type     = $("alType")?.value || "practice";
    const duration = Number($("alDuration")?.value || 60);
    const intensity= Number($("alIntensity")?.value || 6);
    const load     = estimateLoad(intensity, duration);

    a.history = a.history || {};
    a.history.sessions = Array.isArray(a.history.sessions) ? a.history.sessions : [];
    a.history.sessions.push({
      id: `s_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type, duration, intensity, load,
      sport: STATE.sport || "basketball",
      created_at: new Date().toISOString(),
    });

    saveAthletes();
    toast(`✅ Session logged · Load: ${load}`);
    renderAthleteTrainView();
  });
}

export function renderTrainView() {
  // Role-aware render
  if (STATE.role === "athlete") {
    renderAthleteTrainView();
    return;
  }

  // Coach view: show builder, hide athlete mount
  const mount = $("trainAthleteMount");
  if (mount) mount.style.display = "none";
  const builder = $("trainCoachBuilder");
  if (builder) builder.style.display = "";

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
