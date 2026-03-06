/* ================================================================
   nutritionEngine.js — PerformanceIQ v7 Nutrition Engine
   Macro calculations, meal planning, and dietary support
   ================================================================ */

(function() {
  'use strict';

  // ─── MACRO CALCULATION ───────────────────────────────────────────
  const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,
    light: 1.375,
    low: 1.375,
    moderate: 1.55,
    med: 1.55,
    active: 1.725,
    high: 1.725,
    very_active: 1.9,
  };

  const GOAL_ADJUSTMENTS = {
    cut: { calories: -500, protein: 1.1, carbs: 0.8, fat: 0.9 },
    lose: { calories: -500, protein: 1.1, carbs: 0.8, fat: 0.9 },
    maintain: { calories: 0, protein: 1.0, carbs: 1.0, fat: 1.0 },
    build: { calories: 300, protein: 1.15, carbs: 1.1, fat: 1.0 },
    gain: { calories: 300, protein: 1.15, carbs: 1.1, fat: 1.0 },
    bulk: { calories: 500, protein: 1.2, carbs: 1.2, fat: 1.05 },
    performance: { calories: 200, protein: 1.1, carbs: 1.15, fat: 1.0 },
  };

  function calculateBMR(weight_lbs, height_in, age, gender) {
    const weight_kg = weight_lbs * 0.453592;
    const height_cm = height_in * 2.54;
    const actualAge = age || 25;
    
    if (gender === 'female') {
      return (10 * weight_kg) + (6.25 * height_cm) - (5 * actualAge) - 161;
    }
    return (10 * weight_kg) + (6.25 * height_cm) - (5 * actualAge) + 5;
  }

  function macroTargets(options = {}) {
    const {
      weight_lbs = 160,
      height_in = 70,
      age = 25,
      gender = 'male',
      activity = 'med',
      goal = 'maintain',
    } = options;

    const bmr = calculateBMR(weight_lbs, height_in, age, gender);
    const activityMult = ACTIVITY_MULTIPLIERS[activity] || 1.55;
    const tdee = Math.round(bmr * activityMult);
    
    const goalAdj = GOAL_ADJUSTMENTS[goal] || GOAL_ADJUSTMENTS.maintain;
    const targetCalories = tdee + goalAdj.calories;

    const baseProtein = weight_lbs * 0.8;
    const baseFat = weight_lbs * 0.35;
    
    const protein_g = Math.round(baseProtein * goalAdj.protein);
    const fat_g = Math.round(baseFat * goalAdj.fat);
    
    const proteinCals = protein_g * 4;
    const fatCals = fat_g * 9;
    const carbCals = Math.max(0, targetCalories - proteinCals - fatCals);
    const carbs_g = Math.round((carbCals / 4) * goalAdj.carbs);

    return {
      calories: Math.round(targetCalories),
      protein_g,
      carbs_g,
      fat_g,
      fiber_g: Math.round(targetCalories / 100),
      water_oz: Math.round(weight_lbs * 0.5),
    };
  }

  // ─── MEAL FOODS DATABASE ─────────────────────────────────────────
  const MEAL_FOODS = {
    breakfast: [
      { name: "Oatmeal with berries & honey", protein: 9, carbs: 55, fat: 6, cal: 310 },
      { name: "Greek yogurt parfait with granola", protein: 20, carbs: 42, fat: 8, cal: 320 },
      { name: "Scrambled eggs on whole-grain toast", protein: 22, carbs: 30, fat: 14, cal: 330 },
      { name: "Protein smoothie (whey, banana, oat milk)", protein: 30, carbs: 50, fat: 6, cal: 374 },
      { name: "Avocado toast with eggs", protein: 18, carbs: 28, fat: 20, cal: 360 },
    ],
    lunch: [
      { name: "Grilled chicken rice bowl with veg", protein: 42, carbs: 58, fat: 10, cal: 490 },
      { name: "Turkey & avocado wrap", protein: 35, carbs: 48, fat: 16, cal: 476 },
      { name: "Salmon quinoa salad", protein: 38, carbs: 44, fat: 14, cal: 458 },
      { name: "Lean beef stir-fry with brown rice", protein: 40, carbs: 52, fat: 12, cal: 468 },
    ],
    snack: [
      { name: "Cottage cheese & pineapple", protein: 18, carbs: 20, fat: 3, cal: 179 },
      { name: "Apple with almond butter", protein: 5, carbs: 28, fat: 9, cal: 209 },
      { name: "Rice cakes with peanut butter", protein: 7, carbs: 22, fat: 8, cal: 188 },
      { name: "Hard-boiled eggs & fruit", protein: 13, carbs: 18, fat: 7, cal: 191 },
    ],
    dinner: [
      { name: "Baked salmon, sweet potato & broccoli", protein: 44, carbs: 48, fat: 16, cal: 512 },
      { name: "Chicken thigh, roasted veg & quinoa", protein: 40, carbs: 44, fat: 14, cal: 474 },
      { name: "Lean beef tacos (corn tortillas)", protein: 38, carbs: 50, fat: 16, cal: 492 },
      { name: "Grilled shrimp with pasta primavera", protein: 35, carbs: 58, fat: 12, cal: 468 },
    ],
  };

  function generateMealPlan(options = {}) {
    const { targets = null, restrictions = [], days = 1 } = options;
    const macros = targets || macroTargets(options);
    const plans = [];

    for (let d = 0; d < days; d++) {
      const dayPlan = { day: d + 1, meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
      const mealSplit = { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 };

      for (const [mealType, pct] of Object.entries(mealSplit)) {
        const available = MEAL_FOODS[mealType] || [];
        if (available.length === 0) continue;
        const meal = available[Math.floor(Math.random() * available.length)];
        dayPlan.meals.push({ type: mealType, ...meal });
        dayPlan.totals.calories += meal.cal;
        dayPlan.totals.protein += meal.protein;
        dayPlan.totals.carbs += meal.carbs;
        dayPlan.totals.fat += meal.fat;
      }
      plans.push(dayPlan);
    }
    return { targets: macros, plans };
  }

  // ─── EXPOSE API ──────────────────────────────────────────────────
  window.nutritionEngine = {
    macroTargets,
    calculateBMR,
    generateMealPlan,
    MEAL_FOODS,
    ACTIVITY_MULTIPLIERS,
    GOAL_ADJUSTMENTS,
  };

})();
