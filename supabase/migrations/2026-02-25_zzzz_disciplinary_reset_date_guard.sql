-- Guard disciplinary reset date so it never predates the incident date.
-- Keeps reset semantics consistent even if a follow-up date is edited backward.

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
      when i.disciplinary_reset_at is null then greatest(new.date, i.date)
      when greatest(new.date, i.date) > i.disciplinary_reset_at then greatest(new.date, i.date)
      else i.disciplinary_reset_at
    end,
    disciplinary_reset_inferred = false,
    updated_at = now()
  where i.id = new.incident_id
    and i.incident_type = 'disciplinar'
    and (
      i.disciplinary_reset_applied = false
      or i.disciplinary_reset_at is null
      or greatest(new.date, i.date) > i.disciplinary_reset_at
      or i.disciplinary_reset_inferred = true
    );

  return new;
end;
$$;

update public.incidents i
set disciplinary_reset_at = greatest(coalesce(i.disciplinary_reset_at, i.date), i.date)
where i.incident_type = 'disciplinar'
  and i.disciplinary_reset_applied = true
  and (
    i.disciplinary_reset_at is null
    or i.disciplinary_reset_at < i.date
  );
