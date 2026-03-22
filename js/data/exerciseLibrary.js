/**
 * PerformanceIQ — Exercise Library + Training Templates
 */

export const SPORT_EMOJI = {
  basketball: '🏀', football: '🏈', soccer: '⚽',
  baseball: '⚾', volleyball: '🏐', track: '🏃',
};

export const EXERCISES = [
  // Strength
  { id:'sq',  name:'Back Squat',        category:'strength', tags:['lower','compound'],  sports:['all'] },
  { id:'dl',  name:'Deadlift',          category:'strength', tags:['posterior','compound'],sports:['all'] },
  { id:'bp',  name:'Bench Press',       category:'strength', tags:['upper','push'],       sports:['all'] },
  { id:'row', name:'Bent-Over Row',     category:'strength', tags:['upper','pull'],       sports:['all'] },
  { id:'pu',  name:'Weighted Pull-Up',  category:'strength', tags:['upper','pull'],       sports:['all'] },
  { id:'op',  name:'Overhead Press',    category:'strength', tags:['upper','push'],       sports:['all'] },
  { id:'tbdl',name:'Trap Bar Deadlift', category:'strength', tags:['lower','compound'],   sports:['football','basketball'] },
  { id:'bss', name:'Bulgarian Split Squat',category:'strength',tags:['lower','unilateral'],sports:['all'] },
  // Power
  { id:'pc',  name:'Power Clean',       category:'power',    tags:['full-body','olympic'],sports:['football','basketball'] },
  { id:'bj',  name:'Box Jump',          category:'power',    tags:['lower','explosive'],  sports:['all'] },
  { id:'lb',  name:'Lateral Bound',     category:'power',    tags:['lower','explosive'],  sports:['basketball','soccer'] },
  { id:'dj',  name:'Depth Jump',        category:'power',    tags:['lower','plyometric'], sports:['volleyball','basketball'] },
  { id:'mbsl',name:'Med Ball Slam',     category:'power',    tags:['full-body','explosive'],sports:['all'] },
  { id:'mbrt',name:'Rotational Med Ball Throw',category:'power',tags:['rotational','power'],sports:['baseball','soccer'] },
  // Speed
  { id:'sp40',name:'40-Yard Dash',      category:'speed',    tags:['sprint','acceleration'],sports:['football','basketball'] },
  { id:'sp30',name:'30m Fly Sprint',    category:'speed',    tags:['max-velocity'],       sports:['track','football'] },
  { id:'5105',name:'5-10-5 Shuttle',    category:'speed',    tags:['agility','COD'],      sports:['basketball','football'] },
  { id:'td',  name:'T-Drill',           category:'speed',    tags:['agility','direction'],sports:['basketball','soccer'] },
  // Agility
  { id:'ls',  name:'Lateral Shuffle',   category:'agility',  tags:['lateral','footwork'], sports:['basketball','volleyball'] },
  { id:'cd',  name:'Cone Drill (L-Shape)',category:'agility', tags:['direction','COD'],   sports:['football','soccer'] },
  { id:'lad', name:'Ladder Drills',     category:'agility',  tags:['footwork','coordination'],sports:['all'] },
  // Core
  { id:'pl',  name:'Plank',             category:'core',     tags:['anti-extension','stability'],sports:['all'] },
  { id:'pp',  name:'Pallof Press',      category:'core',     tags:['anti-rotation','stability'],sports:['baseball','all'] },
  { id:'hb',  name:'Hollow Body Hold',  category:'core',     tags:['anti-extension','gymnastic'],sports:['volleyball','all'] },
  { id:'fg',  name:'Farmer Carry',      category:'core',     tags:['grip','loaded-carry'],sports:['all'] },
  // Mobility
  { id:'csq', name:'Goblet Squat',      category:'mobility', tags:['lower','mobility'],   sports:['all'] },
  { id:'hip', name:'Hip Flexor Stretch',category:'mobility', tags:['hip','flexibility'],  sports:['all'] },
  { id:'pig', name:'Pigeon Pose',       category:'mobility', tags:['hip','recovery'],     sports:['all'] },
  // Recovery
  { id:'fr',  name:'Foam Roll — Full Body',category:'recovery',tags:['pliability','TB12'],sports:['all'] },
  { id:'ic',  name:'Ice Bath Protocol', category:'recovery', tags:['recovery','cold'],    sports:['all'] },
  { id:'sk',  name:'Nordic Hamstring Curl',category:'recovery',tags:['hamstring','injury-prev'],sports:['soccer','track'] },
];

export const TRAINING_TEMPLATES = [
  // Basketball
  { id:'bb-strength-8w', sport:'basketball', title:'In-Season Strength 8-Week', duration:8, level:'intermediate', focus:'Strength', sessions_per_week:3,
    exercises:['Back Squat','Romanian Deadlift','Bench Press','Bent-Over Row','Plank'],
    phases:[{label:'Accumulation',weeks:3,color:'#3b82f6'},{label:'Intensification',weeks:3,color:'#22c955'},{label:'Peak',weeks:2,color:'#ef4444'}], popular:true },
  { id:'bb-speed-6w', sport:'basketball', title:'Explosive Speed 6-Week', duration:6, level:'advanced', focus:'Speed & Power', sessions_per_week:3,
    exercises:['Power Clean','Box Jump','Lateral Bound','5-10-5 Shuttle','T-Drill'],
    phases:[{label:'Base',weeks:2,color:'#60a5fa'},{label:'Development',weeks:3,color:'#22c955'},{label:'Peak',weeks:1,color:'#f59e0b'}], popular:true },
  { id:'bb-offseason-12w', sport:'basketball', title:'Off-Season Elite 12-Week', duration:12, level:'advanced', focus:'Full Athletic', sessions_per_week:4,
    exercises:['Back Squat','Deadlift','Power Clean','Box Jump','40-Yard Dash'],
    phases:[{label:'Foundation',weeks:4,color:'#94a3b8'},{label:'Build',weeks:4,color:'#3b82f6'},{label:'Power',weeks:3,color:'#22c955'},{label:'Deload',weeks:1,color:'#e2e8f0'}], popular:false },

  // Football
  { id:'fb-power-8w', sport:'football', title:'Position Power 8-Week', duration:8, level:'advanced', focus:'Explosive Power', sessions_per_week:4,
    exercises:['Power Clean','Trap Bar Deadlift','Box Jump','Med Ball Slam','40-Yard Dash'],
    phases:[{label:'Volume',weeks:3,color:'#dc2626'},{label:'Intensify',weeks:3,color:'#b91c1c'},{label:'Peak',weeks:2,color:'#7f1d1d'}], popular:true },
  { id:'fb-strength-10w', sport:'football', title:'Lineman Strength 10-Week', duration:10, level:'elite', focus:'Max Strength', sessions_per_week:4,
    exercises:['Back Squat','Deadlift','Bench Press','Overhead Press','Farmer Carry'],
    phases:[{label:'Accumulation',weeks:4,color:'#dc2626'},{label:'Build',weeks:4,color:'#b91c1c'},{label:'Competition Prep',weeks:2,color:'#7f1d1d'}], popular:false },

  // Soccer
  { id:'sc-conditioning-8w', sport:'soccer', title:'Soccer Conditioning 8-Week', duration:8, level:'intermediate', focus:'Aerobic Base', sessions_per_week:3,
    exercises:['Nordic Hamstring Curl','Single-Leg Calf Raise','Lateral Squat','T-Drill','Cone Drill (L-Shape)'],
    phases:[{label:'Aerobic Base',weeks:3,color:'#16a34a'},{label:'Speed Endurance',weeks:3,color:'#15803d'},{label:'Peak',weeks:2,color:'#166534'}], popular:true },

  // Track
  { id:'tr-speed-6w', sport:'track', title:'Sprint Development 6-Week', duration:6, level:'intermediate', focus:'Speed', sessions_per_week:4,
    exercises:['30m Fly Sprint','40-Yard Dash','Box Jump','Depth Jump','Lateral Bound'],
    phases:[{label:'Mechanics',weeks:2,color:'#d97706'},{label:'Velocity',weeks:3,color:'#b45309'},{label:'Competition',weeks:1,color:'#92400e'}], popular:true },

  // Volleyball
  { id:'vb-jump-6w', sport:'volleyball', title:'Vertical Jump Mastery 6-Week', duration:6, level:'intermediate', focus:'Vertical Jump', sessions_per_week:3,
    exercises:['Box Jump','Depth Jump','Hollow Body Hold','Back Squat','Nordic Hamstring Curl'],
    phases:[{label:'Plyometric Base',weeks:2,color:'#ea580c'},{label:'Progressive',weeks:3,color:'#c2410c'},{label:'Peak',weeks:1,color:'#9a3412'}], popular:true },

  // Baseball
  { id:'ba-rotational-8w', sport:'baseball', title:'Rotational Power 8-Week', duration:8, level:'intermediate', focus:'Rotational Power', sessions_per_week:3,
    exercises:['Rotational Med Ball Throw','Trap Bar Deadlift','Pallof Press','Farmer Carry','Nordic Hamstring Curl'],
    phases:[{label:'Arm Care',weeks:3,color:'#ca8a04'},{label:'Power Build',weeks:3,color:'#a16207'},{label:'Peak',weeks:2,color:'#713f12'}], popular:true },
];
