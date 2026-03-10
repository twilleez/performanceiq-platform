// state.js
import { loadLocalState, saveLocalState } from "../services/storage.js";

const base = {
  boot: {
    mode: "local-fallback",
    diagnostics: []
  },
  session: {
    loggedIn: false,
    user:     null,
    role:     "coach",
    userId:   null
  },
  ui: {
    view:            "dashboard",
    activeAthleteId: null
  },
  team: {
    id:       null,
    name:     "No Team Loaded",
    joinCode: ""
  },
  roster:  [],
  summary: {
    piq:          0,
    readiness:    0,
    weeklyLoad:   0,
    atRisk:       0,
    athleteCount: 0
  },
  setup: {
    schemaAligned:      true,
    workoutTablesAdded: true,
    foreignKeysFixed:   true
  }
};

export function initState() {
  return loadLocalState() || structuredClone(base);
}

export function persist(state) {
  saveLocalState(state);
}
