/** Nutrition engine — macro targets & meal plans. */
export function calculateMacroTargetsElite(profile) {
  const weight=parseFloat(profile?.weightLbs)||165, age=parseInt(profile?.age)||17;
  const bmr=Math.round((weight*0.453592*10)+(170*6.25)-(age*5)+5);
  const tdee=Math.round(bmr*1.725);
  return { cal:tdee, pro:Math.round(weight*0.453592*2.2), cho:Math.round(tdee*.45/4), fat:Math.round(tdee*.25/9) };
}
export function getMealPlanForProfileElite(profile) { return null; }
