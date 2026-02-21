-- Certificate signature mode + verification code by student snapshot.
-- Adds public RPC for QR/code validation without authentication.

set check_function_bodies = off;

alter table public.certificate_events
  add column if not exists signature_mode text;

update public.certificate_events
set signature_mode = 'digital_cursive'
where signature_mode is null;

alter table public.certificate_events
  alter column signature_mode set default 'digital_cursive';

alter table public.certificate_events
  alter column signature_mode set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'certificate_events_signature_mode_check'
  ) then
    alter table public.certificate_events
      add constraint certificate_events_signature_mode_check
      check (signature_mode in ('digital_cursive', 'physical_print'));
  end if;
end $$;

alter table public.certificate_event_students
  add column if not exists verification_code text;

update public.certificate_event_students
set verification_code = upper(replace(gen_random_uuid()::text, '-', ''))
where verification_code is null
   or btrim(verification_code) = '';

alter table public.certificate_event_students
  alter column verification_code set default upper(replace(gen_random_uuid()::text, '-', ''));

alter table public.certificate_event_students
  alter column verification_code set not null;

create unique index if not exists certificate_event_students_verification_code_uidx
  on public.certificate_event_students (verification_code);

alter table public.certificate_event_students
  add column if not exists verification_status text;

update public.certificate_event_students
set verification_status = 'valid'
where verification_status is null;

alter table public.certificate_event_students
  alter column verification_status set default 'valid';

alter table public.certificate_event_students
  alter column verification_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'certificate_event_students_verification_status_check'
  ) then
    alter table public.certificate_event_students
      add constraint certificate_event_students_verification_status_check
      check (verification_status in ('valid', 'revoked'));
  end if;
end $$;

create index if not exists certificate_event_students_verification_status_idx
  on public.certificate_event_students (verification_status);

drop function if exists public.verify_certificate_code(text);

create or replace function public.verify_certificate_code(p_code text)
returns table (
  verification_code text,
  verification_status text,
  issued_at timestamptz,
  student_name text,
  certificate_type text,
  event_title text,
  school_name text,
  class_name text
)
language sql
security definer
set search_path = public
as $$
  select
    ces.verification_code,
    ces.verification_status,
    ce.created_at as issued_at,
    ces.student_name_snapshot as student_name,
    ce.certificate_type,
    ce.title as event_title,
    coalesce(sc.school_name, 'INSTITUIÇÃO DE ENSINO') as school_name,
    ce.class_name_snapshot as class_name
  from public.certificate_event_students ces
  join public.certificate_events ce
    on ce.id = ces.certificate_event_id
  left join public.school_config sc
    on sc.id = '00000000-0000-0000-0000-000000000000'::uuid
  where ces.verification_code = upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'))
  limit 1
$$;

revoke all on function public.verify_certificate_code(text) from public;
grant execute on function public.verify_certificate_code(text) to anon;
grant execute on function public.verify_certificate_code(text) to authenticated;
