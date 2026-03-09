import {initState,persist} from "./state/state.js"
import {renderDashboard} from "./views/dashboard.js"
import {renderAuth} from "./views/auth.js"
import {renderTeam} from "./views/team.js"

const app=document.getElementById("app")
const state=initState()

function render(){

if(!state.session.loggedIn){
app.innerHTML=renderAuth()
bindAuth()
return
}

let content=""
switch(state.ui.view){
case "team": content=renderTeam(state); break
default: content=renderDashboard(state)
}

app.innerHTML=`
<div class="app">
<div class="sidebar">
<h2>PerformanceIQ</h2>
<button data-nav="dashboard">Dashboard</button>
<button data-nav="team">Team</button>
<button data-action="logout">Logout</button>
</div>
<div class="main">${content}</div>
</div>`

bind()
persist(state)
}

function bind(){
app.querySelectorAll("[data-nav]").forEach(b=>{
b.onclick=()=>{state.ui.view=b.dataset.nav;render()}
})

const logout=app.querySelector("[data-action='logout']")
if(logout) logout.onclick=()=>{
state.session.loggedIn=false
render()
}
}

function bindAuth(){
const login=document.getElementById("login-btn")
login.onclick=()=>{
const email=document.getElementById("email").value
if(!email) return alert("enter email")
state.session.loggedIn=true
state.session.user=email
render()
}
}

render()
