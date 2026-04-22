/**
 * PerformanceIQ — Supabase Client
 * Single source of truth for the Supabase client instance.
 * All DB/auth operations go through this module.
 *
 * DEPLOY CHECKLIST:
 *   1. Replace SUPABASE_ANON_KEY with your actual anon key from
 *      Supabase Dashboard → Project Settings → API → anon public
 *   2. SUPABASE_URL is already set to your project URL
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL      = 'https://jijqjbgmhhlvokgtuema.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppanFqYmdtaGhsdm9rZ3R1ZW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDEyMTYsImV4cCI6MjA4ODkxNzIxNn0.bX3-H-B1KrDe5d5ernRoDAojIEVT7sdXXtPBlxvktKk'; // ← replace this

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  },
});

// ── VALID ENUM VALUES — must match DB constraints exactly ─────

const VALID_ROLES = ['coach', 'player', 'parent', 'admin', 'solo'];

const VALID_GOALS = [
  'strength', 'speed', 'endurance', 'power', 'agility',
  'weight_loss', 'muscle_gain', 'recovery', 'recruiting',
  'general_fitness', 'sport_performance',
];

/**
 * Maps display/legacy goal labels → DB enum values.
 * Covers every goal label used in the onboarding GOALS array
 * and older onboarding versions.
 */
const GOAL_DISPLAY_MAP = {
  'speed & agility':      'speed',
  'agility':              'agility',
  'weight loss':          'weight_loss',
  'muscle gain':          'muscle_gain',
  'general fitness':      'general_fitness',
  'sport performance':    'sport_performance',
  'college recruiting':   'recruiting',
  'recovery & longevity': 'recovery',
  'injury prevention':    'recovery',
  'injury_prev':          'recovery',
  'flexibility':          'endurance',
  'conditioning':         'endurance',
  'vertical':             'power',
  'vertical jump':        'power',
  'nutrition':            'general_fitness',
};

/**
 * upsertProfile
 * Hardened Supabase profiles upsert. Normalizes all constrained
 * fields before writing so DB constraints can never block it.
 *
 * Safe to call from:
 *   - onboarding finish handler
 *   - settings/profile save
 *   - any future profile update path
 *
 * @param {string} userId   — supabase.auth.getUser() → data.user.id
 * @param {object} profile  — raw profile data from onboarding or state
 * @returns {{ ok: boolean, error?: string, code?: string, hint?: string }}
 */
export async function upsertProfile(userId, profile) {
  if (!userId) return { ok: false, error: 'No user ID — not authenticated.' };

  // ── Normalize role ────────────────────────────────────────
  const role = VALID_ROLES.includes(profile.role) ? profile.role : 'solo';

  // ── Normalize sport ───────────────────────────────────────
  // sport column has no DB constraint — just lowercase + trim
  const sport = (profile.sport || '').toLowerCase().trim() || null;

  // ── Normalize primary_goal ────────────────────────────────
  const rawGoal     = (profile.primaryGoal || profile.primary_goal || '').toLowerCase().trim();
  const primaryGoal = VALID_GOALS.includes(rawGoal)
    ? rawGoal
    : (GOAL_DISPLAY_MAP[rawGoal] || null); // null is allowed (IS NULL OR ... in constraint)

  // ── Build payload ─────────────────────────────────────────
  const payload = {
    id:             userId,
    name:           (profile.name  || '').trim()  || null,
    email:          (profile.email || '').toLowerCase().trim() || null,
    role,
    sport,
    primary_goal:   primaryGoal,
    team:           (profile.team     || '').trim() || null,
    position:       (profile.position || '').trim() || null,
    grad_year:      profile.gradYear      ? Number(profile.gradYear)      : null,
    age:            profile.age           ? Number(profile.age)           : null,
    weight_lbs:     profile.weight        ? Number(profile.weight)        : null,
    height_in:      profile.heightIn      ? Number(profile.heightIn)      : null,
    training_level: profile.trainingLevel || 'intermediate',
    comp_phase:     profile.compPhase     || 'in-season',
    days_per_week:  profile.daysPerWeek   ? Number(profile.daysPerWeek)   : 4,
    sleep_hours:    profile.sleepHours    ? Number(profile.sleepHours)    : 7,
    injury_history: profile.injuries || profile.injuryHistory            || null,
    goals:          Array.isArray(profile.goals) ? profile.goals          : [],
    onboarded:      true,
    updated_at:     new Date().toISOString(),
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('[PIQ] upsertProfile failed:', error);
    return {
      ok:    false,
      error: error.message,
      code:  error.code,
      hint:  error.hint || null,
    };
  }

  return { ok: true };
}
