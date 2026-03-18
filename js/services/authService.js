/**
 * PerformanceIQ — Auth Service
 * Wraps Supabase Auth. Replaces the demo localStorage auth in core/auth.js
 * for production. The existing core/auth.js still works as fallback in demo mode.
 */

import { supabase } from './supabase.js';

// ── SIGN UP ───────────────────────────────────────────────────
export async function signUpWithSupabase(email, password, name, role) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role }, // stored in auth.users.raw_user_meta_data
    },
  });

  if (error) return { ok: false, error: error.message };

  // Create profile row (triggers or manual insert)
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id:   data.user.id,
        email,
        name,
        role: _mapRole(role),
      });

    if (profileError && profileError.code !== '23505') {
      // 23505 = unique violation (profile already exists), safe to ignore
      console.error('[PIQ] Profile insert error:', profileError);
    }
  }

  return { ok: true, user: data.user, session: data.session };
}

// ── SIGN IN ───────────────────────────────────────────────────
export async function signInWithSupabase(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { ok: false, error: error.message };

  // Fetch full profile
  const profile = await getProfile(data.user.id);
  return { ok: true, user: data.user, session: data.session, profile };
}

// ── SIGN OUT ──────────────────────────────────────────────────
export async function signOutFromSupabase() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('[PIQ] Sign out error:', error);
}

// ── GET CURRENT SESSION ───────────────────────────────────────
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
}

// ── GET PROFILE ───────────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[PIQ] Profile fetch error:', error);
    return null;
  }
  return data;
}

// ── UPDATE PROFILE ────────────────────────────────────────────
export async function updateProfile(userId, fields) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('[PIQ] Profile update error:', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, profile: data };
}

// ── AUTH STATE LISTENER ───────────────────────────────────────
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// ── ROLE MAPPING ──────────────────────────────────────────────
// Maps app roles to schema roles (schema extended via migration 001)
function _mapRole(appRole) {
  const map = {
    player: 'player',
    coach:  'coach',
    parent: 'parent',
    admin:  'admin',
    solo:   'solo',
  };
  return map[appRole] || 'athlete';
}
