// /js/views/train.js

export function renderTrainView(state) {
  const session = state?.currentSession || mockSession();

  return `
  <div class="view-with-sidebar">
    <div class="page-main">

      <div class="page-header">
        <h1>Training Session</h1>
        <p>${session.title}</p>
      </div>

      ${renderProgressBar(session)}
      ${session.steps.map((s, i) => renderStep(s, i)).join("")}

    </div>
  </div>
  `;
}

/* ---------------- COMPONENTS ---------------- */

function renderProgressBar(session) {
  const percent = Math.round((session.currentStep / session.steps.length) * 100);

  return `
  <div class="panel">
    <div class="panel-title">Progress</div>
    <div style="background:var(--surface-2);height:10px;border-radius:6px;">
      <div style="width:${percent}%;height:100%;background:var(--piq-green);border-radius:6px;"></div>
    </div>
    <p style="margin-top:6px">${percent}% complete</p>
  </div>
  `;
}

function renderStep(step, index) {
  return `
  <div class="panel">
    <div class="panel-title">Step ${index + 1}</div>
    <h3>${step.name}</h3>

    ${step.exercises.map(ex => renderExercise(ex)).join("")}
  </div>
  `;
}

function renderExercise(ex) {
  return `
  <div style="margin-top:10px;padding:10px;border:1px solid var(--border);border-radius:10px">
    <strong>${ex.name}</strong>
    <p>${ex.sets} x ${ex.reps}</p>
    <p style="font-size:12px;color:var(--text-muted)">Rest: ${ex.rest}s</p>

    <div style="margin-top:8px;display:flex;gap:8px">
      <button class="btn-primary">Start Set</button>
      <button class="btn-draft">Swap</button>
    </div>
  </div>
  `;
}

/* ---------------- MOCK DATA ---------------- */

function mockSession() {
  return {
    title: "Lower Body Strength",
    currentStep: 1,
    steps: [
      {
        name: "Warm-Up",
        exercises: [
          { name: "Dynamic Stretch", sets: 1, reps: "5 min", rest: 0 }
        ]
      },
      {
        name: "Main Lift",
        exercises: [
          { name: "Back Squat", sets: 4, reps: 5, rest: 120 }
        ]
      },
      {
        name: "Accessory",
        exercises: [
          { name: "Split Squat", sets: 3, reps: 8, rest: 60 }
        ]
      }
    ]
  };
}
