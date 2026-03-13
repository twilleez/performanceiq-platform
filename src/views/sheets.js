import { getExercise } from "../features/trainingEngine.js";

// ─── Readiness Sheet ──────────────────────────────────────────────────────────
// BUG FIX: was referencing state.athlete.* — correct shape is state.readiness.*
export function readinessSheet(state) {
  if (!state.ui.activeReadinessSheet) return "";

  const r = state.readiness;
  const score = r?.score ?? null;

  const scoreColor =
    score === null ? "var(--muted)" :
    score >= 80    ? "#34d399"      :
    score >= 65    ? "#fbbf24"      : "#f87171";

  const scoreLabel =
    score === null ? "Not logged" :
    score >= 80    ? "Primed"     :
    score >= 65    ? "Build"      : "Recover";

  return `
    <div class="sheet-backdrop" data-action="close-readiness">
      <div class="sheet" onclick="event.stopPropagation()">
        <div class="handle"></div>
        <div class="space">
          <div>
            <div class="title-lg">Today's Check-in</div>
            <div class="muted">Log how your body feels right now.</div>
          </div>
          <button class="secondary sm" data-action="close-readiness">✕</button>
        </div>

        ${score !== null ? `
        <div class="readiness-hero section">
          <div class="metric" style="color:${scoreColor}">${score}</div>
          <div class="pill" style="border-color:${scoreColor};color:${scoreColor}">${scoreLabel}</div>
          <div class="row section" style="flex-wrap:wrap;gap:8px">
            <span class="stat-chip">HRV ${r.hrv || "—"}</span>
            <span class="stat-chip">Sleep ${r.sleep_hrs}h</span>
            <span class="stat-chip">Soreness ${r.soreness}</span>
            <span class="stat-chip">Battery ${r.body_battery}%</span>
          </div>
        </div>
        ` : ""}

        <div class="card section">
          <div class="title-md" style="margin-bottom:12px">
            ${score !== null ? "Update Check-in" : "Log Today's Check-in"}
          </div>
          <div class="list">
            <label class="input-row">
              <span>Sleep (hrs)</span>
              <input
                id="ri-sleep" type="number" min="0" max="14" step="0.5"
                value="${r?.sleep_hrs ?? 7}"
                style="width:90px;text-align:center"
              />
            </label>
            <label class="input-row">
              <span>Soreness</span>
              <select id="ri-soreness" class="select-input">
                ${["None","Low","Moderate","High"].map(v =>
                  `<option${r?.soreness === v ? " selected" : ""}>${v}</option>`
                ).join("")}
              </select>
            </label>
            <label class="input-row">
              <span>Hydration</span>
              <select id="ri-hydration" class="select-input">
                ${["On target","Low","Very low"].map(v =>
                  `<option${r?.hydration === v ? " selected" : ""}>${v}</option>`
                ).join("")}
              </select>
            </label>
            <label class="input-row">
              <span>Energy (1–10)</span>
              <input
                id="ri-battery" type="number" min="1" max="100" step="1"
                value="${r?.body_battery ?? 70}"
                style="width:90px;text-align:center"
              />
            </label>
          </div>
          <button style="margin-top:16px;width:100%" data-action="save-readiness">
            Save Check-in
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Set Logging Sheet ────────────────────────────────────────────────────────
// BUG FIX: was referencing state.workouts[] — correct shape is state.workout (singular)
export function setLoggingSheet(state) {
  if (!state.ui.activeSetExerciseId) return "";

  const workout = state.workout;
  if (!workout) return "";

  const ex = workout.exercises?.find(x => x.id === state.ui.activeSetExerciseId);
  if (!ex) return "";

  const meta = getExercise(ex.id);

  const setTiles = (ex.sets ?? []).map((s, idx) => `
    <button
      class="set-tile${s.done ? " done" : ""}"
      data-action="toggle-set"
      data-ex="${ex.id}"
      data-set="${idx}"
      aria-label="Set ${idx + 1}: ${s.target}${s.done ? " — complete" : ""}"
    >
      <div class="muted small">Set ${idx + 1}</div>
      <div style="font-weight:700;margin:4px 0">${s.target}</div>
      <div class="small">${s.done ? "✓ Done" : "Tap to log"}</div>
    </button>
  `).join("");

  const doneSets  = (ex.sets ?? []).filter(s => s.done).length;
  const totalSets = (ex.sets ?? []).length;

  return `
    <div class="sheet-backdrop" data-action="close-set-sheet">
      <div class="sheet" onclick="event.stopPropagation()">
        <div class="handle"></div>
        <div class="space">
          <div>
            <div class="title-lg">${meta?.title || ex.id}</div>
            <div class="muted">${meta?.cue || "Tap a set tile to mark it complete."}</div>
          </div>
          <button class="secondary sm" data-action="close-set-sheet">Done</button>
        </div>
        <div class="progress-bar section">
          <div style="height:3px;border-radius:3px;background:rgba(255,255,255,.08)">
            <div style="width:${totalSets ? Math.round((doneSets/totalSets)*100) : 0}%;height:100%;border-radius:3px;background:var(--accent);transition:width .3s"></div>
          </div>
          <div class="muted small" style="margin-top:6px">${doneSets} of ${totalSets} sets logged</div>
        </div>
        <div class="set-row section">${setTiles}</div>
        <div class="card section" style="opacity:.7">
          <div class="muted small" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Movement Pattern</div>
          <div>${meta?.pattern || "—"} · ${meta?.equipment || "bodyweight"}</div>
        </div>
      </div>
    </div>
  `;
}

// ─── Swap Sheet ───────────────────────────────────────────────────────────────
export function swapSheet(state, options) {
  if (!state.ui.activeSwapExerciseId) return "";

  const currentMeta = getExercise(state.ui.activeSwapExerciseId);

  const optionItems = options.length
    ? options.map(o => `
        <div class="item space">
          <div>
            <strong>${o.title}</strong>
            <div class="muted small">${o.pattern} · ${o.equipment}</div>
            <div class="muted small" style="font-size:11px;margin-top:4px">${o.cue}</div>
          </div>
          <button class="sm" data-action="pick-swap" data-new="${o.id}">Use</button>
        </div>
      `).join("")
    : `<div class="item muted">No swap options found for this sport and movement pattern.</div>`;

  return `
    <div class="sheet-backdrop" data-action="close-swap-sheet">
      <div class="sheet" onclick="event.stopPropagation()">
        <div class="handle"></div>
        <div class="space">
          <div>
            <div class="title-lg">Swap Exercise</div>
            <div class="muted">Same sport · same pattern · same intent.</div>
          </div>
          <button class="secondary sm" data-action="close-swap-sheet">✕</button>
        </div>
        ${currentMeta ? `
        <div class="banner section" style="font-size:13px">
          Replacing: <strong>${currentMeta.title}</strong>
          <span class="muted"> (${currentMeta.pattern})</span>
        </div>` : ""}
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

  const patternLabel = {
    power:          "⚡ Power",
    strength_lower: "🏋️ Strength",
    hinge:          "🔄 Hinge",
    speed:          "💨 Speed",
    core:           "🎯 Core",
  }[meta.pattern] || meta.pattern;

  return `
    <div class="sheet-backdrop" data-action="close-detail-sheet">
      <div class="sheet" onclick="event.stopPropagation()">
        <div class="handle"></div>
        <div class="space">
          <div>
            <div class="title-lg">${meta.title}</div>
            <div class="row" style="gap:8px;margin-top:6px">
              <span class="pill" style="font-size:11px">${patternLabel}</span>
              <span class="pill" style="font-size:11px">${meta.equipment}</span>
              <span class="pill" style="font-size:11px">${meta.sport}</span>
            </div>
          </div>
          <button class="secondary sm" data-action="close-detail-sheet">✕</button>
        </div>

        <div class="card section">
          <div class="muted small" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Coaching Cue</div>
          <div style="font-size:16px;line-height:1.55;font-weight:500">"${meta.cue}"</div>
        </div>

        <div class="card section" style="opacity:.6;text-align:center;padding:24px 16px">
          <div style="font-size:32px;margin-bottom:8px">🎬</div>
          <div class="title-md">Video Demo</div>
          <div class="muted" style="font-size:13px;margin-top:6px">Coming soon — video library in progress.</div>
        </div>
      </div>
    </div>
  `;
}

// ─── Video Sheet ──────────────────────────────────────────────────────────────
export function videoSheet(state) {
  if (!state.ui.videoSheetOpen) return "";
  return `
    <div class="sheet-backdrop" data-action="close-video-sheet">
      <div class="sheet" onclick="event.stopPropagation()">
        <div class="handle"></div>
        <div class="space">
          <div class="title-lg">Video Demo</div>
          <button class="secondary sm" data-action="close-video-sheet">✕</button>
        </div>
        <div class="card section" style="text-align:center;padding:40px 16px">
          <div style="font-size:48px;margin-bottom:12px">🎬</div>
          <div class="title-md">Coming Soon</div>
          <div class="muted section" style="font-size:14px;max-width:280px;margin:10px auto 0">
            Video demos will be available once the exercise library is linked to hosted media.
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Onboarding Sheet ─────────────────────────────────────────────────────────
export function onboardingSheet(state) {
  const step = state.ui.onboardingStep;
  if (!step) return "";

  const SPORTS = ["basketball","football","soccer","baseball","volleyball","track"];
  const POSITIONS = {
    basketball: ["Point Guard","Shooting Guard","Small Forward","Power Forward","Center"],
    football:   ["QB","RB","WR","TE","OL","DL","LB","DB","K/P"],
    soccer:     ["Goalkeeper","Defender","Midfielder","Forward"],
    baseball:   ["Pitcher","Catcher","Infield","Outfield","DH"],
    volleyball: ["Setter","Outside Hitter","Middle Blocker","Libero","Opposite"],
    track:      ["Sprinter","Distance","Jumper","Thrower","Multi-event"],
  };
  const GOALS = [
    "Get Faster", "Build Strength", "Improve Endurance",
    "Peak for Season", "Recover Smart", "General Fitness",
  ];

  const profile = state.ui.onboardingDraft ?? {};

  if (step === 1) {
    return `
      <div class="sheet-backdrop" style="align-items:center">
        <div class="sheet" style="max-width:440px;border-radius:28px;padding:28px">
          <div class="title-lg" style="margin-bottom:6px">Welcome to PerformanceIQ</div>
          <div class="muted" style="margin-bottom:22px">Let's build your athlete profile. Takes 30 seconds.</div>

          <div class="list">
            <label class="input-row" style="flex-direction:column;align-items:flex-start;gap:8px">
              <span style="font-weight:600">Your Name</span>
              <input id="ob-name" type="text" placeholder="e.g. Alex Johnson" value="${profile.name ?? ""}"/>
            </label>
            <label class="input-row" style="flex-direction:column;align-items:flex-start;gap:8px;margin-top:12px">
              <span style="font-weight:600">Primary Sport</span>
              <div class="grid three" style="width:100%;gap:8px">
                ${SPORTS.map(s => `
                  <button class="secondary sm${profile.sport === s ? " active-sport" : ""}"
                    data-ob-sport="${s}" style="${profile.sport === s ? "background:rgba(83,181,255,.18);border-color:rgba(83,181,255,.45);color:var(--text)" : ""}">
                    ${s[0].toUpperCase() + s.slice(1)}
                  </button>
                `).join("")}
              </div>
            </label>
          </div>

          <button style="width:100%;margin-top:20px" data-action="ob-step-2">
            Continue →
          </button>
        </div>
      </div>
    `;
  }

  if (step === 2) {
    const positions = POSITIONS[profile.sport] ?? ["General"];
    return `
      <div class="sheet-backdrop" style="align-items:center">
        <div class="sheet" style="max-width:440px;border-radius:28px;padding:28px">
          <div class="muted small" style="margin-bottom:4px">Step 2 of 3</div>
          <div class="title-lg" style="margin-bottom:6px">Your Role</div>
          <div class="muted" style="margin-bottom:22px">Position, goal, and how you're using PerformanceIQ.</div>

          <div class="list">
            <label class="input-row" style="flex-direction:column;align-items:flex-start;gap:8px">
              <span style="font-weight:600">Position</span>
              <select id="ob-position" class="select-input" style="width:100%">
                <option value="">Select position…</option>
                ${positions.map(p => `<option${profile.position === p ? " selected" : ""}>${p}</option>`).join("")}
              </select>
            </label>
            <label class="input-row" style="flex-direction:column;align-items:flex-start;gap:8px;margin-top:12px">
              <span style="font-weight:600">Primary Goal</span>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%">
                ${GOALS.map(g => `
                  <button class="secondary sm${profile.goal === g ? " active-sport" : ""}"
                    data-ob-goal="${g}" style="${profile.goal === g ? "background:rgba(83,181,255,.18);border-color:rgba(83,181,255,.45);color:var(--text)" : ""}">
                    ${g}
                  </button>
                `).join("")}
              </div>
            </label>
            <label class="input-row" style="flex-direction:column;align-items:flex-start;gap:8px;margin-top:12px">
              <span style="font-weight:600">I am a…</span>
              <div class="row" style="width:100%;gap:8px">
                <button class="secondary sm${profile.role === "athlete" ? " active-sport" : ""}"
                  data-ob-role="athlete" style="${profile.role === "athlete" ? "background:rgba(83,181,255,.18);border-color:rgba(83,181,255,.45);color:var(--text);flex:1" : "flex:1"}">
                  Athlete
                </button>
                <button class="secondary sm${profile.role === "coach" ? " active-sport" : ""}"
                  data-ob-role="coach" style="${profile.role === "coach" ? "background:rgba(83,181,255,.18);border-color:rgba(83,181,255,.45);color:var(--text);flex:1" : "flex:1"}">
                  Coach
                </button>
              </div>
            </label>
          </div>

          <div class="row" style="margin-top:20px">
            <button class="secondary" data-action="ob-step-1">← Back</button>
            <button style="flex:1" data-action="ob-step-3">Continue →</button>
          </div>
        </div>
      </div>
    `;
  }

  if (step === 3) {
    const EQUIP = ["Barbell","Dumbbells","Kettlebell","Bands","Bodyweight Only","Sled","Med Ball"];
    return `
      <div class="sheet-backdrop" style="align-items:center">
        <div class="sheet" style="max-width:440px;border-radius:28px;padding:28px">
          <div class="muted small" style="margin-bottom:4px">Step 3 of 3</div>
          <div class="title-lg" style="margin-bottom:6px">Equipment Access</div>
          <div class="muted" style="margin-bottom:22px">So we generate workouts that match your setup.</div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${EQUIP.map(e => {
              const active = (profile.equipment ?? []).includes(e);
              return `
                <button class="secondary sm${active ? " active-sport" : ""}"
                  data-ob-equip="${e}"
                  style="${active ? "background:rgba(83,181,255,.18);border-color:rgba(83,181,255,.45);color:var(--text)" : ""}">
                  ${e}
                </button>
              `;
            }).join("")}
          </div>

          <div class="row" style="margin-top:20px">
            <button class="secondary" data-action="ob-step-2">← Back</button>
            <button style="flex:1" data-action="ob-finish">Finish Setup →</button>
          </div>
        </div>
      </div>
    `;
  }

  return "";
}
