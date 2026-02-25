-- Hardening for certificate atomic save RPC:
-- ensure admin can edit events owned by other users without RLS insert conflicts.

alter function public.save_certificate_event_atomic(
  uuid,
  text,
  text,
  uuid,
  text,
  smallint,
  text,
  text[],
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  integer,
  jsonb
) security definer;

alter function public.save_certificate_event_atomic(
  uuid,
  text,
  text,
  uuid,
  text,
  smallint,
  text,
  text[],
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  integer,
  jsonb
) set search_path = public;
