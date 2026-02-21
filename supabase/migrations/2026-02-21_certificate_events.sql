-- Persisted certificate events and student snapshots.
-- Depends on public.current_app_role() created in 2026-02-09_incidents_role_rls.sql

set check_function_bodies = off;

create table if not exists public.certificate_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  created_by_name text not null,
  title text not null,
  certificate_type text not null
    check (certificate_type in ('monitoria', 'destaque', 'evento_participacao', 'evento_organizacao')),
  class_id uuid null references public.classes(id) on delete set null,
  class_name_snapshot text not null,
  school_year smallint not null check (school_year between 1 and 3),
  period_mode text not null check (period_mode in ('quarters', 'annual')),
  selected_quarters text[] not null default '{}'::text[],
  period_label text not null,
  reference_type text null check (reference_type in ('subject', 'area')),
  reference_value text null,
  reference_label text null,
  base_text text not null,
  teacher_name text null,
  director_name text null,
  type_meta jsonb not null default '{}'::jsonb,
  students_count integer not null default 0 check (students_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists certificate_events_owner_created_at_idx
  on public.certificate_events (owner_id, created_at desc);

create index if not exists certificate_events_type_created_at_idx
  on public.certificate_events (certificate_type, created_at desc);

create index if not exists certificate_events_class_created_at_idx
  on public.certificate_events (class_id, created_at desc);

create table if not exists public.certificate_event_students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  certificate_event_id uuid not null references public.certificate_events(id) on delete cascade,
  student_id uuid null references public.students(id) on delete set null,
  student_name_snapshot text not null,
  text_override text null,
  highlight_status text null check (highlight_status in ('confirmed', 'pending')),
  highlight_average numeric null,
  created_at timestamptz not null default now()
);

create index if not exists certificate_event_students_event_idx
  on public.certificate_event_students (certificate_event_id);

create index if not exists certificate_event_students_owner_idx
  on public.certificate_event_students (owner_id);

alter table public.certificate_events enable row level security;
alter table public.certificate_event_students enable row level security;

drop policy if exists "certificate_events_select_by_role" on public.certificate_events;
drop policy if exists "certificate_events_insert_own" on public.certificate_events;
drop policy if exists "certificate_events_update_by_role" on public.certificate_events;
drop policy if exists "certificate_events_delete_by_role" on public.certificate_events;

create policy "certificate_events_select_by_role"
on public.certificate_events
for select
to authenticated
using (
  public.current_app_role() = 'admin'
  or owner_id = auth.uid()
);

create policy "certificate_events_insert_own"
on public.certificate_events
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "certificate_events_update_by_role"
on public.certificate_events
for update
to authenticated
using (
  public.current_app_role() = 'admin'
  or owner_id = auth.uid()
)
with check (
  public.current_app_role() = 'admin'
  or owner_id = auth.uid()
);

create policy "certificate_events_delete_by_role"
on public.certificate_events
for delete
to authenticated
using (
  public.current_app_role() = 'admin'
  or owner_id = auth.uid()
);

drop policy if exists "certificate_event_students_select_by_role" on public.certificate_event_students;
drop policy if exists "certificate_event_students_insert_own" on public.certificate_event_students;
drop policy if exists "certificate_event_students_update_by_role" on public.certificate_event_students;
drop policy if exists "certificate_event_students_delete_by_role" on public.certificate_event_students;

create policy "certificate_event_students_select_by_role"
on public.certificate_event_students
for select
to authenticated
using (
  public.current_app_role() = 'admin'
  or owner_id = auth.uid()
);

create policy "certificate_event_students_insert_own"
on public.certificate_event_students
for insert
to authenticated
with check (owner_id = auth.uid());

create policy "certificate_event_students_update_by_role"
on public.certificate_event_students
for update
to authenticated
using (
  public.current_app_role() = 'admin'
  or owner_id = auth.uid()
)
with check (
  public.current_app_role() = 'admin'
  or owner_id = auth.uid()
);

create policy "certificate_event_students_delete_by_role"
on public.certificate_event_students
for delete
to authenticated
using (
  public.current_app_role() = 'admin'
  or owner_id = auth.uid()
);
