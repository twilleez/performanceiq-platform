import { STATE } from "./state/state.js"
import { initRouter } from "./router.js"
import { createSupabase } from "./services/supabaseClient.js"
import { hydrateDashboard } from "./services/dataLoader.js"

const app = document.getElementById("app")

async function boot(){

const supabase = await createSupabase()

STATE.bootMode = supabase ? "supabase" : "local"

if(supabase){

await hydrateDashboard(STATE, supabase)

}

initRouter(app, STATE)

}

boot()
