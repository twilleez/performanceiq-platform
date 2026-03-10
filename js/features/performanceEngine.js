export function buildRoster(athletes,readiness,piq,training){

return athletes.map(a=>{

const ready=readiness.find(r=>r.athlete_id===a.id)
const p=piq.find(x=>x.athlete_id===a.id)

let acr=null

if(p?.acute_load && p?.chronic_load){

acr=p.acute_load/p.chronic_load

}

let risk="low"

if(acr>1.5 || ready?.readiness_score<60) risk="high"
else if(acr>1.3 || ready?.readiness_score<75) risk="medium"

return{

...a,
piq:p?.piq_total,
readiness:ready?.readiness_score,
acr,
risk

}

})

}
