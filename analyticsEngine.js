// analyticsEngine.js — v1.0.0 (Offline-first)
// Provides athlete analytics + alerts from logs.
// Depends on helper inputs you pass in (training sessions, readiness rows, nutrition rows, targets).
(function () {
  "use strict";
  if (window.analyticsEngine) return;

  const clamp = (n, a, b) => Math.min(Math.max(Number(n) || 0, a), b);

  function safeISO(d) {
    const s = String(d || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  }
  const todayISO = () => new Date().toISOString().slice(0, 10);

  function addDaysISO(iso, deltaDays) {
    const d = safeISO(iso) || todayISO();
    const ms = Date.parse(d);
    if (!Number.isFinite(ms)) return todayISO();
    return new Date(ms + deltaDays * 86400000).toISOString().slice(0, 10);
  }

  function toNum(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function sessionLoad(sess) {
    return clamp(toNum(sess?.minutes, 0) * toNum(sess?.rpe, 0), 0, 6000);
  }

  function sumLoads(trainingSessions, fromISO, toISOInclusive) {
    const f = safeISO(fromISO);
    const t = safeISO(toISOInclusive);
    if (!f || !t) return 0;
    return (trainingSessions || [])
      .filter((s) => s && safeISO(s.dateISO) && s.dateISO >= f && s.dateISO <= t)
      .reduce((acc, s) => acc + sessionLoad(s), 0);
  }

  function dailyLoads(trainingSessions, startISO, days) {
    const map = {};
    for (let i = 0; i < days; i++) map[addDaysISO(startISO, i)] = 0;
    (trainingSessions || []).forEach((s) => {
      const d = safeISO(s?.dateISO);
      if (!d || !(d in map)) return;
      map[d] += sessionLoad(s);
    });
    return map;
  }

  function computeACWR(trainingSessions, asOfISO) {
    const asOf = safeISO(asOfISO) || todayISO();
    const acuteFrom = addDaysISO(asOf, -6);
    const chronicFrom = addDaysISO(asOf, -27);

    const acute = sumLoads(trainingSessions, acuteFrom, asOf); // 7d
    const chronicTotal = sumLoads(trainingSessions, chronicFrom, asOf); // 28d
    const chronicAvg7 = (chronicTotal / 28) * 7;
    const acwr = chronicAvg7 > 0 ? acute / chronicAvg7 : null;

    const daily = dailyLoads(trainingSessions, acuteFrom, 7);
    const vals = Object.values(daily);
    const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, vals.length);
    const sd = Math.sqrt(variance);
    const monotony = sd > 0 ? mean / sd : (mean > 0 ? 3 : 0);
    const strain = acute * monotony;

    return {
      acute: Math.round(acute),
      chronicAvg7: Math.round(chronicAvg7),
      acwr: acwr === null ? null : Number(acwr.toFixed(2)),
      monotony: Number(monotony.toFixed(2)),
      strain: Math.round(strain),
      daily7: daily
    };
  }

  function rollingAvg(list, fromISO, toISOInclusive, field) {
    const f = safeISO(fromISO);
    const t = safeISO(toISOInclusive);
    if (!f || !t) return null;
    const rows = (list || []).filter((r) => r && safeISO(r.dateISO) && r.dateISO >= f && r.dateISO <= t);
    if (!rows.length) return null;
    const vals = rows.map((r) => toNum(r[field], NaN)).filter((x) => Number.isFinite(x));
    if (!vals.length) return null;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Number(mean.toFixed(2));
  }

  function sleepDebt7(readinessRows, asOfISO) {
    const asOf = safeISO(asOfISO) || todayISO();
    const from = addDaysISO(asOf, -6);
    const avgSleep = rollingAvg(readinessRows, from, asOf, "sleep");
    if (avgSleep === null) return null;
    // Simple: "ideal" 8.0h
    const debtPerNight = Math.max(0, 8 - avgSleep);
    const weeklyDebt = Number((debtPerNight * 7).toFixed(2));
    return { avgSleep, weeklyDebt };
  }

  function readinessTrend(readinessRows, asOfISO) {
    const asOf = safeISO(asOfISO) || todayISO();
    const w1From = addDaysISO(asOf, -6);
    const w2From = addDaysISO(asOf, -13);
    const w2To = addDaysISO(asOf, -7);

    const avg7 = rollingAvg(readinessRows, w1From, asOf, "computedScore");
    const prev7 = rollingAvg(readinessRows, w2From, w2To, "computedScore");
    if (avg7 === null) return { avg7: null, delta: null };
    if (prev7 === null) return { avg7, delta: null };
    return { avg7, delta: Number((avg7 - prev7).toFixed(2)) };
  }

  function nutritionAdherenceTrend(nutRows, asOfISO) {
    const asOf = safeISO(asOfISO) || todayISO();
    const from = addDaysISO(asOf, -6);
    const vals = (nutRows || [])
      .filter((r) => r && safeISO(r.dateISO) && r.dateISO >= from && r.dateISO <= asOf)
      .map((r) => toNum(r.adherenceScore, NaN))
      .filter((x) => Number.isFinite(x));
    if (!vals.length) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Number(avg.toFixed(2));
  }

  function buildAlerts({ acwrMeta, sleepMeta, readinessMeta, nutritionAvg }) {
    const alerts = [];

    if (acwrMeta.acwr !== null) {
      if (acwrMeta.acwr > 1.5) alerts.push({ level: "danger", msg: `Load spike: ACWR ${acwrMeta.acwr} (> 1.5)` });
      else if (acwrMeta.acwr > 1.3) alerts.push({ level: "warn", msg: `Elevated load: ACWR ${acwrMeta.acwr} (> 1.3)` });
      else if (acwrMeta.acwr < 0.6) alerts.push({ level: "warn", msg: `Underload: ACWR ${acwrMeta.acwr} (< 0.6)` });
    } else {
      alerts.push({ level: "muted", msg: "ACWR not available (need more training history)" });
    }

    if (acwrMeta.monotony >= 2.5) alerts.push({ level: "warn", msg: `High monotony ${acwrMeta.monotony} (repeating similar load)` });
    if (acwrMeta.strain >= 12000) alerts.push({ level: "warn", msg: `High strain ${acwrMeta.strain}` });

    if (sleepMeta?.avgSleep !== null) {
      if (sleepMeta.avgSleep < 6.5) alerts.push({ level: "danger", msg: `Low sleep avg ${sleepMeta.avgSleep}h (7d)` });
      else if (sleepMeta.avgSleep < 7.2) alerts.push({ level: "warn", msg: `Sleep trending low ${sleepMeta.avgSleep}h (7d)` });
      if (sleepMeta.weeklyDebt >= 6) alerts.push({ level: "warn", msg: `Sleep debt ~${sleepMeta.weeklyDebt}h/week` });
    }

    if (readinessMeta?.avg7 !== null) {
      if (readinessMeta.avg7 < 55) alerts.push({ level: "danger", msg: `Low readiness avg ${readinessMeta.avg7} (7d)` });
      else if (readinessMeta.avg7 < 65) alerts.push({ level: "warn", msg: `Readiness watch ${readinessMeta.avg7} (7d)` });
      if (readinessMeta.delta !== null && readinessMeta.delta <= -6) alerts.push({ level: "warn", msg: `Readiness down ${readinessMeta.delta} vs prior week` });
    }

    if (nutritionAvg !== null) {
      if (nutritionAvg < 60) alerts.push({ level: "warn", msg: `Nutrition adherence low avg ${nutritionAvg}` });
      if (nutritionAvg < 45) alerts.push({ level: "danger", msg: `Nutrition adherence critical avg ${nutritionAvg}` });
    }

    return alerts.slice(0, 8);
  }

  window.analyticsEngine = {
    computeSummary({ trainingSessions, readinessRows, nutritionRows, asOfISO }) {
      const asOf = safeISO(asOfISO) || todayISO();

      const acwrMeta = computeACWR(trainingSessions || [], asOf);
      const sleepMeta = sleepDebt7(readinessRows || [], asOf);

      // readinessRows in core will include computedScore already
      const readinessMeta = readinessTrend(readinessRows || [], asOf);

      const nutritionAvg = nutritionAdherenceTrend(nutritionRows || [], asOf);

      const alerts = buildAlerts({ acwrMeta, sleepMeta, readinessMeta, nutritionAvg });

      return {
        asOfISO: asOf,
        acwrMeta,
        sleepMeta,
        readinessMeta,
        nutritionAvg,
        alerts
      };
    }
  };
})();
