import { getExercise } from "../features/trainingEngine.js";

// ─── Readiness Detail + Input Sheet ──────────────────────────────────────────
export function readinessSheet(state) {
  if (!state.ui.activeReadinessSheet) return "";
  return `
    <div class="sheet-backdrop">
      <div class="sheet">
        <div class="handle"></div>
        <div class="space">
          <div>
            <div class="title-lg">Readiness Detail</div>
            <div class="muted">Today's body-state summary.</div>
          </div>
          <button class="secondary" data-action="close-readiness">Close</button>
        </div>

        <div class="grid two section">
          <div class="item"><strong>HRV</strong><div class="muted">${state.athlete.hrv}</div></div>
          <div class="item"><strong>Sleep</strong><div class="muted">${state.athlete.sleep}h</div></div>
          <div class="item"><strong>Soreness</strong><div class="muted">${state.athlete.soreness}</div></div>
          <div class="item"><strong>Hydration</strong><div class="muted">${state.athlete.hydration}</div></div>
        </div>

        <div class="card section">
          <div class="title-md" style="margin-bottom:12px">Update Today's Check-in</div>
          <div class="list">
            <label class="input-row">
              <span class="muted small">Sleep (hrs)</span>
              <input
                id="ri-sleep"
                type="number"
                min="0" max="14" step="0.1"
                value="${state.athlete.sleep}"
                style="width:90px"
              />
            </label>
            <label class="input-row">
              <span class="muted small">Soreness</span>
              <select id="ri-soreness" class="select-input">
                ${["None","Low","Moderate","High"].map(v =>
                  `<option${state.athlete.soreness === v ? " selected" : ""}>${v}</option>`
                ).join("")}
              </select>
            </label>
            <label class="input-row">
              <span class="muted small">Hydration</span>
              <select id="ri-hydration" class="select-input">
                ${["On target","Low","Very low"].map(v =>
                  `<option${state.athlete.hydration === v ? " selected" : ""}>${v}</option>`
                ).join("")}
              </select>
            </label>
          </div>
          <button style="margin-top:14px;width:100%" data-action="save-readiness">Save Check-in</button>
        </div>
      </div>
    </div>
  `;
}

// ─── Set Logging Sheet ────────────────────────────────────────────────────────
export function setLoggingSheet(state) {
  const workout = state.workouts.find(w => w.id === state.ui.activeWorkoutId) || state.workouts[0];
  const ex = workout.exercises.find(x => x.id === state.ui.activeSetExerciseId);
  const meta = getExercise(ex?.id);
  if (!ex) return "";

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
      <div class="small">${s.done ? "✓ Complete" : "Tap to log"}</div>
    </button>
  `).join("");

  return `
    <div class="sheet-backdrop">
      <div class="sheet">
        <div class="handle"></div>
        <div class="space">
          <div>
            <div class="title-lg">${meta?.title || ex.id}</div>
            <div class="muted">${meta?.cue || "Tap a set to mark it complete."}</div>
          </div>
          <button class="secondary" data-action="close-set-sheet">Done</button>
        </div>
        <div class="set-row section">${setTiles}</div>
      </div>
    </div>
  `;
}

// ─── Swap Sheet ───────────────────────────────────────────────────────────────
export function swapSheet(state, options) {
  if (!state.ui.activeSwapExerciseId) return "";

  const optionItems = options.length
    ? options.map(o => `
        <div class="item space">
          <div>
            <strong>${o.title}</strong>
            <div class="muted small">${o.pattern} · ${o.equipment}</div>
          </div>
          <button data-action="pick-swap" data-new="${o.id}">Use</button>
        </div>
      `).join("")
    : `<div class="item muted">No swap options found for this sport and movement pattern.</div>`;

  return `
    <div class="sheet-backdrop">
      <div class="sheet">
        <div class="handle"></div>
        <div class="space">
          <div>
            <div class="title-lg">Swap Exercise</div>
            <div class="muted">Same sport. Same pattern. Same training intent.</div>
          </div>
          <button class="secondary" data-action="close-swap-sheet">Close</button>
        </div>
        <div class="list section">${optionItems}</div>
      </div>
    </div>
  `;
}

// ─── Exercise Detail Sheet ────────────────────────────────────────────────────
export function detailSheet(state) {
  if (!state.ui.activeDetailExerciseId) return "";
  const meta = getExercise(state.ui.activeDetailExerciseId);
  if (!meta) return "";

  const videoSection = meta.videoUrl
    ? `<div class="card section">
         <div class="title-md">Video Demo</div>
         <button class="secondary" style="margin-top:10px;width:100%" data-action="video" data-url="${meta.videoUrl}">
           ▶ Watch Demo
         </button>
       </div>`
    : `<div class="card section" style="opacity:.45">
         <div class="title-md">Video Demo</div>
         <div class="muted section" style="font-size:13px">No demo video linked yet.</div>
       </div>`;

  return `
    <div class="sheet-backdrop">
      <div class="sheet">
        <div class="handle"></div>
        <div class="space">
          <div>
            <div class="title-lg">${meta.title}</div>
            <div class="muted">${meta.pattern} · ${meta.equipment}</div>
          </div>
          <button class="secondary" data-action="close-detail-sheet">Close</button>
        </div>
        <div class="card section">
          <div class="title-md">Coaching Cue</div>
          <div class="muted section">${meta.cue}</div>
        </div>
        ${videoSection}
      </div>
    </div>
  `;
}

// ─── Video Coming Soon Sheet ──────────────────────────────────────────────────
export function videoSheet(state) {
  if (!state.ui.activeVideoUrl && !state.ui.videoSheetOpen) return "";
  return `
    <div class="sheet-backdrop">
      <div class="sheet">
        <div class="handle"></div>
        <div class="space">
          <div class="title-lg">Video Demo</div>
          <button class="secondary" data-action="close-video-sheet">Close</button>
        </div>
        <div class="card section" style="text-align:center;padding:32px 16px">
          <div style="font-size:40px;margin-bottom:12px">🎬</div>
          <div class="title-md">Coming Soon</div>
          <div class="muted section" style="font-size:14px">
            Video demos will be linked here when your exercise library is connected to hosted media.
          </div>
        </div>
      </div>
    </div>
  `;
}
