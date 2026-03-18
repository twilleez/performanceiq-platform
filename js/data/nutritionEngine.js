/**
 * PerformanceIQ Elite Nutrition Engine
 * Powered by:
 *   - Tom Brady TB12 Method: Anti-inflammatory, alkaline-focused, no processed foods
 *   - Kelsey Poulter principles: Fueling for performance, timing, sustainability
 *   - ISSN Position Stand (2017): Evidence-based sport nutrition
 *   - NSCA Nutrition Guidelines: Periodized nutrition for athletes
 *
 * All macro calculations are based on body weight and training phase.
 * Meal plans are designed for elite athletes who demand the best.
 */

// ── TB12 ANTI-INFLAMMATORY FOOD PRINCIPLES ────────────────────
// Brady: "I eat to perform, not for pleasure. My diet is 80% alkaline-forming foods."
export const TB12_PRINCIPLES = {
  title: 'TB12 Anti-Inflammatory Nutrition',
  core: [
    'Eat 80% alkaline-forming foods: vegetables, fruits, nuts, legumes',
    'Eliminate processed sugar, white flour, MSG, and artificial additives',
    'Minimize nightshade vegetables (tomatoes, peppers, eggplant, potatoes)',
    'Choose organic whenever possible to reduce pesticide load',
    'Hydrate with electrolyte-rich water: 0.5–1 oz per pound of body weight daily',
    'Eat healthy fats: avocado, olive oil, coconut oil, nuts, seeds',
    'Prioritize anti-inflammatory omega-3s: wild salmon, sardines, flaxseed, chia',
    'Avoid alcohol completely during in-season training',
    'Limit caffeine to before noon; avoid on game days',
  ],
  avoidFoods: [
    'Processed sugar and high-fructose corn syrup',
    'White bread, pasta, and refined grains',
    'Fried foods and trans fats',
    'Artificial sweeteners and food dyes',
    'Excessive dairy (especially non-organic)',
    'Alcohol',
    'Nightshade vegetables (for inflammation-prone athletes)',
  ],
  priorityFoods: [
    { name: 'Wild Salmon', benefit: 'Omega-3s, anti-inflammatory, protein', category: 'Protein' },
    { name: 'Avocado', benefit: 'Healthy fats, potassium, anti-inflammatory', category: 'Fat' },
    { name: 'Blueberries', benefit: 'Antioxidants, cognitive function, recovery', category: 'Carb' },
    { name: 'Leafy Greens (Kale, Spinach)', benefit: 'Alkaline, vitamins K/C/A, iron', category: 'Vegetable' },
    { name: 'Sweet Potato', benefit: 'Complex carbs, beta-carotene, potassium', category: 'Carb' },
    { name: 'Quinoa', benefit: 'Complete protein, complex carbs, gluten-free', category: 'Carb/Protein' },
    { name: 'Almonds / Walnuts', benefit: 'Healthy fats, vitamin E, anti-inflammatory', category: 'Fat' },
    { name: 'Coconut Oil', benefit: 'MCTs, anti-microbial, quick energy', category: 'Fat' },
    { name: 'Turmeric', benefit: 'Curcumin: most studied anti-inflammatory compound', category: 'Spice' },
    { name: 'Ginger', benefit: 'Anti-inflammatory, digestion, nausea relief', category: 'Spice' },
    { name: 'Bone Broth', benefit: 'Collagen, joint health, gut health', category: 'Recovery' },
    { name: 'Beets', benefit: 'Nitrates for blood flow, endurance, recovery', category: 'Vegetable' },
    { name: 'Tart Cherry Juice', benefit: 'Reduces DOMS, improves sleep quality (evidence-based)', category: 'Recovery' },
    { name: 'Eggs (Pasture-Raised)', benefit: 'Complete protein, choline, vitamin D', category: 'Protein' },
    { name: 'Grass-Fed Beef (lean)', benefit: 'CLA, omega-3s, iron, B12', category: 'Protein' },
  ],
};

// ── KELSEY POULTER FUELING PRINCIPLES ─────────────────────────
// Poulter: "Fueling is not optional. It is the foundation of every training adaptation."
export const POULTER_PRINCIPLES = {
  title: 'Kelsey Poulter Performance Fueling',
  core: [
    'Pre-workout fueling is mandatory: carbs + protein 60–90 min before training',
    'Post-workout window: protein + carbs within 30–45 min of training completion',
    'Do not train fasted for high-intensity sessions — performance and adaptation suffer',
    'Hydration starts the night before: drink 16–24 oz water before bed on training days',
    'Eat real food first; supplements fill gaps, not the foundation',
    'Sustainable habits beat perfect plans: 80/20 rule — eat well 80% of the time',
    'Meal prep is a performance skill: athletes who prepare eat better under pressure',
    'Listen to hunger cues — athletes often under-eat, not over-eat',
    'Color on your plate = micronutrients = recovery and immune function',
  ],
  timingProtocol: {
    wakeUp: 'Hydrate immediately: 16–20 oz water with electrolytes',
    preWorkout: 'Carbs + protein 60–90 min before: oatmeal + eggs, banana + Greek yogurt, or rice + chicken',
    duringWorkout: 'Hydrate: 6–8 oz every 15–20 min. For sessions >60 min, add electrolytes.',
    postWorkout: 'Within 30–45 min: 20–40g protein + fast carbs. Chocolate milk, protein shake + banana, or rice + salmon.',
    lunch: 'Largest meal of the day for most athletes. Lean protein + complex carbs + vegetables + healthy fat.',
    dinner: 'Moderate carbs (more if training tomorrow, less if rest day). Protein + vegetables + healthy fat.',
    bedtime: 'Optional: casein protein or Greek yogurt for overnight muscle protein synthesis.',
  },
};

// ── ELITE MEAL PLANS ──────────────────────────────────────────
export const ELITE_MEAL_PLANS = {
  // ── IN-SEASON HIGH PERFORMANCE ──────────────────────────────
  in_season_performance: {
    id: 'meal-inseason-perf',
    title: 'In-Season Performance Meal Plan',
    subtitle: 'TB12 Anti-Inflammatory + Kelsey Poulter Fueling',
    phase: 'in-season',
    goal: 'Maximize performance, accelerate recovery, reduce inflammation',
    macroNote: 'Macros are personalized to your body weight and training level in your profile.',
    days: [
      {
        day: 'Training Day (High Carb)',
        meals: [
          {
            timing: 'Wake-Up (6:00–7:00 AM)',
            label: 'Hydration Protocol',
            items: ['16–20 oz filtered water', 'Pinch of Himalayan salt + squeeze of lemon (electrolytes)', 'Optional: 8 oz tart cherry juice (reduces DOMS — evidence from J. Int. Soc. Sports Nutr. 2010)'],
            macros: { cal: 60, pro: 0, cho: 14, fat: 0 },
            note: 'TB12: "Hydration is the first performance decision you make every day."',
          },
          {
            timing: 'Pre-Workout Meal (7:00–8:00 AM)',
            label: 'Power Breakfast',
            items: ['1 cup rolled oats (cooked) with blueberries and honey', '3 pasture-raised eggs (scrambled or poached)', '1/2 avocado', '1 cup spinach (sauteed in coconut oil)', '1 cup green tea'],
            macros: { cal: 620, pro: 28, cho: 68, fat: 24 },
            note: 'Kelsey Poulter: "Carbs before training are not the enemy — they are the fuel."',
          },
          {
            timing: 'Post-Workout (Within 30–45 min)',
            label: 'Recovery Window',
            items: ['Protein shake: 30g whey or plant protein + 1 banana + 8 oz coconut water', 'Optional: 1 tbsp almond butter'],
            macros: { cal: 380, pro: 32, cho: 48, fat: 6 },
            note: 'ISSN: Post-exercise protein synthesis is maximized with 20–40g protein + carbohydrates within 45 minutes.',
          },
          {
            timing: 'Lunch (12:00–1:00 PM)',
            label: 'Performance Plate',
            items: ['6 oz wild salmon or grilled chicken breast', '1.5 cups brown rice or quinoa', '2 cups mixed roasted vegetables (broccoli, zucchini, bell pepper)', '1/4 avocado', 'Olive oil + lemon dressing', '1 cup bone broth (optional, for collagen/joint health)'],
            macros: { cal: 720, pro: 52, cho: 72, fat: 20 },
            note: 'TB12 priority foods: wild salmon and vegetables. Anti-inflammatory foundation.',
          },
          {
            timing: 'Afternoon Snack (3:00–4:00 PM)',
            label: 'Fuel Between Sessions',
            items: ['1 cup Greek yogurt (plain, full-fat)', '1/2 cup mixed berries', '1 tbsp chia seeds', '1 tbsp honey', 'Handful of almonds (1 oz)'],
            macros: { cal: 340, pro: 18, cho: 38, fat: 14 },
            note: 'Kelsey Poulter: "Snacks are not cheating — they are strategic fueling between meals."',
          },
          {
            timing: 'Dinner (6:00–7:00 PM)',
            label: 'Recovery Dinner',
            items: ['6 oz grass-fed beef (lean) or turkey breast', '1 cup sweet potato (roasted)', '2 cups leafy greens salad (kale, arugula, spinach)', 'Olive oil + apple cider vinegar dressing', '1/2 cup chickpeas', 'Turmeric + ginger seasoning'],
            macros: { cal: 650, pro: 48, cho: 58, fat: 18 },
            note: 'TB12: Turmeric and ginger are powerful anti-inflammatories. Use them daily.',
          },
          {
            timing: 'Optional Bedtime (9:00–10:00 PM)',
            label: 'Overnight Recovery',
            items: ['1 cup cottage cheese or 3/4 cup Greek yogurt (casein protein for overnight synthesis)', '1 tbsp almond butter', 'Chamomile tea (promotes sleep quality)'],
            macros: { cal: 250, pro: 22, cho: 12, fat: 10 },
            note: 'ISSN: Casein protein before sleep increases overnight muscle protein synthesis (Res. Q. Exerc. Sport, 2012).',
          },
        ],
        totalMacros: { cal: 3020, pro: 200, cho: 310, fat: 92 },
      },
      {
        day: 'Rest / Recovery Day (Moderate Carb)',
        meals: [
          {
            timing: 'Breakfast (8:00–9:00 AM)',
            label: 'Anti-Inflammatory Start',
            items: ['3-egg veggie omelette (spinach, mushrooms, onion, turmeric)', '1 slice sprouted grain toast', '1/2 avocado', '1 cup mixed berries', '16 oz water + electrolytes'],
            macros: { cal: 520, pro: 30, cho: 42, fat: 22 },
            note: 'Rest day: slightly lower carbs, higher fat and protein for tissue repair.',
          },
          {
            timing: 'Lunch (12:00–1:00 PM)',
            label: 'Repair Plate',
            items: ['6 oz grilled chicken or wild salmon', '1 cup quinoa', '2 cups roasted vegetables (any)', '1/4 avocado', 'Olive oil + lemon', '1 cup bone broth'],
            macros: { cal: 640, pro: 50, cho: 55, fat: 18 },
            note: 'Bone broth provides collagen precursors for joint and connective tissue repair.',
          },
          {
            timing: 'Snack (3:00–4:00 PM)',
            label: 'Recovery Snack',
            items: ['Apple + 2 tbsp almond butter', '1 oz walnuts', '8 oz tart cherry juice (recovery evidence-based)'],
            macros: { cal: 360, pro: 8, cho: 42, fat: 18 },
            note: 'Tart cherry juice: reduces muscle soreness markers by up to 22% (Howatson et al., 2010).',
          },
          {
            timing: 'Dinner (6:00–7:00 PM)',
            label: 'Nourishing Dinner',
            items: ['6 oz wild salmon or turkey', '1 cup lentils or black beans', '3 cups mixed greens + roasted beets', 'Olive oil + balsamic dressing', 'Ginger + turmeric seasoning'],
            macros: { cal: 580, pro: 44, cho: 48, fat: 16 },
            note: 'Beets contain nitrates that improve blood flow and reduce recovery time.',
          },
        ],
        totalMacros: { cal: 2100, pro: 132, cho: 187, fat: 74 },
      },
    ],
  },
  // ── OFF-SEASON MUSCLE BUILDING ───────────────────────────────
  off_season_build: {
    id: 'meal-offseason-build',
    title: 'Off-Season Athletic Development Meal Plan',
    subtitle: 'Muscle Gain + Performance Foundation',
    phase: 'off-season',
    goal: 'Build lean muscle mass while maintaining athleticism and recovery',
    days: [
      {
        day: 'Training Day (High Calorie)',
        meals: [
          {
            timing: 'Breakfast (7:00 AM)',
            label: 'Mass Builder Breakfast',
            items: ['1.5 cups oatmeal with banana, honey, and cinnamon', '4 eggs (scrambled with spinach)', '1 cup whole milk or oat milk', '1 tbsp coconut oil (cooking)'],
            macros: { cal: 780, pro: 38, cho: 95, fat: 24 },
            note: 'Higher calorie intake during off-season supports muscle protein synthesis and training adaptations.',
          },
          {
            timing: 'Pre-Workout Snack (10:00 AM)',
            label: 'Pre-Training Fuel',
            items: ['1 banana + 1 tbsp almond butter', '1 cup Greek yogurt', '8 oz water'],
            macros: { cal: 360, pro: 18, cho: 48, fat: 10 },
            note: 'Kelsey Poulter: "Carbs before training are the most underutilized performance tool."',
          },
          {
            timing: 'Post-Workout (30 min)',
            label: 'Anabolic Window',
            items: ['40g whey protein shake + 1 cup chocolate milk', '1 large banana', '1 tbsp honey'],
            macros: { cal: 520, pro: 42, cho: 72, fat: 8 },
            note: 'ISSN: 40g protein post-workout is optimal for larger athletes (>80kg) for maximal MPS.',
          },
          {
            timing: 'Lunch (1:00 PM)',
            label: 'Athlete\'s Lunch',
            items: ['8 oz chicken breast or lean beef', '2 cups white rice (faster digesting for recovery)', '2 cups broccoli + carrots', '1 tbsp olive oil', '1 cup black beans'],
            macros: { cal: 820, pro: 62, cho: 88, fat: 16 },
            note: 'White rice post-training: faster glycogen replenishment than brown rice (Jentjens & Jeukendrup, 2003).',
          },
          {
            timing: 'Afternoon Snack (4:00 PM)',
            label: 'Muscle Snack',
            items: ['2 oz mixed nuts', '1 cup cottage cheese', '1/2 cup pineapple', '1 oz dark chocolate (70%+)'],
            macros: { cal: 420, pro: 24, cho: 36, fat: 18 },
            note: 'Dark chocolate (70%+): flavonoids reduce inflammation and improve endothelial function.',
          },
          {
            timing: 'Dinner (7:00 PM)',
            label: 'Recovery Dinner',
            items: ['8 oz salmon or grass-fed beef', '1.5 cups sweet potato', '2 cups mixed roasted vegetables', '1/4 avocado', 'Turmeric + black pepper seasoning (enhances curcumin absorption 2000%)'],
            macros: { cal: 740, pro: 52, cho: 62, fat: 22 },
            note: 'Black pepper with turmeric: piperine increases curcumin bioavailability by 2000% (Shoba et al., 1998).',
          },
          {
            timing: 'Bedtime (10:00 PM)',
            label: 'Overnight Fuel',
            items: ['1 cup cottage cheese (slow-digesting casein)', '1 tbsp almond butter', '1 kiwi (improves sleep quality — evidence-based)'],
            macros: { cal: 310, pro: 26, cho: 22, fat: 12 },
            note: 'Kiwi before bed: improves sleep onset and quality (Lin et al., 2011, Asia Pac. J. Clin. Nutr.).',
          },
        ],
        totalMacros: { cal: 3950, pro: 262, cho: 423, fat: 110 },
      },
    ],
  },
};

// ── FOOD DATABASE (Quick-Add) ─────────────────────────────────
export const FOOD_DATABASE = [
  // Proteins
  { name: 'Chicken Breast (6 oz)', cal: 280, pro: 52, cho: 0, fat: 6, category: 'Protein' },
  { name: 'Wild Salmon (6 oz)', cal: 310, pro: 44, cho: 0, fat: 14, category: 'Protein' },
  { name: 'Grass-Fed Beef (6 oz lean)', cal: 340, pro: 50, cho: 0, fat: 14, category: 'Protein' },
  { name: 'Turkey Breast (6 oz)', cal: 240, pro: 46, cho: 0, fat: 5, category: 'Protein' },
  { name: 'Eggs (3 large)', cal: 210, pro: 18, cho: 2, fat: 14, category: 'Protein' },
  { name: 'Greek Yogurt (1 cup)', cal: 170, pro: 17, cho: 9, fat: 5, category: 'Protein' },
  { name: 'Cottage Cheese (1 cup)', cal: 220, pro: 25, cho: 8, fat: 9, category: 'Protein' },
  { name: 'Whey Protein (1 scoop)', cal: 130, pro: 25, cho: 5, fat: 2, category: 'Protein' },
  { name: 'Tuna (1 can)', cal: 150, pro: 33, cho: 0, fat: 1, category: 'Protein' },
  { name: 'Shrimp (6 oz)', cal: 170, pro: 32, cho: 2, fat: 3, category: 'Protein' },
  // Carbohydrates
  { name: 'Brown Rice (1 cup cooked)', cal: 220, pro: 5, cho: 45, fat: 2, category: 'Carb' },
  { name: 'White Rice (1 cup cooked)', cal: 205, pro: 4, cho: 45, fat: 0, category: 'Carb' },
  { name: 'Oatmeal (1 cup cooked)', cal: 165, pro: 6, cho: 28, fat: 3, category: 'Carb' },
  { name: 'Sweet Potato (1 medium)', cal: 130, pro: 3, cho: 30, fat: 0, category: 'Carb' },
  { name: 'Quinoa (1 cup cooked)', cal: 222, pro: 8, cho: 39, fat: 4, category: 'Carb' },
  { name: 'Banana (1 large)', cal: 120, pro: 1, cho: 31, fat: 0, category: 'Carb' },
  { name: 'Blueberries (1 cup)', cal: 84, pro: 1, cho: 21, fat: 0, category: 'Carb' },
  { name: 'Apple (1 medium)', cal: 95, pro: 0, cho: 25, fat: 0, category: 'Carb' },
  { name: 'Sprouted Grain Bread (2 slices)', cal: 160, pro: 8, cho: 28, fat: 2, category: 'Carb' },
  { name: 'Black Beans (1 cup)', cal: 227, pro: 15, cho: 41, fat: 1, category: 'Carb/Protein' },
  { name: 'Lentils (1 cup cooked)', cal: 230, pro: 18, cho: 40, fat: 1, category: 'Carb/Protein' },
  // Fats
  { name: 'Avocado (1/2)', cal: 120, pro: 1, cho: 6, fat: 11, category: 'Fat' },
  { name: 'Almonds (1 oz)', cal: 164, pro: 6, cho: 6, fat: 14, category: 'Fat' },
  { name: 'Walnuts (1 oz)', cal: 185, pro: 4, cho: 4, fat: 18, category: 'Fat' },
  { name: 'Olive Oil (1 tbsp)', cal: 119, pro: 0, cho: 0, fat: 14, category: 'Fat' },
  { name: 'Almond Butter (2 tbsp)', cal: 196, pro: 7, cho: 6, fat: 18, category: 'Fat' },
  { name: 'Coconut Oil (1 tbsp)', cal: 121, pro: 0, cho: 0, fat: 14, category: 'Fat' },
  { name: 'Chia Seeds (2 tbsp)', cal: 138, pro: 5, cho: 12, fat: 9, category: 'Fat' },
  { name: 'Dark Chocolate 70% (1 oz)', cal: 170, pro: 2, cho: 13, fat: 12, category: 'Fat' },
  // Vegetables
  { name: 'Spinach (2 cups raw)', cal: 14, pro: 2, cho: 2, fat: 0, category: 'Vegetable' },
  { name: 'Kale (2 cups raw)', cal: 34, pro: 3, cho: 7, fat: 0, category: 'Vegetable' },
  { name: 'Broccoli (1 cup)', cal: 55, pro: 4, cho: 11, fat: 1, category: 'Vegetable' },
  { name: 'Mixed Greens (2 cups)', cal: 20, pro: 2, cho: 3, fat: 0, category: 'Vegetable' },
  { name: 'Beets (1 cup roasted)', cal: 74, pro: 3, cho: 17, fat: 0, category: 'Vegetable' },
  // Recovery
  { name: 'Tart Cherry Juice (8 oz)', cal: 140, pro: 1, cho: 34, fat: 0, category: 'Recovery' },
  { name: 'Bone Broth (1 cup)', cal: 45, pro: 9, cho: 0, fat: 1, category: 'Recovery' },
  { name: 'Chocolate Milk (1 cup)', cal: 190, pro: 8, cho: 30, fat: 5, category: 'Recovery' },
  { name: 'Coconut Water (8 oz)', cal: 46, pro: 2, cho: 9, fat: 0, category: 'Recovery' },
];

// ── HYDRATION CALCULATOR ──────────────────────────────────────
// TB12: 0.5–1 oz per pound of body weight
export function calculateHydrationTarget(weightLbs, trainingDay = true) {
  const base = Math.round(weightLbs * 0.6); // 0.6 oz/lb baseline
  const training = trainingDay ? Math.round(weightLbs * 0.15) : 0; // extra for training
  const total = base + training;
  return {
    base,
    trainingExtra: training,
    total,
    cups: Math.round(total / 8),
    liters: (total * 0.02957).toFixed(1),
    note: 'Based on TB12 Method: 0.5–1 oz per pound of body weight. Increase in heat or high-intensity sessions.',
  };
}

// ── MEAL PLAN SELECTOR ────────────────────────────────────────
export function getMealPlanForProfile(compPhase, primaryGoal) {
  if (compPhase === 'off-season' && (primaryGoal === 'size' || primaryGoal === 'strength')) {
    return ELITE_MEAL_PLANS.off_season_build;
  }
  return ELITE_MEAL_PLANS.in_season_performance;
}
