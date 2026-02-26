-- Normalize and backfill creator display names for incidents and certificate events.
-- Idempotent migration focused on replacing generic/slug labels (e.g. "usuario", "norma.fernandes")
-- with human-readable names sourced from profiles/authorized_emails.

create or replace function public.normalize_display_name(input_value text)
returns text
language plpgsql
immutable
as $$
declare
  raw_value text := btrim(coalesce(input_value, ''));
  generic_key text;
  tokens text[];
  output_value text := '';
  token text;
  idx integer;
begin
  if raw_value = '' then
    return null;
  end if;

  if position('@' in raw_value) > 0 then
    raw_value := split_part(raw_value, '@', 1);
  end if;

  raw_value := lower(raw_value);
  raw_value := regexp_replace(raw_value, '[._-]+', ' ', 'g');
  raw_value := regexp_replace(raw_value, '\s+', ' ', 'g');
  raw_value := btrim(raw_value);

  if raw_value = '' then
    return null;
  end if;

  generic_key := lower(
    translate(
      raw_value,
      'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
      'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
    )
  );

  if generic_key in (
    'usuario',
    'usuarios',
    'usuario da equipe',
    'usuarios da equipe',
    'user',
    'sem nome',
    'nao identificado',
    'nao identificada'
  ) then
    return null;
  end if;

  tokens := string_to_array(raw_value, ' ');
  if tokens is null or array_length(tokens, 1) is null then
    return null;
  end if;

  for idx in 1..array_length(tokens, 1) loop
    token := tokens[idx];

    if idx > 1 and token in ('da', 'de', 'do', 'das', 'dos', 'e') then
      output_value := output_value || ' ' || token;
    else
      output_value := output_value
        || case when output_value = '' then '' else ' ' end
        || upper(left(token, 1))
        || substr(token, 2);
    end if;
  end loop;

  return nullif(btrim(output_value), '');
end;
$$;

-- 1) Keep profiles.name healthy using authorized_emails.display_name and auth.users.email.
with resolved_profiles as (
  select
    p.id,
    public.normalize_display_name(
      coalesce(
        nullif(btrim(ae.display_name), ''),
        nullif(btrim(p.name), ''),
        nullif(btrim(u.email), '')
      )
    ) as resolved_name
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join public.authorized_emails ae
    on lower(ae.email) = lower(coalesce(u.email, ''))
)
update public.profiles p
set name = rp.resolved_name
from resolved_profiles rp
where p.id = rp.id
  and rp.resolved_name is not null
  and (
    p.name is null
    or btrim(p.name) = ''
    or public.normalize_display_name(p.name) is null
    or p.name ~ '^[a-z0-9._-]+$'
  );

-- 2) Backfill incidents.created_by_name from profiles.
with resolved_incident_creator as (
  select
    i.id,
    coalesce(
      public.normalize_display_name(pc.name),
      public.normalize_display_name(po.name),
      public.normalize_display_name(uc.email),
      public.normalize_display_name(uo.email),
      public.normalize_display_name(i.created_by_name)
    ) as resolved_name
  from public.incidents i
  left join public.profiles pc on pc.id = i.created_by
  left join public.profiles po on po.id = i.owner_id
  left join auth.users uc on uc.id = i.created_by
  left join auth.users uo on uo.id = i.owner_id
)
update public.incidents i
set created_by_name = ric.resolved_name
from resolved_incident_creator ric
where i.id = ric.id
  and ric.resolved_name is not null
  and (
    i.created_by_name is null
    or btrim(i.created_by_name) = ''
    or public.normalize_display_name(i.created_by_name) is null
    or i.created_by_name ~ '^[a-z0-9._-]+$'
  );

-- 3) Backfill certificate_events.created_by_name from owner profile.
with resolved_certificate_creator as (
  select
    ce.id,
    coalesce(
      public.normalize_display_name(p.name),
      public.normalize_display_name(u.email),
      public.normalize_display_name(ce.created_by_name)
    ) as resolved_name
  from public.certificate_events ce
  left join public.profiles p on p.id = ce.owner_id
  left join auth.users u on u.id = ce.owner_id
)
update public.certificate_events ce
set created_by_name = rcc.resolved_name
from resolved_certificate_creator rcc
where ce.id = rcc.id
  and rcc.resolved_name is not null
  and (
    ce.created_by_name is null
    or btrim(ce.created_by_name) = ''
    or public.normalize_display_name(ce.created_by_name) is null
    or ce.created_by_name ~ '^[a-z0-9._-]+$'
  );
