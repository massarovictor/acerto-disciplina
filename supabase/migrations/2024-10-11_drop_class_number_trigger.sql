-- Ensure legacy class_number trigger/functions are removed after column drop.

drop trigger if exists set_class_number on public.classes;
drop function if exists public.set_class_number();
drop function if exists public.try_build_class_number(text, date, smallint, integer, integer, text);
drop function if exists public.build_class_number(text, date, smallint, integer, integer, text);
drop function if exists public.course_to_code(text);
