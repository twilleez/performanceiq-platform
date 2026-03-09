export function calcSessionFatigue(session){
  const keys = ['warmup','activation','power','primary','secondary','accessory','core','conditioning','cooldown'];
  return keys.reduce((sum, key) => sum + (session[key] || []).reduce((s, ex) => s + (ex.fatigue_score || 0), 0), 0);
}
export function reduceFatigue(session, max = 16){
  const clone = JSON.parse(JSON.stringify(session));
  let fatigue = calcSessionFatigue(clone);
  if(fatigue <= max) return { session: clone, fatigue };
  clone.conditioning = []; fatigue = calcSessionFatigue(clone);
  if(fatigue > max){ clone.accessory = []; fatigue = calcSessionFatigue(clone); }
  if(fatigue > max){ clone.secondary = []; fatigue = calcSessionFatigue(clone); }
  return { session: clone, fatigue };
}
