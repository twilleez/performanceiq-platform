import { loadRoster } from "./schemaQueries.js"
import { buildRoster } from "../features/performanceEngine.js"

export async function hydrateDashboard(state,supabase){

const roster = await loadRoster(supabase,state.team.id)

state.roster = buildRoster(roster.data)

}
