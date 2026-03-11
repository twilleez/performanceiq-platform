import { getExercise } from "../features/performanceEngine.js";

export function workoutsView(state){
  const cards = state.roster.flatMap(a => a.workouts.map(w => ({ athlete: a, workout: w })));
  return `<div class="card"><h2>Sports-Specific Workouts</h2><div class="list">${cards.map(({athlete, workout}) => `<div class="item"><div class="row"><strong>${athlete.name}</strong><span class="badge">${workout.title}</span><span class="badge">${workout.dayType}</span></div><div class="small muted">${workout.notes}</div><div class="list" style="margin-top:10px">${workout.exercises.map(exId => { const ex = getExercise(exId); return `<div class="exercise-card"><div class="row"><div style="flex:1"><strong>${ex?.title || exId}</strong><div class="small muted">${ex?.pattern || "-"} • ${state.team.sport}</div></div><button class="secondary" data-swap="${athlete.id}|${workout.id}|${exId}">Swap</button></div></div>`; }).join("")}</div></div>`).join("")}</div></div>`;
}
