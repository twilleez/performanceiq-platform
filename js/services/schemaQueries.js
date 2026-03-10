export async function loadRoster(supabase,teamId){

return supabase
.from("athletes")
.select("*")
.eq("team_id",teamId)

}

export async function loadReadiness(supabase,teamId){

return supabase
.from("readiness")
.select("*")
.eq("team_id",teamId)

}

export async function loadPiq(supabase,teamId){

return supabase
.from("piq_scores_daily")
.select("*")
.eq("team_id",teamId)

}

export async function loadTraining(supabase,teamId){

return supabase
.from("training_sessions")
.select("*")
.eq("team_id",teamId)

}

export async function loadWorkouts(supabase,teamId){

return supabase
.from("workout_assignments")
.select(`
id,
athlete_id,
workouts(
id,
title,
day_type
)
`)
.eq("team_id",teamId)

}
