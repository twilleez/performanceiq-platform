// js/state/state.js — Central application state

export const state = {
  role: 'athlete', // 'athlete' | 'coach'
  athleteId: 1,
  currentView: 'dashboard',

  // Current athlete profile
  athlete: {
    id: 1,
    name: 'Jordan Davis',
    sport: 'basketball',
    position: 'Forward',
    experience_level: 'performance', // foundation|development|performance|elite|maintenance
    development_stage: 'performance',
    training_age: 4, // years
    height_cm: 193,
    weight_kg: 89,
    goal: 'in-season performance',
    season_phase: 'inseason', // offseason|preseason|inseason|postseason
  },

  // Today's wellness (from wellness log)
  wellness: {
    sleep_hours: 7.2,
    soreness: 3, // 1-10
    stress: 4, // 1-10
    energy: 6, // 1-10
    mood: 7, // 1-10
    logged: true,
  },

  // Today's readiness (computed by engine)
  readiness: null,

  // Today's training session
  session: null,

  // PIQ score history (last 14 days)
  piqHistory: [
    { date: '2026-02-21', score: 71 },
    { date: '2026-02-22', score: 74 },
    { date: '2026-02-23', score: 68 },
    { date: '2026-02-24', score: 72 },
    { date: '2026-02-25', score: 76 },
    { date: '2026-02-26', score: 79 },
    { date: '2026-02-27', score: 75 },
    { date: '2026-02-28', score: 73 },
    { date: '2026-03-01', score: 78 },
    { date: '2026-03-02', score: 82 },
    { date: '2026-03-03', score: 77 },
    { date: '2026-03-04', score: 80 },
    { date: '2026-03-05', score: 76 },
    { date: '2026-03-06', score: 0 }, // today — computed
  ],

  // ACWR load data (7-day acute / 28-day chronic)
  loadData: {
    acute: 342,   // AU last 7 days
    chronic: 290, // AU last 28 days avg/week
    acwr: 1.18,
  },

  // Performance test results
  performanceResults: [
    { test: 'Vertical Jump', value: 28.5, unit: 'in', delta: +1.5, date: '2026-03-01' },
    { test: '40-Yard Dash', value: 4.72, unit: 's', delta: -0.04, date: '2026-03-01' },
    { test: 'Bench Press', value: 225, unit: 'lbs', delta: +10, date: '2026-02-15' },
    { test: 'Squat 1RM', value: 315, unit: 'lbs', delta: +15, date: '2026-02-15' },
  ],

  // Team (coach view)
  team: {
    name: 'Varsity Basketball',
    sport: 'basketball',
    athletes: [
      { id: 2, name: 'Marcus Webb', initials: 'MW', position: 'PG', readiness: 88, wellness: { sleep: 8.5, soreness: 2, stress: 2, energy: 9, mood: 8 }, color: '#4da6ff' },
      { id: 3, name: 'Devon Carter', initials: 'DC', position: 'SG', readiness: 72, wellness: { sleep: 6.5, soreness: 5, stress: 6, energy: 5, mood: 5 }, color: '#f5c518' },
      { id: 4, name: 'Jordan Davis', initials: 'JD', position: 'SF', readiness: 76, wellness: { sleep: 7.2, soreness: 3, stress: 4, energy: 6, mood: 7 }, color: '#00e5a0' },
      { id: 5, name: 'Tyler Monroe', initials: 'TM', position: 'PF', readiness: 51, wellness: { sleep: 5.5, soreness: 8, stress: 7, energy: 3, mood: 4 }, color: '#ff7a35' },
      { id: 6, name: 'Chris Evans', initials: 'CE', position: 'C', readiness: 90, wellness: { sleep: 9.0, soreness: 1, stress: 2, energy: 9, mood: 9 }, color: '#4da6ff' },
      { id: 7, name: 'Antoine Silva', initials: 'AS', position: 'PG', readiness: 40, wellness: { sleep: 5.0, soreness: 9, stress: 8, energy: 2, mood: 3 }, color: '#ff3b3b' },
      { id: 8, name: 'Jabari King', initials: 'JK', position: 'SG', readiness: 83, wellness: { sleep: 8.0, soreness: 3, stress: 3, energy: 8, mood: 8 }, color: '#00e5a0' },
      { id: 9, name: 'Rafael Torres', initials: 'RT', position: 'SF', readiness: 65, wellness: { sleep: 6.8, soreness: 5, stress: 5, energy: 6, mood: 6 }, color: '#f5c518' },
      { id: 10, name: 'Noah Patel', initials: 'NP', position: 'PF', readiness: 79, wellness: { sleep: 7.5, soreness: 3, stress: 3, energy: 7, mood: 7 }, color: '#4da6ff' },
      { id: 11, name: 'Darnell Reed', initials: 'DR', position: 'C', readiness: 58, wellness: { sleep: 6.0, soreness: 6, stress: 5, energy: 5, mood: 5 }, color: '#f5c518' },
    ],
  },
};

// Alias export so older/newer files can both work
export const STATE = state;

const STORAGE_KEY = 'piq_state_v1';

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('saveState failed:', err);
    return false;
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return state;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return state;

    mergeInto(state, parsed);
    return state;
  } catch (err) {
    console.error('loadState failed:', err);
    return state;
  }
}

export function getReadinessLevel(score) {
  const n = Number(score) || 0;

  if (n >= 80) return { level: 'green', label: 'GO', emoji: '⚡' };
  if (n >= 65) return { level: 'yellow', label: 'MODERATE', emoji: '⚠️' };
  if (n >= 50) return { level: 'orange', label: 'CAUTION', emoji: '🔶' };
  return { level: 'red', label: 'RECOVER', emoji: '🛑' };
}

export function getACWRStatus(acwr) {
  const n = Number(acwr);

  if (!Number.isFinite(n)) {
    return { cls: 'low', label: 'Status unavailable' };
  }

  if (n < 0.8) {
    return { cls: 'low', label: 'Undertrained' };
  }

  if (n <= 1.3) {
    return { cls: 'optimal', label: 'Optimal Zone' };
  }

  if (n < 1.5) {
    return { cls: 'high', label: 'High Risk' };
  }

  return { cls: 'danger', label: 'Injury Risk' };
}

function mergeInto(target, source) {
  Object.keys(source).forEach((key) => {
    const srcVal = source[key];
    const tgtVal = target[key];

    if (Array.isArray(srcVal)) {
      target[key] = srcVal;
      return;
    }

    if (srcVal && typeof srcVal === 'object' && tgtVal && typeof tgtVal === 'object' && !Array.isArray(tgtVal)) {
      mergeInto(tgtVal, srcVal);
      return;
    }

    target[key] = srcVal;
  });
}
