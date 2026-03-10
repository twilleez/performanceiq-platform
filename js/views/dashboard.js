export function dashboard(state){

return `
<div class="card">

<h2>Team Dashboard</h2>

<p>Team PIQ: ${state.summary.piq}</p>
<p>Readiness: ${state.summary.readiness}</p>
<p>Weekly Load: ${state.summary.weeklyLoad}</p>

</div>
`

}
