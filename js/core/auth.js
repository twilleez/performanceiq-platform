/**
 * PerformanceIQ Auth v2
 * Real Supabase auth for production users.
 * Demo mode preserved: @demo.com emails bypass Supabase entirely,
 * work offline, and never touch the DB.
 */
import { supabase } from './supabase.js';

const SESSION_KEY = 'piq_session_v2';

// ── DEMO USERS ────────────────────────────────────────────────
// These work without Supabase — useful for investor demos and testing.
const DEMO_USERS = {
  'coach@demo.com':  { id: 'u_coach',  name: 'Alex Morgan',   role: 'coach',  sport: 'basketball' },
  'player@demo.com': { id: 'u_player', name: 'Jake Williams', role: 'player', sport: 'basketball' },
  'parent@demo.com': { id: 'u_parent', name: 'Maria Chen',    role: 'parent', sport: null },
  'admin@demo.com':  { id: 'u_admin',  name: 'Sam Taylor',    role: 'admin',  sport: null },
  'solo@demo.com':   { id: 'u_solo',   name: 'Jordan Lee',    role: 'solo',   sport: 'track' },
};

// ── SESSION ───────────────────────────────────────────────────
let _session = null;

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) _session = JSON.parse(raw);
  } catch (_) { _session = null; }
}

function saveSession(s) {
  _session = s;
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else   localStorage.removeItem(SESSION_KEY);
}

// ── PUBLIC API ────────────────────────────────────────────────
export function initAuth()        { loadSession(); }
export function getSession()      { return _session; }
export function isAuthenticated() { return !!_session; }
export function getCurrentRole()  { return _session?.role || null; }
export function getCurrentUser()  { return _session?.user || null; }

/**
 * signIn
 * Demo emails → localStorage only, no network call.
 * Real emails  → Supabase signInWithPassword, profile fetched from DB.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} roleHint — used as fallback if DB profile has no role yet
 * @returns {{ ok: boolean, session?: object, isNew?: boolean, error?: string }}
 */
export async function signIn(email, password, roleHint) {
  email = email.trim().toLowerCase();

  // Demo shortcut — any password accepted
  const demo = DEMO_USERS[email];
  if (demo) {
    const session = {
      user:      { ...demo, onboardingDone: true },
      role:      demo.role,
      expiresAt: Date.now() + 86400000 * 7,
      isDemo:    true,
    };
    saveSession(session);
    return { ok: true, session };
  }

  // Real Supabase auth
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  const sbUser = data.user;

  // Fetch profile row
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name, sport, onboarded')
    .eq('id', sbUser.id)
    .maybeSingle();

  const role      = profile?.role     || roleHint || 'solo';
  const onboarded = profile?.onboarded ?? false;

  const user = {
    id:             sbUser.id,
    name:           profile?.name || sbUser.user_metadata?.name || email.split('@')[0],
    email,
    role,
    sport:          profile?.sport || null,
    onboardingDone: onboarded,
  };

  const session = { user, role, expiresAt: Date.now() + 86400000 * 7 };
  saveSession(session);
  return { ok: true, session, isNew: !onboarded };
}

/**
 * signUp
 * Demo emails → localStorage only.
 * Real emails  → supabase.auth.signUp (handle_new_user trigger creates profile stub).
 *
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @param {string} role
 * @returns {{ ok: boolean, session?: object, isNew?: boolean, error?: string }}
 */
export async function signUp(email, password, name, role) {
  email = email.trim().toLowerCase();
  if (!email.includes('@')) return { ok: false, error: 'Invalid email.' };
  if (!name.trim())         return { ok: false, error: 'Name is required.' };
  if (!role)                return { ok: false, error: 'Please select a role.' };

  // Demo shortcut
  if (DEMO_USERS[email]) {
    const base    = DEMO_USERS[email];
    const user    = { ...base, name: name.trim(), role, onboardingDone: false };
    const session = { user, role, expiresAt: Date.now() + 86400000 * 7, isDemo: true };
    saveSession(session);
    return { ok: true, session, isNew: true };
  }

  // Real Supabase signup
  // role + name passed as user_metadata so handle_new_user trigger can use them
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name.trim(), role } },
  });

  if (error) return { ok: false, error: error.message };

  const sbUser = data.user;
  const user = {
    id:             sbUser.id,
    name:           name.trim(),
    email,
    role,
    sport:          null,
    onboardingDone: false,
  };
  const session = { user, role, expiresAt: Date.now() + 86400000 * 7 };
  saveSession(session);
  return { ok: true, session, isNew: true };
}

/**
 * signOut
 * Clears localStorage session and Supabase session for real users.
 */
export async function signOut() {
  if (!_session?.isDemo) {
    await supabase.auth.signOut().catch(() => {}); // non-fatal if already expired
  }
  saveSession(null);
}

/** Update role in active session (called after pick-role screen) */
export function setRole(role) {
  if (!_session) return;
  _session.role      = role;
  _session.user.role = role;
  saveSession(_session);
}

/** Patch arbitrary fields onto the session user object */
export function updateUser(fields) {
  if (!_session) return;
  Object.assign(_session.user, fields);
  saveSession(_session);
}

/** True if signed in but onboarding not yet completed */
export function needsOnboarding() {
  return _session?.user && !_session.user.onboardingDone;
}

/** Mark onboarding complete and merge profile data into session */
export function markOnboardingDone(profile) {
  if (!_session) return;
  Object.assign(_session.user, profile, { onboardingDone: true });
  saveSession(_session);
}

/** Two-letter initials for avatar display */
export function getInitials() {
  const name = _session?.user?.name || '';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
}
