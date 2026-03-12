import { getExercise, progressPct } from "../features/trainingEngine.js";

export function sessionView(state) {
  const workout = state.workout;

  if (!workout) {
    return `
      <div class="screen">
        <div class="topbar">
          <div><div class="muted">Session</div><div class="title-xl">No Session Today</div></div>
        </div>
        <div class="card section" style="text-align:center;padding:32px 16px">
          <div style="font-size:40px;margin-bottom:12px">🏋️</div>
          <div class="title-md" style="margin-bottom:8px">No workout assigned yet</div>
          <div class="muted" style="margin-bottom:20px">Generate a session based on your readiness and sport.</div>
          <button data-action="auto-workout">Generate Workout</button>
        </div>
      </div>`;
  }

  const exerciseCards = workout.exercises.map(ex => {
    const meta = getExercise(ex.id);
    const hasVideo = !!meta?.videoUrl;
    const setTiles = ex.sets.map((s, idx) => `
      <button class="set-tile${s.done ? " done" : ""}" data-action="toggle-set" data-ex="${ex.id}" data-set="${idx}" aria-label="Set ${idx+1}: ${s.target}${s.done?" — complete":""}">
        <div class="muted small">Set ${idx+1}</div>
        <div>${s.target}</div>
        <div class="small">${s.done ? "✓ Done" : "Tap to log"}</div>
      </button>`).join("");

    return `
      <div class="exercise-card">
        <div class="space">
          <div>
            <div class="title-md">${meta?.title || ex.id}</div>
            <div class="muted small">${meta?.pattern || "—"} · ${meta?.equipment || "bodyweight"}</div>
          </div>
          <div class="row">
            <button class="secondary sm" data-action="detail" data-ex="${ex.id}">View</button>
            ${hasVideo ? `<button class="secondary sm" data-action="video" data-url="${meta.videoUrl}">Video</button>` : ""}
            <button class="secondary sm" data-action="swap" data-ex="${ex.id}">Swap</button>
            <button class="sm" data-action="open-sets" data-ex="${ex.id}">Log</button>
          </div>
        </div>
        <div class="set-row">${setTiles}</div>
      </div>`;
  }).join("");

  return `
    <div class="screen">
      <div class="topbar">
        <div><div class="muted">Session</div><div class="title-xl">${workout.title}</div></div>
        <div class="pill">${progressPct(workout)}% complete</div>
      </div>
      <div class="muted section" style="font-size:13px;padding:0 2px">${workout.recovery_cue || ""}</div>
      <div class="list section">${exerciseCards}</div>
    </div>`;
}
