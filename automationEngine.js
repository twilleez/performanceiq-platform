// automationEngine.js — v1.0.0
// Week 9–10 Automation Layer
// Auto flags, weekly summary, suggested deload prompt, spike banners, nutrition warnings.

(function () {
  "use strict";
  if (window.automationEngine) return;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function iso(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.toISOString().slice(0, 10);
  }

  function todayISO() { return iso(new Date()); }

  function addDays(dateISO, days) {
    const d = new Date(dateISO + "T00:00:00");
    d.setDate(d.getDate() + days);
    return iso(d);
  }

  function dateRange(endISO, daysBack) {
    const out = [];
    for (let i = daysBack - 1; i >= 0; i--) out.push(addDays(endISO, -i));
    return out;
  }

  function sum(arr) {
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += Number(arr[i] || 0);
    return s;
  }

  function getDailyLoad(state, athleteId, dateISO) {
    const k = athleteId + "|" + dateISO;
    const arr = state.sessionsByAthlete[k] || [];
    let total = 0;
    for (let i = 0; i < arr.length; i++) total += Number(arr[i].load || 0);
    return total;
  }

  function getNutritionAdherence(state, athleteId, dateISO) {
    const k = athleteId + "|" + dateISO;
    const rec = state.nutritionByAthlete[k];
    if (!rec) return null;
    const n = Number(rec.adherence);
    return Number.isFinite(n) ? n : null;
  }

  function getReadiness(state, athleteId, dateISO) {
    const k = athleteId + "|" + dateISO;
    const rec = state.readinessByAthlete[k];
    if (!rec) return { sleepHours: null, soreness: null };
    return { sleepHours: rec.sleepHours ?? null, soreness: rec.soreness ?? null };
  }

  function computeSnapshot(state, athleteId, asOfISO) {
    // Requires riskEngine + analyticsEngine (already loaded)
    const daily7 = dateRange(asOfISO, 7).map(d => getDailyLoad(state, athleteId, d));
    const acute7 = sum(daily7);

    const daily28 = dateRange(asOfISO, 28).map(d => getDailyLoad(state, athleteId, d));
    const chronic28 = sum(daily28);

    const ms = window.riskEngine.monotonyAndStrain(daily7);
    const ac = window.riskEngine.computeACWR(acute7, chronic28);

    const r = getReadiness(state, athleteId, asOfISO);
    const nut = getNutritionAdherence(state, athleteId, asOfISO);

    const risk = window.riskEngine.riskIndex({
      acwr: ac.acwr,
      monotony: ms.monotony,
      sleepHours: r.sleepHours,
      soreness: r.soreness,
      nutritionAdherence: nut
    });

    const band = window.riskEngine.band(risk);
    const flags = window.riskEngine.buildFlags({
      acwr: ac.acwr,
      monotony: ms.monotony,
      strain: ms.strain,
      nutritionAdherence: nut
    });

    const deload = window.riskEngine.suggestedDeload({
      acwr: ac.acwr,
      monotony: ms.monotony,
      risk
    });

    return {
      daily7,
      acute7,
      chronic28,
      acwr: ac.acwr,
      monotony: ms.monotony,
      strain: ms.strain,
      nutritionAdherence: nut,
      risk,
      band,
      flags,
      deload
    };
  }

  function weeklySummary(state, athleteId, endISO) {
    const days = dateRange(endISO, 7);
    const loads = days.map(d => getDailyLoad(state, athleteId, d));
    const total = sum(loads);

    // Nutrition adherence avg over 7d (only days logged)
    let nutSum = 0, nutCount = 0;
    for (let i = 0; i < days.length; i++) {
      const v = getNutritionAdherence(state, athleteId, days[i]);
      if (v !== null && v !== undefined) { nutSum += v; nutCount++; }
    }
    const nutAvg = nutCount ? (nutSum / nutCount) : null;

    // Readiness avg (sleep & soreness) if present
    let sleepSum = 0, sleepCount = 0;
    let soreSum = 0, soreCount = 0;
    for (let i = 0; i < days.length; i++) {
      const r = getReadiness(state, athleteId, days[i]);
      if (r.sleepHours != null) { sleepSum += Number(r.sleepHours); sleepCount++; }
      if (r.soreness != null) { soreSum += Number(r.soreness); soreCount++; }
    }

    return {
      endISO,
      totalLoad7: total,
      dailyLoads: loads,
      nutAvg: nutAvg != null ? Math.round(nutAvg) : null,
      sleepAvg: sleepCount ? (sleepSum / sleepCount) : null,
      sorenessAvg: soreCount ? (soreSum / soreCount) : null
    };
  }

  function pickTopBadges(snapshot) {
    // Prioritize perception-changing badges
    const out = [];

    // Load spike
    if (snapshot.acwr >= 1.5) out.push({ tone: "danger", label: `Load Spike (ACWR ${snapshot.acwr.toFixed(2)})` });
    else if (snapshot.acwr >= 1.3) out.push({ tone: "warn", label: `Elevated Load (ACWR ${snapshot.acwr.toFixed(2)})` });
    else out.push({ tone: "ok", label: `Load Normal (ACWR ${snapshot.acwr.toFixed(2)})` });

    // Nutrition warning
    if (snapshot.nutritionAdherence != null && snapshot.nutritionAdherence < 70) {
      out.push({ tone: "warn", label: `Nutrition Low (${Math.round(snapshot.nutritionAdherence)}%)` });
    }

    // Suggested deload
    if (snapshot.deload.suggest) out.push({ tone: "warn", label: `Suggested Deload` });

    // Risk band
    out.push({ tone: snapshot.band.color, label: `Risk ${snapshot.band.label} (${snapshot.risk})` });

    return out.slice(0, 4);
  }

  // Dismissible prompts (stored outside app state so it never breaks UI)
  const DISMISS_KEY = "piq_dismissed_prompts_v1";

  function getDismissed() {
    try {
      return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function dismissPrompt(promptId, untilISO) {
    const d = getDismissed();
    d[promptId] = untilISO || addDays(todayISO(), 7);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(d));
  }

  function isDismissed(promptId) {
    const d = getDismissed();
    const until = d[promptId];
    if (!until) return false;
    return todayISO() <= until;
  }

  function buildDeloadPrompt(state, athleteId, snapshot) {
    const pid = `deload_${athleteId}`;
    if (isDismissed(pid)) return null;
    if (!snapshot.deload.suggest) return null;

    return {
      id: pid,
      tone: "warn",
      title: "Suggested Deload",
      body: snapshot.deload.reason,
      actionLabel: "Dismiss 7 days",
      onAction() { dismissPrompt(pid, addDays(todayISO(), 7)); }
    };
  }

  window.automationEngine = {
    computeSnapshot,
    weeklySummary,
    pickTopBadges,
    buildDeloadPrompt,
    dismissPrompt,
    isDismissed
  };
})();
