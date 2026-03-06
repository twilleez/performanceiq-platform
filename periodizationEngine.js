/* ================================================================
   periodizationEngine.js — PerformanceIQ v7 Periodization Engine
   Training phase management, load calculations, and planning
   ================================================================ */

(function() {
  'use strict';

  const PHASES = {
    general: { name: 'General Preparation', abbrev: 'GPP', weeks: 4, volume: 'high', intensity: 'low', focus: ['conditioning', 'mobility', 'general_strength'] },
    strength: { name: 'Strength Phase', abbrev: 'STR', weeks: 4, volume: 'moderate', intensity: 'high', focus: ['compound_lifts', 'accessory', 'recovery'] },
    power: { name: 'Power Phase', abbrev: 'PWR', weeks: 3, volume: 'low', intensity: 'high', focus: ['plyometrics', 'speed', 'sport_specific'] },
    peaking: { name: 'Peaking Phase', abbrev: 'PEAK', weeks: 2, volume: 'very_low', intensity: 'moderate', focus: ['skill_work', 'recovery', 'mental_prep'] },
    competition: { name: 'Competition', abbrev: 'COMP', weeks: 0, volume: 'low', intensity: 'moderate', focus: ['maintenance', 'recovery', 'sport_specific'] },
    transition: { name: 'Transition/Recovery', abbrev: 'TRANS', weeks: 2, volume: 'very_low', intensity: 'low', focus: ['active_recovery', 'mobility', 'cross_training'] },
  };

  const VOLUME_MODIFIERS = { very_low: 0.5, low: 0.7, moderate: 1.0, high: 1.2, very_high: 1.4 };
  const INTENSITY_MODIFIERS = { low: 0.6, moderate: 0.75, high: 0.85, very_high: 0.95 };

  function calculateACWR(sessions, today = new Date()) {
    if (!sessions || sessions.length === 0) return { acwr: 1.0, acute: 0, chronic: 0, risk: 'optimal' };
    const dayMs = 86400000, todayMs = today.getTime();
    const sumLoad = arr => arr.reduce((sum, s) => sum + ((s.rpe || 5) * (s.duration_min || 60)), 0);
    const acuteSessions = sessions.filter(s => (todayMs - new Date(s.logged_at || s.date).getTime()) <= 7 * dayMs);
    const chronicSessions = sessions.filter(s => (todayMs - new Date(s.logged_at || s.date).getTime()) <= 28 * dayMs);
    const acuteLoad = sumLoad(acuteSessions), chronicLoad = sumLoad(chronicSessions) / 4;
    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;
    let risk = 'optimal';
    if (acwr > 1.5) risk = 'high'; else if (acwr > 1.3) risk = 'caution'; else if (acwr < 0.8) risk = 'undertrained';
    return { acwr: Math.round(acwr * 100) / 100, acute: Math.round(acuteLoad), chronic: Math.round(chronicLoad), risk };
  }

  function weeklyVolume(sessions, weeksBack = 8) {
    const weeks = [], now = Date.now(), weekMs = 7 * 86400000;
    for (let w = 0; w < weeksBack; w++) {
      const weekStart = now - ((w + 1) * weekMs), weekEnd = now - (w * weekMs);
      const weekSessions = (sessions || []).filter(s => { const t = new Date(s.logged_at || s.date).getTime(); return t >= weekStart && t < weekEnd; });
      const volume = weekSessions.reduce((sum, s) => sum + ((s.rpe || 5) * (s.duration_min || 60)), 0);
      weeks.unshift({ week: weeksBack - w, volume, sessions: weekSessions.length });
    }
    return weeks;
  }

  function getNextPhase(current) {
    const order = ['general', 'strength', 'power', 'peaking', 'competition', 'transition'];
    return order[(order.indexOf(current) + 1) % order.length];
  }

  function shouldDeload(sessions, weekOfPhase) {
    if (weekOfPhase % 4 === 0) return { deload: true, reason: 'Scheduled deload week' };
    const weeklyVol = weeklyVolume(sessions, 4);
    const avgVolume = weeklyVol.reduce((s, w) => s + w.volume, 0) / weeklyVol.length;
    if ((weeklyVol[weeklyVol.length - 1]?.volume || 0) > avgVolume * 1.3) return { deload: true, reason: 'High recent training load' };
    return { deload: false, reason: null };
  }

  window.periodizationEngine = { PHASES, VOLUME_MODIFIERS, INTENSITY_MODIFIERS, calculateACWR, weeklyVolume, getNextPhase, shouldDeload };
})();
