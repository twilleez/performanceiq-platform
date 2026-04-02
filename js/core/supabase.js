// js/core/supabase.js — PerformanceIQ
// Single Supabase client. Import everywhere — never instantiate a second.
// FIX: updateProfile now correctly passes `email` through to the DB update.
//      Previously, only app-aliased fields were mapped; `email` was silently dropped.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = 'https://jijqjbgmhhlvokgtuema.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppanFqYmdtaGhsdm9rZ3R1ZW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDEyMTYsImV4cCI6MjA4ODkxNzIxNn0.bX3-H-B1KrDe5d5ernRoDAojIEVT7sdXXtPBlxvktKk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
  },
})

// ── AUTH STATE ─────────────────────────────────────────────────
let _session  = null
let _profile  = null
const _listeners = new Set()

export const getSession = () => _session
export const getProfile = () => _profile
export const getUser    = () => _session?.user ?? null
export const isAuthed   = () => !!_session

export function onAuthChange(fn) {
  _listeners.add(fn)
  // Immediately call with current state so subscriber doesn't miss it
  try { fn(_session, _profile) } catch (e) { console.error('[PIQ] auth listener error:', e) }
  return () => _listeners.delete(fn)
}

function _notify() {
  _listeners.forEach(fn => {
    try { fn(_session, _profile) } catch (e) { console.error('[PIQ] auth listener error:', e) }
  })
}

// ── PROFILE NORMALIZER ─────────────────────────────────────────
// Maps DB column names → consistent app-layer property names.
//
// DB column         → App property
// name              → display_name
// onboarding_done   → onboarded
// goal / primary_goal / secondary_goals → goals[]
export function normalizeProfile(row) {
  if (!row) return null
  return {
    ...row,
    display_name: row.name ?? row.display_name ?? '',
    onboarded:    !!(row.onboarded ?? row.onboarding_done ?? false),
    goals: row.goals?.length
      ? row.goals
      : [row.primary_goal, ...(row.secondary_goals ?? [])].filter(Boolean),
  }
}

// ── PROFILE LOAD ───────────────────────────────────────────────
async function _loadProfile(userId) {
  if (!userId) { _profile = null; return }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    // PGRST116 = row not found — new user, profile not yet created, that's OK
    if (error.code !== 'PGRST116') {
      console.warn('[PIQ] profile load error:', error.message)
    }
    _profile = null
  } else {
    _profile = normalizeProfile(data)
  }
}

// ── INIT ───────────────────────────────────────────────────────
export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  _session = session
  await _loadProfile(session?.user?.id)
  _notify()

  supabase.auth.onAuthStateChange(async (event, session) => {
    _session = session
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      await _loadProfile(session?.user?.id)
    } else if (event === 'SIGNED_OUT') {
      _profile = null
    }
    _notify()
  })
}

// ── AUTH HELPERS ───────────────────────────────────────────────
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUpWithEmail(email, password, meta = {}) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: meta },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) console.warn('[PIQ] signOut error:', error.message)
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}${location.pathname}#/reset-password`,
  })
  if (error) throw error
}

// ── PROFILE UPDATE ─────────────────────────────────────────────
// Maps app property names → DB column names on write.
// IMPORTANT: fields NOT listed in the alias map are passed through AS-IS,
// which means `email` (a real DB column) correctly reaches the UPDATE call.
export async function updateProfile(updates) {
  const user = getUser()
  if (!user) throw new Error('Not authenticated')

  // Start with a shallow copy so we don't mutate the caller's object
  const db = { ...updates }

  // ── App alias → DB column renames ──────────────────────────
  // display_name → name
  if ('display_name' in db) {
    db.name = db.display_name
    delete db.display_name
  }

  // onboarded → onboarding_done
  if ('onboarded' in db) {
    db.onboarding_done = db.onboarded
    delete db.onboarded
  }

  // goals[] → primary_goal + secondary_goals + goal (legacy single)
  if ('goals' in db) {
    const g = db.goals ?? []
    db.primary_goal    = g[0] ?? ''
    db.secondary_goals = g.slice(1)
    db.goal            = g[0] ?? ''     // legacy single-value column
    delete db.goals
  }

  // NOTE: `email`, `role`, `sport`, `name`, `updated_at`, and any other
  // plain DB columns are NOT deleted — they pass through correctly.
  db.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('profiles')
    .update(db)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error

  _profile = normalizeProfile(data)
  _notify()
  return _profile
}

// ── PROFILE CREATE (for new signups before onboarding) ─────────
// Called right after signUp to create the initial profile row.
// This ensures email and id are present from the start.
export async function createInitialProfile(userId, email, meta = {}) {
  if (!userId || !email) throw new Error('userId and email are required')

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id:              userId,
      email,                          // satisfies NOT NULL constraint
      name:            meta.name ?? '',
      role:            meta.role ?? 'solo_athlete',
      onboarding_done: false,
      created_at:      new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    })
    .select()
    .single()

  // 23505 = unique violation — profile already exists from a trigger, safe to ignore
  if (error && error.code !== '23505') throw error

  if (data) {
    _profile = normalizeProfile(data)
    _notify()
  }

  return _profile
}
