/**
 * PerformanceIQ — Supabase Client
 * Single source of truth for the Supabase client instance.
 * Uses the project's publishable browser key; privileged keys must never be
 * shipped to the client.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://jijqjbgmhhlvokgtuema.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-5KfMIVCS5es4nlW-97xQQ_DFJp5RHg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const VALID_ROLES = ['coach', 'player', 'parent', 'admin', 'solo'];
const VALID_GOALS = [
  'strength', 'speed', 'endurance', 'power', 'agility',
  'weight_loss', 'muscle_gain', 'recovery', 'recruiting',
  'general_fitness', 'sport_performance',
];

const GOAL_DISPLAY_MAP = {
  'speed & agility': 'speed',
  'agility': 'agility',
  'weight loss': 'weight_loss',
  'muscle gain': 'muscle_gain',
  'general fitness': 'general_fitness',
  'sport performance': 'sport_performance',
  'college recruiting': 'recruiting',
  'recovery & longevity': 'recovery',
  'injury prevention': 'recovery',
  'injury_prev': 'recovery',
  'flexibility': 'endurance',
  'conditioning': 'endurance',
  'vertical': 'power',
  'vertical jump': 'power',
  'nutrition': 'general_fitness',
};

export async function upsertProfile(userId, profile) {
  if (!userId) return { ok: false, error: 'No user ID — not authenticated.' };

  const role = VALID_ROLES.includes(profile.role) ? profile.role : 'solo';
  const sport = (profile.sport || '').toLowerCase().trim() || null;
  const rawGoal = (profile.primaryGoal || profile.primary_goal || '').toLowerCase().trim();
  const primaryGoal = VALID_GOALS.includes(rawGoal) ? rawGoal : (GOAL_DISPLAY_MAP[rawGoal] || null);

  // Keep this payload synchronized with the live public.profiles schema.
  const payload = {
    id: userId,
    name: (profile.name || '').trim(),
    email: (profile.email || '').toLowerCase().trim() || null,
    role,
    sport: sport || 'basketball',
    primary_goal: primaryGoal || '',
    team_name: (profile.team || profile.team_name || '').trim(),
    position: (profile.position || '').trim(),
    grad_year: profile.gradYear ? Number(profile.gradYear) : null,
    age: profile.age ? Number(profile.age) : null,
    weight_lbs: profile.weight ? Number(profile.weight) : null,
    height_in: profile.heightIn ? Number(profile.heightIn) : null,
    training_level: profile.trainingLevel || 'intermediate',
    comp_phase: profile.compPhase || 'in-season',
    days_per_week: profile.daysPerWeek ? Number(profile.daysPerWeek) : 4,
    sleep_hours: profile.sleepHours ? Number(profile.sleepHours) : 7,
    injury_history: profile.injuries || profile.injuryHistory || 'none',
    goals: Array.isArray(profile.goals) ? profile.goals : [],
    onboarded: true,
    onboarding_done: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('[PIQ] upsertProfile failed:', error);
    return { ok: false, error: error.message, code: error.code, hint: error.hint || null };
  }
  return { ok: true };
}
