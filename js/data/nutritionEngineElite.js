/**
 * PerformanceIQ — Nutrition Engine Elite
 * Macro targets based on body weight, sport, and competition phase.
 * ISSN Position Stand (2017) + NSCA guidelines.
 */

const MACRO_CYCLES = {
  'in-season': {
    basketball: { cal: w => w * 18, pro: w => w * 0.9, cho: w => w * 2.8, fat: w => w * 0.35 },
    football:   { cal: w => w * 19, pro: w => w * 1.0, cho: w => w * 3.0, fat: w => w * 0.38 },
    soccer:     { cal: w => w * 18, pro: w => w * 0.85,cho: w => w * 3.2, fat: w => w * 0.32 },
    baseball:   { cal: w => w * 17, pro: w => w * 0.85,cho: w => w * 2.5, fat: w => w * 0.34 },
    volleyball: { cal: w => w * 17, pro: w => w * 0.85,cho: w => w * 2.6, fat: w => w * 0.33 },
    track:      { cal: w => w * 20, pro: w => w * 0.9, cho: w => w * 3.5, fat: w => w * 0.30 },
  },
  'off-season': {
    basketball: { cal: w => w * 16, pro: w => w * 1.0, cho: w => w * 2.5, fat: w => w * 0.38 },
    football:   { cal: w => w * 18, pro: w => w * 1.1, cho: w => w * 2.8, fat: w => w * 0.40 },
    soccer:     { cal: w => w * 15, pro: w => w * 0.9, cho: w => w * 2.2, fat: w => w * 0.36 },
    baseball:   { cal: w => w * 15, pro: w => w * 0.9, cho: w => w * 2.0, fat: w => w * 0.38 },
    volleyball: { cal: w => w * 15, pro: w => w * 0.85,cho: w => w * 2.0, fat: w => w * 0.36 },
    track:      { cal: w => w * 16, pro: w => w * 0.95,cho: w => w * 2.4, fat: w => w * 0.32 },
  },
  'pre-season': {
    basketball: { cal: w => w * 19, pro: w => w * 1.0, cho: w => w * 3.0, fat: w => w * 0.35 },
    football:   { cal: w => w * 20, pro: w => w * 1.1, cho: w => w * 3.2, fat: w => w * 0.38 },
    soccer:     { cal: w => w * 19, pro: w => w * 0.9, cho: w => w * 3.2, fat: w => w * 0.33 },
    baseball:   { cal: w => w * 17, pro: w => w * 0.9, cho: w => w * 2.8, fat: w => w * 0.34 },
    volleyball: { cal: w => w * 18, pro: w => w * 0.9, cho: w => w * 2.8, fat: w => w * 0.34 },
    track:      { cal: w => w * 20, pro: w => w * 0.95,cho: w => w * 3.5, fat: w => w * 0.30 },
  },
};

export function calculateMacroTargetsElite(weightLbs = 165, sport = 'basketball', compPhase = 'in-season') {
  const cycle = MACRO_CYCLES[compPhase]?.[sport] || MACRO_CYCLES['in-season']['basketball'];
  return {
    cal: Math.round(cycle.cal(weightLbs)),
    pro: Math.round(cycle.pro(weightLbs)),
    cho: Math.round(cycle.cho(weightLbs)),
    fat: Math.round(cycle.fat(weightLbs)),
  };
}

export function getMealPlanForProfileElite(profile) { return null; }
