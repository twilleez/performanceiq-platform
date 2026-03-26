  // /js/views/dashboard.js

export function renderDashboard(state) {
  const athlete = state?.profile || {};
  const todayWorkout = state?.todayWorkout || null;

  return `
  <div class="view-with-sidebar">

    <div class="page-main">

      <div class="page-header">
        <h1>Welcome back, <span>${athlete.name || "Athlete"}</span></h1>
        <p>Your daily performance overview</p>
      </div>

      ${renderTodayPlan(todayWorkout)}
      ${renderScoreCard(state)}
      ${renderReadinessCard(state)}
      ${renderProgress()}
      ${renderQuickActions()}

    </div>
  </div>
  `;
}

/* ---------------- COMPONENTS ---------------- */

function renderTodayPlan(workout) {
  if (!workout) {
    return `
    <div class="panel">
      <div class="panel-title">Today</div>
      <p>No workout scheduled.</p>
      <button class="btn-primary">Generate Workout</button>
    </div>
    `;
  }

  return `
  <div class="panel">
    <div class="panel-title">Today's Plan</div>
    <h2>${workout.title}</h2>
    <p>${workout.duration || 60} min session</p>
    <button class="btn-primary">Start Workout</button>
  </div>
  `;
}

function renderScoreCard(state) {
  const score = state?.score || 700;

  return `
  <div class="panel">
    <div class="panel-title">PerformanceIQ Score</div>
    <h2>${score}</h2>
    <p>▲ +12 this week</p>

    <div style="margin-top:10px;font-size:13px;color:var(--text-muted)">
      <strong>Why it changed:</strong><br/>
      + Completed workouts<br/>
      + Improved sleep<br/>
      + Better consistency
    </div>
  </div>
  `;
}

function renderReadinessCard(state) {
  const readiness = state?.readiness || 75;

  let label = "Moderate";
  if (readiness > 85) label = "High";
  if (readiness < 60) label = "Low";

  return `
  <div class="panel">
    <div class="panel-title">Readiness</div>
    <h2>${readiness}</h2>
    <p>${label}</p>

    <div style="margin-top:10px;font-size:13px;color:var(--text-muted)">
      Sleep: 7h<br/>
      Soreness: Low<br/>
      Load: Moderate
    </div>
  </div>
  `;
}

function renderProgress() {
  return `
  <div class="panel">
    <div class="panel-title">Progress</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-lbl">Strength</div>
        <div class="kpi-val g">↑</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Speed</div>
        <div class="kpi-val b">↑</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Endurance</div>
        <div class="kpi-val">→</div>
      </div>
    </div>
  </div>
  `;
}

function renderQuickActions() {
  return `
  <div class="panel">
    <div class="panel-title">Quick Actions</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn-draft">Generate Workout</button>
      <button class="btn-draft">Log Session</button>
      <button class="btn-draft">Wellness</button>
      <button class="btn-draft">Progress</button>
    </div>
  </div>
  `;
}
