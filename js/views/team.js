export function teamView(state){

return `

<h2>Roster</h2>

<table>

<tr>
<th>Name</th>
<th>PIQ</th>
<th>Readiness</th>
<th>ACR</th>
<th>Risk</th>
</tr>

${state.roster.map(a=>`

<tr>

<td>${a.name}</td>
<td>${a.piq}</td>
<td>${a.readiness}</td>
<td>${a.acr}</td>
<td>${a.risk}</td>

</tr>

`).join("")}

</table>

`

}
