// ─── Application State ─────────────────────────────────────────────────────
// Single source of truth for all UI and data state.
// Data is fetched from Supabase (or local storage in solo/offline mode).

export const STATE = {
  // Auth
  session: null,        // Supabase session | null (null = solo/guest mode)
  profile: null,        // profiles row | locally-built profile object

  // Mode: "solo" | "connected"
  // Solo mode uses localStorage for all persistence; no Supabase calls.
  mode: "solo",

  // Loaded data
  workout: null,        // today's workout row/object | null
  readiness: null,      // today's readiness_log row | null
  prs: [],              // personal_records[]
  readinessTrend: [],   // last 14 days of readiness_logs
  team: null,           // teams row (if athlete on a team / coach's team)
  teamReadiness: [],    // coach view

  // UI
  ui: {
    tab:                    "today",   // today | session | progress | profile
    teamTab:                "team-home",
    activeSetExerciseId:    null,
    activeSwapExerciseId:   null,
    activeDetailExerciseId: null,
    activeReadinessSheet:   false,
    videoSheetOpen:         false,
    activeVideoUrl:         null,
    onboardingStep:         null,      // null = done, 1-3 = in progress
    loading:                false,
    error:                  null,
    toast:                  null,      // { msg, type: 'success'|'error' }
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────
export function setLoading(val) { STATE.ui.loading = val; }
export function setError(msg)   { STATE.ui.error   = msg; }
export function clearError()    { STATE.ui.error   = null; }

export function setToast(msg, type = "success") {
  STATE.ui.toast = { msg, type };
  setTimeout(() => { STATE.ui.toast = null; }, 3200);
}

export function isCoach()   { return STATE.profile?.role === "coach"; }
export function isAthlete() { return STATE.profile?.role !== "coach"; }
export function isSolo()    { return STATE.mode === "solo"; }
