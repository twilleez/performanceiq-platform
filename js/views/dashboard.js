export function dashboard(state){

return `

<div class="card">

<h2>PerformanceIQ Dashboard</h2>

<p>Team: ${state.team.name}</p>

<p>PIQ: ${state.summary.piq}</p>
<p>Readiness: ${state.summary.readiness}</p>
<p>Weekly Load: ${state.summary.weeklyLoad}</p>

</div>

`

}
