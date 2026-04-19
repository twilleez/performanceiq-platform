/**
 * PerformanceIQ — core/auth.js
 * Single source of truth for auth state.
 * localStorage-only sessions; Supabase is NOT used here.
 * GitHub Pages static hosting requires this approach.
 */

const SESSION_KEY = 'piq_session_v2';

// ── DEMO USERS ────────────────────────────────────────────────
const DEMO_USERS = {
  'coach@demo.com':  { id: 'u_coach',  name: 'Alex Morgan',   role: 'coach',  sport: 'basketball' },
  'player@demo.com': { id: 'u_player', name: 'Jake Williams', role: 'player', sport: 'basketball' },
  'parent@demo.com': { id: 'u_parent', name: 'Maria Chen',    role: 'parent', sport: null         },
  'admin@demo.com':  { id: 'u_admin',  name: 'Sam Taylor',    role: 'admin',  sport: null         },
  'solo@demo.com':   { id: 'u_solo',   name: 'Jordan Lee',    role: 'solo',   sport: 'track'      },
};

// ── INTERNAL STATE ────────────────────────────────────────────
let _session = null;

function _load() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) _session = JSON.parse(raw);
  } catch (_) { _session = null; }
}

function _save(s) {
  _session = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else   localStorage.removeItem(SESSION_KEY);
  } catch (_) { /* quota / private mode */ }
}

// ── INIT ──────────────────────────────────────────────────────
/** Called once by boot.js — restores session from localStorage. */
export function initAuth() {
  _load();
}

// ── READ ──────────────────────────────────────────────────────
export function getSession()      { return _session; }
export function isAuthenticated() { return !!_session; }
export function getCurrentRole()  { return _session?.role  || null; }
export function getCurrentUser()  { return _session?.user  || null; }

export function getInitials() {
  const name = _session?.user?.name || '';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
}

export function needsOnboarding() {
  return !!_session?.user && !_session.user.onboardingDone;
}

// ── WRITE ─────────────────────────────────────────────────────
/**
 * signIn — demo emails bypass password check.
 * Any other valid email creates a session with the given roleHint.
 */
export async function signIn(email, password, roleHint = 'solo') {
  email = (email || '').trim().toLowerCase();

  // Demo shortcut
  const demo = DEMO_USERS[email];
  if (demo) {
    const session = {
      user: { ...demo },
      role: demo.role,
      expiresAt: Date.now() + 86_400_000 * 7,
    };
    _save(session);
    return { ok: true, session };
  }

  // Generic real-user session (pre-Supabase era)
  if (email.includes('@')) {
    const namePart = email.split('@')[0];
    const name = namePart
      .split(/[._-]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const user = { id: 'u_' + Date.now(), name, email, role: roleHint, sport: null };
    const session = { user, role: roleHint, expiresAt: Date.now() + 86_400_000 * 7 };
    _save(session);
    return { ok: true, session };
  }

  return { ok: false, error: 'Please enter a valid email address.' };
}

export async function signUp(email, password, name, role = 'solo') {
  email = (email || '').trim().toLowerCase();
  if (!email.includes('@')) return { ok: false, error: 'Invalid email.' };
  if (!name?.trim())        return { ok: false, error: 'Name is required.' };
  if (!role)                return { ok: false, error: 'Please select a role.' };

  const user = {
    id: 'u_' + Date.now(),
    name: name.trim(),
    email,
    role,
    sport: null,
  };
  const session = { user, role, expiresAt: Date.now() + 86_400_000 * 7 };
  _save(session);
  return { ok: true, session, isNew: true };
}

export function signOut() {
  _save(null);
}

// ── MUTATORS ──────────────────────────────────────────────────
/** Set / change role (called from pick-role and onboarding). */
export function setRole(role) {
  if (!_session) return;
  _session.role       = role;
  _session.user.role  = role;
  _save(_session);
}

/** Merge arbitrary fields into the user object. */
export function updateUser(fields) {
  if (!_session) return;
  Object.assign(_session.user, fields);
  _save(_session);
}

/** Mark onboarding complete and persist profile. */
export function markOnboardingDone(profile) {
  if (!_session) return;
  Object.assign(_session.user, profile, { onboardingDone: true });
  _save(_session);
}
