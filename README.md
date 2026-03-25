-- ============================================================
-- 002_workout_engine.sql
-- Run AFTER 001_all_phases.sql
-- ORDER: all tables first, then indexes, then RLS + policies,
--        then functions, then triggers, then views
-- ============================================================

-- ── TABLE 1: PROFILES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT,
  last_name   TEXT,
  role        TEXT DEFAULT 'athlete'
    CHECK (role IN ('coach','athlete','parent','solo_athlete','admin')),
  sport       TEXT,
  team_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE 2: COACH–ATHLETE LINKS ─────────────────────────────
CREATE TABLE IF NOT EXISTS coach_athlete_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at   TIMESTAMPTZ DEFAULT NOW(),
  is_active   BOOLEAN DEFAULT TRUE,
  UNIQUE(coach_id, athlete_id)
);

-- ── TABLE 3: PARENT–ATHLETE LINKS ────────────────────────────
CREATE TABLE IF NOT EXISTS parent_athlete_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, athlete_id)
);

-- ── TABLE 4: WORKOUT LOGS ─────────────────────────────────────
-- Depends on nothing above — safe to create here
CREATE TABLE IF NOT EXISTS workout_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type       TEXT NOT NULL DEFAULT 'other',
  duration_minutes    INTEGER NOT NULL DEFAULT 0,
  intensity           SMALLINT CHECK (intensity BETWEEN 0 AND 10),
  training_load       INTEGER GENERATED ALWAYS AS (intensity * duration_minutes) STORED,
  wellness_score      DECIMAL(3,1) CHECK (wellness_score BETWEEN 0 AND 10),
  notes               TEXT,
  compliance_score    DECIMAL(4,3) DEFAULT 1.0 CHECK (compliance_score BETWEEN 0 AND 1),
  piq_score_at_log    SMALLINT CHECK (piq_score_at_log BETWEEN 0 AND 100),
  prescribed_by       UUID REFERENCES auth.users(id),
  workout_template_id UUID,
  logged_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE 5: PIQ SCORE HISTORY ───────────────────────────────
CREATE TABLE IF NOT EXISTS piq_score_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total            SMALLINT NOT NULL CHECK (total BETWEEN 0 AND 100),
  consistency      SMALLINT CHECK (consistency BETWEEN 0 AND 100),
  readiness        SMALLINT CHECK (readiness BETWEEN 0 AND 100),
  compliance       SMALLINT CHECK (compliance BETWEEN 0 AND 100),
  load_management  SMALLINT CHECK (load_management BETWEEN 0 AND 100),
  acwr             DECIMAL(4,2),
  calculated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── TABLE 6: PIQ REPORT LOG ───────────────────────────────────
CREATE TABLE IF NOT EXISTS piq_report_log (
  id          TEXT PRIMARY KEY,
  coach_id    UUID NOT NULL REFERENCES auth.users(id),
  athlete_id  UUID NOT NULL REFERENCES auth.users(id),
  file_path   TEXT NOT NULL,
  share_url   TEXT NOT NULL,
  expires_in  TEXT DEFAULT '30d',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES (after all tables exist)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date
  ON workout_logs(user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_logs_date
  ON workout_logs(logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_piq_score_user
  ON piq_score_history(user_id, calculated_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY + POLICIES
-- All referenced tables now exist — safe to define policies
-- ============================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (TRUE);

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- coach_athlete_links
ALTER TABLE coach_athlete_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY cal_participant ON coach_athlete_links
  FOR ALL USING (auth.uid() = coach_id OR auth.uid() = athlete_id);

-- parent_athlete_links
ALTER TABLE parent_athlete_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY pal_participant ON parent_athlete_links
  FOR ALL USING (auth.uid() = parent_id OR auth.uid() = athlete_id);

-- workout_logs — coaches can see their athletes' logs
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY workout_logs_own ON workout_logs
  FOR ALL USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM coach_athlete_links
      WHERE coach_id = auth.uid() AND athlete_id = user_id
    )
  );

-- piq_score_history — coaches and parents can see their athletes'
ALTER TABLE piq_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY piq_score_own ON piq_score_history
  FOR ALL USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM coach_athlete_links
      WHERE coach_id = auth.uid() AND athlete_id = user_id
    )
    OR EXISTS (
      SELECT 1 FROM parent_athlete_links
      WHERE parent_id = auth.uid() AND athlete_id = user_id
    )
  );

-- piq_report_log — coach who created it
ALTER TABLE piq_report_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_log_coach ON piq_report_log
  FOR ALL USING (auth.uid() = coach_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-create profile, streak row, and preferences on signup
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO piq_streaks (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO piq_user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

-- ============================================================
-- VIEWS
-- ============================================================

-- ACWR per user: acute 7-day load / chronic 28-day load
CREATE OR REPLACE VIEW piq_acwr AS
SELECT
  user_id,
  COALESCE(
    SUM(CASE WHEN logged_at >= NOW() - INTERVAL '7 days'
        THEN training_load ELSE 0 END) / 7.0, 0
  ) AS acute_load,
  COALESCE(
    SUM(CASE WHEN logged_at >= NOW() - INTERVAL '28 days'
        THEN training_load ELSE 0 END) / 28.0, 0
  ) AS chronic_load,
  CASE
    WHEN SUM(CASE WHEN logged_at >= NOW() - INTERVAL '28 days'
             THEN training_load ELSE 0 END) > 0
    THEN ROUND(
      (SUM(CASE WHEN logged_at >= NOW() - INTERVAL '7 days'
           THEN training_load ELSE 0 END) / 7.0) /
      (SUM(CASE WHEN logged_at >= NOW() - INTERVAL '28 days'
           THEN training_load ELSE 0 END) / 28.0), 2
    )
    ELSE 1.0
  END AS acwr
FROM workout_logs
WHERE logged_at >= NOW() - INTERVAL '28 days'
GROUP BY user_id;
