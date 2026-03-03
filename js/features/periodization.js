// /js/features/periodization.js
// Simple 4-week periodization generator (offline-first).

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function startOfNextWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 Sun..6 Sat
  const diff = (8 - day) % 7; // days until next Monday
  d.setDate(d.getDate() + (diff || 7));
  return d;
}

function templateFor(season = "pre", sport = "basketball") {
  const s = String(season || "").toLowerCase();
  // volume/intensity targets are relative; views can interpret.
  if (s.includes("in")) {
    return {
      name: `${sport} In-Season (4-week)` ,
      weeks: [
        { focus: "Maintain strength + speed", volume: 0.75, intensity: 0.85 },
        { focus: "Taper & sharpen", volume: 0.65, intensity: 0.90 },
        { focus: "Game density management", volume: 0.60, intensity: 0.85 },
        { focus: "Recover + re-load", volume: 0.70, intensity: 0.80 },
      ],
    };
  }
  if (s.includes("post")) {
    return {
      name: `${sport} Post-Season (4-week)` ,
      weeks: [
        { focus: "Deload + restore", volume: 0.50, intensity: 0.60 },
        { focus: "Rebuild capacity", volume: 0.70, intensity: 0.70 },
        { focus: "Strength emphasis", volume: 0.80, intensity: 0.80 },
        { focus: "Power & speed", volume: 0.75, intensity: 0.90 },
      ],
    };
  }
  // default pre-season
  return {
    name: `${sport} Pre-Season (4-week)` ,
    weeks: [
      { focus: "Base conditioning + movement", volume: 0.85, intensity: 0.70 },
      { focus: "Strength + skill volume", volume: 0.90, intensity: 0.75 },
      { focus: "Power + game-speed", volume: 0.80, intensity: 0.85 },
      { focus: "Taper into competition", volume: 0.65, intensity: 0.90 },
    ],
  };
}

function sessionsForWeek(week, sport) {
  // A simple weekly microcycle.
  const base = [
    { day: "Mon", type: "Strength", minutes: 60 },
    { day: "Tue", type: "Skill", minutes: 75 },
    { day: "Wed", type: "Conditioning", minutes: 45 },
    { day: "Thu", type: "Strength", minutes: 50 },
    { day: "Fri", type: "Game-speed", minutes: 60 },
    { day: "Sat", type: "Recovery", minutes: 30 },
    { day: "Sun", type: "Off", minutes: 0 },
  ];
  // Slight sport-specific labels.
  if (String(sport).toLowerCase().includes("soccer")) {
    base[4].type = "Tactical + speed";
    base[1].type = "Technical";
  }
  if (String(sport).toLowerCase().includes("football")) {
    base[1].type = "Position skill";
    base[4].type = "Speed + contact prep";
  }
  return base.map((s) => ({
    ...s,
    loadTarget: Math.round(100 * week.volume * (s.minutes / 75) * (0.6 + 0.5 * week.intensity)),
  }));
}

export function generatePeriodization({ seasonPhase = "pre", sport = "basketball", startDateISO } = {}) {
  const tpl = templateFor(seasonPhase, sport);
  const start = startDateISO ? new Date(startDateISO) : startOfNextWeek(new Date());
  const weeks = tpl.weeks.map((w, i) => {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + i * 7);
    const sessions = sessionsForWeek(w, sport);
    return {
      week: i + 1,
      start: isoDate(weekStart),
      focus: w.focus,
      volume: w.volume,
      intensity: w.intensity,
      sessions,
    };
  });
  return { name: tpl.name, sport, seasonPhase, start: isoDate(start), weeks };
}
