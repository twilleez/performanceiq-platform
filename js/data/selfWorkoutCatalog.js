export const SELF_WORKOUT_TYPES = [
  { id:'strength', label:'Strength', icon:'🏋️', description:'Build force and foundational strength.' },
  { id:'power', label:'Power', icon:'💥', description:'Explosive jumps, throws and high-intent lifts.' },
  { id:'speed', label:'Speed', icon:'⚡', description:'Acceleration, mechanics and max-velocity work.' },
  { id:'agility', label:'Agility', icon:'🔀', description:'Change of direction, deceleration and reaction.' },
  { id:'conditioning', label:'Conditioning', icon:'🔥', description:'Work capacity and sport conditioning.' },
  { id:'mobility', label:'Mobility', icon:'🧘', description:'Movement quality, range and control.' },
  { id:'recovery', label:'Recovery', icon:'💚', description:'Low-load recovery and tissue quality.' },
];

const WORKOUTS = {
  strength: {
    title:'Total-Body Strength', dayType:'Strength', duration:55, rpe:'7–8',
    exercises:[
      {name:'Goblet Squat',sets:4,reps:'6–8',rest:90},
      {name:'Romanian Deadlift',sets:3,reps:'8',rest:90},
      {name:'Dumbbell Bench Press',sets:3,reps:'8–10',rest:75},
      {name:'One-Arm Dumbbell Row',sets:3,reps:'10/side',rest:60},
      {name:'Split Squat',sets:3,reps:'8/side',rest:75},
      {name:'Front Plank',sets:3,reps:'40 sec',rest:45},
    ]
  },
  power: {
    title:'Explosive Power Session', dayType:'Power', duration:45, rpe:'6–8',
    exercises:[
      {name:'Countermovement Jump',sets:4,reps:'3',rest:90},
      {name:'Broad Jump',sets:3,reps:'3',rest:90},
      {name:'Medicine Ball Chest Pass',sets:4,reps:'5',rest:60},
      {name:'Medicine Ball Rotational Throw',sets:3,reps:'5/side',rest:60},
      {name:'Jump Squat',sets:3,reps:'5',rest:90},
    ]
  },
  speed: {
    title:'Acceleration & Speed', dayType:'Speed', duration:45, rpe:'6–7',
    exercises:[
      {name:'A-Skip',sets:2,reps:'20 yd',rest:45},
      {name:'Wall Acceleration Drill',sets:3,reps:'5/side',rest:45},
      {name:'10-Yard Sprint',sets:6,reps:'1',rest:90},
      {name:'Flying 20',sets:4,reps:'1',rest:120},
      {name:'Build-Up Sprint',sets:3,reps:'30 yd',rest:90},
    ]
  },
  agility: {
    title:'Agility & Change of Direction', dayType:'Agility', duration:40, rpe:'6–7',
    exercises:[
      {name:'Deceleration Drop',sets:3,reps:'5',rest:45},
      {name:'5-10-5 Shuttle',sets:4,reps:'1',rest:90},
      {name:'Lateral Shuffle to Sprint',sets:4,reps:'2/side',rest:60},
      {name:'Cone Reaction Drill',sets:4,reps:'20 sec',rest:60},
      {name:'Closeout to Backpedal',sets:3,reps:'4',rest:60},
    ]
  },
  conditioning: {
    title:'Athletic Conditioning', dayType:'Conditioning', duration:35, rpe:'7–8',
    exercises:[
      {name:'Tempo Run',sets:8,reps:'60 yd',rest:45},
      {name:'Shuttle Run',sets:6,reps:'20 sec',rest:40},
      {name:'Farmer Carry',sets:4,reps:'30 yd',rest:45},
      {name:'Bodyweight Circuit',sets:4,reps:'45 sec',rest:45},
    ]
  },
  mobility: {
    title:'Mobility & Movement Quality', dayType:'Mobility', duration:30, rpe:'3–4',
    exercises:[
      {name:'90/90 Hip Switch',sets:2,reps:'8/side',rest:20},
      {name:'World’s Greatest Stretch',sets:2,reps:'5/side',rest:20},
      {name:'Ankle Dorsiflexion Rock',sets:2,reps:'10/side',rest:20},
      {name:'Thoracic Rotation',sets:2,reps:'8/side',rest:20},
      {name:'Deep Squat Hold',sets:3,reps:'30 sec',rest:30},
    ]
  },
  recovery: {
    title:'Recovery Reset', dayType:'Recovery', duration:25, rpe:'2–3',
    exercises:[
      {name:'Easy Walk or Bike',sets:1,reps:'10 min',rest:0},
      {name:'Diaphragmatic Breathing',sets:3,reps:'5 breaths',rest:20},
      {name:'Hip Flexor Stretch',sets:2,reps:'30 sec/side',rest:20},
      {name:'Hamstring Mobility',sets:2,reps:'30 sec/side',rest:20},
      {name:'Calf Mobility',sets:2,reps:'30 sec/side',rest:20},
    ]
  },
};

export function getSelfWorkout(type='strength', sport='basketball') {
  const base = WORKOUTS[type] || WORKOUTS.strength;
  return {
    ...base,
    type,
    sport,
    sessionType: base.dayType,
    estimatedDuration: base.duration,
    rpeTarget: base.rpe,
    exercises: base.exercises.map(ex => ({...ex})),
  };
}
