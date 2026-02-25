alter table public.incidents
add column if not exists disciplinary_reset_applied boolean not null default false;

alter table public.incidents
add column if not exists disciplinary_reset_at date;

alter table public.incidents
add column if not exists disciplinary_reset_inferred boolean not null default false;

create index if not exists incidents_disciplinary_reset_idx
on public.incidents (disciplinary_reset_applied, disciplinary_reset_at);

alter table public.follow_ups
add column if not exists suspension_applied boolean not null default false;

update public.follow_ups
set suspension_applied = true
where suspension_applied = false
  and lower(translate(coalesce(providencias, ''), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')) like '%suspens%';

create or replace function public.apply_incident_reset_from_follow_up()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.suspension_applied, false) is not true then
    return new;
  end if;

  update public.incidents i
  set
    disciplinary_reset_applied = true,
    disciplinary_reset_at = case
      when i.disciplinary_reset_at is null then new.date
      when new.date > i.disciplinary_reset_at then new.date
      else i.disciplinary_reset_at
    end,
    disciplinary_reset_inferred = false,
    updated_at = now()
  where i.id = new.incident_id
    and i.incident_type = 'disciplinar'
    and (
      i.disciplinary_reset_applied = false
      or i.disciplinary_reset_at is null
      or new.date > i.disciplinary_reset_at
      or i.disciplinary_reset_inferred = true
    );

  return new;
end;
$$;

drop trigger if exists trg_follow_ups_apply_incident_reset on public.follow_ups;

create trigger trg_follow_ups_apply_incident_reset
after insert or update of suspension_applied, date
on public.follow_ups
for each row
execute function public.apply_incident_reset_from_follow_up();

with strong_followup_hits as (
  select
    fu.incident_id,
    max(fu.date) as reset_date
  from public.follow_ups fu
  where coalesce(fu.suspension_applied, false) = true
  group by fu.incident_id
),
strong_incident_hits as (
  select
    i.id,
    i.date as reset_date
  from public.incidents i
  where i.incident_type = 'disciplinar'
    and lower(translate(coalesce(i.actions, ''), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')) like '%suspens%'
),
strong_hits as (
  select
    i.id,
    coalesce(sf.reset_date, si.reset_date) as reset_date
  from public.incidents i
  left join strong_followup_hits sf on sf.incident_id = i.id
  left join strong_incident_hits si on si.id = i.id
  where i.incident_type = 'disciplinar'
    and (sf.incident_id is not null or si.id is not null)
),
clear_weak as (
  update public.incidents i
  set
    disciplinary_reset_applied = false,
    disciplinary_reset_at = null,
    disciplinary_reset_inferred = false
  where i.incident_type = 'disciplinar'
    and i.disciplinary_reset_inferred = true
    and not exists (
      select 1
      from strong_hits sh
      where sh.id = i.id
    )
  returning i.id
)
update public.incidents i
set
  disciplinary_reset_applied = true,
  disciplinary_reset_at = sh.reset_date,
  disciplinary_reset_inferred = true
from strong_hits sh
where i.id = sh.id
  and (
    i.disciplinary_reset_applied = false
    or i.disciplinary_reset_inferred = true
  );
