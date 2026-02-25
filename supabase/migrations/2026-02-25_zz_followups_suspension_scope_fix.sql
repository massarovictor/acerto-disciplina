-- Fix scope of retroactive suspension inference to disciplinary incidents only.
-- This migration is idempotent and safe after previous hardening migration.

with normalized_followups as (
  select
    fu.id,
    fu.incident_id,
    lower(
      translate(
        coalesce(fu.providencias, ''),
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
        'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
      )
    ) as providencias_norm
  from public.follow_ups fu
),
disciplinary_hits as (
  select nf.id
  from normalized_followups nf
  join public.incidents i on i.id = nf.incident_id
  where i.incident_type = 'disciplinar'
    and nf.providencias_norm like '%suspens%'
)
update public.follow_ups fu
set suspension_applied = true
where fu.id in (select id from disciplinary_hits)
  and coalesce(fu.suspension_applied, false) = false;

with normalized_followups as (
  select
    fu.id,
    fu.incident_id,
    lower(
      translate(
        coalesce(fu.providencias, ''),
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
        'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
      )
    ) as providencias_norm
  from public.follow_ups fu
),
family_hits as (
  select nf.id
  from normalized_followups nf
  join public.incidents i on i.id = nf.incident_id
  where i.incident_type <> 'disciplinar'
    and nf.providencias_norm like '%suspens%'
)
update public.follow_ups fu
set suspension_applied = false
where fu.id in (select id from family_hits)
  and coalesce(fu.suspension_applied, false) = true;
