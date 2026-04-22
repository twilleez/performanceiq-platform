/**
 * PerformanceIQ — Supabase Client
 * Single source of truth for the Supabase client instance.
 * All DB/auth operations go through this module.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://jijqjbgmhhlvokgtuema.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY'; // replace with your actual anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
});

// ── VALID ENUM VALUES (must match DB constraints exactly) ─────
const VALID_ROLES = ['coach', 'player', 'parent', 'admin', 'solo'];
const VALID_GOALS = [
  'strength', 'speed', 'endurance', 'power', 'agility',
  'weight_loss', 'muscle_gain', 'recovery', 'recruiting',
  'general_fitness', 'sport_performance',
];

// Display/legacy → DB enum mapping for primary_goal
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
 * upsertProfile — hardened Supabase profiles upsert.
 * Normalizes all constrained fields before write.
 * Safe to call from onboarding finish and settings/profile save.
 *
 * @param {string} userId   — auth.uid() from Supabase session
 * @param {object} profile  — raw profile data from onboarding/state
 * @returns {{ ok: boolean, error?: string, code?: string }}
 */
export async function upsertProfile(userId, profile) {
  if (!userId) return { ok: false, error: 'No user ID — not authenticated.' };

  // ── Normalize role ────────────────────────────────────────
  const role = VALID_ROLES.includes(profile.role) ? profile.role : 'solo';

  // ── Normalize sport (lowercase, no DB constraint) ─────────
  const sport = (profile.sport || '').toLowerCase().trim() || null;

  // ── Normalize primary_goal ────────────────────────────────
  const rawGoal    = (profile.primaryGoal || profile.primary_goal || '').toLowerCase().trim();
  const primaryGoal = VALID_GOALS.includes(rawGoal)
    ? rawGoal
    : (GOAL_DISPLAY_MAP[rawGoal] || null);

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
    injury_history: profile.injuries || profile.injuryHistory || null,
    goals:          Array.isArray(profile.goals) ? profile.goals : [],
    onboarded:      true,
    updated_at:     new Date().toISOString(),
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('[PIQ] upsertProfile failed:', error);
    return { ok: false, error: error.message, code: error.code, hint: error.hint || null };
  }

  return { ok: true };
}
