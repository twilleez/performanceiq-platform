import { STATE } from "./state/state.js"
import { dashboard } from "./views/dashboard.js"

const app = document.getElementById("app")

function render(){

app.innerHTML = dashboard(STATE)

}

render()
