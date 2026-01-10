-- Switch to using class name only; remove class_number artifacts.

-- Drop class_number-related functions and trigger.
drop trigger if exists set_class_number on public.classes;
drop function if exists public.set_class_number();
drop function if exists public.try_build_class_number(text, date, smallint, integer, integer, text);
drop function if exists public.build_class_number(text, date, smallint, integer, integer, text);
drop function if exists public.course_to_code(text);

-- Remove class_number column and constraint if present.
alter table public.classes
  drop constraint if exists classes_owner_id_class_number_key;

alter table public.classes
  drop column if exists class_number;

-- Update class name builder to include year range when available.
drop function if exists public.build_class_name(text, text, text);

create or replace function public.build_class_name(
  start_calendar_year int,
  end_calendar_year int,
  series text,
  letter text,
  course text
)
returns text
language plpgsql
stable
as $$
declare
  base_name text;
begin
  if start_calendar_year is not null and end_calendar_year is not null then
    base_name := format('%s-%s', start_calendar_year, end_calendar_year);
  else
    base_name := btrim(series);
  end if;

  if course is not null and btrim(course) <> '' then
    base_name := base_name || ' ' || btrim(course);
  end if;

  if letter is not null and btrim(letter) <> '' then
    base_name := base_name || ' ' || upper(btrim(letter));
  end if;

  return base_name;
end;
$$;

create or replace function public.set_class_name()
returns trigger
language plpgsql
as $$
begin
  new.name := public.build_class_name(
    new.start_calendar_year,
    new.end_calendar_year,
    new.series,
    new.letter,
    new.course
  );
  return new;
end;
$$;

drop trigger if exists set_class_name on public.classes;
create trigger set_class_name
before insert or update on public.classes
for each row execute function public.set_class_name();

-- Ensure class names are unique per owner.
create unique index if not exists classes_owner_id_name_key
  on public.classes (owner_id, name);
