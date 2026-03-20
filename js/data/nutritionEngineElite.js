/**
 * PerformanceIQ Nutrition Engine — Elite v2
 * Periodized macro-cycling, sport-specific fueling, supplement recommendations,
 * and hydration protocols based on elite sports nutrition science.
 *
 * Based on:
 * - ISSN Position Stand on Sports Nutrition (Campbell et al., 2018)
 * - Periodized Nutrition for Athletes (Jeukendrup & Gleeson, 2019)
 * - TB12 Anti-Inflammatory Principles (Brady & Yaccarino, 2017)
 * - Kelsey Poulter Fueling Framework (Poulter, 2020)
 */

// ────────────────────────────────────────────────────────────────
// MACRO-CYCLING FRAMEWORK
// ────────────────────────────────────────────────────────────────

/**
 * Periodized Macronutrient Targets
 * Adjusts macros based on training phase and sport demands.
 */
const MACRO_CYCLES = {
  'off-season': {
    basketball: { cal: (w) => w * 17, pro: (w) => w * 1.8, cho: (w) => w * 5.0, fat: (w) => w * 1.2 },
    football:   { cal: (w) => w * 18, pro: (w) => w * 2.0, cho: (w) => w * 5.5, fat: (w) => w * 1.3 },
    soccer:     { cal: (w) => w * 16, pro: (w) => w * 1.7, cho: (w) => w * 4.8, fat: (w) => w * 1.1 },
    baseball:   { cal: (w) => w * 15, pro: (w) => w * 1.6, cho: (w) => w * 4.5, fat: (w) => w * 1.0 },
    volleyball: { cal: (w) => w * 16, pro: (w) => w * 1.7, cho: (w) => w * 4.8, fat: (w) => w * 1.1 },
    track:      { cal: (w) => w * 17, pro: (w) => w * 1.8, cho: (w) => w * 5.2, fat: (w) => w * 1.1 },
  },
  'pre-season': {
    basketball: { cal: (w) => w * 18, pro: (w) => w * 1.9, cho: (w) => w * 5.5, fat: (w) => w * 1.2 },
    football:   { cal: (w) => w * 19, pro: (w) => w * 2.1, cho: (w) => w * 6.0, fat: (w) => w * 1.3 },
    soccer:     { cal: (w) => w * 17, pro: (w) => w * 1.8, cho: (w) => w * 5.2, fat: (w) => w * 1.1 },
    baseball:   { cal: (w) => w * 16, pro: (w) => w * 1.7, cho: (w) => w * 4.8, fat: (w) => w * 1.0 },
    volleyball: { cal: (w) => w * 17, pro: (w) => w * 1.8, cho: (w) => w * 5.2, fat: (w) => w * 1.1 },
    track:      { cal: (w) => w * 18, pro: (w) => w * 1.9, cho: (w) => w * 5.5, fat: (w) => w * 1.1 },
  },
  'in-season': {
    basketball: { cal: (w) => w * 17, pro: (w) => w * 1.8, cho: (w) => w * 5.2, fat: (w) => w * 1.1 },
    football:   { cal: (w) => w * 17, pro: (w) => w * 1.8, cho: (w) => w * 5.2, fat: (w) => w * 1.1 },
    soccer:     { cal: (w) => w * 16, pro: (w) => w * 1.7, cho: (w) => w * 4.8, fat: (w) => w * 1.0 },
    baseball:   { cal: (w) => w * 15, pro: (w) => w * 1.6, cho: (w) => w * 4.5, fat: (w) => w * 0.9 },
    volleyball: { cal: (w) => w * 16, pro: (w) => w * 1.7, cho: (w) => w * 4.8, fat: (w) => w * 1.0 },
    track:      { cal: (w) => w * 16, pro: (w) => w * 1.7, cho: (w) => w * 4.8, fat: (w) => w * 1.0 },
  },
};

/**
 * Calculate periodized macro targets based on athlete profile.
 * @param {number} weightLbs - Body weight in pounds
 * @param {string} sport - Sport name
 * @param {string} compPhase - Competition phase (off-season, pre-season, in-season)
 * @returns {object} Macro targets { cal, pro, cho, fat }
 */
export function calculateMacroTargetsElite(weightLbs, sport = 'basketball', compPhase = 'off-season') {
  const cycle = MACRO_CYCLES[compPhase]?.[sport] || MACRO_CYCLES['off-season']['basketball'];
  
  return {
    cal: Math.round(cycle.cal(weightLbs)),
    pro: Math.round(cycle.pro(weightLbs)),
    cho: Math.round(cycle.cho(weightLbs)),
    fat: Math.round(cycle.fat(weightLbs)),
  };
}

// ────────────────────────────────────────────────────────────────
// ELITE MEAL PLANS (Periodized)
// ────────────────────────────────────────────────────────────────

export const ELITE_MEAL_PLANS = {
  'off-season-muscle': {
    name: 'Off-Season Muscle Building',
    phase: 'off-season',
    focus: 'Hypertrophy & Strength',
    meals: [
      {
        name: 'Breakfast',
        time: '7:00 AM',
        options: [
          { name: 'Egg White Scramble + Oatmeal', cal: 520, pro: 35, cho: 65, fat: 8, ingredients: '4 egg whites, 1 cup oatmeal, berries, honey' },
          { name: 'Greek Yogurt Parfait', cal: 480, pro: 32, cho: 68, fat: 6, ingredients: '2 cups Greek yogurt, granola, honey, almonds' },
          { name: 'Protein Pancakes', cal: 510, pro: 38, cho: 62, fat: 10, ingredients: '2 scoops whey, 2 eggs, oats, banana, almond butter' },
        ],
        timing: 'Within 1 hour of waking',
      },
      {
        name: 'Mid-Morning Snack',
        time: '10:00 AM',
        options: [
          { name: 'Apple + Almond Butter', cal: 280, pro: 10, cho: 32, fat: 14, ingredients: '1 apple, 2 tbsp almond butter' },
          { name: 'Protein Shake', cal: 300, pro: 30, cho: 35, fat: 5, ingredients: '1 scoop whey, banana, oats, water' },
        ],
      },
      {
        name: 'Lunch',
        time: '12:30 PM',
        options: [
          { name: 'Grilled Chicken + Brown Rice', cal: 650, pro: 55, cho: 78, fat: 8, ingredients: '8 oz chicken breast, 1.5 cups brown rice, broccoli, olive oil' },
          { name: 'Salmon + Sweet Potato', cal: 680, pro: 48, cho: 82, fat: 14, ingredients: '6 oz salmon, 1 large sweet potato, asparagus, lemon' },
          { name: 'Lean Beef + Quinoa', cal: 660, pro: 52, cho: 80, fat: 12, ingredients: '6 oz lean beef, 1 cup quinoa, bell peppers, olive oil' },
        ],
        timing: '4–5 hours before training',
      },
      {
        name: 'Pre-Workout (if training)',
        time: '3:00 PM',
        options: [
          { name: 'Banana + Honey', cal: 180, pro: 2, cho: 45, fat: 0, ingredients: '1 banana, 1 tbsp honey' },
          { name: 'Rice Cakes + Jam', cal: 200, pro: 3, cho: 48, fat: 1, ingredients: '2 rice cakes, 2 tbsp jam' },
        ],
        timing: '30–60 min before training',
      },
      {
        name: 'Post-Workout',
        time: '5:00 PM',
        options: [
          { name: 'Whey + Dextrose', cal: 320, pro: 40, cho: 45, fat: 2, ingredients: '1.5 scoops whey, 50g dextrose, water' },
          { name: 'Chocolate Milk', cal: 300, pro: 16, cho: 52, fat: 5, ingredients: '2 cups low-fat chocolate milk' },
        ],
        timing: 'Within 30 min post-workout',
      },
      {
        name: 'Dinner',
        time: '7:00 PM',
        options: [
          { name: 'Turkey + Pasta', cal: 620, pro: 48, cho: 75, fat: 10, ingredients: '7 oz ground turkey, 1.5 cups pasta, marinara, parmesan' },
          { name: 'Tilapia + Rice', cal: 580, pro: 52, cho: 68, fat: 8, ingredients: '8 oz tilapia, 1.5 cups white rice, green beans, lemon' },
        ],
        timing: '2–3 hours before bed',
      },
      {
        name: 'Evening Snack',
        time: '9:00 PM',
        options: [
          { name: 'Casein Shake', cal: 200, pro: 25, cho: 15, fat: 4, ingredients: '1 scoop casein, water, vanilla extract' },
          { name: 'Cottage Cheese', cal: 180, pro: 28, cho: 8, fat: 3, ingredients: '1 cup low-fat cottage cheese, berries' },
        ],
        timing: 'Before bed (slow-digesting protein)',
      },
    ],
  },
  'in-season-performance': {
    name: 'In-Season Performance',
    phase: 'in-season',
    focus: 'Maintenance & Recovery',
    meals: [
      {
        name: 'Breakfast',
        time: '7:00 AM',
        options: [
          { name: 'Egg Whites + Toast', cal: 420, pro: 32, cho: 48, fat: 6, ingredients: '4 egg whites, 2 slices whole wheat toast, jam' },
          { name: 'Oatmeal + Berries', cal: 380, pro: 12, cho: 72, fat: 4, ingredients: '1 cup oatmeal, mixed berries, honey' },
        ],
      },
      {
        name: 'Mid-Morning Snack',
        time: '10:00 AM',
        options: [
          { name: 'Banana + Peanut Butter', cal: 240, pro: 9, cho: 28, fat: 12, ingredients: '1 banana, 1.5 tbsp peanut butter' },
        ],
      },
      {
        name: 'Lunch',
        time: '12:30 PM',
        options: [
          { name: 'Chicken + White Rice', cal: 550, pro: 48, cho: 65, fat: 6, ingredients: '7 oz chicken, 1.5 cups white rice, steamed vegetables' },
        ],
      },
      {
        name: 'Pre-Game/Practice',
        time: '2 hours before',
        options: [
          { name: 'Rice Cakes + Honey', cal: 200, pro: 2, cho: 50, fat: 0, ingredients: '3 rice cakes, 2 tbsp honey' },
          { name: 'Bagel + Jam', cal: 280, pro: 8, cho: 56, fat: 2, ingredients: '1 bagel, 2 tbsp jam' },
        ],
      },
      {
        name: 'Post-Game Recovery',
        time: 'Immediately after',
        options: [
          { name: 'Recovery Shake', cal: 380, pro: 40, cho: 50, fat: 3, ingredients: '1.5 scoops whey, banana, 50g dextrose, water' },
        ],
      },
      {
        name: 'Dinner',
        time: '7:00 PM',
        options: [
          { name: 'Lean Protein + Carbs', cal: 580, pro: 50, cho: 65, fat: 8, ingredients: '7 oz lean protein, 1.5 cups starch, vegetables' },
        ],
      },
      {
        name: 'Evening',
        time: '9:00 PM',
        options: [
          { name: 'Casein + Berries', cal: 180, pro: 25, cho: 12, fat: 3, ingredients: '1 scoop casein, mixed berries' },
        ],
      },
    ],
  },
};

// ────────────────────────────────────────────────────────────────
// TB12 ANTI-INFLAMMATORY FOOD PRIORITIES
// ────────────────────────────────────────────────────────────────

export const TB12_PRIORITY_FOODS = {
  proteins: [
    { name: 'Wild-Caught Salmon', benefits: 'Omega-3, anti-inflammatory', frequency: '3–4x/week' },
    { name: 'Grass-Fed Beef', benefits: 'Amino acids, CLA', frequency: '2–3x/week' },
    { name: 'Organic Chicken', benefits: 'Lean protein, B vitamins', frequency: '4–5x/week' },
    { name: 'Pasture-Raised Eggs', benefits: 'Choline, lutein', frequency: 'Daily' },
    { name: 'Plant-Based: Lentils, Chickpeas', benefits: 'Fiber, polyphenols', frequency: '3–4x/week' },
  ],
  carbs: [
    { name: 'Sweet Potatoes', benefits: 'Beta-carotene, potassium', frequency: '4–5x/week' },
    { name: 'Quinoa', benefits: 'Complete amino acids, fiber', frequency: '3–4x/week' },
    { name: 'Brown Rice', benefits: 'Selenium, magnesium', frequency: '4–5x/week' },
    { name: 'Oats', benefits: 'Beta-glucan, sustained energy', frequency: 'Daily' },
    { name: 'Berries', benefits: 'Anthocyanins, antioxidants', frequency: 'Daily' },
  ],
  fats: [
    { name: 'Extra Virgin Olive Oil', benefits: 'Polyphenols, anti-inflammatory', frequency: 'Daily' },
    { name: 'Avocado', benefits: 'Monounsaturated fat, potassium', frequency: '3–4x/week' },
    { name: 'Almonds & Walnuts', benefits: 'Omega-3, vitamin E', frequency: 'Daily' },
    { name: 'Coconut Oil', benefits: 'MCT, lauric acid', frequency: '2–3x/week' },
  ],
  vegetables: [
    { name: 'Leafy Greens (Spinach, Kale)', benefits: 'Magnesium, folate', frequency: 'Daily' },
    { name: 'Cruciferous (Broccoli, Cauliflower)', benefits: 'Sulforaphane, detox', frequency: '4–5x/week' },
    { name: 'Beets', benefits: 'Nitrates, blood flow', frequency: '2–3x/week' },
    { name: 'Turmeric', benefits: 'Curcumin, anti-inflammatory', frequency: 'Daily (in meals)' },
  ],
};

// ────────────────────────────────────────────────────────────────
// SUPPLEMENT RECOMMENDATIONS (Elite Athletes)
// ────────────────────────────────────────────────────────────────

export const ELITE_SUPPLEMENTS = {
  daily: [
    { name: 'Multivitamin', dosage: '1 tablet', timing: 'With breakfast', purpose: 'Micronutrient insurance' },
    { name: 'Omega-3 (Fish Oil)', dosage: '2–3g EPA+DHA', timing: 'With meals', purpose: 'Anti-inflammatory, joint health' },
    { name: 'Vitamin D3', dosage: '2,000–4,000 IU', timing: 'With breakfast', purpose: 'Immune, bone, mood' },
    { name: 'Magnesium', dosage: '300–400mg', timing: 'Before bed', purpose: 'Sleep, recovery, muscle' },
  ],
  trainingDays: [
    { name: 'Creatine Monohydrate', dosage: '5g', timing: 'Post-workout with carbs', purpose: 'Strength, power, cognition' },
    { name: 'Beta-Alanine', dosage: '3–5g', timing: 'Daily (split doses)', purpose: 'Buffering, endurance' },
    { name: 'Beetroot Juice', dosage: '500ml', timing: '2–3 hours pre-workout', purpose: 'Nitrates, blood flow' },
  ],
  recovery: [
    { name: 'Tart Cherry Extract', dosage: '500mg', timing: 'Post-workout', purpose: 'Soreness, sleep quality' },
    { name: 'Curcumin (Turmeric)', dosage: '500–1,000mg', timing: 'With fat source', purpose: 'Inflammation, joint health' },
    { name: 'Collagen Peptides', dosage: '10–20g', timing: 'Post-workout or bedtime', purpose: 'Joint, tendon, skin' },
  ],
};

// ────────────────────────────────────────────────────────────────
// HYDRATION PROTOCOLS
// ────────────────────────────────────────────────────────────────

/**
 * Calculate daily hydration target (baseline + training adjustment).
 * Formula: (Body Weight in lbs × 0.5) + Training Adjustment
 */
export function calculateHydrationTargetElite(weightLbs, trainingIntensity = 'moderate') {
  const baseline = weightLbs * 0.5; // oz per day
  const trainingAdj = {
    light: 0,
    moderate: 16, // +16 oz
    high: 32,     // +32 oz
    extreme: 48,  // +48 oz
  };
  
  const total = baseline + (trainingAdj[trainingIntensity] || 16);
  const liters = total / 33.814;
  
  return {
    totalOz: Math.round(total),
    totalLiters: Math.round(liters * 10) / 10,
    windows: [
      { time: '7:00 AM', oz: Math.round(total * 0.12), note: 'Upon waking' },
      { time: '10:00 AM', oz: Math.round(total * 0.12), note: 'Mid-morning' },
      { time: '1:00 PM', oz: Math.round(total * 0.15), note: 'Around lunch' },
      { time: '3:00 PM', oz: Math.round(total * 0.12), note: 'Pre-training' },
      { time: '5:00 PM', oz: Math.round(total * 0.20), note: 'During/post-training' },
      { time: '7:00 PM', oz: Math.round(total * 0.15), note: 'With dinner' },
      { time: '9:00 PM', oz: Math.round(total * 0.14), note: 'Evening' },
    ],
  };
}

// ────────────────────────────────────────────────────────────────
// ELECTROLYTE FORMULA (for high-sweat sports)
// ────────────────────────────────────────────────────────────────

export const ELECTROLYTE_FORMULA = {
  name: 'Elite Hydration Mix',
  formula: {
    water: '500ml',
    sodium: '500–700mg',
    potassium: '100–200mg',
    carbs: '30–60g',
    caffeine: '0–100mg (optional)',
  },
  diy: 'Mix: 500ml water + 1/4 tsp sea salt + 1/2 banana (potassium) + 30g honey (carbs)',
  timing: 'During training sessions > 60 min',
};

// ────────────────────────────────────────────────────────────────
// FOOD DATABASE (Quick-Add)
// ────────────────────────────────────────────────────────────────

export const FOOD_DB_ELITE = {
  'Chicken Breast (3.5 oz)': { cal: 165, pro: 31, cho: 0, fat: 3.6 },
  'Salmon (3.5 oz)': { cal: 208, pro: 20, cho: 0, fat: 13 },
  'Egg (1 large)': { cal: 78, pro: 6, cho: 0.6, fat: 5 },
  'Greek Yogurt (1 cup)': { cal: 130, pro: 23, cho: 9, fat: 0 },
  'Brown Rice (1 cup cooked)': { cal: 215, pro: 5, cho: 45, fat: 1.8 },
  'Sweet Potato (1 medium)': { cal: 103, pro: 2.3, cho: 23, fat: 0.1 },
  'Broccoli (1 cup)': { cal: 55, pro: 3.7, cho: 11, fat: 0.6 },
  'Banana (1 medium)': { cal: 105, pro: 1.3, cho: 27, fat: 0.3 },
  'Almonds (1 oz / 23 nuts)': { cal: 164, pro: 6, cho: 6, fat: 14 },
  'Olive Oil (1 tbsp)': { cal: 120, pro: 0, cho: 0, fat: 14 },
  'Oatmeal (1 cup dry)': { cal: 150, pro: 5, cho: 27, fat: 3 },
  'Whey Protein (1 scoop)': { cal: 120, pro: 25, cho: 3, fat: 1 },
  'Dextrose (50g)': { cal: 200, pro: 0, cho: 50, fat: 0 },
};

// ────────────────────────────────────────────────────────────────
// MEAL PLAN SELECTOR
// ────────────────────────────────────────────────────────────────

export function getMealPlanForProfileElite(compPhase, primaryGoal) {
  if (compPhase === 'off-season' && primaryGoal === 'Strength') {
    return ELITE_MEAL_PLANS['off-season-muscle'];
  }
  if (compPhase === 'in-season') {
    return ELITE_MEAL_PLANS['in-season-performance'];
  }
  return ELITE_MEAL_PLANS['off-season-muscle'];
}

// ────────────────────────────────────────────────────────────────
// EXPORT LEGACY FUNCTIONS (for backward compatibility)
// ────────────────────────────────────────────────────────────────

export function calculateMacroTargets(weightLbs, sport, compPhase) {
  return calculateMacroTargetsElite(weightLbs, sport, compPhase);
}

export function calculateHydrationTarget(weightLbs, trainingDay) {
  return calculateHydrationTargetElite(weightLbs, trainingDay ? 'high' : 'moderate');
}

export function getMealPlanForProfile(compPhase, primaryGoal) {
  return getMealPlanForProfileElite(compPhase, primaryGoal);
}
