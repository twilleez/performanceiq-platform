import { exerciseLibrary } from '../data/exerciseLibrary.js';
import { applyProgression } from './progressionEngine.js';
import { getPhase } from './periodizationEngine.js';
import { reduceFatigue } from './fatigueEngine.js';
import { getReadinessAdjustment } from './readinessEngine.js';
const LEVELS = { beginner:1, intermediate:2, advanced:3 };
const equipmentMatch = (eq, athleteEq) => eq.some(e => athleteEq.includes(e));
const difficultyMatch = (level, athleteLevel) => LEVELS[level] <= LEVELS[athleteLevel];
function pick(pattern, athlete, count = 1, intent){
  return exerciseLibrary.filter(ex => ex.movement_pattern === pattern && equipmentMatch(ex.equipment, athlete.equipment) && difficultyMatch(ex.difficulty, athlete.experience) && (!intent || ex.training_intent === intent)).slice(0, count).map(ex => applyProgression(ex, athlete.week));
}
export function findSwaps(exercise, athlete){
  return exerciseLibrary.filter(ex => ex.id !== exercise.id && ex.movement_pattern === exercise.movement_pattern && ex.training_intent === exercise.training_intent && equipmentMatch(ex.equipment, athlete.equipment) && difficultyMatch(ex.difficulty, athlete.experience)).slice(0, 5);
}
export function generateSession(dayType, athlete, readinessScore = 75){
  const phase = getPhase(athlete.week);
  const readiness = getReadinessAdjustment(readinessScore);
  const session = { dayType, title: dayType.replaceAll('_',' ').replace(/\b\w/g, m => m.toUpperCase()), week: athlete.week, phase: phase.name, warmup: pick('warmup', athlete, 1, 'warmup'), activation: pick('activation', athlete, 1, 'activation'), power: [], primary: [], secondary: [], accessory: [], core: [], conditioning: [], cooldown: pick('cooldown', athlete, 1, 'cooldown') };
  if(dayType === 'lower_strength'){ session.power = pick('plyometric', athlete, 1, 'power'); session.primary = pick('squat', athlete, 1, 'strength'); session.secondary = pick('hinge', athlete, 1, 'strength'); session.accessory = pick('lunge', athlete, 1, 'strength'); session.core = pick('anti_rotation', athlete, 1, 'core_stability'); }
  if(dayType === 'upper_strength'){ session.primary = pick('horizontal_push', athlete, 1, 'strength'); session.secondary = pick('horizontal_pull', athlete, 1, 'strength'); session.accessory = pick('vertical_push', athlete, 1, 'strength'); session.core = pick('anti_extension', athlete, 1, 'core_stability'); }
  if(dayType === 'power_speed'){ session.power = pick('plyometric', athlete, 1, 'power'); session.primary = pick('sprint', athlete, 1, 'speed'); session.secondary = pick('lunge', athlete, 1, 'strength'); session.core = pick('anti_rotation', athlete, 1, 'core_stability'); }
  if(dayType === 'conditioning'){ session.primary = pick('conditioning', athlete, 1, 'conditioning'); session.secondary = pick('squat', athlete, 1, 'strength'); session.core = pick('anti_extension', athlete, 1, 'core_stability'); session.conditioning = pick('conditioning', athlete, 1, 'conditioning'); }
  const reduced = reduceFatigue(session, readiness.conditioning ? 16 : 13);
  reduced.session.fatigue = reduced.fatigue;
  reduced.session.readinessLabel = readiness.label;
  return reduced.session;
}
export function generateWeek(profile, readinessScore = 75){
  const athlete = { ...profile, week: profile.week || 1 };
  const split = athlete.training_days >= 5 ? ['lower_strength','upper_strength','power_speed','lower_strength','conditioning'] : ['lower_strength','upper_strength','power_speed','conditioning'];
  return split.map(day => generateSession(day, athlete, readinessScore));
}
