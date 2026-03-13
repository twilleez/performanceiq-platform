import { progressPct } from "../features/trainingEngine.js";
import { buildMicrocycle } from "../features/microcycle.js";

export function athleteHomeView(state) {
  const { profile, workout, readiness } = state;

  const score = readiness?.score ?? null;
  const scoreColor =
    score === null ? "var(--muted)" :
    score >= 80    ? "#34d399"      :
    score >= 65    ? "#fbbf24"      : "#f87171";

  const readinessMsg =
    score === null ? "Log today's check-in to get your personalised readiness score." :
    score >= 80    ? "You're primed for a high quality session. Push outputs, keep technique clean." :
    score >= 65    ? "You have enough to train well. Be selective — prioritise quality over volume." :
                     "Your body is asking for care today. A recovery session is the smart play.";

  const chips = score !== null ? `
    <div class="row" style="margin-top:12px;flex-wrap:wrap;gap:6px">
      <span class="stat-chip">HRV ${readiness.hrv || "—"}</span>
      <span class="stat-chip">Sleep ${readiness.sleep_hrs}h</span>
      <span class="stat-chip">Soreness ${readiness.soreness}</span>
      <span class="stat-chip">Battery ${readiness.body_battery}%</span>
    </div>
  ` : "";

  // Workout block
  const pct = workout ? progressPct(workout) : 0;
  const dayType = workout?.day_type ?? "";
  const dayTypePill = dayType
    ? `<span class="pill" style="font-size:11px;background:${
        dayType === "power"    ? "rgba(251,191,36,.1)" :
        dayType === "recovery" ? "rgba(52,211,153,.1)"  : "rgba(83,181,255,.1)"
      };border-color:${
        dayType === "power"    ? "rgba(251,191,36,.3)" :
        dayType === "recovery" ? "rgba(52,211,153,.3)"  : "rgba(83,181,255,.3)"
      }">${dayType}</span>`
    : "";

  const workoutBlock = workout
    ? `
      <div class="card">
        <div class="space" style="align-items:flex-start">
          <div style="flex:1;min-width:0">
            <div class="row" style="gap:6px;margin-bottom:4px">
              <div class="muted small">Today's Session</div>
              ${dayTypePill}
            </div>
            <div class="title-md" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${workout.title}</div>
            <div class="muted" style="font-size:13px;margin-top:4px">${workout.notes}</div>
          </div>
          <div class="metric-sm" style="color:var(--accent);flex-shrink:0">${pct}%</div>
        </div>
        <div style="margin-top:10px;height:3px;border-radius:3px;background:rgba(255,255,255,.07)">
          <div style="width:${pct}%;height:100%;border-radius:3px;background:var(--accent);transition:width .4s"></div>
        </div>
        <div class="row" style="margin-top:12px;justify-content:space-between">
          <div class="muted" style="font-size:12px">${workout.recovery_cue}</div>
          <button class="sm" data-action="start-session">▶ Start</button>
        </div>
      </div>
    `
    : `
      <div class="card" style="text-align:center;padding:20px 16px">
        <div class="muted small" style="margin-bottom:6px">Today's Session</div>
        <div class="title-md" style="margin-bottom:6px">No session yet</div>
        <div class="muted" style="font-size:13px;margin-bottom:16px">Generate a session based on your readiness score.</div>
        <button data-action="auto-workout" style="width:100%">⚡ Generate Workout</button>
      </div>
    `;

  // Microcycle
  const microcycle = buildMicrocycle(profile?.sport ?? "basketball");
  const microcycleCards = microcycle.map(d => {
    const isToday = d.status === "today";
    const isDone  = d.status === "done";
    return `
      <div class="day-card${isToday ? " today" : ""}" style="${isDone ? "opacity:.4" : ""}">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px;color:${isToday ? "var(--accent)" : "var(--muted)"}">
          ${isToday ? "Today" : isDone ? "Done" : d.day}
        </div>
        <div style="font-weight:600;font-size:13px">${d.label}</div>
      </div>
    `;
  }).join("");

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric"
  });

  return `
    <div class="screen">
      <div class="topbar">
        <div>
          <div class="muted" style="font-size:12px">${dateStr}</div>
          <div class="title-xl">
            ${profile?.name ? `Hey, ${profile.name.split(" ")[0]}.` : "My Training."}
          </div>
        </div>
        ${profile?.sport
          ? `<div class="pill">${profile.sport[0].toUpperCase() + profile.sport.slice(1)}</div>`
          : ""}
      </div>

      ${state.ui.error ? `<div class="banner section" style="background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.3)">${state.ui.error}</div>` : ""}

      <div class="grid two section">
        <!-- Readiness card -->
        <div class="card">
          <div class="space">
            <div>
              <div class="muted small" style="margin-bottom:4px">Readiness</div>
              <div class="metric" style="color:${scoreColor}">
                ${score !== null ? score : "—"}
              </div>
            </div>
            <button class="secondary sm" data-action="open-readiness">
              ${score !== null ? "Details" : "Check In"}
            </button>
          </div>
          ${chips}
          <div class="banner section" style="font-size:13px">${readinessMsg}</div>
        </div>

        <!-- Workout card -->
        ${workoutBlock}
      </div>

      <!-- Microcycle -->
      <div class="card section">
        <div class="space" style="margin-bottom:12px">
          <div class="title-md">This Week</div>
          ${profile?.goal ? `<span class="pill" style="font-size:11px">${profile.goal}</span>` : ""}
        </div>
        <div class="grid" style="grid-template-columns:repeat(5,1fr);gap:8px">
          ${microcycleCards}
        </div>
      </div>

      <!-- Solo mode notice -->
      ${!state.session ? `
        <div class="card section" style="background:rgba(83,181,255,.06);border-color:rgba(83,181,255,.15)">
          <div class="space">
            <div>
              <div style="font-weight:600;margin-bottom:2px">Solo Mode</div>
              <div class="muted" style="font-size:13px">Your data lives on this device only. Sign up to sync across devices and unlock team features.</div>
            </div>
            <button class="secondary sm" data-action="sign-in-prompt">Sign Up</button>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}
