// /js/views/schedule.js
import { STATE, saveState } from "../state/state.js";
import { toast } from "../services/toast.js";

function $(id) { return document.getElementById(id); }

function ensureEvents() {
  if (!Array.isArray(STATE.events)) STATE.events = [];
}

export function renderSchedule(hostEl = null) {
  ensureEvents();
  const host = hostEl || $("fullEventList");
  if (!host) return;

  host.innerHTML = "";

  const bar = document.createElement("div");
  bar.className = "schedule-bar";
  bar.innerHTML = `
    <div class="schedule-title">Schedule</div>
    <button class="btn" type="button" id="btnAddEvent">+ Add Event</button>
  `;
  host.appendChild(bar);

  const form = document.createElement("div");
  form.className = "schedule-form";
  form.style.display = "none";
  form.innerHTML = `
    <input class="input" id="evtTitle" placeholder="Event title" aria-label="Event title" />
    <input class="input" id="evtDate" type="date" aria-label="Event date" />
    <button class="btn" type="button" id="evtSave">Save</button>
    <button class="btn ghost" type="button" id="evtCancel">Cancel</button>
  `;
  host.appendChild(form);

  const list = document.createElement("div");
  list.className = "schedule-list";
  host.appendChild(list);

  function drawList() {
    list.innerHTML = "";
    if (!STATE.events.length) {
      const empty = document.createElement("div");
      empty.className = "empty-mini";
      empty.textContent = "No events yet.";
      list.appendChild(empty);
      return;
    }
    STATE.events
      .slice()
      .sort((a,b)=>String(a.date).localeCompare(String(b.date)))
      .forEach((e, idx) => {
        const row = document.createElement("div");
        row.className = "schedule-row";
        row.innerHTML = `
          <div class="schedule-row-main">
            <div class="schedule-row-title">${e.title}</div>
            <div class="schedule-row-sub">${e.date}</div>
          </div>
          <button class="icon-btn danger" type="button" aria-label="Delete event">✕</button>
        `;
        row.querySelector("button")?.addEventListener("click", () => {
          STATE.events.splice(idx, 1);
          saveState();
          drawList();
          toast("Event deleted");
        });
        list.appendChild(row);
      });
  }

  const btnAdd = bar.querySelector("#btnAddEvent");
  const btnSave = form.querySelector("#evtSave");
  const btnCancel = form.querySelector("#evtCancel");

  btnAdd?.addEventListener("click", () => {
    form.style.display = form.style.display === "none" ? "" : "none";
  });

  btnCancel?.addEventListener("click", () => { form.style.display = "none"; });

  btnSave?.addEventListener("click", () => {
    const title = String(form.querySelector("#evtTitle")?.value || "").trim();
    const date = String(form.querySelector("#evtDate")?.value || "").trim();
    if (!title || !date) { toast("Enter title + date"); return; }
    STATE.events.push({ title, date, created_at: new Date().toISOString() });
    saveState();
    form.querySelector("#evtTitle").value = "";
    form.querySelector("#evtDate").value = "";
    form.style.display = "none";
    drawList();
    toast("Event added ✓");
  });

  drawList();
}
