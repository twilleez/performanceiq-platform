// /js/features/sessionGenerator.js
import { EXERCISE_BANK } from '../data/exerciseBank.js';

// FIX: cap and pct were imported from scoring.js but were never exported there.
// Define them locally where they are actually used.
function cap(str) {
  const s = String(str || '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function pct(total, fraction) {
  return Math.round(Number(total) * fraction);
}

function getExercisesFor(sport, type) {
  const bank = EXERCISE_BANK[sport] || EXERCISE_BANK.basketball || {};
  // EXERCISE_BANK values are arrays of exercise objects, not nested by type
  // Return the whole bank array; caller slices what it needs
  return Array.isArray(bank) ? bank : [];
}

function applyInjuryFiltersToExercise(name, injuries) {
  const inj = new Set((injuries || []).map(x => String(x).toLowerCase()));
  if (!inj.size) return name;
  const risky = /(jump|plyo|bounds|depth|sprint|max velocity)/i;
  if ((inj.has('knee') || inj.has('ankle')) && risky.test(name)) {
    return name.replace(risky, 'low-impact');
  }
  return name;
}

export function generateSession(sport, type, duration, intensity, injuries) {
  const SE = { basketball: '🏀', football: '🏈', soccer: '⚽', baseball: '⚾', volleyball: '🏐', track: '🏃' };
  const TL = { practice: 'Practice', strength: 'Strength', speed: 'Speed', conditioning: 'Conditioning', recovery: 'Recovery', competition: 'Competition Prep' };
  const IL = { low: 'Low', moderate: 'Moderate', high: 'High' };

  const inj = (injuries && injuries.length)
    ? ' · ' + injuries.map(i => cap(i) + '-friendly').join(', ')
    : '';

  const BLOCKS = {
    practice: [
      { dot: 'var(--blue)',   name: 'Dynamic Warm-up',                                        time: pct(duration, .16) },
      { dot: 'var(--accent)', name: 'Skill Microblocks — Sport-specific',                     time: pct(duration, .25) },
      { dot: 'var(--orange)', name: 'Strength Block' + (injuries?.includes('knee') ? ' (knee-friendly)' : ''), time: pct(duration, .28) },
      { dot: 'var(--yellow)', name: 'Power & Conditioning',                                   time: pct(duration, .18) },
      { dot: 'var(--green)',  name: 'Cool-down + Mobility',                                   time: pct(duration, .13) },
    ],
    strength: [
      { dot: 'var(--blue)',   name: 'Warm-up + Movement Prep',       time: pct(duration, .14) },
      { dot: 'var(--orange)', name: 'Main Lift — Primary Pattern',   time: pct(duration, .32) },
      { dot: 'var(--accent)', name: 'Accessory Work — Volume Build', time: pct(duration, .28) },
      { dot: 'var(--yellow)', name: 'Core & Stability',              time: pct(duration, .16) },
      { dot: 'var(--green)',  name: 'Stretch + Recovery Protocol',   time: pct(duration, .10) },
    ],
    speed: [
      { dot: 'var(--blue)',   name: 'Neural Warm-up',                  time: pct(duration, .18) },
      { dot: 'var(--accent)', name: 'Acceleration Mechanics × 6 sets', time: pct(duration, .30) },
      { dot: 'var(--orange)', name: 'Max Velocity Runs',               time: pct(duration, .25) },
      { dot: 'var(--yellow)', name: 'Change of Direction Drills',      time: pct(duration, .17) },
      { dot: 'var(--green)',  name: 'Cool-down + PNF Stretch',         time: pct(duration, .10) },
    ],
    recovery: [
      { dot: 'var(--blue)',   name: 'Light Cardio — Zone 1',             time: pct(duration, .30) },
      { dot: 'var(--green)',  name: 'Mobility Flow',                     time: pct(duration, .30) },
      { dot: 'var(--accent)', name: 'Foam Rolling + Soft Tissue',        time: pct(duration, .25) },
      { dot: 'var(--yellow)', name: 'Breathing + Parasympathetic Reset', time: pct(duration, .15) },
    ],
    conditioning: [
      { dot: 'var(--blue)',   name: 'Dynamic Warm-up',              time: pct(duration, .15) },
      { dot: 'var(--orange)', name: 'Aerobic Base — Steady State',  time: pct(duration, .30) },
      { dot: 'var(--accent)', name: 'Interval Circuits × 4 rounds', time: pct(duration, .30) },
      { dot: 'var(--yellow)', name: 'Lactate Tolerance Drills',     time: pct(duration, .15) },
      { dot: 'var(--green)',  name: 'Cool-down',                    time: pct(duration, .10) },
    ],
    competition: [
      { dot: 'var(--blue)',   name: 'Pre-Game Activation',             time: pct(duration, .22) },
      { dot: 'var(--accent)', name: 'Plyometric Priming × 3 sets',     time: pct(duration, .25) },
      { dot: 'var(--orange)', name: 'Sport-Specific Movement Prep',    time: pct(duration, .28) },
      { dot: 'var(--green)',  name: 'Mental Cue + Team Walk-through',  time: pct(duration, .25) },
    ],
  };

  const blocks = (BLOCKS[type] || BLOCKS.practice).map(b => ({ ...b }));

  const exArr = getExercisesFor(sport, type);
  blocks.forEach((b, i) => {
    const ex = exArr[i % Math.max(1, exArr.length)];
    // ex is an object like { name, sets, reps, load } — format as string
    b.exercises = ex
      ? [applyInjuryFiltersToExercise(`${ex.name} — ${ex.sets}×${ex.reps} @ ${ex.load}`, injuries || [])]
      : [];
  });

  return {
    id: `sess_${Date.now()}`,
    sport,
    type,
    duration,
    intensity,
    title: `${cap(type)} · ${duration} min`,
    typeTag: `${SE[sport] || '🏀'} ${TL[type] || 'Practice'} · ${IL[intensity] || 'Moderate'}${inj}`,
    name: type === 'recovery' ? 'ACTIVE RECOVERY SESSION'
        : type === 'strength' ? 'STRENGTH & POWER BLOCK'
        : type === 'speed' ? 'SPEED & ACCELERATION'
        : type === 'competition' ? 'COMPETITION PREP'
        : type === 'conditioning' ? 'CONDITIONING CIRCUIT'
        : 'FULL PRACTICE SESSION',
    meta: [`⏱ ${duration} min`, `🔥 ${IL[intensity] || 'Moderate'}`, `${SE[sport] || '🏀'} ${cap(sport)}`].join(' · '),
    blocks,
  };
}

export function buildWorkoutCardHTML(session, showActions = true) {
  const blocks = (session.blocks || []).map(b => {
    const ex = Array.isArray(b.exercises) && b.exercises.length
      ? `<div class="block-exercises">${b.exercises.map(x => `<div class="ex-line">• ${x}</div>`).join('')}</div>`
      : '';
    return `<div class="block-item">
      <div class="block-dot" style="background:${b.dot}"></div>
      <div class="block-name">${b.name}${ex}</div>
      <div class="block-time">${b.time} min</div>
    </div>`;
  }).join('');

  const actions = showActions ? `<div style="display:flex;gap:9px;margin-top:14px">
    <button class="btn btn-primary btn-full js-start" style="font-size:13px">▷ Start Session</button>
    <button class="btn btn-ghost js-save" style="font-size:13px">Save</button>
  </div>` : '';

  return `<div class="workout-card">
    <div class="workout-type-tag">${session.typeTag}</div>
    <div class="workout-name">${session.name}</div>
    <div class="workout-meta">${session.meta}</div>
    <div class="block-list">${blocks}</div>
    ${actions}
  </div>`;
}
