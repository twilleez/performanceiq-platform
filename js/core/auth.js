/**
 * PerformanceIQ Auth — Dual Mode
 *
 * DEMO MODE:  Known demo emails (coach@demo.com etc.) use localStorage only.
 *             No Supabase calls. Works offline. Safe for stakeholder demos.
 *
 * REAL MODE:  Any other email hits Supabase Auth + profiles table.
 *             Session persisted by Supabase client (IndexedDB/localStorage).
 *
 * Consumers of this module call the same functions regardless of mode.
 * The mode switch is invisible to the rest of the app.
 */

import { supabase }                from '../services/supabase.js';
import { signInWithSupabase,
         signUpWithSupabase,
         signOutFromSupabase,
         getProfile,
         updateProfile,
         onAuthStateChange }       from '../services/authService.js';

// ── CONSTANTS ─────────────────────────────────────────────────
const SESSION_KEY = 'piq_session_v2';

const DEMO_USERS = {
  'coach@demo.com':  { id: 'u_coach',  name: 'Alex Morgan',   role: 'coach',  sport: 'basketball' },
  'player@demo.com': { id: 'u_player', name: 'Jake Williams', role: 'player', sport: 'basketball' },
  'parent@demo.com': { id: 'u_parent', name: 'Maria Chen',    role: 'parent', sport: null },
  'admin@demo.com':  { id: 'u_admin',  name: 'Sam Taylor',    role: 'admin',  sport: null },
  'solo@demo.com':   { id: 'u_solo',   name: 'Jordan Lee',    role: 'solo',   sport: 'track' },
};

// ── SESSION STATE ─────────────────────────────────────────────
let _session    = null;   // { user, role, expiresAt, isDemo, supabaseSession }
let _profile    = null;   // Full Supabase profile row (null in demo mode)
let _listeners  = [];     // onAuthStateChange callbacks

// ── HELPERS ───────────────────────────────────────────────────
function _isDemoEmail(email) {
  return Object.prototype.hasOwnProperty.call(DEMO_USERS, email.toLowerCase().trim());
}

function _loadLocalSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) _session = JSON.parse(raw);
  } catch (_) {
    _session = null;
  }
}

function _saveLocalSession(s) {
  _session = s;
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else   localStorage.removeItem(SESSION_KEY);
}

function _notify() {
  _listeners.forEach(fn => {
    try { fn(_session); } catch (e) { console.error('[PIQ] auth listener error:', e); }
  });
}

// ── INIT ──────────────────────────────────────────────────────
/**
 * Called once by boot.js.
 * Restores demo session from localStorage OR real session from Supabase.
 */
export async function initAuth() {
  // 1. Try restoring a demo session
  _loadLocalSession();
  if (_session?.isDemo) {
    _notify();
    return;
  }

  // 2. Try restoring a real Supabase session
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      const prof = await getProfile(data.session.user.id);
      _profile = prof;
      _session = _buildRealSession(data.session, prof);
      _saveLocalSession(_session);
      _notify();
      return;
    }
  } catch (e) {
    console.warn('[PIQ] Supabase session restore failed, continuing in demo mode:', e);
  }

  // 3. No session found — clear everything
  _saveLocalSession(null);
  _notify();

  // 4. Listen for future Supabase auth changes (sign in from another tab etc.)
  onAuthStateChange(async (event, supaSession) => {
    if (event === 'SIGNED_IN' && supaSession && !_session?.isDemo) {
      const prof = await getProfile(supaSession.user.id);
      _profile = prof;
      _session = _buildRealSession(supaSession, prof);
      _saveLocalSession(_session);
      _notify();
    }
    if (event === 'SIGNED_OUT' && !_session?.isDemo) {
      _session  = null;
      _profile  = null;
      _saveLocalSession(null);
      _notify();
    }
  });
}

// ── SIGN IN ───────────────────────────────────────────────────
/**
 * Demo emails: localStorage only, any password accepted.
 * Real emails:  Supabase signInWithPassword.
 */
export async function signIn(email, password, roleHint) {
  email = email.trim().toLowerCase();

  // ── DEMO PATH ─────────────────────────────────────────────
  if (_isDemoEmail(email)) {
    const demo = DEMO_USERS[email];
    const session = {
      isDemo:    true,
      user:      demo,
      role:      demo.role,
      expiresAt: Date.now() + 86400000 * 7,
    };
    _saveLocalSession(session);
    _notify();
    return { ok: true, session };
  }

  // ── REAL PATH ─────────────────────────────────────────────
  // New user with no account yet — auto-create one
  if (!password || password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }

  const result = await signInWithSupabase(email, password);

  if (!result.ok) {
    // If user doesn't exist yet, try signing them up automatically
    if (result.error?.includes('Invalid login') || result.error?.includes('Email not confirmed')) {
      return { ok: false, error: result.error };
    }
    return { ok: false, error: result.error };
  }

  _profile = result.profile;
  _session = _buildRealSession(result.session, result.profile, roleHint);
  _saveLocalSession(_session);
  _notify();
  return { ok: true, session: _session };
}

// ── SIGN UP ───────────────────────────────────────────────────
export async function signUp(email, password, name, role) {
  email = email.trim().toLowerCase();

  if (!email.includes('@')) return { ok: false, error: 'Invalid email.' };
  if (!name.trim())          return { ok: false, error: 'Name is required.' };
  if (!role)                 return { ok: false, error: 'Please select a role.' };

  // Demo emails cannot be used for real sign-up
  if (_isDemoEmail(email)) {
    return { ok: false, error: 'That email is reserved for demo accounts. Use a different email.' };
  }

  if (!password || password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }

  const result = await signUpWithSupabase(email, password, name, role);

  if (!result.ok) return { ok: false, error: result.error };

  // Supabase may require email confirmation — handle gracefully
  if (!result.session) {
    return {
      ok:      true,
      isNew:   true,
      needsConfirmation: true,
      message: 'Check your email to confirm your account, then sign in.',
    };
  }

  const prof = await getProfile(result.user.id);
  _profile  = prof;
  _session  = _buildRealSession(result.session, prof);
  _saveLocalSession(_session);
  _notify();
  return { ok: true, session: _session, isNew: true };
}

// ── SIGN OUT ──────────────────────────────────────────────────
export async function signOut() {
  if (_session?.isDemo) {
    // Demo: just clear localStorage
    _saveLocalSession(null);
    _profile = null;
    _notify();
    return;
  }

  // Real: sign out from Supabase + clear local
  await signOutFromSupabase();
  _saveLocalSession(null);
  _profile = null;
  _notify();
}

// ── PUBLIC GETTERS ────────────────────────────────────────────
export function getSession()       { return _session; }
export function isAuthenticated()  { return !!_session; }
export function getCurrentRole()   { return _session?.role || null; }
export function isDemo()           { return _session?.isDemo === true; }

export function getCurrentUser() {
  if (!_session) return null;
  // Merge local session user with full Supabase profile if available
  return _profile
    ? { ..._session.user, ..._profileToUser(_profile) }
    : _session.user;
}

export function getInitials() {
  const name = getCurrentUser()?.name || '';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
}

// ── PROFILE UPDATES ───────────────────────────────────────────
/**
 * Updates both local session and Supabase profile (real mode only).
 */
export async function updateUser(fields) {
  if (!_session) return;

  // Always update local session
  Object.assign(_session.user, fields);
  _saveLocalSession(_session);

  // Also push to Supabase if real user
  if (!_session.isDemo && _session.user?.id && !_session.user.id.startsWith('u_')) {
    await updateProfile(_session.user.id, _supabaseFields(fields));
  }
}

export function setRole(role) {
  if (!_session) return;
  _session.role      = role;
  _session.user.role = role;
  _saveLocalSession(_session);
}

export function needsOnboarding() {
  return _session?.user && !_session.user.onboardingDone;
}

export function markOnboardingDone(profile) {
  if (!_session) return;
  Object.assign(_session.user, profile, { onboardingDone: true });
  _saveLocalSession(_session);

  // Push to Supabase async (non-blocking)
  if (!_session.isDemo && _session.user?.id && !_session.user.id.startsWith('u_')) {
    updateProfile(_session.user.id, {
      ..._supabaseFields(profile),
      onboarding_done: true,
    }).catch(e => console.error('[PIQ] onboarding sync error:', e));
  }
}

// ── AUTH STATE SUBSCRIPTION ───────────────────────────────────
export function subscribeToAuth(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

// ── PRIVATE HELPERS ───────────────────────────────────────────
function _buildRealSession(supaSession, profile, roleHint) {
  const role = profile?.role || roleHint || 'solo';
  return {
    isDemo:          false,
    supabaseSession: supaSession,
    user: {
      id:              supaSession.user.id,
      email:           supaSession.user.email,
      name:            profile?.name || supaSession.user.user_metadata?.name || '',
      role,
      sport:           profile?.sport || null,
      onboardingDone:  profile?.onboarding_done || false,
    },
    role,
    expiresAt: supaSession.expires_at
      ? supaSession.expires_at * 1000
      : Date.now() + 86400000 * 7,
  };
}

// Maps app user fields → Supabase profiles columns
function _supabaseFields(fields) {
  const map = {
    name:           'name',
    email:          'email',
    sport:          'sport',
    position:       'sport_position',
    team:           'team_name',
    compPhase:      'comp_phase',
    trainingLevel:  'training_level',
    daysPerWeek:    'days_per_week',
    weightLbs:      'weight_lbs',
    heightFt:       'height_ft',
    heightIn:       'height_in',
    age:            'age',
    gradYear:       'grad_year',
    sleepHours:     'sleep_hours',
    injuryHistory:  'injury_history',
    primaryGoal:    'primary_goal',
    secondaryGoals: 'secondary_goals',
    onboardingDone: 'onboarding_done',
  };
  const out = {};
  for (const [appKey, dbKey] of Object.entries(map)) {
    if (fields[appKey] !== undefined) out[dbKey] = fields[appKey];
  }
  return out;
}

// Maps Supabase profile row → app user shape
function _profileToUser(profile) {
  return {
    id:             profile.id,
    email:          profile.email,
    name:           profile.name,
    role:           profile.role,
    sport:          profile.sport,
    position:       profile.sport_position,
    team:           profile.team_name,
    onboardingDone: profile.onboarding_done,
    piqScore:       profile.piq_score,
    readiness:      profile.readiness_score,
    streak:         profile.streak_days,
  };
}
