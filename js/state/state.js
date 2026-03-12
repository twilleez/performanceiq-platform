export const STATE = {
  bootMode:"local-fallback",
  session:{loggedIn:false,user:null,role:"coach"},
  ui:{view:"dashboard",activeAthleteId:"a1",swapTarget:null,selectedSport:"basketball"},
  team:{name:"Demo Team",joinCode:"DEMO1234"},
  roster:[
    {id:"a1",name:"Player One",pos:"PG",sport:"basketball",piq:82,readiness:79,load:412,acr:1.18,risk:"low",workouts:[{id:"w1",title:"Basketball Explosive Lower",dayType:"power",status:"assigned",notes:"Landing mechanics + unilateral force",exercises:["bb_lateral_bound","bb_goblet_squat","bb_single_leg_rdl","bb_sprint","bb_dead_bug"]}]},
    {id:"a2",name:"Player Two",pos:"WR",sport:"football",piq:76,readiness:68,load:455,acr:1.38,risk:"medium",workouts:[{id:"w2",title:"Football Speed + Strength",dayType:"strength",status:"assigned",notes:"Acceleration + force production",exercises:["fb_broad_jump","fb_split_squat","fb_trap_rdl","fb_accel_sprint","fb_pallof"]}]},
    {id:"a3",name:"Player Three",pos:"CM",sport:"soccer",piq:73,readiness:74,load:436,acr:1.24,risk:"low",workouts:[{id:"w3",title:"Soccer Speed Endurance Lift",dayType:"speed",status:"assigned",notes:"Stride mechanics + single-leg strength",exercises:["sc_counter_jump","sc_stepup","sc_rdl","sc_fly_sprint","sc_side_plank"]}]},
    {id:"a4",name:"Player Four",pos:"SS",sport:"baseball",piq:71,readiness:72,load:398,acr:1.19,risk:"low",workouts:[{id:"w4",title:"Baseball Rotational Power",dayType:"power",status:"assigned",notes:"Hip-shoulder separation + decel control",exercises:["bs_med_rot_throw","bs_rear_split","bs_rdl","bs_10_split","bs_deadbug"]}]},
    {id:"a5",name:"Player Five",pos:"200m",sport:"track",piq:69,readiness:67,load:470,acr:1.32,risk:"medium",workouts:[{id:"w5",title:"Track Power + Sprint Support",dayType:"power",status:"assigned",notes:"Stiffness + acceleration transfer",exercises:["tr_hurdle_hop","tr_split_squat","tr_rdl","tr_accel","tr_hollow"]}]}
  ],
  summary:{piq:74,readiness:72,weeklyLoad:2171,atRisk:2},
  alerts:["Player Two: medium risk due to readiness / ACR","Player Five: medium risk due to readiness / ACR"],
  calendar:{Mon:["Lift","Practice"],Tue:["Recovery"],Wed:["Lift","Speed"],Thu:["Practice"],Fri:["Lift"],Sat:["Game"],Sun:["Off"]},
  builder:{title:"",dayType:"strength",notes:"",athleteId:"a1"}
};
