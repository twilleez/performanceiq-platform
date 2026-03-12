import { progressPct } from "../features/trainingEngine.js";
import { buildMicrocycle } from "../features/microcycle.js";

export function athleteHomeView(state) {
  const { profile, workout, readiness } = state;

  // ── Readiness block ──────────────────────────────────────────────────────
  const score = readiness?.score ?? null;
  const readinessDisplay = score !== null
    ? `<div class="metric">${score}</div>`
    : `<div class="metric muted">—</div>`;

  const readinessMsg = score === null
    ? "Log today's check-in to get your personalised readiness score."
    : score >= 80
      ? "You're primed for a high quality session. Push outputs, keep technique clean."
      : score >= 65
        ? "You have enough to train well. Be selective — prioritise quality over volume."
        : "Your body is asking for care today. A recovery session is the smart play.";

  const chips = score !== null ? `
    <div class="row section">
      <span class="stat-chip">HRV ${readiness.hrv || "—"}</span>
      <span class="stat-chip">Sleep ${readiness.sleep_hrs}h</span>
      <span class="stat-chip">Soreness ${readiness.soreness}</span>
      <span class="stat-chip">Battery ${readiness.body_battery}</span>
    </div>
  ` : "";

  // ── Workout block ────────────────────────────────────────────────────────
  const pct = workout ? progressPct(workout) : 0;
  const workoutBlock = workout
    ? `
      <div class="card">
        <div class="space">
          <div>
            <div class="muted small">Today Session</div>
            <div class="title-lg">${workout.title}</div>
            <div class="muted">${workout.notes}</div>
          </div>
          <div class="metric-sm">${pct}%</div>
        </div>
        <div class="space section">
          <div class="muted" style="font-size:13px">${workout.recovery_cue}</div>
          <button data-action="start-session">Start</button>
        </div>
      </div>
    `
    : `
      <div class="card">
        <div class="muted small" style="margin-bottom:8px">Today Session</div>
        <div class="title-md" style="margin-bottom:12px">No session assigned</div>
        <button data-action="auto-workout">Generate Workout</button>
      </div>
    `;

  // ── Microcycle ───────────────────────────────────────────────────────────
  const microcycle = buildMicrocycle(profile?.sport ?? "basketball");
  const microcycleCards = microcycle.map(d => {
    const isToday = d.status === "today";
    const isDone  = d.status === "done";
    const style   = isToday
      ? "border-color:rgba(83,181,255,.45);background:rgba(83,181,255,.08)"
      : isDone ? "opacity:.45" : "";
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
        <div class="pill">${profile?.sport ?? ""} · ${new Date().toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })}</div>
      </div>

      <div class="grid two section">
        <div class="card">
          <div class="space">
            <div>
              <div class="muted small">Readiness</div>
              ${readinessDisplay}
            </div>
            <button class="secondary sm" data-action="open-readiness">
              ${score !== null ? "Details" : "Check In"}
            </button>
          </div>
          ${chips}
          <div class="banner section">${readinessMsg}</div>
        </div>

        ${workoutBlock}
      </div>

      <div class="card section">
        <div class="space">
          <div class="title-md">This Week</div>
          <span class="pill">${profile?.goal || "Training"}</span>
        </div>
        <div class="grid three section">${microcycleCards}</div>
      </div>
    </div>
  `;
}
