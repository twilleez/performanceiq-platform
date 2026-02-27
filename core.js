// core.js — v5.0.0 (Week 5–6 Performance Engine Integrated)

(function () {
  "use strict";
  if (window.__PIQ_CORE_V5__) return;
  window.__PIQ_CORE_V5__ = true;

  const STORAGE_KEY = "piq_state_v5";

  function defaultState() {
    return {
      ui: {
        activeView: "dashboard",
        role: "coach",
        sport: "basketball",
        advancedMode: false
      },
      athletes: [],
      logs: {},
      periodization: {
        currentWeek: 1
      }
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return JSON.parse(raw);
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  const $ = (id) => document.getElementById(id);

  function showView(view) {
    document.querySelectorAll(".view").forEach(v => v.hidden = true);
    const el = document.getElementById("view-" + view);
    if (el) el.hidden = false;
    state.ui.activeView = view;
    saveState();

    if (view === "periodization") renderPeriodization();
    if (view === "workouts") renderWorkouts();
  }

  function renderPeriodization() {
    const host = $("view-periodization");
    if (!host) return;

    const week = state.periodization.currentWeek;
    const phase = window.periodizationEngine.getCurrentPhase(week);
    const info = window.periodizationEngine.PHASES[phase];

    host.innerHTML = `
      <div class="card">
        <div class="cardhead">
          <h2>Periodization</h2>
          <span class="muted">Week ${week}</span>
        </div>

        <div class="mini">
          <div class="minihead">Current Phase</div>
          <div class="minibody">
            <b>${info.label}</b><br/>
            <span class="muted small">${info.description}</span>
          </div>
        </div>

        <div class="row gap wrap" style="margin-top:12px">
          <button class="btn" id="btnNextWeek">Next Week</button>
        </div>
      </div>
    `;

    $("btnNextWeek").onclick = () => {
      state.periodization.currentWeek++;
      saveState();
      renderPeriodization();
    };
  }

  function renderWorkouts() {
    const host = $("view-workouts");
    if (!host) return;

    const workout = window.workoutEngine.generateWorkout({
      sport: state.ui.sport,
      advanced: state.ui.advancedMode
    });

    host.innerHTML = `
      <div class="card">
        <div class="cardhead">
          <h2>Workout Plan</h2>
          <span class="muted">${workout.sport.toUpperCase()}</span>
        </div>

        <div class="mini">
          <div class="minihead">Exercises</div>
          <div class="minibody">
            <ul>
              ${workout.exercises.map(e => `<li>${e}</li>`).join("")}
            </ul>
          </div>
        </div>

        <div class="row gap wrap" style="margin-top:12px">
          <button class="btn" id="btnToggleAdvanced">
            ${state.ui.advancedMode ? "Switch to Standard" : "Switch to Advanced"}
          </button>
        </div>
      </div>
    `;

    $("btnToggleAdvanced").onclick = () => {
      state.ui.advancedMode = !state.ui.advancedMode;
      saveState();
      renderWorkouts();
    };
  }

  function boot() {
    document.querySelectorAll(".navbtn").forEach(btn => {
      btn.onclick = () => showView(btn.dataset.view);
    });

    showView(state.ui.activeView || "dashboard");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
