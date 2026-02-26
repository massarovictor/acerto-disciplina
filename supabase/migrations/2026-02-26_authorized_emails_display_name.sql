-- Store a display name alongside authorized emails so admin UI
-- can show human-readable user names without relying on profile joins.

alter table public.authorized_emails
add column if not exists display_name text;

-- Backfill from auth.users + public.profiles when possible.
update public.authorized_emails ae
set display_name = p.name
from auth.users u
join public.profiles p on p.id = u.id
where lower(coalesce(u.email, '')) = lower(ae.email)
  and (
    ae.display_name is null
    or btrim(ae.display_name) = ''
  );
