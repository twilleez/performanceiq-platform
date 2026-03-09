export function getPhase(week = 1){
  if(week <= 4) return { name:'Foundation', rep_range:'8-12', intensity:'moderate', fatigueCap:60 };
  if(week <= 8) return { name:'Strength', rep_range:'5-8', intensity:'high', fatigueCap:70 };
  if(week <= 11) return { name:'Power', rep_range:'3-5', intensity:'high', fatigueCap:65 };
  return { name:'Deload', rep_range:'8-10', intensity:'light', fatigueCap:40 };
}
