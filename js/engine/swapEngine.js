// js/engine/swapEngine.js
// Intelligent exercise swap — matches movement_pattern + equipment, respects restrictions

import { exercises } from '../data/exerciseLibrary.js';

/**
 * Find valid swaps for an exercise.
 * @param {string} exerciseId - The exercise to swap out
 * @param {object} constraints - { equipment_available, injury_restrictions, difficulty, sport }
 * @returns {Array} up to 3 ranked swap candidates with reason text
 */
export function findSwaps(exerciseId, constraints = {}) {
  const original = exercises.find(e => e.id === exerciseId);
  if (!original) return [];

  const {
    equipment_available = null,  // null = all available
    injury_restrictions = [],    // e.g. ['knees', 'shoulders']
    prefer_difficulty = null,    // 'easier' | 'same' | 'harder'
    sport = null,
  } = constraints;

  let candidates = exercises.filter(e => {
    if (e.id === exerciseId) return false;

    // Must match movement pattern
    if (e.movement_pattern !== original.movement_pattern) return false;

    // Equipment filter
    if (equipment_available && !equipment_available.includes(e.equipment) && e.equipment !== 'none') return false;

    // Injury restrictions
    if (injury_restrictions.length > 0) {
      const muscleStr = [e.primary_muscle, e.movement_pattern].join(' ').toLowerCase();
      for (const restriction of injury_restrictions) {
        if (isContraindicated(muscleStr, restriction)) return false;
      }
    }

    return true;
  });

  // Score candidates by fit
  candidates = candidates.map(e => ({
    ...e,
    score: scoreCandidate(e, original, { sport, prefer_difficulty }),
    reason: buildSwapReason(e, original, constraints),
  }));

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, 3);
}

function scoreCandidate(candidate, original, { sport, prefer_difficulty }) {
  let score = 50;

  // Same category = big bonus
  if (candidate.category === original.category) score += 20;

  // Sport relevance
  if (sport && (candidate.sport_tags.includes(sport) || candidate.sport_tags.includes('all'))) score += 10;

  // Difficulty preference
  const diffOrder = { beginner: 1, intermediate: 2, advanced: 3 };
  const origDiff  = diffOrder[original.difficulty] || 2;
  const candDiff  = diffOrder[candidate.difficulty] || 2;
  if (prefer_difficulty === 'easier' && candDiff < origDiff) score += 15;
  else if (prefer_difficulty === 'harder' && candDiff > origDiff) score += 15;
  else if (!prefer_difficulty && candDiff === origDiff) score += 10;

  // Same primary muscle group = bonus
  if (candidate.primary_muscle === original.primary_muscle) score += 15;

  // Same equipment preferred (easier transition)
  if (candidate.equipment === original.equipment) score += 8;

  return score;
}

function buildSwapReason(candidate, original, { equipment_available, injury_restrictions }) {
  const reasons = [];

  if (candidate.equipment === 'none') reasons.push('no equipment needed');
  else if (candidate.equipment !== original.equipment) reasons.push(`uses ${candidate.equipment}`);

  if (candidate.difficulty !== original.difficulty) {
    const dirs = { beginner: 'easier', intermediate: 'moderate', advanced: 'harder' };
    reasons.push(dirs[candidate.difficulty] || candidate.difficulty);
  }

  if (candidate.primary_muscle === original.primary_muscle) reasons.push('same target muscle');

  if (injury_restrictions.length > 0) reasons.push('joint-friendly');

  if (reasons.length === 0) reasons.push('same movement pattern');

  return reasons.join(' · ');
}

function isContraindicated(muscleStr, restriction) {
  const map = {
    knees:     ['squat', 'lunge', 'quads'],
    shoulders: ['push', 'pull', 'chest', 'shoulders', 'rear_delt'],
    back:      ['hinge', 'posterior', 'back', 'hamstrings'],
    hips:      ['hinge', 'hip_flexors', 'hips'],
    ankles:    ['jump', 'sprint', 'agility'],
  };
  const targets = map[restriction.toLowerCase()] || [];
  return targets.some(t => muscleStr.includes(t));
}
