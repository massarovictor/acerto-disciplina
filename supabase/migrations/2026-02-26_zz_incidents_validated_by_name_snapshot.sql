-- Snapshot resolver name on incidents to support "Resolvida por" UI
-- without relying on profile joins at render time.

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

alter table public.incidents
add column if not exists validated_by_name text;

-- Backfill from validator profile/auth user email when possible.
with resolved_validator as (
  select
    i.id,
    coalesce(
      public.normalize_display_name(p.name),
      public.normalize_display_name(u.email),
      public.normalize_display_name(i.validated_by_name)
    ) as resolved_name
  from public.incidents i
  left join public.profiles p on p.id = i.validated_by
  left join auth.users u on u.id = i.validated_by
)
update public.incidents i
set validated_by_name = rv.resolved_name
from resolved_validator rv
where i.id = rv.id
  and rv.resolved_name is not null
  and (
    i.validated_by_name is null
    or btrim(i.validated_by_name) = ''
    or public.normalize_display_name(i.validated_by_name) is null
    or i.validated_by_name ~ '^[a-z0-9._-]+$'
  );
