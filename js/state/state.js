// ─── Helpers ──────────────────────────────────────────────────────────────────
// Returns a microcycle array with the real current day marked "today",
// past days marked "done", and future days "upcoming".
function buildMicrocycle() {
  const days = [
    { day:"Mon", label:"Explosive Lower"      },
    { day:"Tue", label:"Recovery + Mobility"  },
    { day:"Wed", label:"Upper Strength"       },
    { day:"Thu", label:"Speed + COD"          },
    { day:"Fri", label:"Flush + Reset"        },
  ];
  // JS: 0=Sun,1=Mon,...,5=Fri,6=Sat. Map to index 0–4 (Mon–Fri).
  const jsDay = new Date().getDay(); // 0–6
  const todayIdx = jsDay === 0 || jsDay === 6 ? -1 : jsDay - 1; // weekend = no match
  return days.map((d, i) => ({
    ...d,
    status: i < todayIdx ? "done" : i === todayIdx ? "today" : "upcoming",
  }));
}

// ─── SCHEMA VERSION – bump when shape changes ─────────────────────────────────
export const SCHEMA_VERSION = 2;

// ─── Default STATE factory (used for fresh starts and deep-merge base) ────────
export function defaultState() {
  return {
    _version: SCHEMA_VERSION,
    mode: "athlete",
    session: { loggedIn: false, user: null },
    ui: {
      tab: "today",
      teamTab: "team-home",
      activeWorkoutId: "w_today",
      activeSetExerciseId: null,
      activeSwapExerciseId: null,
      activeDetailExerciseId: null,
      activeReadinessSheet: false,
      videoSheetOpen: false,
      activeVideoUrl: null,
    },
    athlete: {
      name: "Willie",
      sport: "basketball",
      position: "PG",
      block: "Explosive Foundation",
      week: 3,
      microcycle: buildMicrocycle(),
      equipment: ["dumbbell", "band", "bodyweight"],
      goal: "Power + strength",
      readiness: 82,
      hrv: "Good",
      sleep: 8.1,
      soreness: "Low",
      bodyBattery: 78,
      hydration: "On target",
      streak: 11,
      weeklyVolume: 14,
      mealPlanEnabled: false,
      notes: "Explosive block emphasis. Keep sprint quality high.",
    },
    progress: {
      strength: 76,
      conditioning: 68,
      mobility: 83,
      timeline: [
        { week:"W1", delta:"+2%" },
        { week:"W2", delta:"+3%" },
        { week:"W3", delta:"+4%" },
        { week:"W4", delta:"deload" },
      ],
      prs: [
        { label:"Goblet Squat",   value:"70 lb × 8",  history:[60,62,65,67,70] },
        { label:"10 Yard Sprint", value:"1.82 s",      history:[2.1,2.0,1.95,1.88,1.82] },
        { label:"Vertical Jump",  value:"31.5 in",     history:[28,29,30,30.5,31.5] },
      ],
      insights: [
        "Lower body power is trending up across the last 3 weeks.",
        "Mobility is currently your most stable pillar.",
        "Readiness drops most after back-to-back sprint exposures.",
      ],
    },
    workouts: [{
      id: "w_today",
      title: "Explosive Lower",
      sport: "basketball",
      dayType: "power",
      notes: "Landing mechanics, unilateral force, acceleration.",
      active: true,
      recoveryCue: "Stay crisp. Leave 1 rep in reserve on loaded lower lifts.",
      exercises: [
        { id:"lat_bound",    sets:[{ target:"3 × 5/side", done:false }] },
        { id:"goblet_squat", sets:[{ target:"4 × 6", done:false }, { target:"4 × 6", done:false }] },
        { id:"sl_rdl",       sets:[{ target:"3 × 6/side", done:false }] },
        { id:"sprint10",     sets:[{ target:"4 reps", done:false }] },
        { id:"dead_bug",     sets:[{ target:"3 × 8/side", done:false }] },
      ],
    }],
    team: {
      enabled: true,
      name: "Virginia Trailblazers",
      announcements: [
        "Practice time moved to 6:30 PM.",
        "Recovery emphasis after Saturday game.",
      ],
      coachNotes: [
        "Stay within your target sprint quality today.",
        "Focus on crisp landings and hip stability.",
      ],
      events: {
        Mon:["Practice 6:30 PM"],
        Tue:["Lift 4:00 PM"],
        Wed:["Team Film 7:00 PM"],
        Thu:["Practice 6:30 PM"],
        Fri:["Travel"],
        Sat:["Game 2:00 PM"],
        Sun:["Recovery"],
      },
      leaderboard: [
        { name:"Player One",   metric:"PIQ 88"        },
        { name:"Player Two",   metric:"Readiness 85"  },
        { name:"Player Three", metric:"Streak 12"     },
      ],
      roster: [
        { name:"Player One",  role:"captain", sport:"basketball", pos:"PG"    },
        { name:"Player Two",  role:"athlete", sport:"basketball", pos:"SG"    },
        { name:"Coach Hill",  role:"coach",   sport:"basketball", pos:"Coach" },
      ],
      activity: [
        "Player One hit a new PR.",
        "Attendance milestone reached.",
        "Block 2 completed.",
      ],
    },
  };
}

// ─── Deep-merge: fills missing keys from defaults without wiping existing data ─
function deepMerge(target, source) {
  const out = { ...source };
  for (const key of Object.keys(source)) {
    if (
      key in target &&
      target[key] !== null &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      out[key] = deepMerge(target[key], source[key]);
    } else if (key in target) {
      out[key] = target[key];
    }
  }
  return out;
}

// ─── Live STATE singleton ─────────────────────────────────────────────────────
export const STATE = defaultState();

// ─── Hydrate from localStorage with schema-safe deep merge ───────────────────
export function hydrateState() {
  try {
    const raw = localStorage.getItem("piq_state");
    if (!raw) return;
    const persisted = JSON.parse(raw);
    // If schema changed, wipe and start fresh
    if (persisted._version !== SCHEMA_VERSION) return;
    const merged = deepMerge(persisted, defaultState());
    // Refresh microcycle to today's real date on every load
    merged.athlete.microcycle = buildMicrocycle();
    Object.assign(STATE, merged);
  } catch (e) {
    console.warn("piq: state hydration failed, using defaults.", e);
  }
}
