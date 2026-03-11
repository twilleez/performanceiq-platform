export function computePIQ(scores){

const total = scores.reduce((sum,v)=>sum+v,0)

return Math.round(total / scores.length)

}
