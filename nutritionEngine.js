// nutritionEngine.js — v1.0.0

(function () {
  "use strict";
  if (window.nutritionEngine) return;

  function calculateMacros({ weightLbs, goal, trainingLevel }) {
    let calories;

    if (goal === "BULK") calories = weightLbs * 19;
    else if (goal === "CUT") calories = weightLbs * 15;
    else calories = weightLbs * 17;

    const protein = weightLbs * 0.9;
    const fats = calories * 0.25 / 9;
    const carbs = (calories - (protein * 4) - (fats * 9)) / 4;

    return {
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fats: Math.round(fats)
    };
  }

  function generateSimpleMealPlan(macros) {
    return {
      breakfast: "Eggs + Oats",
      lunch: "Chicken + Rice + Vegetables",
      dinner: "Salmon + Sweet Potato",
      snacks: "Greek Yogurt, Fruit, Protein Shake",
      totals: macros
    };
  }

  window.nutritionEngine = {
    calculateMacros,
    generateSimpleMealPlan
  };
})();
