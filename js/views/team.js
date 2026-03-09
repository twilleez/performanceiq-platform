export function renderTeam(state){
return `
<div class="card">
<h2>${state.team.name}</h2>
<p>Join Code: ${state.team.joinCode}</p>
</div>

<div class="card">
<h3>Athletes</h3>
<table width="100%">
<tr><th>Name</th><th>Position</th><th>PIQ</th></tr>
${state.team.athletes.map(a=>`
<tr>
<td>${a.name}</td>
<td>${a.position}</td>
<td>${a.piq}</td>
</tr>
`).join("")}
</table>
</div>
`
}
