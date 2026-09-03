/**
 * PerformanceIQ Auth v6
 * Supabase is authoritative for production sessions.
 * Demo mode remains local/offline and never touches the database.
 */
import { supabase } from './supabase.js';

const SESSION_KEY = 'piq_session_v2';
const ALLOWED_PUBLIC_ROLES = ['coach', 'player', 'parent', 'solo'];

const DEMO_USERS = {
  'coach@demo.com':  { id: 'u_coach',  name: 'Alex Morgan',   role: 'coach',  sport: 'basketball' },
  'player@demo.com': { id: 'u_player', name: 'Jake Williams', role: 'player', sport: 'basketball' },
  'parent@demo.com': { id: 'u_parent', name: 'Maria Chen',    role: 'parent', sport: null },
  'admin@demo.com':  { id: 'u_admin',  name: 'Sam Taylor',    role: 'admin',  sport: null },
  'solo@demo.com':   { id: 'u_solo',   name: 'Jordan Lee',    role: 'solo',   sport: 'track' },
};

const DEMO_BY_ROLE = Object.values(DEMO_USERS).reduce((acc, user) => {
  acc[user.role] = user;
  return acc;
}, {});

let _session = null;

function appReturnUrl() {
  // GitHub Pages hosts PIQ under /performanceiq-platform/. Keeping the current
  // pathname also makes local/staging deployments work without hardcoding a host.
  const base = `${window.location.origin}${window.location.pathname}`;
  return base.endsWith('/') ? base : `${base}/`;
}

function saveSession(s) {
  _session = s;
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    _session = raw ? JSON.parse(raw) : null;
    if (_session?.expiresAt && _session.expiresAt <= Date.now()) saveSession(null);
  } catch (_) {
    saveSession(null);
  }
}

function makeDemoSession(demo, onboardingDone = true) {
  return {
    user: { ...demo, onboardingDone },
    role: demo.role,
    expiresAt: Date.now() + 86400000 * 7,
    isDemo: true,
  };
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, name, sport, onboarded')
    .eq('id', userId)
    .maybeSingle();
  if (error) return { profile: null, error };
  return { profile: data, error: null };
}

async function fetchProfileWithRetry(userId, attempts = 6) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    const res = await fetchProfile(userId);
    if (res.profile) return res;
    lastError = res.error;
    if (i < attempts - 1) await new Promise(resolve => setTimeout(resolve, 175 * (i + 1)));
  }
  return { profile: null, error: lastError };
}

async function adoptSupabaseSession(sbSession, cachedUser = null) {
  const sbUser = sbSession?.user;
  if (!sbUser?.id) {
    saveSession(null);
    return false;
  }

  const { profile, error: profileError } = await fetchProfileWithRetry(sbUser.id);
  if (profileError || !profile) {
    saveSession(null);
    return false;
  }

  const role = profile.role || sbUser.user_metadata?.role || cachedUser?.role || 'solo';
  const user = {
    ...(cachedUser || {}),
    id: sbUser.id,
    email: sbUser.email || cachedUser?.email || '',
    name: profile.name || sbUser.user_metadata?.name || cachedUser?.name || sbUser.email?.split('@')[0] || '',
    role,
    sport: profile.sport || null,
    onboardingDone: profile.onboarded ?? false,
  };

  saveSession({
    user,
    role,
    expiresAt: sbSession.expires_at ? sbSession.expires_at * 1000 : Date.now() + 3600000,
  });
  return true;
}

export function initAuth() { loadSession(); }
export function getSession() { return _session; }
export function isAuthenticated() { return !!_session; }
export function getCurrentRole() { return _session?.role || null; }
export function getCurrentUser() { return _session?.user || null; }
export function clearAuthSession() { saveSession(null); }

/** Deterministic offline demo start. No network request and no password path. */
export function startDemo(role) {
  const normalized = role === 'athlete' ? 'player' : role;
  const demo = DEMO_BY_ROLE[normalized];
  if (!demo) return { ok: false, error: 'Unknown demo role.' };
  const session = makeDemoSession(demo, true);
  saveSession(session);
  return { ok: true, session };
}

/**
 * Reconcile the local PIQ cache with Supabase. A confirmation link can establish
 * a valid Supabase session before PerformanceIQ has any local session; adopt it.
 */
export async function reconcileSupabaseSession() {
  if (_session?.isDemo) return true;

  const { data, error } = await supabase.auth.getSession();
  const sbSession = data?.session;
  if (error || !sbSession?.user) {
    if (_session) saveSession(null);
    return false;
  }

  if (_session?.user?.id && sbSession.user.id !== _session.user.id) saveSession(null);
  return adoptSupabaseSession(sbSession, _session?.user || null);
}

export async function syncSupabaseSession() {
  if (_session?.isDemo) return true;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session) return false;
  return adoptSupabaseSession(data.session, _session?.user || null);
}

export async function signIn(email, password, roleHint) {
  email = email.trim().toLowerCase();

  const demo = DEMO_USERS[email];
  if (demo) return startDemo(demo.role);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const message = /invalid login credentials/i.test(error.message)
      ? 'Email or password is incorrect. If you previously tried to create an account with this email, use Forgot password to set a new password.'
      : error.message;
    return { ok: false, error: message };
  }

  const sbUser = data.user;
  const { profile, error: profileError } = await fetchProfileWithRetry(sbUser.id);
  if (profileError || !profile) {
    await supabase.auth.signOut().catch(() => {});
    return { ok: false, error: 'Your account signed in, but the PerformanceIQ profile could not be loaded. Please try again.' };
  }

  const role = profile.role || roleHint || 'solo';
  const onboarded = profile.onboarded ?? false;
  const user = {
    id: sbUser.id,
    name: profile.name || sbUser.user_metadata?.name || email.split('@')[0],
    email,
    role,
    sport: profile.sport || null,
    onboardingDone: onboarded,
  };

  const session = {
    user,
    role,
    expiresAt: data.session?.expires_at ? data.session.expires_at * 1000 : Date.now() + 3600000,
  };
  saveSession(session);
  return { ok: true, session, isNew: !onboarded };
}

export async function signUp(email, password, name, role) {
  email = email.trim().toLowerCase();
  const cleanName = name?.trim() || '';
  if (!email.includes('@')) return { ok: false, error: 'Enter a valid email address.' };
  if (!password || password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
  if (!cleanName) return { ok: false, error: 'Name is required.' };
  if (!ALLOWED_PUBLIC_ROLES.includes(role)) return { ok: false, error: 'Please select a valid account type.' };

  if (DEMO_USERS[email]) {
    const base = DEMO_USERS[email];
    const user = { ...base, name: cleanName, role, onboardingDone: false };
    const session = { user, role, expiresAt: Date.now() + 86400000 * 7, isDemo: true };
    saveSession(session);
    return { ok: true, session, isNew: true };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: cleanName, full_name: cleanName, role },
      emailRedirectTo: appReturnUrl(),
    },
  });
  if (error) return { ok: false, error: error.message };

  // With email confirmation enabled Supabase deliberately makes repeated-signup
  // responses non-enumerable. identities=[] is the documented signal returned
  // by current GoTrue builds for an already-registered identity. Do not pretend
  // that we changed the existing password or that a new account was created.
  const identities = data.user?.identities;
  const possiblyExisting = Array.isArray(identities) && identities.length === 0;

  if (!data.session) {
    saveSession(null);
    return {
      ok: true,
      isNew: !possiblyExisting,
      possiblyExisting,
      requiresEmailConfirmation: !possiblyExisting,
      needsAccountRecovery: possiblyExisting,
    };
  }

  const sbUser = data.user;
  if (!sbUser?.id) return { ok: false, error: 'Account creation did not return a valid user. Please try again.' };

  const adopted = await adoptSupabaseSession(data.session, {
    id: sbUser.id,
    name: cleanName,
    email,
    role,
    sport: null,
    onboardingDone: false,
  });
  if (!adopted) {
    return { ok: false, error: 'Account was created, but the profile is still initializing. Please sign in again in a few seconds.' };
  }
  return { ok: true, session: _session, isNew: true };
}

export async function resendSignupConfirmation(email) {
  const cleanEmail = email.trim().toLowerCase();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: cleanEmail,
    options: { emailRedirectTo: appReturnUrl() },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function requestPasswordReset(email) {
  const cleanEmail = email.trim().toLowerCase();
  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${appReturnUrl()}#/reset-password`,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updatePassword(newPassword) {
  if (!newPassword || newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut() {
  if (!_session?.isDemo) await supabase.auth.signOut().catch(() => {});
  saveSession(null);
}

export function setRole(role) {
  if (!_session) return;
  _session.role = role;
  _session.user.role = role;
  saveSession(_session);
}

export function updateUser(fields) {
  if (!_session) return;
  Object.assign(_session.user, fields);
  saveSession(_session);
}

export function needsOnboarding() {
  return !!(_session?.user && !_session.user.onboardingDone);
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
