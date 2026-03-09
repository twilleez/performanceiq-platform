export function calculateCompliance(workouts){
  if(!workouts.length) return 0;
  return Math.round((workouts.filter(w => w.completed).length / workouts.length) * 100);
}
export function calculateWeeklyLoad(workouts){ return workouts.reduce((sum, w) => sum + (w.fatigue || 0), 0); }
export function calculatePIQ({ strength = 70, speed = 70, conditioning = 70, compliance = 0, recovery = 70 }){
  return Math.round(0.30 * strength + 0.20 * speed + 0.20 * conditioning + 0.15 * compliance + 0.15 * recovery);
}
export function summarizeLogs(state){
  const workouts = state.logs.workouts;
  const load = calculateWeeklyLoad(workouts);
  const compliance = calculateCompliance(workouts);
  const recovery = state.readiness?.score || 70;
  const strength = Math.min(95, 65 + workouts.filter(w => String(w.dayType).includes('strength')).length * 3);
  const speed = Math.min(95, 65 + workouts.filter(w => String(w.dayType).includes('power') || String(w.dayType).includes('conditioning')).length * 3);
  const conditioning = Math.min(95, 65 + Math.round(load / 8));
  return { load, compliance, piq: calculatePIQ({ strength, speed, conditioning, compliance, recovery }), strength, speed, conditioning, recovery };
}
