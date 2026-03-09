export function renderDashboard(state){
return `
<div class="card">
<h2>Dashboard</h2>
<p>Logged in as ${state.session.user}</p>
</div>

<div class="card">
<h3>Team</h3>
<p>${state.team.name}</p>
<p>Join Code: ${state.team.joinCode}</p>
</div>
`
}
