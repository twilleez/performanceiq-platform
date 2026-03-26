/**
 * PerformanceIQ Auth  (remediated)
 *
 * Changes from prior version:
 *   1. Non-demo sign-ins now derive a stable, deterministic user ID from the
 *      email address instead of Date.now(). Previously every sign-in created
 *      a new ID, orphaning all state saved under the prior session.
 *   2. signUp() also uses the stable ID derivation for consistency.
 *   3. All other behaviour (demo shortcut, 7-day session, role assignment) is
 *      unchanged.
 */

const SESSION_KEY = 'piq_session_v2';

// ── DEMO USERS ─────────────────────────────────────────────────────────────────
const DEMO_USERS = {
  'coach@demo.com':  { id: 'u_coach',  name: 'Alex Morgan',   role: 'coach',  sport: 'basketball' },
  'player@demo.com': { id: 'u_player', name: 'Jake Williams', role: 'player', sport: 'basketball' },
  'parent@demo.com': { id: 'u_parent', name: 'Maria Chen',    role: 'parent', sport: null },
  'admin@demo.com':  { id: 'u_admin',  name: 'Sam Taylor',    role: 'admin',  sport: null },
  'solo@demo.com':   { id: 'u_solo',   name: 'Jordan Lee',    role: 'solo',   sport: 'track' },
};

// ── SESSION ────────────────────────────────────────────────────────────────────
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

/**
 * Derive a stable, deterministic user ID from an email address.
 * Uses a simple djb2-style hash — not cryptographically secure, but
 * collision-resistant enough for a demo/local-storage context and,
 * crucially, always produces the same ID for the same email so
 * returning users retain their persisted state.
 */
function stableIdFromEmail(email) {
  let hash = 5381;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) + hash) ^ email.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return 'u_' + hash.toString(36);
}

// ── PUBLIC ─────────────────────────────────────────────────────────────────────
export function initAuth()       { loadSession(); }
export function getSession()     { return _session; }
export function isAuthenticated(){ return !!_session; }
export function getCurrentRole() { return _session?.role || null; }
export function getCurrentUser() { return _session?.user || null; }

/**
 * Sign in.
 *   - Demo addresses: fixed user objects, any password accepted.
 *   - All other valid emails: stable deterministic ID derived from email,
 *     role from roleHint (defaults to 'solo').
 */
export async function signIn(email, password, roleHint) {
  email = email.trim().toLowerCase();

  // Demo shortcut
  const demo = DEMO_USERS[email];
  if (demo) {
    const session = { user: demo, role: demo.role, expiresAt: Date.now() + 86400000 * 7 };
    saveSession(session);
    return { ok: true, session };
  }

  // Any valid email — stable ID so returning users keep their data
  if (email && email.includes('@')) {
    const namePart = email.split('@')[0];
    const name     = namePart.split(/[._]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const role     = roleHint || 'solo';
    const user     = { id: stableIdFromEmail(email), name, email, role, sport: null };
    const session  = { user, role, expiresAt: Date.now() + 86400000 * 7 };
    saveSession(session);
    return { ok: true, session };
  }

  return { ok: false, error: 'Please enter a valid email address.' };
}

export async function signUp(email, password, name, role) {
  email = email.trim().toLowerCase();
  if (!email.includes('@')) return { ok: false, error: 'Invalid email.' };
  if (!name.trim())         return { ok: false, error: 'Name is required.' };
  if (!role)                return { ok: false, error: 'Please select a role.' };

  const user    = { id: stableIdFromEmail(email), name: name.trim(), email, role, sport: null };
  const session = { user, role, expiresAt: Date.now() + 86400000 * 7 };
  saveSession(session);
  return { ok: true, session, isNew: true };
}

export function signOut() { saveSession(null); }

/** Update role after pick-role screen */
export function setRole(role) {
  if (!_session) return;
  _session.role      = role;
  _session.user.role = role;
  saveSession(_session);
}

/** Update user profile fields */
export function updateUser(fields) {
  if (!_session) return;
  Object.assign(_session.user, fields);
  saveSession(_session);
}

export function needsOnboarding() { return _session?.user && !_session.user.onboardingDone; }

export function markOnboardingDone(profile) {
  if (!_session) return;
  Object.assign(_session.user, profile, { onboardingDone: true });
  saveSession(_session);
}

export function getInitials() {
  const name = _session?.user?.name || '';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
}
