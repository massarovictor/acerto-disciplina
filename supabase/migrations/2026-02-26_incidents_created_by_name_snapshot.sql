-- Snapshot creator name on incidents to avoid UUID-only UI labels
-- when profile lookup is restricted by RLS.

alter table public.incidents
add column if not exists created_by_name text;

update public.incidents i
set created_by_name = p.name
from public.profiles p
where i.created_by = p.id
  and (
    i.created_by_name is null
    or btrim(i.created_by_name) = ''
  );
