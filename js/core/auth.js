/**
 * PerformanceIQ Auth  (remediated + assertNotDemo added)
 *
 * Changes from prior version:
 *   1. assertNotDemo() added — required by storage.js guardedSaveToStorage()
 *      and guardedRemoveFromStorage(). Was referenced but never implemented,
 *      causing a hard SyntaxError crash on app load.
 *
 *   2. isDemo() helper exported — returns true when the active session
 *      belongs to one of the fixed demo accounts.
 *
 *   3. Stable deterministic user ID from email hash (from prior remediation).
 *      Non-demo sign-ins no longer create a new ID on every login.
 *
 * assertNotDemo() contract:
 *   - Returns true  → caller may proceed with the write/delete
 *   - Returns false → user is in demo mode; shows a toast and blocks the op
 *   - Demo mode = session user ID is one of the 5 fixed demo IDs
 */

const SESSION_KEY = 'piq_session_v2';

// ── DEMO USER IDs ──────────────────────────────────────────────────────────────
// Checked at runtime by assertNotDemo() — do not add real user IDs here.
const DEMO_IDS = new Set(['u_coach', 'u_player', 'u_parent', 'u_admin', 'u_solo']);

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
 * djb2-style hash — always produces the same ID for the same email
 * so returning users retain their persisted state across sessions.
 */
function stableIdFromEmail(email) {
  let hash = 5381;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) + hash) ^ email.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return 'u_' + hash.toString(36);
}

// ── PUBLIC AUTH ────────────────────────────────────────────────────────────────
export function initAuth()        { loadSession(); }
export function getSession()      { return _session; }
export function isAuthenticated() { return !!_session; }
export function getCurrentRole()  { return _session?.role || null; }
export function getCurrentUser()  { return _session?.user || null; }

/** Returns true when the active session is one of the 5 demo accounts. */
export function isDemo() {
  return !!(_session?.user?.id && DEMO_IDS.has(_session.user.id));
}

/**
 * assertNotDemo — gate function called by storage.js guarded helpers.
 *
 * Returns true  if the current session is a real (non-demo) user — caller
 *               may proceed with the localStorage write or delete.
 * Returns false if the session is a demo account — shows a toast and
 *               signals the caller to abort the operation.
 *
 * Uses a dynamic import for toast() so there is no circular dependency
 * at boot time (auth.js loads before the component layer is ready).
 *
 * @param {string} [message]  Optional custom toast message for context.
 * @returns {boolean}
 */
export function assertNotDemo(message) {
  if (!isDemo()) return true;

  const msg = message || 'Create a free account to save your data.';

  // Lazy-load toast to avoid circular import at boot — fire-and-forget
  import('../components/toast.js')
    .then(m => m.toast(msg, 'warning'))
    .catch(() => console.warn('[PIQ demo guard]', msg));

  return false;
}

// ── SIGN IN / SIGN UP ──────────────────────────────────────────────────────────

/**
 * Sign in.
 *   - Demo addresses (x@demo.com): fixed user objects, any password accepted.
 *   - All other valid emails: stable deterministic ID derived from email hash
 *     so returning users keep their persisted state across sessions.
 */
export async function signIn(email, password, roleHint) {
  email = email.trim().toLowerCase();

  const demo = DEMO_USERS[email];
  if (demo) {
    const session = { user: demo, role: demo.role, expiresAt: Date.now() + 86400000 * 7 };
    saveSession(session);
    return { ok: true, session };
  }

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

export function setRole(role) {
  if (!_session) return;
  _session.role      = role;
  _session.user.role = role;
  saveSession(_session);
}

export function updateUser(fields) {
  if (!_session) return;
  Object.assign(_session.user, fields);
  saveSession(_session);
}

export function needsOnboarding() {
  return _session?.user && !_session.user.onboardingDone;
}

export function markOnboardingDone(profile) {
  if (!_session) return;
  Object.assign(_session.user, profile, { onboardingDone: true });
  saveSession(_session);
}

export function getInitials() {
  const name = _session?.user?.name || '';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
}
