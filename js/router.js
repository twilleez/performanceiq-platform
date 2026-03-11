import { dashboard } from "./views/dashboard.js"
import { teamView } from "./views/team.js"
import { workoutsView } from "./views/workouts.js"
import { analyticsView } from "./views/analytics.js"

export function initRouter(app,state){

const view = state.ui?.view || "dashboard"

if(view==="team") app.innerHTML = teamView(state)
else if(view==="workouts") app.innerHTML = workoutsView(state)
else if(view==="analytics") app.innerHTML = analyticsView(state)
else app.innerHTML = dashboard(state)

}
