/**
 * PerformanceIQ Exercise Library
 * Normalized exercise data across all 6 sports.
 */

export const SPORT_EMOJI = {
  basketball: '🏀', football: '🏈', soccer: '⚽',
  baseball: '⚾', volleyball: '🏐', track: '🏃',
};

export const SPORT_LABELS = {
  basketball: 'Basketball', football: 'Football', soccer: 'Soccer',
  baseball: 'Baseball', volleyball: 'Volleyball', track: 'Track & Field',
};

export const SPORTS = ['basketball','football','soccer','baseball','volleyball','track'];

// ── EXERCISE LIBRARY ──────────────────────────────────────────
export const EXERCISES = [
  // Basketball
  { id:'ex-001', name:'Lateral Bound',          sports:['basketball','soccer','volleyball'], category:'power',      tags:['lateral','plyometric'] },
  { id:'ex-002', name:'Goblet Squat',            sports:['basketball','football','volleyball'], category:'strength', tags:['quad','glute'] },
  { id:'ex-003', name:'Single Leg RDL',          sports:['basketball','soccer','track'],        category:'strength', tags:['posterior-chain','balance'] },
  { id:'ex-004', name:'10 Yard Sprint',          sports:['basketball','football','soccer'],      category:'speed',    tags:['acceleration','sprint'] },
  { id:'ex-005', name:'Dead Bug',                sports:['basketball','football','baseball'],    category:'core',     tags:['anti-rotation','stability'] },
  { id:'ex-006', name:'Skater Jump',             sports:['basketball','volleyball'],             category:'power',    tags:['lateral','plyometric'] },
  // Football
  { id:'ex-007', name:'Trap Bar Deadlift',       sports:['football','basketball','track'],       category:'strength', tags:['hip-hinge','posterior-chain'] },
  { id:'ex-008', name:'Box Squat',               sports:['football','basketball'],               category:'strength', tags:['quad','power'] },
  { id:'ex-009', name:'Broad Jump',              sports:['football','basketball','soccer'],      category:'power',    tags:['horizontal-jump','plyometric'] },
  { id:'ex-010', name:'Med Ball Slam',           sports:['football','baseball'],                 category:'power',    tags:['total-body','explosive'] },
  { id:'ex-011', name:'Sled Push',               sports:['football','soccer'],                   category:'power',    tags:['acceleration','horizontal'] },
  { id:'ex-012', name:'Kettlebell Swing',        sports:['football','track'],                    category:'power',    tags:['hip-hinge','ballistic'] },
  // Soccer
  { id:'ex-013', name:'Nordic Curl',             sports:['soccer','track'],                      category:'strength', tags:['hamstring','eccentric'] },
  { id:'ex-014', name:'Single Leg Hop Series',   sports:['soccer','track','volleyball'],         category:'power',    tags:['unilateral','plyometric'] },
  { id:'ex-015', name:'Plank Shoulder Tap',      sports:['soccer','baseball'],                   category:'core',     tags:['anti-rotation','stability'] },
  { id:'ex-016', name:'Drop Jump',               sports:['soccer','volleyball','track'],         category:'power',    tags:['reactive','plyometric'] },
  { id:'ex-017', name:'Bulgarian Split Squat',   sports:['soccer','volleyball','track'],         category:'strength', tags:['unilateral','quad'] },
  { id:'ex-018', name:'5-10-5 Shuttle',          sports:['soccer','basketball','football'],      category:'agility',  tags:['COD','acceleration'] },
  // Baseball
  { id:'ex-019', name:'Rotational Med Ball Throw', sports:['baseball'],                          category:'power',    tags:['rotational','explosive'] },
  { id:'ex-020', name:'Med Ball Chop',           sports:['baseball','football'],                 category:'power',    tags:['rotational','diagonal'] },
  { id:'ex-021', name:'Trap Bar RDL',            sports:['baseball','football'],                 category:'strength', tags:['posterior-chain','hip-hinge'] },
  { id:'ex-022', name:'DB Split Squat',          sports:['baseball'],                            category:'strength', tags:['unilateral','quad'] },
  { id:'ex-023', name:'90 Ft Sprint',            sports:['baseball'],                            category:'speed',    tags:['acceleration','sprint'] },
  // Volleyball
  { id:'ex-024', name:'Box Jump',                sports:['volleyball','basketball'],             category:'power',    tags:['vertical-jump','plyometric'] },
  { id:'ex-025', name:'Depth Jump',              sports:['volleyball'],                          category:'power',    tags:['reactive','plyometric'] },
  { id:'ex-026', name:'Hollow Body Hold',        sports:['volleyball','gymnastics'],             category:'core',     tags:['anti-extension','stability'] },
  { id:'ex-027', name:'Back Squat',              sports:['volleyball','football','track'],       category:'strength', tags:['quad','total-lower'] },
  { id:'ex-028', name:'Lateral Shuffle Sprint',  sports:['volleyball','basketball'],             category:'agility',  tags:['lateral','speed'] },
  { id:'ex-029', name:'Farmer Carry',            sports:['volleyball','football'],               category:'strength', tags:['grip','core','loaded-carry'] },
  // Track
  { id:'ex-030', name:'Hang Power Clean',        sports:['track','football'],                    category:'power',    tags:['Olympic','triple-extension'] },
  { id:'ex-031', name:'Flying 20m Sprint',       sports:['track'],                              category:'speed',    tags:['max-velocity','sprint'] },
  { id:'ex-032', name:'Front Squat',             sports:['track','volleyball'],                  category:'strength', tags:['quad','anterior-chain'] },
  { id:'ex-033', name:'Romanian Deadlift',       sports:['track','soccer'],                     category:'strength', tags:['posterior-chain','hip-hinge'] },
  { id:'ex-034', name:'Hurdle Hop Series',       sports:['track'],                              category:'power',    tags:['plyometric','reactive'] },
  { id:'ex-035', name:'Pallof Hold',             sports:['track','baseball'],                   category:'core',     tags:['anti-rotation','stability'] },
  // Universal
  { id:'ex-036', name:'Push-Up',                 sports:SPORTS,                                 category:'strength', tags:['push','upper-body'] },
  { id:'ex-037', name:'Pull-Up',                 sports:SPORTS,                                 category:'strength', tags:['pull','upper-body'] },
  { id:'ex-038', name:'Plank',                   sports:SPORTS,                                 category:'core',     tags:['stability','anti-extension'] },
  { id:'ex-039', name:'Hip Flexor Stretch',      sports:SPORTS,                                 category:'mobility', tags:['flexibility','recovery'] },
  { id:'ex-040', name:'Foam Roll',               sports:SPORTS,                                 category:'recovery', tags:['SMR','recovery'] },
];

// ── TRAINING TEMPLATES ────────────────────────────────────────
export const TRAINING_TEMPLATES = [
  // BASKETBALL
  { id:'bb-preseason-12w', sport:'basketball', title:'Pre-Season 12-Week Power Build',
    duration:12, level:'intermediate', focus:'Power + Speed', sessions_per_week:4,
    exercises:['Lateral Bound','Goblet Squat','Single Leg RDL','10 Yard Sprint','Dead Bug'],
    phases:[{label:'Accumulation',weeks:4,color:'#93c5fd'},{label:'Intensification',weeks:4,color:'#3b82f6'},{label:'Realization',weeks:3,color:'#2a9df4'},{label:'Deload',weeks:1,color:'#bfdbfe'}],
    popular:true },
  { id:'bb-inseason-4w',    sport:'basketball', title:'In-Season Maintenance 4-Week',
    duration:4, level:'intermediate', focus:'Maintenance', sessions_per_week:2,
    exercises:['Goblet Squat','Dead Bug','10 Yard Sprint'],
    phases:[{label:'Maintenance',weeks:4,color:'#3b82f6'}], popular:false },
  { id:'bb-guard-speed-4w', sport:'basketball', title:'Guard Speed & Quickness 4-Week',
    duration:4, level:'intermediate', focus:'Speed + COD', sessions_per_week:3,
    exercises:['10 Yard Sprint','Lateral Bound','Skater Jump'],
    phases:[{label:'Speed Foundation',weeks:2,color:'#60a5fa'},{label:'Peak Speed',weeks:2,color:'#2a9df4'}], popular:false },
  { id:'bb-strength-8w',    sport:'basketball', title:'General Strength Foundation 8-Week',
    duration:8, level:'beginner', focus:'Strength', sessions_per_week:3,
    exercises:['Goblet Squat','Dead Bug','Single Leg RDL'],
    phases:[{label:'Foundation',weeks:4,color:'#93c5fd'},{label:'Build',weeks:4,color:'#3b82f6'}], popular:false },

  // FOOTBALL
  { id:'fb-offseason-16w',  sport:'football', title:'Off-Season 16-Week Power Program',
    duration:16, level:'advanced', focus:'Strength + Power', sessions_per_week:4,
    exercises:['Trap Bar Deadlift','Box Squat','Broad Jump','Med Ball Slam'],
    phases:[{label:'Foundation',weeks:4,color:'#fca5a5'},{label:'Max Strength',weeks:5,color:'#ef4444'},{label:'Power Conv.',weeks:5,color:'#dc2626'},{label:'Taper',weeks:2,color:'#fecaca'}],
    popular:true },
  { id:'fb-speed-6w',       sport:'football', title:'Speed & Explosiveness Block 6-Week',
    duration:6, level:'intermediate', focus:'Speed', sessions_per_week:3,
    exercises:['Sled Push','Broad Jump','Kettlebell Swing'],
    phases:[{label:'Speed Foundation',weeks:3,color:'#fca5a5'},{label:'Speed Peak',weeks:3,color:'#ef4444'}], popular:false },
  { id:'fb-combine-8w',     sport:'football', title:'Combine Prep 8-Week',
    duration:8, level:'advanced', focus:'Peak Performance', sessions_per_week:5,
    exercises:['Broad Jump','Trap Bar Deadlift','Sled Push'],
    phases:[{label:'Strength Base',weeks:3,color:'#fca5a5'},{label:'Power',weeks:3,color:'#ef4444'},{label:'Speed Peak',weeks:2,color:'#dc2626'}],
    popular:true },

  // SOCCER
  { id:'sc-base-8w',        sport:'soccer', title:'Aerobic Base Build 8-Week',
    duration:8, level:'beginner', focus:'Conditioning', sessions_per_week:5,
    exercises:['Single Leg Hop Series','Nordic Curl','Plank Shoulder Tap'],
    phases:[{label:'Base Build',weeks:6,color:'#86efac'},{label:'Deload',weeks:1,color:'#bbf7d0'},{label:'Bridge',weeks:1,color:'#4ade80'}], popular:false },
  { id:'sc-preseason-10w',  sport:'soccer', title:'Pre-Season 10-Week Speed + Power',
    duration:10, level:'advanced', focus:'Speed + Power', sessions_per_week:4,
    exercises:['Drop Jump','Bulgarian Split Squat','5-10-5 Shuttle'],
    phases:[{label:'Accumulation',weeks:3,color:'#86efac'},{label:'Intensification',weeks:4,color:'#22c955'},{label:'Taper',weeks:3,color:'#4ade80'}],
    popular:true },
  { id:'sc-return-4w',      sport:'soccer', title:'Return-to-Play Protocol 4-Week',
    duration:4, level:'beginner', focus:'Recovery', sessions_per_week:3,
    exercises:['Nordic Curl','Plank Shoulder Tap','Single Leg Hop Series'],
    phases:[{label:'Early Phase',weeks:2,color:'#86efac'},{label:'Progressive Load',weeks:2,color:'#22c955'}], popular:false },

  // BASEBALL
  { id:'ba-rotation-12w',   sport:'baseball', title:'Rotational Power 12-Week',
    duration:12, level:'intermediate', focus:'Rotational Power', sessions_per_week:4,
    exercises:['Rotational Med Ball Throw','Med Ball Chop','Trap Bar RDL'],
    phases:[{label:'Arm Care',weeks:3,color:'#fcd34d'},{label:'Power Build',weeks:5,color:'#f59e0b'},{label:'Peak',weeks:3,color:'#d97706'},{label:'Deload',weeks:1,color:'#fef3c7'}],
    popular:true },
  { id:'ba-arm-care-6w',    sport:'baseball', title:'Arm Care & Shoulder 6-Week',
    duration:6, level:'beginner', focus:'Arm Health', sessions_per_week:3,
    exercises:['DB Split Squat','Trap Bar RDL','Med Ball Chop'],
    phases:[{label:'Mobility',weeks:2,color:'#fcd34d'},{label:'Strength',weeks:3,color:'#f59e0b'},{label:'Maintenance',weeks:1,color:'#fde68a'}], popular:false },
  { id:'ba-preseason-8w',   sport:'baseball', title:'Pre-Season Full Athletic 8-Week',
    duration:8, level:'intermediate', focus:'Full Athletic', sessions_per_week:4,
    exercises:['Rotational Med Ball Throw','Broad Jump','90 Ft Sprint'],
    phases:[{label:'Accumulation',weeks:3,color:'#fcd34d'},{label:'Build',weeks:3,color:'#f59e0b'},{label:'Peak',weeks:2,color:'#d97706'}], popular:false },

  // VOLLEYBALL
  { id:'vb-jump-6w',        sport:'volleyball', title:'Vertical Jump Mastery 6-Week',
    duration:6, level:'intermediate', focus:'Vertical Jump', sessions_per_week:3,
    exercises:['Box Jump','Depth Jump','Hollow Body Hold'],
    phases:[{label:'Plyometric Base',weeks:2,color:'#fdba74'},{label:'Progressive',weeks:3,color:'#ff6b35'},{label:'Peak',weeks:1,color:'#ea580c'}],
    popular:true },
  { id:'vb-preseason-8w',   sport:'volleyball', title:'Pre-Season Full Athletic 8-Week',
    duration:8, level:'advanced', focus:'Full Athletic', sessions_per_week:4,
    exercises:['Box Jump','Back Squat','Lateral Shuffle Sprint'],
    phases:[{label:'Base',weeks:2,color:'#fdba74'},{label:'Build',weeks:4,color:'#ff6b35'},{label:'Peak',weeks:2,color:'#ea580c'}], popular:false },
  { id:'vb-shoulder-4w',    sport:'volleyball', title:'Shoulder Resilience 4-Week',
    duration:4, level:'intermediate', focus:'Shoulder Health', sessions_per_week:3,
    exercises:['Farmer Carry','Hollow Body Hold','Lateral Shuffle Sprint'],
    phases:[{label:'Foundation',weeks:2,color:'#fdba74'},{label:'Strength',weeks:2,color:'#ff6b35'}], popular:false },

  // TRACK
  { id:'tr-speed-8w',       sport:'track', title:'Max Velocity Sprint 8-Week',
    duration:8, level:'advanced', focus:'Speed', sessions_per_week:4,
    exercises:['Hang Power Clean','Flying 20m Sprint','Front Squat'],
    phases:[{label:'Acceleration',weeks:3,color:'#c4b5fd'},{label:'Max Velocity',weeks:3,color:'#8b5cf6'},{label:'Speed Endurance',weeks:2,color:'#7c3aed'}],
    popular:true },
  { id:'tr-strength-6w',    sport:'track', title:'Posterior Chain Strength 6-Week',
    duration:6, level:'intermediate', focus:'Strength', sessions_per_week:3,
    exercises:['Front Squat','Romanian Deadlift','Hang Power Clean'],
    phases:[{label:'Foundation',weeks:3,color:'#c4b5fd'},{label:'Intensification',weeks:3,color:'#8b5cf6'}], popular:false },
  { id:'tr-xc-10w',         sport:'track', title:'Cross-Country Base Build 10-Week',
    duration:10, level:'beginner', focus:'Aerobic Base', sessions_per_week:5,
    exercises:['Romanian Deadlift','Pallof Hold','Hurdle Hop Series'],
    phases:[{label:'Base',weeks:4,color:'#c4b5fd'},{label:'Progressive',weeks:4,color:'#8b5cf6'},{label:'Taper',weeks:2,color:'#a78bfa'}], popular:false },
  { id:'tr-taper-3w',       sport:'track', title:'Competition Taper 3-Week',
    duration:3, level:'advanced', focus:'Peak + Recovery', sessions_per_week:3,
    exercises:['Flying 20m Sprint','Pallof Hold'],
    phases:[{label:'Taper 1',weeks:1,color:'#c4b5fd'},{label:'Taper 2',weeks:1,color:'#a78bfa'},{label:'Peak',weeks:1,color:'#8b5cf6'}], popular:false },
];

// ── FOOD DATABASE ─────────────────────────────────────────────
export const FOOD_DB = {
  'chicken breast':    {cal:165, pro:31, cho:0,  fat:4},
  'ground beef':       {cal:250, pro:26, cho:0,  fat:16},
  'salmon':            {cal:208, pro:28, cho:0,  fat:10},
  'tuna':              {cal:130, pro:28, cho:0,  fat:1},
  'eggs':              {cal:155, pro:13, cho:1,  fat:11},
  'egg whites':        {cal:52,  pro:11, cho:1,  fat:0},
  'greek yogurt':      {cal:100, pro:17, cho:6,  fat:0},
  'cottage cheese':    {cal:110, pro:12, cho:4,  fat:5},
  'milk':              {cal:149, pro:8,  cho:12, fat:8},
  'protein shake':     {cal:130, pro:25, cho:5,  fat:2},
  'oats':              {cal:150, pro:5,  cho:27, fat:3},
  'brown rice':        {cal:215, pro:5,  cho:45, fat:2},
  'white rice':        {cal:200, pro:4,  cho:44, fat:0},
  'sweet potato':      {cal:103, pro:2,  cho:24, fat:0},
  'pasta':             {cal:220, pro:8,  cho:43, fat:1},
  'bread':             {cal:80,  pro:3,  cho:15, fat:1},
  'banana':            {cal:89,  pro:1,  cho:23, fat:0},
  'apple':             {cal:52,  pro:0,  cho:14, fat:0},
  'orange':            {cal:62,  pro:1,  cho:15, fat:0},
  'blueberries':       {cal:84,  pro:1,  cho:21, fat:0},
  'avocado':           {cal:160, pro:2,  cho:9,  fat:15},
  'broccoli':          {cal:34,  pro:3,  cho:7,  fat:0},
  'spinach':           {cal:23,  pro:3,  cho:4,  fat:0},
  'almonds':           {cal:164, pro:6,  cho:6,  fat:14},
  'peanut butter':     {cal:188, pro:8,  cho:6,  fat:16},
  'sports drink':      {cal:80,  pro:0,  cho:21, fat:0},
  'granola bar':       {cal:190, pro:3,  cho:29, fat:7},
  'turkey':            {cal:189, pro:28, cho:0,  fat:8},
  'beef jerky':        {cal:116, pro:16, cho:3,  fat:4},
  'hummus':            {cal:166, pro:8,  cho:18, fat:8},
  'quinoa':            {cal:222, pro:8,  cho:39, fat:4},
  'black beans':       {cal:227, pro:15, cho:41, fat:1},
  'edamame':           {cal:122, pro:11, cho:10, fat:5},
  'chocolate milk':    {cal:208, pro:8,  cho:32, fat:5},
  'whey protein':      {cal:120, pro:24, cho:3,  fat:2},
  'casein protein':    {cal:120, pro:24, cho:4,  fat:1},
  'rice cakes':        {cal:35,  pro:1,  cho:7,  fat:0},
  'trail mix':         {cal:173, pro:5,  cho:16, fat:11},
  'watermelon':        {cal:86,  pro:2,  cho:22, fat:0},
  'lentils':           {cal:230, pro:18, cho:40, fat:1},
};

export function lookupFood(query) {
  const q = query.toLowerCase().trim();
  if (FOOD_DB[q]) return { name: q, ...FOOD_DB[q] };
  const key = Object.keys(FOOD_DB).find(k => k.includes(q) || q.includes(k));
  if (key) return { name: key, ...FOOD_DB[key] };
  return { name: q, cal: 150, pro: 5, cho: 20, fat: 5 }; // fallback estimate
}
