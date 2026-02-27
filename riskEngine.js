// riskEngine.js — v1.0.0
// Week 7–8 Production Risk Layer
// Computes: ACWR, monotony/strain, load spike, nutrition adherence warning, suggested deload

(function () {
  "use strict";
  if (window.riskEngine) return;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function sum(arr) {
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += Number(arr[i] || 0);
    return s;
  }

  // Monotony = mean daily load / std dev daily load (7d)
  // Strain = weekly load * monotony
  function monotonyAndStrain(dailyLoads7) {
    const n = dailyLoads7.length || 1;
    const mean = sum(dailyLoads7) / n;
    let variance = 0;
    for (let i = 0; i < n; i++) {
      const d = dailyLoads7[i] - mean;
      variance += d * d;
    }
    variance /= n;
    const sd = Math.sqrt(variance);
    const monotony = sd === 0 ? (mean > 0 ? 3 : 0) : (mean / sd);
    const weeklyLoad = sum(dailyLoads7);
    const strain = weeklyLoad * monotony;
    return {
      mean,
      sd,
      monotony,
      weeklyLoad,
      strain
    };
  }

  function computeACWR(acute7, chronic28) {
    const acute = acute7;
    const chronic = chronic28 / 4; // average week baseline from 28 days
    if (chronic <= 0) return { acwr: acute > 0 ? 2.0 : 0, acute, chronicWeekAvg: chronic };
    return { acwr: acute / chronic, acute, chronicWeekAvg: chronic };
  }

  function riskIndex({ acwr, monotony, sleepHours, soreness, nutritionAdherence }) {
    // Simple, transparent heuristic (0–100)
    // ACWR component (0..40)
    let acwrScore = 0;
    if (acwr >= 2.0) acwrScore = 40;
    else if (acwr >= 1.5) acwrScore = 28;
    else if (acwr >= 1.3) acwrScore = 18;
    else if (acwr >= 1.1) acwrScore = 10;
    else acwrScore = 5;

    // Monotony component (0..20)
    let monoScore = 0;
    if (monotony >= 2.5) monoScore = 20;
    else if (monotony >= 2.0) monoScore = 15;
    else if (monotony >= 1.5) monoScore = 10;
    else monoScore = 5;

    // Recovery component (0..25)
    let recScore = 0;
    if (sleepHours !== null && sleepHours !== undefined) {
      if (sleepHours < 6) recScore += 12;
      else if (sleepHours < 7) recScore += 8;
      else recScore += 3;
    } else recScore += 6;

    if (soreness !== null && soreness !== undefined) {
      if (soreness >= 8) recScore += 13;
      else if (soreness >= 6) recScore += 9;
      else if (soreness >= 4) recScore += 6;
      else recScore += 3;
    } else recScore += 6;

    // Nutrition component (0..15)
    let nutScore = 0;
    if (nutritionAdherence !== null && nutritionAdherence !== undefined) {
      if (nutritionAdherence < 50) nutScore = 15;
      else if (nutritionAdherence < 70) nutScore = 10;
      else if (nutritionAdherence < 85) nutScore = 6;
      else nutScore = 2;
    } else nutScore = 6;

    const total = clamp(Math.round(acwrScore + monoScore + recScore + nutScore), 0, 100);
    return total;
  }

  function band(risk) {
    if (risk >= 75) return { label: "High", color: "danger" };
    if (risk >= 55) return { label: "Moderate", color: "warn" };
    return { label: "Low", color: "ok" };
  }

  function buildFlags({ acwr, monotony, strain, nutritionAdherence }) {
    const flags = [];

    if (acwr >= 1.5) flags.push({ key: "load_spike", label: "Load spike", detail: `ACWR ${acwr.toFixed(2)} (≥1.5)` });
    else if (acwr >= 1.3) flags.push({ key: "elevated_load", label: "Elevated load", detail: `ACWR ${acwr.toFixed(2)} (≥1.3)` });

    if (monotony >= 2.0) flags.push({ key: "monotony", label: "High monotony", detail: `Monotony ${monotony.toFixed(2)} (≥2.0)` });

    if (strain >= 6000) flags.push({ key: "strain", label: "High strain", detail: `Strain ${Math.round(strain)} (≥6000)` });

    if (nutritionAdherence !== null && nutritionAdherence !== undefined && nutritionAdherence < 70) {
      flags.push({ key: "nutrition", label: "Nutrition warning", detail: `Adherence ${Math.round(nutritionAdherence)}% (<70%)` });
    }

    return flags;
  }

  function suggestedDeload({ acwr, monotony, risk }) {
    // Suggest deload if risk high or workload pattern risky
    if (risk >= 75) return { suggest: true, reason: "Risk index high" };
    if (acwr >= 1.5 && monotony >= 2.0) return { suggest: true, reason: "ACWR + monotony elevated" };
    if (acwr >= 1.8) return { suggest: true, reason: "ACWR very high" };
    return { suggest: false, reason: "No deload needed" };
  }

  window.riskEngine = {
    monotonyAndStrain,
    computeACWR,
    riskIndex,
    band,
    buildFlags,
    suggestedDeload
  };
})();
