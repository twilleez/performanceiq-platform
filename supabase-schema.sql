-- ============================================================
-- PerformanceIQ — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── profiles ─────────────────────────────────────────────────
-- One row per user. Created automatically on signup via trigger.
-- role: 'athlete' | 'coach'
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '',
  role        text not null default 'athlete' check (role in ('athlete','coach')),
  sport       text not null default 'basketball',
  position    text not null default '',
  goal        text not null default '',
  equipment   text[] not null default '{}',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── teams ─────────────────────────────────────────────────────
create table public.teams (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  sport       text not null default 'basketball',
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ── team_members ──────────────────────────────────────────────
-- Athletes belong to a team. Coach can invite via magic link.
create table public.team_members (
  team_id     uuid not null references public.teams(id) on delete cascade,
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (team_id, athlete_id)
);

-- ── workout_templates ─────────────────────────────────────────
-- Reusable workout plans a coach (or the system) defines.
create table public.workout_templates (
  id          uuid primary key default uuid_generate_v4(),
  created_by  uuid references public.profiles(id) on delete set null,
  title       text not null,
  sport       text not null,
  day_type    text not null default 'power',  -- power | strength | recovery | speed | conditioning
  notes       text not null default '',
  recovery_cue text not null default '',
  exercises   jsonb not null default '[]',    -- [{id, sets:[{target}]}]
  created_at  timestamptz not null default now()
);

-- ── workouts ──────────────────────────────────────────────────
-- An assigned instance of a template for a specific athlete on a specific date.
create table public.workouts (
  id            uuid primary key default uuid_generate_v4(),
  athlete_id    uuid not null references public.profiles(id) on delete cascade,
  template_id   uuid references public.workout_templates(id) on delete set null,
  assigned_by   uuid references public.profiles(id) on delete set null, -- null = self-assigned
  scheduled_date date not null default current_date,
  title         text not null,
  sport         text not null,
  day_type      text not null default 'power',
  notes         text not null default '',
  recovery_cue  text not null default '',
  exercises     jsonb not null default '[]',   -- [{id, sets:[{target, done, logged_reps, logged_weight}]}]
  completed_at  timestamptz,                   -- null = not finished
  created_at    timestamptz not null default now()
);

-- ── readiness_logs ────────────────────────────────────────────
-- One row per athlete per day. Upsert on check-in.
create table public.readiness_logs (
  id            uuid primary key default uuid_generate_v4(),
  athlete_id    uuid not null references public.profiles(id) on delete cascade,
  log_date      date not null default current_date,
  score         int not null default 75 check (score between 0 and 100),
  hrv           text not null default '',
  sleep_hrs     numeric(4,1) not null default 7.0,
  soreness      text not null default 'Low',   -- None | Low | Moderate | High
  hydration     text not null default 'On target',
  body_battery  int not null default 70,
  notes         text not null default '',
  created_at    timestamptz not null default now(),
  unique (athlete_id, log_date)
);

-- ── personal_records ──────────────────────────────────────────
-- Updated whenever a new best is logged during a workout.
create table public.personal_records (
  id            uuid primary key default uuid_generate_v4(),
  athlete_id    uuid not null references public.profiles(id) on delete cascade,
  exercise_id   text not null,   -- matches EXERCISES[].id
  value         numeric not null,
  unit          text not null default 'lb',  -- lb | kg | sec | in | reps
  label         text not null default '',    -- e.g. "70 lb × 8"
  set_at        date not null default current_date,
  workout_id    uuid references public.workouts(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ── team_announcements ────────────────────────────────────────
create table public.team_announcements (
  id          uuid primary key default uuid_generate_v4(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ── coach_notes ───────────────────────────────────────────────
create table public.coach_notes (
  id          uuid primary key default uuid_generate_v4(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  athlete_id  uuid references public.profiles(id) on delete cascade, -- null = whole team
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.teams              enable row level security;
alter table public.team_members       enable row level security;
alter table public.workout_templates  enable row level security;
alter table public.workouts           enable row level security;
alter table public.readiness_logs     enable row level security;
alter table public.personal_records   enable row level security;
alter table public.team_announcements enable row level security;
alter table public.coach_notes        enable row level security;

-- ── profiles policies ─────────────────────────────────────────
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Coaches can read profiles of athletes on their teams
create policy "Coaches can read their athletes profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.teams t
      join public.team_members tm on tm.team_id = t.id
      where t.coach_id = auth.uid()
        and tm.athlete_id = profiles.id
    )
  );

-- ── teams policies ────────────────────────────────────────────
create policy "Coaches can manage their own teams"
  on public.teams for all
  using (coach_id = auth.uid());

create policy "Athletes can read teams they belong to"
  on public.teams for select
  using (
    exists (
      select 1 from public.team_members
      where team_id = teams.id and athlete_id = auth.uid()
    )
  );

-- ── team_members policies ─────────────────────────────────────
create policy "Coaches manage team membership"
  on public.team_members for all
  using (
    exists (
      select 1 from public.teams
      where id = team_members.team_id and coach_id = auth.uid()
    )
  );

create policy "Athletes can see their own membership"
  on public.team_members for select
  using (athlete_id = auth.uid());

-- ── workouts policies ─────────────────────────────────────────
create policy "Athletes can manage own workouts"
  on public.workouts for all
  using (athlete_id = auth.uid());

create policy "Coaches can manage workouts for their athletes"
  on public.workouts for all
  using (
    exists (
      select 1 from public.teams t
      join public.team_members tm on tm.team_id = t.id
      where t.coach_id = auth.uid()
        and tm.athlete_id = workouts.athlete_id
    )
  );

-- ── workout_templates policies ────────────────────────────────
create policy "Anyone authenticated can read templates"
  on public.workout_templates for select
  using (auth.uid() is not null);

create policy "Coaches can create templates"
  on public.workout_templates for insert
  with check (created_by = auth.uid());

create policy "Coaches can update their own templates"
  on public.workout_templates for update
  using (created_by = auth.uid());

-- ── readiness_logs policies ───────────────────────────────────
create policy "Athletes manage own readiness logs"
  on public.readiness_logs for all
  using (athlete_id = auth.uid());

create policy "Coaches can read their athletes readiness"
  on public.readiness_logs for select
  using (
    exists (
      select 1 from public.teams t
      join public.team_members tm on tm.team_id = t.id
      where t.coach_id = auth.uid()
        and tm.athlete_id = readiness_logs.athlete_id
    )
  );

-- ── personal_records policies ─────────────────────────────────
create policy "Athletes manage own PRs"
  on public.personal_records for all
  using (athlete_id = auth.uid());

create policy "Coaches can read their athletes PRs"
  on public.personal_records for select
  using (
    exists (
      select 1 from public.teams t
      join public.team_members tm on tm.team_id = t.id
      where t.coach_id = auth.uid()
        and tm.athlete_id = personal_records.athlete_id
    )
  );

-- ── team_announcements policies ───────────────────────────────
create policy "Team members can read announcements"
  on public.team_announcements for select
  using (
    exists (
      select 1 from public.team_members
      where team_id = team_announcements.team_id
        and athlete_id = auth.uid()
    )
    or
    exists (
      select 1 from public.teams
      where id = team_announcements.team_id and coach_id = auth.uid()
    )
  );

create policy "Coaches can post announcements"
  on public.team_announcements for insert
  with check (
    exists (
      select 1 from public.teams
      where id = team_announcements.team_id and coach_id = auth.uid()
    )
  );

-- ── coach_notes policies ──────────────────────────────────────
create policy "Coaches manage their notes"
  on public.coach_notes for all
  using (author_id = auth.uid());

create policy "Athletes can read notes addressed to them"
  on public.coach_notes for select
  using (athlete_id = auth.uid());

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'athlete')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at on profiles
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
