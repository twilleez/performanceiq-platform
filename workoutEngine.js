/**
 * PerformanceIQ — Auth
 * ─────────────────────────────────────────────────────────────
 * Auth flows, role resolution, and session management.
 * Demo mode: no Supabase required — works entirely in localStorage.
 *
 * SECTIONS
 *  1. Constants & demo registry
 *  2. Session persistence
 *  3. Public read helpers
 *  4. Demo-mode guards  ← NEW
 *  5. Sign-in / sign-up / sign-out
 *  6. Session mutation helpers
 */

// ── 1. CONSTANTS & DEMO REGISTRY ─────────────────────────────

const SESSION_KEY = 'piq_session_v2';

/**
 * Known demo accounts. Any email found here produces a read-only
 * demo session — mutations are blocked by assertNotDemo().
 */
const DEMO_USERS = {
  'coach@demo.com':  { id: 'u_coach',  name: 'Alex Morgan',   role: 'coach',  sport: 'basketball' },
  'player@demo.com': { id: 'u_player', name: 'Jake Williams', role: 'player', sport: 'basketball' },
  'parent@demo.com': { id: 'u_parent', name: 'Maria Chen',    role: 'parent', sport: null },
  'admin@demo.com':  { id: 'u_admin',  name: 'Sam Taylor',    role: 'admin',  sport: null },
  'solo@demo.com':   { id: 'u_solo',   name: 'Jordan Lee',    role: 'solo',   sport: 'track' },
};

// ── 2. SESSION PERSISTENCE ────────────────────────────────────

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

// ── 3. PUBLIC READ HELPERS ────────────────────────────────────

export function initAuth()        { loadSession(); }
export function getSession()      { return _session; }
export function isAuthenticated() { return !!_session; }
export function getCurrentRole()  { return _session?.role ?? null; }
export function getCurrentUser()  { return _session?.user ?? null; }

export function getInitials() {
  const name = _session?.user?.name || '';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
}

// ── 4. DEMO-MODE GUARDS ───────────────────────────────────────

/**
 * Returns true when the active session is a demo account.
 * The `isDemo` flag is stamped onto the session object at sign-in
 * time (see signIn below), so this is a single boolean read — no
 * email-matching at call sites.
 */
export function isDemo() {
  return _session?.isDemo === true;
}

/**
 * Call this at the top of any action that mutates persistent data
 * (log workout, save check-in, edit roster, delete session, etc.).
 *
 * If the current user is in demo mode the function:
 *   • fires a "Protected Mode" toast (info-level, non-alarming)
 *   • returns false so the caller can bail out cleanly
 *
 * If not in demo mode it returns true and the caller proceeds.
 *
 * Usage pattern:
 *   async function handleSaveWorkout() {
 *     if (!assertNotDemo()) return;   // ← guard, no extra logic needed
 *     await saveWorkoutToStorage(…);
 *   }
 *
 * The toast import is lazy so auth.js stays free of circular deps
 * with notification modules that may import auth themselves.
 */
export function assertNotDemo(
  message = '🔒 Demo accounts are read-only. Sign up to save data.',
) {
  if (!isDemo()) return true;

  // Lazy import avoids circular dependency with notifications.js
  import('../core/notifications.js')
    .then(({ showToast }) => showToast(message, 'info', 4000))
    .catch(() => {
      // Fallback if notifications module isn't available yet
      console.warn('[PIQ] Demo guard blocked mutation:', message);
    });

  return false;
}

// ── 5. SIGN-IN / SIGN-UP / SIGN-OUT ──────────────────────────

/**
 * Sign in.
 * • Demo emails → read-only session with isDemo: true
 * • Any other valid email → real session with chosen role
 */
export async function signIn(email, password, roleHint) {
  email = email.trim().toLowerCase();

  // ── Demo path ──────────────────────────────────────────────
  const demoUser = DEMO_USERS[email];
  if (demoUser) {
    const session = {
      user:      demoUser,
      role:      demoUser.role,
      isDemo:    true,                         // ← explicit demo flag
      expiresAt: Date.now() + 86_400_000 * 7, // 7 days
    };
    saveSession(session);
    return { ok: true, session };
  }

  // ── Real-user path ─────────────────────────────────────────
  if (email && email.includes('@')) {
    const namePart = email.split('@')[0];
    const name = namePart
      .split(/[._]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const role = roleHint || 'solo';
    const user = { id: 'u_' + Date.now(), name, email, role, sport: null };
    const session = {
      user,
      role,
      isDemo:    false,
      expiresAt: Date.now() + 86_400_000 * 7,
    };
    saveSession(session);
    return { ok: true, session };
  }

  return { ok: false, error: 'Please enter a valid email address.' };
}

/**
 * Sign up — always creates a real (non-demo) account.
 */
export async function signUp(email, password, name, role) {
  email = email.trim().toLowerCase();

  if (!email.includes('@')) return { ok: false, error: 'Invalid email.' };
  if (!name.trim())         return { ok: false, error: 'Name is required.' };
  if (!role)                return { ok: false, error: 'Please select a role.' };

  const user = { id: 'u_' + Date.now(), name: name.trim(), email, role, sport: null };
  const session = {
    user,
    role,
    isDemo:    false,
    expiresAt: Date.now() + 86_400_000 * 7,
  };
  saveSession(session);
  return { ok: true, session, isNew: true };
}

export function signOut() {
  saveSession(null);
}

// ── 6. SESSION MUTATION HELPERS ───────────────────────────────

/** Update role after pick-role screen. */
export function setRole(role) {
  if (!_session) return;
  _session.role      = role;
  _session.user.role = role;
  saveSession(_session);
}

/** Merge arbitrary fields into the user object. */
export function updateUser(fields) {
  if (!_session) return;
  Object.assign(_session.user, fields);
  saveSession(_session);
}

/** Returns true if the session hasn't completed onboarding. */
export function needsOnboarding() {
  return _session?.user && !_session.user.onboardingDone;
}

/** Mark onboarding complete and merge profile data. */
export function markOnboardingDone(profile) {
  if (!_session) return;
  Object.assign(_session.user, profile, { onboardingDone: true });
  saveSession(_session);
}
