// /js/views/schedule.js
// FIX BUG-2 + BUG-9: Event deletion used sorted-array index but spliced
//   from original array → deleted wrong event. Fixed to delete by reference.
// IMPROVEMENT IMP-1: Add event type tags for game/practice/other distinction.

import { STATE, saveState } from "../state/state.js";
import { toast } from "../services/toast.js";
import { generatePeriodization } from "../features/periodization.js";

function $(id) { return document.getElementById(id); }

function ensureEvents() {
  if (!Array.isArray(STATE.events)) STATE.events = [];
}

// Safe HTML escape
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

export function renderSchedule(hostEl = null) {
  ensureEvents();
  const host = hostEl || $("fullEventList");
  if (!host) return;

  host.innerHTML = "";

  // ── Top bar ──────────────────────────────────────────────────────────────
  const bar = document.createElement("div");
  bar.className = "schedule-bar";
  bar.innerHTML = `
    <div class="schedule-title">Schedule</div>
    <button class="btn" type="button" id="btnAddEvent">+ Add Event</button>
  `;
  host.appendChild(bar);

  // ── Periodization block (Elite) ──────────────────────────────────────────
  const per = document.createElement("div");
  per.className = "panel";
  per.style.margin = "14px 0";
  per.innerHTML = `
    <div class="panel-header">
      <div class="panel-title">Periodization Engine (4-week)</div>
      <div class="pill">Elite</div>
    </div>
    <div class="panel-body" style="padding:14px 16px">
      <div class="row" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <select class="input" id="perSeason" aria-label="Season phase" style="max-width:220px">
          <option value="pre">Pre-Season</option>
          <option value="in">In-Season</option>
          <option value="post">Post-Season</option>
        </select>
        <button class="btn" type="button" id="perGen">Generate 4-week Plan</button>
        <button class="btn ghost" type="button" id="perClear">Clear</button>
      </div>
      <div id="perOut" style="margin-top:12px"></div>
    </div>
  `;
  host.appendChild(per);

  // ── Add-event form ────────────────────────────────────────────────────────
  const form = document.createElement("div");
  form.className = "schedule-form";
  form.style.display = "none";
  form.innerHTML = `
    <input class="input" id="evtTitle" placeholder="Event title" aria-label="Event title" />
    <select class="input" id="evtType" aria-label="Event type" style="max-width:200px">
      <option value="game">🏆 Game</option>
      <option value="practice">⚡ Practice</option>
      <option value="travel">✈️ Travel</option>
      <option value="other">📌 Other</option>
    </select>
    <input class="input" id="evtDate" type="date" aria-label="Event date" />
    <button class="btn" type="button" id="evtSave">Save</button>
    <button class="btn ghost" type="button" id="evtCancel">Cancel</button>
  `;
  host.appendChild(form);

  const list = document.createElement("div");
  list.className = "schedule-list";
  host.appendChild(list);

  // ── Periodization render ─────────────────────────────────────────────────
  function drawPeriodization() {
    const out = per.querySelector("#perOut");
    if (!out) return;
    const plan = STATE?.periodization?.active;
    if (!plan) {
      out.innerHTML = `<div class="empty-mini">No plan generated yet.</div>`;
      return;
    }
    out.innerHTML = plan.weeks
      .map((w) => {
        const sessions = w.sessions
          .map(
            (s) => `<div class="schedule-row" style="margin:8px 0">
              <div class="schedule-row-main">
                <div class="schedule-row-title">${esc(s.day)}: ${esc(s.type)}</div>
                <div class="schedule-row-sub">${s.minutes} min • target load ${s.loadTarget}</div>
              </div>
            </div>`
          )
          .join("");
        return `
          <div class="panel" style="margin:10px 0">
            <div class="panel-header">
              <div class="panel-title">Week ${w.week} — ${esc(w.start)}</div>
              <div class="pill">${esc(w.focus)}</div>
            </div>
            <div class="panel-body" style="padding:10px 14px">${sessions}</div>
          </div>
        `;
      })
      .join("");
  }

  // ── Event list render ─────────────────────────────────────────────────────
  // FIX BUG-2: Store reference to event object in closure, delete by reference
  function drawList() {
    list.innerHTML = "";
    if (!STATE.events.length) {
      const empty = document.createElement("div");
      empty.className = "empty-mini";
      empty.textContent = "No events yet. Click + Add Event to schedule games and practices.";
      list.appendChild(empty);
      return;
    }

    const TYPE_ICONS = { game: "🏆", practice: "⚡", travel: "✈️", other: "📌" };

    // Sort by date ascending, but keep reference to original event objects
    const sorted = STATE.events
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    sorted.forEach((eventObj) => {
      const icon = TYPE_ICONS[eventObj.type] || "📌";
      const isPast = eventObj.date < new Date().toISOString().slice(0, 10);

      const row = document.createElement("div");
      row.className = "schedule-row";
      if (isPast) row.style.opacity = "0.6";

      row.innerHTML = `
        <div class="schedule-row-main">
          <div class="schedule-row-title">${icon} ${esc(eventObj.title)}</div>
          <div class="schedule-row-sub">${esc(eventObj.date)}${isPast ? " · Past" : ""}</div>
        </div>
        <button class="icon-btn danger" type="button" aria-label="Delete ${esc(eventObj.title)}">✕</button>
      `;

      // FIX BUG-2: Delete by reference, not index
      row.querySelector("button")?.addEventListener("click", () => {
        STATE.events = STATE.events.filter((e) => e !== eventObj);
        saveState();
        drawList();
        toast("Event deleted");
      });

      list.appendChild(row);
    });
  }

  // ── Event bindings ────────────────────────────────────────────────────────
  const btnAdd = bar.querySelector("#btnAddEvent");
  const btnSave = form.querySelector("#evtSave");
  const btnCancel = form.querySelector("#evtCancel");

  btnAdd?.addEventListener("click", () => {
    form.style.display = form.style.display === "none" ? "" : "none";
    form.querySelector("#evtTitle")?.focus();
  });

  btnCancel?.addEventListener("click", () => {
    form.style.display = "none";
  });

  btnSave?.addEventListener("click", () => {
    const title = String(form.querySelector("#evtTitle")?.value || "").trim();
    const date = String(form.querySelector("#evtDate")?.value || "").trim();
    const type = String(form.querySelector("#evtType")?.value || "other");
    if (!title || !date) { toast("Enter title + date"); return; }

    STATE.events.push({
      title,
      date,
      type,
      created_at: new Date().toISOString(),
    });
    saveState();
    form.querySelector("#evtTitle").value = "";
    form.querySelector("#evtDate").value = "";
    form.style.display = "none";
    drawList();
    toast("Event added ✓");
  });

  per.querySelector("#perGen")?.addEventListener("click", () => {
    const seasonPhase = String(per.querySelector("#perSeason")?.value || "pre");
    const sport = STATE.sport || "basketball";
    const plan = generatePeriodization({ seasonPhase, sport });
    if (!STATE.periodization) STATE.periodization = { active: null };
    STATE.periodization.active = plan;
    saveState();
    drawPeriodization();
    toast("Periodization plan generated ✓");
  });

  per.querySelector("#perClear")?.addEventListener("click", () => {
    if (!STATE.periodization) STATE.periodization = { active: null };
    STATE.periodization.active = null;
    saveState();
    drawPeriodization();
    toast("Plan cleared");
  });

  drawList();
  drawPeriodization();
}
