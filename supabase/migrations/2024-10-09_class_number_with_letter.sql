-- Non-destructive migration: include letter in class_number when possible.
-- This does NOT delete data.

create extension if not exists "unaccent";

create or replace function public.course_to_code(course text)
returns text
language plpgsql
stable
as $$
declare
  normalized text;
begin
  if course is null or btrim(course) = '' then
    return null;
  end if;

  normalized := regexp_replace(unaccent(lower(trim(course))), '[[:space:]]+', ' ', 'g');

  if normalized = 'redes de computadores' then
    return 'RDC';
  elseif normalized = 'desenvolvimento de sistemas' then
    return 'DS';
  elseif normalized in ('administracao financas', 'administracao e financas', 'administracao de financas', 'administracao financeira') then
    return 'ADF';
  elseif normalized = 'comercio' then
    return 'COM';
  elseif normalized = 'agronegocio' then
    return 'AGR';
  elseif normalized = 'fruticultura' then
    return 'FRU';
  else
    raise exception 'Curso "%" nao mapeado para sigla', course;
  end if;
end;
$$;

create or replace function public.build_class_number(
  course text,
  start_year_date date,
  start_year smallint,
  start_calendar_year int,
  end_calendar_year int,
  letter text
)
returns text
language plpgsql
stable
as $$
declare
  start_year_value int;
  end_year_value int;
  start_year_number int;
  normalized_letter text;
begin
  if start_calendar_year is not null and end_calendar_year is not null then
    if end_calendar_year < start_calendar_year then
      raise exception 'end_calendar_year must be >= start_calendar_year';
    end if;

    start_year_value := start_calendar_year;
    end_year_value := end_calendar_year;
  else
    if start_year_date is null then
      raise exception 'start_year_date or start_calendar_year/end_calendar_year is required to build class_number';
    end if;

    start_year_value := extract(year from start_year_date)::int;
    start_year_number := coalesce(start_year, 1);

    if start_year_number < 1 or start_year_number > 3 then
      raise exception 'start_year must be between 1 and 3';
    end if;

    end_year_value := start_year_value + (3 - start_year_number);
  end if;
  if letter is not null and btrim(letter) <> '' then
    normalized_letter := upper(btrim(letter));
  end if;

  return format(
    '%s-%s%s',
    start_year_value,
    end_year_value,
    case when normalized_letter is not null then '-' || normalized_letter else '' end
  );
end;
$$;

create or replace function public.try_build_class_number(
  course text,
  start_year_date date,
  start_year smallint,
  start_calendar_year int,
  end_calendar_year int,
  letter text
)
returns text
language plpgsql
stable
as $$
begin
  return public.build_class_number(
    course,
    start_year_date,
    start_year,
    start_calendar_year,
    end_calendar_year,
    letter
  );
exception when others then
  return null;
end;
$$;

create or replace function public.set_class_number()
returns trigger
language plpgsql
as $$
declare
  next_number text;
begin
  next_number := public.try_build_class_number(
    new.course,
    new.start_year_date,
    new.start_year,
    new.start_calendar_year,
    new.end_calendar_year,
    new.letter
  );

  if next_number is not null then
    new.class_number := next_number;
  end if;

  return new;
end;
$$;

drop trigger if exists set_class_number on public.classes;
create trigger set_class_number
before insert or update on public.classes
for each row execute function public.set_class_number();

update public.classes
set class_number = coalesce(
  public.try_build_class_number(
    course,
    start_year_date,
    start_year,
    start_calendar_year,
    end_calendar_year,
    letter
  ),
  class_number
);
