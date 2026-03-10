import {STATE} from "./state/state.js"
import {createSupabase} from "./services/supabaseClient.js"
import {hydrate} from "./services/dataLoader.js"

import {dashboard} from "./views/dashboard.js"
import {teamView} from "./views/team.js"
import {workoutsView} from "./views/workouts.js"
import {analyticsView} from "./views/analytics.js"

const app=document.getElementById("app")

async function boot(){

const supabase=await createSupabase()

if(supabase){

STATE.bootMode="supabase"

await hydrate(STATE,supabase)

}

render()

}

function render(){

app.innerHTML=dashboard(STATE)

}

boot()
