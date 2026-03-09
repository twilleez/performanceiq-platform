export function calculateReadiness({ sleep = 7, soreness = 3, fatigue = 3, stress = 3 }){
  const sleepScore = Math.min(100, Math.max(0, (sleep / 9) * 100));
  const sorenessScore = Math.max(0, 100 - (soreness - 1) * 12.5);
  const fatigueScore = Math.max(0, 100 - (fatigue - 1) * 12.5);
  const stressScore = Math.max(0, 100 - (stress - 1) * 12.5);
  return Math.round((sleepScore + sorenessScore + fatigueScore + stressScore) / 4);
}
export function getReadinessAdjustment(score){
  if(score >= 80) return { label:'High', conditioning:true };
  if(score >= 65) return { label:'Moderate', conditioning:true };
  return { label:'Low', conditioning:false };
}
