// piq_engines.js — PerformanceIQ Engines v1.0.0
// Offline-first. No Supabase required.
// Exposes: window.PIQ_Engines = { score, risk, periodization, nutrition, heatmap }

(function () {
  "use strict";
  if (window.PIQ_Engines) return;

  const clamp = (n, a, b) => Math.min(Math.max(Number(n), a), b);
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

  const safeISO = (d) => {
    const s = String(d || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  };

  const isoAddDays = (iso, delta) => {
    const s = safeISO(iso) || new Date().toISOString().slice(0, 10);
    const ms = Date.parse(s);
    const out = new Date(ms + delta * 86400000);
    return out.toISOString().slice(0, 10);
  };

  const rangeDays = (endISO, days) => {
    const end = safeISO(endISO) || new Date().toISOString().slice(0, 10);
    const out = [];
    for (let i = days - 1; i >= 0; i--) out.push(isoAddDays(end, -i));
    return out;
  };

  // ---------------------------
  // Workload model (simple, robust)
  // ---------------------------
  // Each day load = (volumeNormalized + intensityBoost + extraGymBoost)
  function computeDailyLoadFromLocalLog(localLog) {
    if (!localLog) return 0;

    const vol = Number(localLog.volume) || 0; // optional if you compute volume elsewhere
    const entries = Array.isArray(localLog.entries) ? localLog.entries : [];
    const computedVol = entries.reduce((s, e) => {
      const w = num(e?.weight);
      const r = num(String(e?.reps || "").replace(/[^0-9.]/g, ""));
      if (w === null || r === null) return s;
      return s + w * r;
    }, 0);

    const volume = vol > 0 ? vol : computedVol;

    const wellness = num(localLog.wellness);
    const energy = num(localLog.energy);
    const sleepQ = num(localLog.sleep_quality);
    const pain = num(localLog.injury_pain);

    // intensity proxy (0..1)
    const intensity =
      (energy !== null ? clamp((energy - 1) / 9, 0, 1) : 0.6) * 0.5 +
      (wellness !== null ? clamp((wellness - 1) / 9, 0, 1) : 0.6) * 0.5;

    const sleepPenalty = sleepQ !== null ? (sleepQ < 5 ? 0.15 : sleepQ < 7 ? 0.08 : 0) : 0.05;
    const painPenalty = pain !== null ? (pain >= 7 ? 0.2 : pain >= 5 ? 0.12 : pain >= 3 ? 0.06 : 0) : 0;

    // Normalize volume to be stable across users (log scale)
    const volNorm = Math.log10(1 + Math.max(0, volume)); // 0..~6
    const volScaled = clamp((volNorm / 5.5) * 70, 0, 70); // 0..70

    const intensityScaled = clamp(intensity * 30, 0, 30); // 0..30

    // penalties reduce effective load quality (not the raw load)
    const qualityMultiplier = clamp(1 - (sleepPenalty + painPenalty), 0.6, 1);

    return (volScaled + intensityScaled) * qualityMultiplier;
  }

  function mean(arr) {
    const v = (arr || []).map((x) => Number(x)).filter((x) => Number.isFinite(x));
    if (!v.length) return null;
    return v.reduce((a, b) => a + b, 0) / v.length;
  }

  function std(arr) {
    const m = mean(arr);
    if (m === null) return null;
    const v = arr.map((x) => Number(x)).filter((x) => Number.isFinite(x));
    if (v.length < 2) return 0;
    const s2 = v.reduce((a, b) => a + (b - m) * (b - m), 0) / (v.length - 1);
    return Math.sqrt(s2);
  }

  // ---------------------------
  // Risk Detection Engine
  // ---------------------------
  // Produces: riskScore 0..100, level, flags
  function riskFromHistory({ dateISO, logsLocal, readiness, baselines }) {
    const date = safeISO(dateISO) || new Date().toISOString().slice(0, 10);
    const logs = Array.isArray(logsLocal) ? logsLocal : [];

    // daily load for last 28 days
    const days28 = rangeDays(date, 28);
    const byDate = {};
    for (const l of logs) if (l?.dateISO) byDate[String(l.dateISO)] = l;

    const load28 = days28.map((d) => computeDailyLoadFromLocalLog(byDate[d] || null));
    const load7 = load28.slice(-7);
    const load28mean = mean(load28);
    const load7mean = mean(load7);

    const acute = load7mean !== null ? load7mean : 0;
    const chronic = load28mean !== null ? load28mean : 0.0001;

    const acwr = chronic > 0 ? acute / chronic : 0;

    // monotony/strain (simple)
    const m7 = mean(load7) || 0;
    const sd7 = std(load7) || 0.0001;
    const monotony = m7 / sd7; // higher => risk
    const strain = m7 * monotony;

    const flags = [];
    let risk = 0;

    // Readiness grade influence (expects {grade, score})
    const grade = String(readiness?.grade || "B").toUpperCase();
    if (grade === "OUT") {
      risk = 95;
      flags.push("OUT grade: training should be paused.");
    } else if (grade === "D") {
      risk += 25;
      flags.push("D readiness: high fatigue / recovery need.");
    } else if (grade === "C") {
      risk += 12;
      flags.push("C readiness: caution.");
    }

    // ACWR thresholds (rough, stable)
    if (acwr >= 1.5) {
      risk += 22;
      flags.push(`Load spike (ACWR ${acwr.toFixed(2)}).`);
    } else if (acwr >= 1.3) {
      risk += 12;
      flags.push(`Moderate load spike (ACWR ${acwr.toFixed(2)}).`);
    } else if (acwr <= 0.6 && acute > 10) {
      risk += 8;
      flags.push(`Underloaded then sudden work risk (ACWR ${acwr.toFixed(2)}).`);
    }

    // monotony
    if (monotony >= 3.0) {
      risk += 18;
      flags.push(`High monotony (${monotony.toFixed(2)}).`);
    } else if (monotony >= 2.2) {
      risk += 10;
      flags.push(`Moderate monotony (${monotony.toFixed(2)}).`);
    }

    // strain
    if (strain >= 240) {
      risk += 12;
      flags.push("High strain week.");
    } else if (strain >= 180) {
      risk += 6;
      flags.push("Elevated strain week.");
    }

    // baseline performance drops (if provided)
    const b = baselines || {};
    const vertDrop = b.vertDropPct; // optional precomputed
    const sprintWorse = b.sprintWorsePct;
    const codWorse = b.codWorsePct;

    if (Number.isFinite(vertDrop) && vertDrop >= 0.05) {
      risk += 8;
      flags.push("Vertical drop vs baseline.");
    }
    if (Number.isFinite(sprintWorse) && sprintWorse >= 0.05) {
      risk += 8;
      flags.push("Sprint slower vs baseline.");
    }
    if (Number.isFinite(codWorse) && codWorse >= 0.05) {
      risk += 8;
      flags.push("COD slower vs baseline.");
    }

    risk = clamp(risk, 0, 100);

    const level = risk >= 75 ? "high" : risk >= 50 ? "moderate" : risk >= 30 ? "watch" : "low";

    return { dateISO: date, riskScore: Math.round(risk), level, flags, acwr, monotony, strain };
  }

  // ---------------------------
  // PerformanceIQ Score (Brand Differentiator)
  // ---------------------------
  // Score 0..100 with breakdown:
  // - Readiness (35)
  // - Consistency (15)
  // - Trend (15)
  // - Workload Quality (15)
  // - Recovery (15)
  // - Nutrition (5) if elite enabled
  function performanceIQScore({ dateISO, logsLocal, testsLocal, readiness, nutritionSummary, eliteEnabled }) {
    const date = safeISO(dateISO) || new Date().toISOString().slice(0, 10);
    const logs = Array.isArray(logsLocal) ? logsLocal : [];
    const tests = Array.isArray(testsLocal) ? testsLocal : [];

    const last14Logs = logs
      .filter((l) => l?.dateISO && l.dateISO <= date)
      .slice()
      .sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)))
      .slice(-14);

    const last14Tests = tests
      .filter((t) => t?.dateISO && t.dateISO <= date)
      .slice()
      .sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)))
      .slice(-14);

    // Readiness (0..35)
    const rScore = Number(readiness?.score);
    const readinessPts = Number.isFinite(rScore) ? clamp((rScore / 100) * 35, 0, 35) : 22;

    // Consistency (0..15) based on log frequency
    const daysLogged = new Set(last14Logs.map((l) => l.dateISO)).size;
    const consistencyPts = clamp((daysLogged / 10) * 15, 0, 15);

    // Trend (0..15): wellness trend + performance trend
    const wellnessVals = last14Logs.map((l) => num(l.wellness)).filter((x) => x !== null);
    const vertVals = last14Tests.map((t) => num(t.vert)).filter((x) => x !== null);

    const slope = (vals) => {
      const y = vals.map(Number).filter((x) => Number.isFinite(x));
      const n = y.length;
      if (n < 2) return 0;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (let i = 0; i < n; i++) {
        sumX += i; sumY += y[i]; sumXY += i * y[i]; sumXX += i * i;
      }
      const denom = n * sumXX - sumX * sumX;
      if (!denom) return 0;
      return (n * sumXY - sumX * sumY) / denom;
    };

    const wSlope = slope(wellnessVals);
    const vSlope = slope(vertVals);

    // normalize slopes into points
    const trendPts =
      clamp(7.5 + wSlope * 2.2, 0, 10) + // wellness influence
      clamp(2.5 + vSlope * 1.2, 0, 5);   // vert influence
    const trendTotal = clamp(trendPts, 0, 15);

    // Workload quality (0..15): penalize spikes + monotony
    const loads14 = rangeDays(date, 14).map((d) => {
      const l = last14Logs.find((x) => x.dateISO === d);
      return computeDailyLoadFromLocalLog(l || null);
    });
    const m = mean(loads14) || 0;
    const sd = std(loads14) || 0.0001;
    const monotony = m / sd;
    const spike = (() => {
      const last7 = loads14.slice(-7);
      const prev7 = loads14.slice(0, 7);
      const a = mean(last7) || 0;
      const c = mean(prev7) || 0.0001;
      return c > 0 ? a / c : 1;
    })();

    let workloadPts = 15;
    if (spike >= 1.5) workloadPts -= 6;
    else if (spike >= 1.3) workloadPts -= 3;
    if (monotony >= 3.0) workloadPts -= 6;
    else if (monotony >= 2.2) workloadPts -= 3;
    workloadPts = clamp(workloadPts, 0, 15);

    // Recovery (0..15): sleep + low pain + hydration proxy
    const sleepQ = mean(last14Logs.map((l) => num(l.sleep_quality)).filter((x) => x !== null));
    const pain = mean(last14Logs.map((l) => num(l.injury_pain)).filter((x) => x !== null));
    const hydration = last14Logs.map((l) => String(l.hydration || "").toLowerCase());
    const hydScore = hydration.filter((h) => h === "good" || h === "great").length / Math.max(1, hydration.length);

    let recoveryPts = 15;
    if (sleepQ !== null && sleepQ < 6) recoveryPts -= 5;
    else if (sleepQ !== null && sleepQ < 7) recoveryPts -= 2;
    if (pain !== null && pain >= 5) recoveryPts -= 5;
    else if (pain !== null && pain >= 3) recoveryPts -= 2;
    if (hydScore < 0.5) recoveryPts -= 2;
    recoveryPts = clamp(recoveryPts, 0, 15);

    // Nutrition (0..5) only if elite enabled
    let nutritionPts = 0;
    if (eliteEnabled) {
      const n = nutritionSummary || {};
      // If they completed targets we award points. If unknown, neutral.
      const hitProtein = n.hitProtein === true ? 1 : n.hitProtein === false ? 0 : 0.6;
      const hitCals = n.hitCalories === true ? 1 : n.hitCalories === false ? 0 : 0.6;
      nutritionPts = clamp((hitProtein * 3) + (hitCals * 2), 0, 5);
    }

    const total = Math.round(
      readinessPts + consistencyPts + trendTotal + workloadPts + recoveryPts + nutritionPts
    );

    return {
      dateISO: date,
      total: clamp(total, 0, 100),
      breakdown: {
        readiness: Math.round(readinessPts),
        consistency: Math.round(consistencyPts),
        trend: Math.round(trendTotal),
        workload: Math.round(workloadPts),
        recovery: Math.round(recoveryPts),
        nutrition: Math.round(nutritionPts)
      },
      derived: { monotony, spike }
    };
  }

  // ---------------------------
  // Periodization Engine (auto blocks)
  // ---------------------------
  // Creates a 12-week plan using days/week and sport
  function buildPeriodization({ startISO, daysPerWeek, sport, goal }) {
    const start = safeISO(startISO) || new Date().toISOString().slice(0, 10);
    const d = clamp(Number(daysPerWeek || 4), 3, 5);
    const s = String(sport || "basketball").toLowerCase();
    const g = String(goal || "performance").toLowerCase();

    const blocks = [
      { name: "Accumulation", weeks: [1, 2, 3], focus: "Volume + technique", intensity: "moderate", deload: false },
      { name: "Deload", weeks: [4], focus: "Recover + skill quality", intensity: "low", deload: true },
      { name: "Intensification", weeks: [5, 6, 7], focus: "Strength + power", intensity: "high", deload: false },
      { name: "Deload", weeks: [8], focus: "Recover + speed", intensity: "low", deload: true },
      { name: "Realization", weeks: [9, 10, 11], focus: "Speed + reactive power", intensity: "high", deload: false },
      { name: "Taper/Test", weeks: [12], focus: "Sharp + test", intensity: "moderate-low", deload: true }
    ];

    const weekRules = (wk) => {
      const b = blocks.find((x) => x.weeks.includes(wk)) || blocks[0];
      const load = b.deload ? 0.8 : b.intensity === "high" ? 1.06 : 1.0;
      const plyo = b.name === "Realization" ? "high" : b.name === "Intensification" ? "moderate" : b.deload ? "low" : "moderate";
      const lift = b.name === "Intensification" ? "high" : b.name === "Accumulation" ? "moderate" : b.deload ? "low" : "moderate";
      const condition = b.deload ? "low" : b.name === "Accumulation" ? "moderate" : "moderate-low";
      return { ...b, loadMultiplier: load, liftFocus: lift, plyoFocus: plyo, conditioning: condition };
    };

    const weeks = [];
    for (let w = 1; w <= 12; w++) {
      const rules = weekRules(w);
      weeks.push({
        week: w,
        startISO: isoAddDays(start, (w - 1) * 7),
        block: rules.name,
        focus: rules.focus,
        loadMultiplier: rules.loadMultiplier,
        liftFocus: rules.liftFocus,
        plyoFocus: rules.plyoFocus,
        conditioning: rules.conditioning,
        notes:
          s === "basketball"
            ? "Prioritize ankles/hips, COD, reactive jumps; keep skill work year-round."
            : "Adjust sport-specific skill emphasis accordingly.",
        goal: g,
        daysPerWeek: d
      });
    }

    return { startISO: start, sport: s, goal: g, daysPerWeek: d, weeks, blocks };
  }

  // Adjust week load based on readiness grade (A/B/C/D/OUT)
  function periodizationAdjustLoad(baseMultiplier, readinessGrade) {
    const g = String(readinessGrade || "B").toUpperCase();
    if (g === "A") return clamp(baseMultiplier * 1.03, 0.6, 1.25);
    if (g === "B") return clamp(baseMultiplier * 1.0, 0.6, 1.25);
    if (g === "C") return clamp(baseMultiplier * 0.9, 0.6, 1.25);
    if (g === "D") return clamp(baseMultiplier * 0.75, 0.6, 1.25);
    if (g === "OUT") return 0;
    return clamp(baseMultiplier, 0.6, 1.25);
  }

  // ---------------------------
  // Elite Nutrition Add-on Engine
  // ---------------------------
  // Generates macro targets + meal templates.
  // NOTE: This is guidance logic; not medical advice.
  function macroTargets({ weightLbs, heightIn, age, sex, activity, goal }) {
    const w = clamp(Number(weightLbs || 150), 80, 350);
    const h = Number(heightIn || 70);
    const a = clamp(Number(age || 18), 10, 70);
    const s = String(sex || "male").toLowerCase();
    const g = String(goal || "lean_bulk").toLowerCase();
    const act = String(activity || "high").toLowerCase();

    // very stable simplified BMR (Mifflin-ish, w/out requiring exact)
    const kg = w * 0.453592;
    const cm = (Number.isFinite(h) ? h : 70) * 2.54;

    const bmr = s === "female"
      ? (10 * kg + 6.25 * cm - 5 * a - 161)
      : (10 * kg + 6.25 * cm - 5 * a + 5);

    const factor = act === "low" ? 1.35 : act === "moderate" ? 1.55 : 1.75;
    let tdee = bmr * factor;

    if (g === "cut") tdee -= 300;
    else if (g === "lean_bulk") tdee += 250;
    else if (g === "maintain") tdee += 0;
    else tdee += 150;

    const calories = Math.round(clamp(tdee, 1600, 4800));

    // protein 0.8–1.0 g/lb for athletes -> pick 0.9 baseline
    const proteinG = Math.round(clamp(w * 0.9, 90, 240));
    const fatG = Math.round(clamp((calories * 0.25) / 9, 45, 140));
    const carbsG = Math.round(Math.max(0, (calories - proteinG * 4 - fatG * 9) / 4));

    return { calories, proteinG, carbsG, fatG };
  }

  function mealPlanTemplate({ calories, proteinG, carbsG, fatG, mealsPerDay }) {
    const m = clamp(Number(mealsPerDay || 4), 3, 6);

    // Split macros across meals (simple and usable)
    const pPer = Math.round(proteinG / m);
    const cPer = Math.round(carbsG / m);
    const fPer = Math.round(fatG / m);

    const ideas = [
      ["Breakfast", "Greek yogurt + oats + berries + honey", "Eggs + toast + fruit"],
      ["Meal 2", "Chicken rice bowl + veggies", "Turkey wrap + fruit + nuts"],
      ["Meal 3", "Salmon + potatoes + salad", "Lean beef + pasta + veggies"],
      ["Snack", "Protein shake + banana", "Cottage cheese + granola"],
      ["Pre/Post", "Rice cakes + peanut butter", "Chocolate milk + pretzels"],
      ["Dinner", "Stir-fry chicken + rice + veggies", "Tacos (lean meat) + beans + salsa"]
    ];

    const plan = [];
    for (let i = 0; i < m; i++) {
      const bucket = ideas[i] || ["Meal", "Balanced plate", "Balanced plate"];
      plan.push({
        meal: bucket[0],
        macros: { proteinG: pPer, carbsG: cPer, fatG: fPer },
        options: [bucket[1], bucket[2]]
      });
    }

    return { mealsPerDay: m, perMeal: { proteinG: pPer, carbsG: cPer, fatG: fPer }, plan };
  }

  // For the “paid upgrade” we track a lightweight compliance summary the UI can update.
  function nutritionComplianceFromDay({ target, actual }) {
    // actual can be null -> unknown
    const t = target || {};
    const a = actual || {};
    const p = num(a.proteinG);
    const cals = num(a.calories);

    const hitProtein =
      p === null ? null : p >= (num(t.proteinG) || 0) * 0.9 && p <= (num(t.proteinG) || 0) * 1.2;
    const hitCalories =
      cals === null ? null : cals >= (num(t.calories) || 0) * 0.9 && cals <= (num(t.calories) || 0) * 1.1;

    return { hitProtein, hitCalories };
  }

  // ---------------------------
  // Heatmap helpers
  // ---------------------------
  function heatColorFromScore(s) {
    const x = clamp(Number(s || 0), 0, 100);
    // green -> yellow -> orange -> red
    if (x >= 85) return "#2ecc71";
    if (x >= 70) return "#f1c40f";
    if (x >= 55) return "#e67e22";
    return "#e74c3c";
  }

  window.PIQ_Engines = {
    score: { performanceIQScore },
    risk: { riskFromHistory },
    periodization: { buildPeriodization, periodizationAdjustLoad },
    nutrition: { macroTargets, mealPlanTemplate, nutritionComplianceFromDay },
    heatmap: { rangeDays, heatColorFromScore }
  };
})();
