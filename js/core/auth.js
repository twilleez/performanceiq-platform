/**
 * PerformanceIQ Auth v4
 * Supabase is authoritative for production sessions.
 * Demo mode remains local/offline and never touches the database.
 */
import { supabase } from './supabase.js';

const SESSION_KEY = 'piq_session_v2';

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

export async function reconcileSupabaseSession() {
  if (!_session || _session.isDemo) return true;

  const { data, error } = await supabase.auth.getSession();
  const sbSession = data?.session;
  if (error || !sbSession?.user || sbSession.user.id !== _session.user?.id) {
    saveSession(null);
    return false;
  }

  const { profile, error: profileError } = await fetchProfile(sbSession.user.id);
  if (profileError || !profile) {
    saveSession(null);
    return false;
  }

  const role = profile.role;
  const user = {
    ..._session.user,
    id: sbSession.user.id,
    email: sbSession.user.email || _session.user?.email || '',
    name: profile.name || sbSession.user.user_metadata?.name || _session.user?.name || '',
    role,
    sport: profile.sport || null,
    onboardingDone: profile.onboarded ?? false,
  };

  saveSession({
    ..._session,
    user,
    role,
    expiresAt: sbSession.expires_at ? sbSession.expires_at * 1000 : Date.now() + 3600000,
  });
  return true;
}

export async function signIn(email, password, roleHint) {
  email = email.trim().toLowerCase();

  const demo = DEMO_USERS[email];
  if (demo) return startDemo(demo.role);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  const sbUser = data.user;
  const { profile, error: profileError } = await fetchProfile(sbUser.id);
  if (profileError) {
    await supabase.auth.signOut().catch(() => {});
    return { ok: false, error: 'Your account was authenticated, but the profile could not be loaded.' };
  }

  const role = profile?.role || roleHint || 'solo';
  const onboarded = profile?.onboarded ?? false;
  const user = {
    id: sbUser.id,
    name: profile?.name || sbUser.user_metadata?.name || email.split('@')[0],
    email,
    role,
    sport: profile?.sport || null,
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
  if (!email.includes('@')) return { ok: false, error: 'Invalid email.' };
  if (!name.trim()) return { ok: false, error: 'Name is required.' };
  if (!role) return { ok: false, error: 'Please select a role.' };

  if (DEMO_USERS[email]) {
    const base = DEMO_USERS[email];
    const user = { ...base, name: name.trim(), role, onboardingDone: false };
    const session = { user, role, expiresAt: Date.now() + 86400000 * 7, isDemo: true };
    saveSession(session);
    return { ok: true, session, isNew: true };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name.trim(), role } },
  });
  if (error) return { ok: false, error: error.message };

  if (!data.session) {
    saveSession(null);
    return { ok: true, isNew: true, requiresEmailConfirmation: true };
  }

  const sbUser = data.user;
  const user = {
    id: sbUser.id,
    name: name.trim(),
    email,
    role,
    sport: null,
    onboardingDone: false,
  };
  const session = {
    user,
    role,
    expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + 3600000,
  };
  saveSession(session);
  return { ok: true, session, isNew: true };
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
