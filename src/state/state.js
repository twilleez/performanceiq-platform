// ─── UI-only state ─────────────────────────────────────────────────────────
// Data (workouts, readiness, PRs) now lives in Supabase.
// This object tracks only transient UI state and the current session context.
export const STATE = {
  // Auth
  session: null,       // Supabase session object
  profile: null,       // profiles row for current user

  // Loaded data (refreshed from DB on navigation)
  workout: null,       // today's workout row (or null)
  readiness: null,     // today's readiness_log row (or null)
  prs: [],             // personal_records[]
  readinessTrend: [],  // last 14 days of readiness_logs
  team: null,          // teams row (if athlete is on a team, or coach's team)
  teamReadiness: [],   // coach view: today's readiness for all athletes

  // UI
  ui: {
    tab:                    "today",   // today | session | progress | profile
    teamTab:                "team-home",
    activeWorkoutId:        null,      // UUID from DB (not the old string ID)
    activeSetExerciseId:    null,
    activeSwapExerciseId:   null,
    activeDetailExerciseId: null,
    activeReadinessSheet:   false,
    videoSheetOpen:         false,
    activeVideoUrl:         null,
    loading:                false,     // global loading indicator
    error:                  null,      // global error string
    toast:                  null,      // { msg, type: 'success'|'error' }
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────
export function setLoading(val) { STATE.ui.loading = val; }
export function setError(msg)   { STATE.ui.error   = msg; }
export function setToast(msg, type = "success") {
  STATE.ui.toast = { msg, type };
  setTimeout(() => { STATE.ui.toast = null; }, 3000);
}

export function isCoach()   { return STATE.profile?.role === "coach"; }
export function isAthlete() { return STATE.profile?.role === "athlete"; }
