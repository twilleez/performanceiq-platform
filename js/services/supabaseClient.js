import {config} from "../config/appConfig.js"

export async function createSupabase(){

if(!config.supabaseUrl) return null

const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm")

return createClient(config.supabaseUrl,config.supabaseKey)

}
