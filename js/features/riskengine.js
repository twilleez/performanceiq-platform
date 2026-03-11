export function riskLevel(readiness,acr){

if(acr>1.5 || readiness<60) return "high"
if(acr>1.3 || readiness<75) return "medium"

return "low"

}
