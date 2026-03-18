/**
 * PerformanceIQ — Supabase Client
 * Single source of truth for all Supabase calls.
 * Import this everywhere you need DB/Auth access.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://jijqjbgmhhlvokgtuema.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppanFqYmdtaGhsdm9rZ3R1ZW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDEyMTYsImV4cCI6MjA4ODkxNzIxNn0.bX3-H-B1KrDe5d5ernRoDAojIEVT7sdXXtPBlxvktKk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
});
