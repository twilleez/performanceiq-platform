import {loadRoster,loadReadiness,loadPiq,loadTraining} from "./schemaQueries.js"
import {buildRoster} from "../features/performanceEngine.js"

export async function hydrate(state,supabase){

const athletes=await loadRoster(supabase,state.team.id)
const readiness=await loadReadiness(supabase,state.team.id)
const piq=await loadPiq(supabase,state.team.id)
const training=await loadTraining(supabase,state.team.id)

state.roster=buildRoster(
athletes.data,
readiness.data,
piq.data,
training.data
)

}
