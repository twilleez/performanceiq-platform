import { progressPct } from "../features/trainingEngine.js";

export function athleteHomeView(state) {
  const workout = state.workouts.find(w => w.id === state.ui.activeWorkoutId) || state.workouts[0];
  const pct = progressPct(workout);

  // Readiness banner — messaging varies by score
  const readinessMsg =
    state.athlete.readiness >= 80
      ? "You're primed for a high quality session. Push outputs, keep technique clean."
      : state.athlete.readiness >= 65
        ? "You have enough to train well. Be selective — prioritise quality over volume."
        : "Your body is asking for care today. A recovery session is the smart play.";

  const microcycleCards = state.athlete.microcycle.map(d => {
    const isToday  = d.status === "today";
    const isDone   = d.status === "done";
    const style = isToday
      ? "border-color:rgba(83,181,255,.45);background:rgba(83,181,255,.08)"
      : isDone
        ? "opacity:.45"
        : "";
    return `
      <div class="day-card" style="${style}">
        <strong>${d.day}</strong>
        <div class="muted small">${d.label}</div>
        <div class="muted small" style="margin-top:6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em">
          ${isToday ? "Today" : isDone ? "Done" : "Upcoming"}
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="screen">
      <div class="topbar">
        <div>
          <div class="muted">Today</div>
          <div class="title-xl">My Training, My Body, My Day</div>
        </div>
        <div class="pill">${state.athlete.block} · Week ${state.athlete.week}</div>
      </div>

      <div class="grid two section">
        <div class="card">
          <div class="space">
            <div>
              <div class="muted small">Readiness</div>
              <div class="metric">${state.athlete.readiness}</div>
            </div>
            <button class="secondary sm" data-action="open-readiness">Details</button>
          </div>
          <div class="row section">
            <span class="stat-chip">HRV ${state.athlete.hrv}</span>
            <span class="stat-chip">Sleep ${state.athlete.sleep}h</span>
            <span class="stat-chip">Soreness ${state.athlete.soreness}</span>
            <span class="stat-chip">Battery ${state.athlete.bodyBattery}</span>
          </div>
          <div class="banner section">${readinessMsg}</div>
        </div>

        <div class="card">
          <div class="space">
            <div>
              <div class="muted small">Today Session</div>
              <div class="title-lg">${workout.title}</div>
              <div class="muted">${workout.notes}</div>
            </div>
            <div class="metric-sm">${pct}%</div>
          </div>
          <div class="row section">
            <span class="stat-chip">Weekly Volume ${state.athlete.weeklyVolume}</span>
            <span class="stat-chip">Streak ${state.athlete.streak}</span>
          </div>
          <div class="space section">
            <div class="muted" style="font-size:13px">${workout.recoveryCue}</div>
            <button data-action="start-session">Start</button>
          </div>
        </div>
      </div>

      <div class="card section">
        <div class="space">
          <div class="title-md">This Week</div>
          <span class="pill">${state.athlete.goal}</span>
        </div>
        <div class="grid three section">${microcycleCards}</div>
      </div>
    </div>
  `;
}
