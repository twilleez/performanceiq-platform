-- ============================================================
-- PerformanceIQ — Supabase Schema v2
-- Changes from v1:
--   + organizations table + RLS
--   + org_members join table
--   + join_code column on teams
--   + org_id FK on teams
--   + Performance indexes on all hot query patterns
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Organizations ─────────────────────────────────────────────
-- Top-level org (e.g. a school, club, or program)
create table if not exists public.organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  admin_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (admin_id)
);

-- ── Org Members ───────────────────────────────────────────────
create table if not exists public.org_members (
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member' check (role in ('admin','coach','member')),
  joined_at   timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ── Profiles ──────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null default '',
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

-- ── Teams ─────────────────────────────────────────────────────
create table if not exists public.teams (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  sport       text not null default 'basketball',
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  org_id      uuid references public.organizations(id) on delete set null,
  join_code   text unique,
  created_at  timestamptz not null default now()
);

-- ── Team Members ──────────────────────────────────────────────
create table if not exists public.team_members (
  team_id     uuid not null references public.teams(id) on delete cascade,
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (team_id, athlete_id)
);

-- ── Workout Templates ─────────────────────────────────────────
create table if not exists public.workout_templates (
  id           uuid primary key default uuid_generate_v4(),
  created_by   uuid references public.profiles(id) on delete set null,
  title        text not null,
  sport        text not null,
  day_type     text not null default 'power',
  notes        text not null default '',
  recovery_cue text not null default '',
  exercises    jsonb not null default '[]',
  created_at   timestamptz not null default now()
);

-- ── Workouts ──────────────────────────────────────────────────
create table if not exists public.workouts (
  id             uuid primary key default uuid_generate_v4(),
  athlete_id     uuid not null references public.profiles(id) on delete cascade,
  template_id    uuid references public.workout_templates(id) on delete set null,
  assigned_by    uuid references public.profiles(id) on delete set null,
  scheduled_date date not null default current_date,
  title          text not null,
  sport          text not null,
  day_type       text not null default 'power',
  notes          text not null default '',
  recovery_cue   text not null default '',
  exercises      jsonb not null default '[]',
  completed_at   timestamptz,
  created_at     timestamptz not null default now()
);

-- ── Readiness Logs ────────────────────────────────────────────
create table if not exists public.readiness_logs (
  id           uuid primary key default uuid_generate_v4(),
  athlete_id   uuid not null references public.profiles(id) on delete cascade,
  log_date     date not null default current_date,
  score        int not null default 75 check (score between 0 and 100),
  hrv          text not null default '',
  sleep_hrs    numeric(4,1) not null default 7.0,
  soreness     text not null default 'Low',
  hydration    text not null default 'On target',
  body_battery int not null default 70,
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  unique (athlete_id, log_date)
);

-- ── Personal Records ──────────────────────────────────────────
create table if not exists public.personal_records (
  id          uuid primary key default uuid_generate_v4(),
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  exercise_id text not null,
  value       numeric not null,
  unit        text not null default 'lb',
  label       text not null default '',
  set_at      date not null default current_date,
  workout_id  uuid references public.workouts(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── Team Announcements ────────────────────────────────────────
create table if not exists public.team_announcements (
  id          uuid primary key default uuid_generate_v4(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ── Coach Notes ───────────────────────────────────────────────
create table if not exists public.coach_notes (
  id          uuid primary key default uuid_generate_v4(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  athlete_id  uuid references public.profiles(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

-- Readiness: most queried by athlete + date
create index if not exists idx_readiness_athlete_date
  on public.readiness_logs(athlete_id, log_date desc);

-- Readiness: team view queries by date across many athletes
create index if not exists idx_readiness_date
  on public.readiness_logs(log_date desc);

-- Workouts: today's workout lookup (hot path)
create index if not exists idx_workouts_athlete_date
  on public.workouts(athlete_id, scheduled_date desc);

-- Workouts: coach assignment queries
create index if not exists idx_workouts_assigned_by
  on public.workouts(assigned_by, scheduled_date desc);

-- PRs: per athlete lookup
create index if not exists idx_prs_athlete
  on public.personal_records(athlete_id, set_at desc);

-- PRs: per exercise across athletes
create index if not exists idx_prs_exercise
  on public.personal_records(exercise_id, value desc);

-- Teams: coach lookup
create index if not exists idx_teams_coach
  on public.teams(coach_id);

-- Teams: join code lookup (for joining)
create index if not exists idx_teams_join_code
  on public.teams(join_code);

-- Teams: org lookup
create index if not exists idx_teams_org
  on public.teams(org_id);

-- Team members: athlete lookup
create index if not exists idx_team_members_athlete
  on public.team_members(athlete_id);

-- Templates: coach lookup
create index if not exists idx_templates_created_by
  on public.workout_templates(created_by, created_at desc);

-- Org members: user lookup
create index if not exists idx_org_members_user
  on public.org_members(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.organizations      enable row level security;
alter table public.org_members        enable row level security;
alter table public.profiles           enable row level security;
alter table public.teams              enable row level security;
alter table public.team_members       enable row level security;
alter table public.workout_templates  enable row level security;
alter table public.workouts           enable row level security;
alter table public.readiness_logs     enable row level security;
alter table public.personal_records   enable row level security;
alter table public.team_announcements enable row level security;
alter table public.coach_notes        enable row level security;

-- ── Organizations policies ────────────────────────────────────
create policy "Org admins manage their org"
  on public.organizations for all using (admin_id = auth.uid());

create policy "Org members can read their org"
  on public.organizations for select using (
    exists (select 1 from public.org_members where org_id = organizations.id and user_id = auth.uid())
  );

-- ── Org Members policies ──────────────────────────────────────
create policy "Admins manage org membership"
  on public.org_members for all using (
    exists (select 1 from public.organizations where id = org_members.org_id and admin_id = auth.uid())
  );

create policy "Users see own org membership"
  on public.org_members for select using (user_id = auth.uid());

-- ── Profiles policies ─────────────────────────────────────────
create policy "Users read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Coaches read their athletes profiles"
  on public.profiles for select using (
    exists (
      select 1 from public.teams t
      join public.team_members tm on tm.team_id = t.id
      where t.coach_id = auth.uid() and tm.athlete_id = profiles.id
    )
  );

-- ── Teams policies ────────────────────────────────────────────
create policy "Coaches manage their teams"
  on public.teams for all using (coach_id = auth.uid());

create policy "Anyone can read team by join code"
  on public.teams for select using (join_code is not null);

create policy "Athletes read teams they belong to"
  on public.teams for select using (
    exists (select 1 from public.team_members where team_id = teams.id and athlete_id = auth.uid())
  );

-- ── Team Members policies ─────────────────────────────────────
create policy "Coaches manage membership"
  on public.team_members for all using (
    exists (select 1 from public.teams where id = team_members.team_id and coach_id = auth.uid())
  );

create policy "Athletes insert own membership"
  on public.team_members for insert with check (athlete_id = auth.uid());

create policy "Athletes see own membership"
  on public.team_members for select using (athlete_id = auth.uid());

-- ── Workouts policies ─────────────────────────────────────────
create policy "Athletes manage own workouts"
  on public.workouts for all using (athlete_id = auth.uid());

create policy "Coaches manage workouts for their athletes"
  on public.workouts for all using (
    exists (
      select 1 from public.teams t
      join public.team_members tm on tm.team_id = t.id
      where t.coach_id = auth.uid() and tm.athlete_id = workouts.athlete_id
    )
  );

-- ── Workout Templates policies ────────────────────────────────
create policy "Authenticated users read templates"
  on public.workout_templates for select using (auth.uid() is not null);

create policy "Coaches create templates"
  on public.workout_templates for insert with check (created_by = auth.uid());

create policy "Coaches update own templates"
  on public.workout_templates for update using (created_by = auth.uid());

-- ── Readiness policies ────────────────────────────────────────
create policy "Athletes manage own readiness"
  on public.readiness_logs for all using (athlete_id = auth.uid());

create policy "Coaches read their athletes readiness"
  on public.readiness_logs for select using (
    exists (
      select 1 from public.teams t
      join public.team_members tm on tm.team_id = t.id
      where t.coach_id = auth.uid() and tm.athlete_id = readiness_logs.athlete_id
    )
  );

-- ── Personal Records policies ─────────────────────────────────
create policy "Athletes manage own PRs"
  on public.personal_records for all using (athlete_id = auth.uid());

create policy "Coaches read their athletes PRs"
  on public.personal_records for select using (
    exists (
      select 1 from public.teams t
      join public.team_members tm on tm.team_id = t.id
      where t.coach_id = auth.uid() and tm.athlete_id = personal_records.athlete_id
    )
  );

-- ── Announcements + Notes policies ───────────────────────────
create policy "Team members read announcements"
  on public.team_announcements for select using (
    exists (select 1 from public.team_members where team_id = team_announcements.team_id and athlete_id = auth.uid())
    or exists (select 1 from public.teams where id = team_announcements.team_id and coach_id = auth.uid())
  );

create policy "Coaches post announcements"
  on public.team_announcements for insert with check (
    exists (select 1 from public.teams where id = team_announcements.team_id and coach_id = auth.uid())
  );

create policy "Coaches manage notes"
  on public.coach_notes for all using (author_id = auth.uid());

create policy "Athletes read notes addressed to them"
  on public.coach_notes for select using (athlete_id = auth.uid());

-- ============================================================
-- TRIGGERS
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'athlete')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
