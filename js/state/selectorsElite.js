/**
 * PerformanceIQ Selectors Elite — re-exports from selectors.js
 * Phase 2: added trend/history selectors
 */
export {
  getScoreBreakdown     as getScoreBreakdownElite,
  getReadinessScore     as getReadinessScoreElite,
  getReadinessResult,
  getNutritionResult,
  getDashboardConfig,
  getReadinessColor,
  getReadinessLabel,
  getReadinessExplain,
  getReadinessRingOffset,
  getMacroTargets,
  getMacroProgress,
  getCheckInHistory,
  getReadinessTrend,
  getPIQTrend,
  getACWRSeries,
  getLoadSeries,
} from './selectors.js';
