-- ============================================================
-- PIQ RECOVERY — DATABASE MIGRATIONS
-- Run in order: 001 → 007
-- ============================================================

-- ── 001: PHASE 0 — AUDIT LOG FOR DESTRUCTIVE ACTIONS ────────
CREATE TABLE IF NOT EXISTS piq_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type   TEXT NOT NULL,   -- 'seed_demo', 'delete_log', 'delete_workout', etc.
  entity_type   TEXT,
  entity_id     UUID,
  payload       JSONB,           -- snapshot of deleted data for undo
  undone        BOOLEAN DEFAULT FALSE,
  undone_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON piq_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON piq_audit_log(entity_type, entity_id);

-- Row level security
ALTER TABLE piq_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_own ON piq_audit_log
  FOR ALL USING (auth.uid() = user_id);

-- ── 002: PHASE 0 — SYNC STATE ────────────────────────────────
-- Tracks last successful sync per user device
CREATE TABLE IF NOT EXISTS piq_sync_state (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id      TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_version   BIGINT DEFAULT 0,
  is_dirty       BOOLEAN DEFAULT FALSE,
  pending_ops    JSONB DEFAULT '[]',
  UNIQUE(user_id, device_id)
);

ALTER TABLE piq_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY sync_own ON piq_sync_state FOR ALL USING (auth.uid() = user_id);

-- ── 003: PHASE 1 — ONBOARDING PROGRESS ───────────────────────
CREATE TABLE IF NOT EXISTS piq_onboarding (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed       BOOLEAN DEFAULT FALSE,
  skipped         BOOLEAN DEFAULT FALSE,
  current_step    SMALLINT DEFAULT 0,
  role            TEXT,
  sport_theme     TEXT,
  team_name       TEXT,
  athlete_name    TEXT,
  first_goal      TEXT,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE piq_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_own ON piq_onboarding FOR ALL USING (auth.uid() = user_id);

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$
LANGUAGE plpgsql;

CREATE TRIGGER onboarding_updated_at
  BEFORE UPDATE ON piq_onboarding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 004: PHASE 1 — TOOLTIP DISMISSALS ────────────────────────
CREATE TABLE IF NOT EXISTS piq_tooltip_dismissals (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tooltip_id  TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, tooltip_id)
);

ALTER TABLE piq_tooltip_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY tooltip_own ON piq_tooltip_dismissals FOR ALL USING (auth.uid() = user_id);

-- ── 005: PHASE 2 — USER PREFERENCES (THEME, DARK MODE) ───────
CREATE TABLE IF NOT EXISTS piq_user_preferences (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme         TEXT DEFAULT 'light',          -- 'light' | 'dark' | 'system'
  sport_theme   TEXT DEFAULT 'track',
  font_size     TEXT DEFAULT 'default',        -- 'default' | 'large' | 'larger'
  reduce_motion BOOLEAN DEFAULT FALSE,
  language      TEXT DEFAULT 'en',
  timezone      TEXT DEFAULT 'America/New_York',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE piq_user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY prefs_own ON piq_user_preferences FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER prefs_updated_at
  BEFORE UPDATE ON piq_user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 006: PHASE 3 — RETENTION TABLES ──────────────────────────

-- Streak tracking
CREATE TABLE IF NOT EXISTS piq_streaks (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak     INTEGER DEFAULT 0,
  longest_streak     INTEGER DEFAULT 0,
  last_log_date      DATE,
  streak_at_risk     BOOLEAN NOT NULL DEFAULT FALSE, -- updated by piq_update_streak()
  total_days_logged  INTEGER DEFAULT 0,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE piq_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY streaks_own ON piq_streaks FOR ALL USING (auth.uid() = user_id);

-- Milestones
CREATE TABLE IF NOT EXISTS piq_milestones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id   TEXT NOT NULL,
  achieved       BOOLEAN DEFAULT FALSE,
  achieved_at    TIMESTAMPTZ,
  notified       BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, milestone_id)
);

ALTER TABLE piq_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY milestones_own ON piq_milestones FOR ALL USING (auth.uid() = user_id);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS piq_push_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL,
  p256dh_key      TEXT NOT NULL,
  auth_key        TEXT NOT NULL,
  device_type     TEXT,       -- 'ios' | 'android' | 'web'
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE piq_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_own ON piq_push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Notification log (rate limiting + history)
CREATE TABLE IF NOT EXISTS piq_notification_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,   -- 'streak_reminder', 'weekly_summary', 'milestone'
  sent_at          TIMESTAMPTZ DEFAULT NOW(),
  opened_at        TIMESTAMPTZ,
  payload          JSONB
);

CREATE INDEX idx_notif_log_user_type ON piq_notification_log(user_id, notification_type, sent_at DESC);
ALTER TABLE piq_notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_own ON piq_notification_log FOR ALL USING (auth.uid() = user_id);

-- ── 007: PHASE 3 — MESSAGING ─────────────────────────────────
CREATE TABLE IF NOT EXISTS piq_message_threads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coach_id, athlete_id)
);

ALTER TABLE piq_message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY threads_participant ON piq_message_threads
  FOR ALL USING (auth.uid() = coach_id OR auth.uid() = athlete_id);

CREATE TABLE IF NOT EXISTS piq_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES piq_message_threads(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON piq_messages(thread_id, created_at DESC);
CREATE INDEX idx_messages_unread ON piq_messages(thread_id, sender_id, read_at) WHERE read_at IS NULL;

ALTER TABLE piq_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_participant ON piq_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM piq_message_threads t
      WHERE t.id = thread_id
        AND (t.coach_id = auth.uid() OR t.athlete_id = auth.uid())
    )
  );

-- ── 008: PHASE 4 — NUTRITION DATABASE ────────────────────────
CREATE TABLE IF NOT EXISTS piq_food_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type      TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack','supplement')),
  food_name      TEXT NOT NULL,
  serving_size   DECIMAL,
  serving_unit   TEXT,
  calories       DECIMAL,
  protein_g      DECIMAL,
  carbs_g        DECIMAL,
  fat_g          DECIMAL,
  barcode        TEXT,         -- UPC from barcode scan
  source         TEXT DEFAULT 'manual',  -- 'manual' | 'barcode' | 'search' | 'recent'
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_food_log_user ON piq_food_log(user_id, logged_at DESC);
ALTER TABLE piq_food_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY food_log_own ON piq_food_log FOR ALL USING (auth.uid() = user_id);

-- ── FUNCTIONS ─────────────────────────────────────────────────

-- Recalculate streak on new workout log
CREATE OR REPLACE FUNCTION piq_update_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_last_date DATE;
  v_today     DATE := CURRENT_DATE;
  v_current   INTEGER;
  v_longest   INTEGER;
BEGIN
  SELECT last_log_date, current_streak, longest_streak
    INTO v_last_date, v_current, v_longest
    FROM piq_streaks WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO piq_streaks (user_id, current_streak, longest_streak, last_log_date, total_days_logged)
    VALUES (p_user_id, 1, 1, v_today, 1);
    RETURN;
  END IF;

  IF v_last_date = v_today THEN
    RETURN; -- Already logged today
  ELSIF v_last_date = v_today - 1 THEN
    v_current := v_current + 1;
  ELSE
    v_current := 1; -- Streak broken
  END IF;

  UPDATE piq_streaks SET
    current_streak = v_current,
    longest_streak = GREATEST(v_longest, v_current),
    last_log_date = v_today,
    total_days_logged = total_days_logged + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notification rate limiter — max 1 per type per 23h
CREATE OR REPLACE FUNCTION piq_can_send_notification(
  p_user_id UUID,
  p_type    TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM piq_notification_log
    WHERE user_id = p_user_id
      AND notification_type = p_type
      AND sent_at > NOW() - INTERVAL '23 hours'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update streak_at_risk flag (cannot use CURRENT_DATE in GENERATED column -- not IMMUTABLE)
CREATE OR REPLACE FUNCTION piq_refresh_streak_at_risk(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE piq_streaks
  SET streak_at_risk = (
    last_log_date IS NOT NULL AND
    last_log_date < CURRENT_DATE AND
    CURRENT_DATE - last_log_date = 1
  )
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
