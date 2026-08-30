create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('coach','player','parent','admin','solo')),
  route text,
  category text not null default 'usability' check (category in ('usability','bug','confusing','feature','other')),
  severity text not null default 'medium' check (severity in ('low','medium','high','blocking')),
  message text not null check (char_length(message) between 3 and 2000),
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','triaged','in_progress','resolved','wont_fix')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beta_feedback_user_created_idx
  on public.beta_feedback(user_id, created_at desc);
create index if not exists beta_feedback_status_created_idx
  on public.beta_feedback(status, created_at desc);

alter table public.beta_feedback enable row level security;

drop policy if exists beta_feedback_insert_own on public.beta_feedback;
create policy beta_feedback_insert_own
on public.beta_feedback
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists beta_feedback_select_own_or_admin on public.beta_feedback;
create policy beta_feedback_select_own_or_admin
on public.beta_feedback
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);

drop policy if exists beta_feedback_admin_update on public.beta_feedback;
create policy beta_feedback_admin_update
on public.beta_feedback
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);

revoke all on public.beta_feedback from anon;
grant select, insert, update on public.beta_feedback to authenticated;
