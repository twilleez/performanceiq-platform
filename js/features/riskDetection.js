// /js/features/riskDetection.js
// Lightweight, offline-safe risk detection combining ACWR + latest wellness.

import { computeACWR } from "./acwr.js";

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function latestWellness(athlete) {
  const w = athlete?.history?.wellness;
  if (!Array.isArray(w) || !w.length) return null;
  return w[w.length - 1];
}

function latestSessions(athlete) {
  const s = athlete?.history?.sessions;
  return Array.isArray(s) ? s : [];
}

// Returns:
// {
//   acwr: number|null,
//   wellnessRisk: 0..1,
//   acwrRisk: 0..1,
//   risk: 0..1,
//   label: "Ready"|"Watch"|"Risk"|"No data",
//   colorClass: "ready"|"watch"|"risk"|"nodata"
// }
export function computeRisk(athlete) {
  const acwr = computeACWR(latestSessions(athlete));
  const w = latestWellness(athlete);

  // ACWR risk mapping
  let acwrRisk = 0;
  if (acwr == null) acwrRisk = 0;
  else if (acwr < 0.8) acwrRisk = 0.25; // underload can also be suboptimal
  else if (acwr <= 1.3) acwrRisk = 0.1;
  else if (acwr <= 1.5) acwrRisk = 0.55;
  else acwrRisk = 0.9;

  // Wellness risk uses soreness + stress + low sleep + low readiness.
  let wellnessRisk = 0;
  if (w) {
    const soreness = clamp01((Number(w.soreness) || 0) / 10);
    const stress = clamp01((Number(w.stress) || 0) / 10);
    const sleep = clamp01((Number(w.sleep) || 0) / 10);
    const readiness = clamp01((Number(w.readiness) || 0) / 10);
    wellnessRisk = (
      0.35 * soreness +
      0.25 * stress +
      0.20 * (1 - sleep) +
      0.20 * (1 - readiness)
    );
    wellnessRisk = clamp01(wellnessRisk);
  }

  const hasAny = acwr != null || !!w;
  if (!hasAny) {
    return {
      acwr: null,
      wellnessRisk: 0,
      acwrRisk: 0,
      risk: 0,
      label: "No data",
      colorClass: "nodata",
    };
  }

  // Blend: ACWR weighted slightly higher for injury risk.
  const risk = clamp01(0.60 * acwrRisk + 0.40 * wellnessRisk);

  let label = "Ready";
  let colorClass = "ready";
  if (risk >= 0.70) {
    label = "Risk";
    colorClass = "risk";
  } else if (risk >= 0.40) {
    label = "Watch";
    colorClass = "watch";
  }

  return {
    acwr: acwr == null ? null : Number(acwr),
    wellnessRisk,
    acwrRisk,
    risk,
    label,
    colorClass,
  };
}
