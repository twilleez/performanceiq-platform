import { getExercise, progressPct } from "../features/trainingEngine.js";

export function sessionView(state) {
  const workout = state.workouts.find(w => w.id === state.ui.activeWorkoutId) || state.workouts[0];

  const exerciseCards = workout.exercises.map(ex => {
    const meta = getExercise(ex.id);
    const hasVideo = !!meta?.videoUrl; // only show Video btn when URL exists

    // Set tiles rendered as <button> for accessibility + iOS tap feedback
    const setTiles = ex.sets.map((s, idx) => `
      <button
        class="set-tile${s.done ? " done" : ""}"
        data-action="toggle-set"
        data-ex="${ex.id}"
        data-set="${idx}"
        aria-label="Set ${idx + 1}: ${s.target}${s.done ? " — complete" : ""}"
      >
        <div class="muted small">Set ${idx + 1}</div>
        <div>${s.target}</div>
        <div class="small">${s.done ? "✓ Done" : "Tap to log"}</div>
      </button>
    `).join("");

    return `
      <div class="exercise-card">
        <div class="space">
          <div>
            <div class="title-md">${meta?.title || ex.id}</div>
            <div class="muted small">${meta?.pattern || "—"} · ${meta?.equipment || "bodyweight"}</div>
          </div>
          <div class="row">
            <button class="secondary sm" data-action="detail" data-ex="${ex.id}">View</button>
            ${hasVideo ? `<button class="secondary sm" data-action="video" data-ex="${ex.id}" data-url="${meta.videoUrl}">Video</button>` : ""}
            <button class="secondary sm" data-action="swap" data-ex="${ex.id}">Swap</button>
            <button class="sm" data-action="open-sets" data-ex="${ex.id}">Log</button>
          </div>
        </div>
        <div class="set-row">${setTiles}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="screen">
      <div class="topbar">
        <div>
          <div class="muted">Session</div>
          <div class="title-xl">${workout.title}</div>
        </div>
        <div class="pill">${progressPct(workout)}% complete</div>
      </div>
      <div class="list section">${exerciseCards}</div>
    </div>
  `;
}
