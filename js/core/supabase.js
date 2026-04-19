/**
 * PerformanceIQ — core/supabase.js
 *
 * Supabase is used ONLY for database queries and file storage.
 * Auth is handled exclusively by core/auth.js + localStorage.
 *
 * Reasons:
 *  1. GitHub Pages has no server; localStorage sessions are correct.
 *  2. supabase.auth.onAuthStateChange() creates a second listener loop
 *     that conflicts with app.js's onRouteChange.
 *  3. isAuthed() in this file was dead code — app.js never called it.
 *
 * If/when native Supabase auth is enabled (post-Capacitor migration),
 * add a thin bridge here that calls core/auth.js's saveSession() so
 * the rest of the app remains unchanged.
 */

// ── CONFIG ────────────────────────────────────────────────────
const SUPABASE_URL = typeof window !== 'undefined'
  ? (window.__PIQ_SUPABASE_URL__ || '')
  : '';
const SUPABASE_ANON_KEY = typeof window !== 'undefined'
  ? (window.__PIQ_SUPABASE_ANON_KEY__ || '')
  : '';

// ── CLIENT ────────────────────────────────────────────────────
let _client = null;

/**
 * Returns the Supabase JS client, or null if config is absent.
 * All DB helpers below call this — they silently no-op when
 * Supabase is not configured (demo / offline mode).
 */
export function getSupabase() {
  if (_client) return _client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    // Supabase JS v2 loaded via CDN in index.html
    const { createClient } = window.supabase;
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Disable Supabase's own session persistence — we own the session
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch (err) {
    console.warn('[PIQ] Supabase client init failed:', err);
    _client = null;
  }

  return _client;
}

/** True only when the Supabase client is available. */
export function isSupabaseReady() {
  return !!getSupabase();
}

// ── DB HELPERS ────────────────────────────────────────────────
// All helpers return { data, error } — same shape as raw Supabase calls.
// Callers should check `error` before using `data`.

/**
 * Upsert a user profile row.
 * Table: profiles  |  PK: id (user id from core/auth.js session)
 */
export async function upsertProfile(profile) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error('Supabase not configured') };
  return sb.from('profiles').upsert(profile, { onConflict: 'id' });
}

/**
 * Fetch a single profile by user id.
 */
export async function fetchProfile(userId) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error('Supabase not configured') };
  return sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
}

/**
 * Fetch teams the current user belongs to.
 * Uses athlete_id (not user_id — see team_members schema).
 */
export async function fetchMyTeams(userId) {
  const sb = getSupabase();
  if (!sb) return { data: [], error: new Error('Supabase not configured') };
  return sb
    .from('team_members')
    .select('team_id, role, jersey, teams(*)')
    .eq('athlete_id', userId);
}

/**
 * Fetch all athletes on a team (coach view).
 * RLS: caller must own or coach the team.
 */
export async function fetchTeamRoster(teamId) {
  const sb = getSupabase();
  if (!sb) return { data: [], error: new Error('Supabase not configured') };
  return sb
    .from('team_members')
    .select('athlete_id, role, jersey, profiles(*)')
    .eq('team_id', teamId);
}

/**
 * Log a training session.
 * Table: sessions
 */
export async function logSession(sessionData) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error('Supabase not configured') };
  return sb.from('sessions').insert(sessionData);
}

/**
 * Fetch recent sessions for a user, newest first.
 */
export async function fetchRecentSessions(userId, limit = 14) {
  const sb = getSupabase();
  if (!sb) return { data: [], error: new Error('Supabase not configured') };
  return sb
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .limit(limit);
}

/**
 * Upsert a daily readiness / wellness check-in.
 * Table: readiness_logs  |  unique on (user_id, log_date)
 */
export async function upsertReadiness(entry) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error('Supabase not configured') };
  return sb
    .from('readiness_logs')
    .upsert(entry, { onConflict: 'user_id,log_date' });
}
