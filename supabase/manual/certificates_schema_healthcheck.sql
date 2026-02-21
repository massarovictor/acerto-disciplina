-- Healthcheck for certificate verification schema (run in Supabase SQL Editor).
-- Precondition: migration 2026-02-22_certificate_verification_and_signature.sql already applied.

-- Optional: refresh PostgREST schema cache after migrations.
notify pgrst, 'reload schema';

-- 1) Required columns.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'certificate_event_students'
  and column_name in ('verification_code', 'verification_status')
order by column_name;

-- 2) Unique index for verification code.
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'certificate_event_students'
  and indexname ilike '%verification_code%';

-- 3) Data consistency.
select
  count(*) filter (where verification_code is null or btrim(verification_code) = '') as missing_verification_code,
  count(*) filter (where verification_status is null) as missing_verification_status
from public.certificate_event_students;

-- 4) Public verification RPC availability.
select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'verify_certificate_code';

