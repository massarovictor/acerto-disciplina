-- Add school_year to grades to support multiple academic years per class.

alter table public.grades
  add column if not exists school_year smallint not null default 1;

alter table public.grades
  drop constraint if exists grades_student_id_class_id_subject_quarter_key;

alter table public.grades
  add constraint grades_student_id_class_id_subject_quarter_school_year_key
  unique (student_id, class_id, subject, quarter, school_year);

alter table public.grades
  drop constraint if exists grades_school_year_check;

alter table public.grades
  add constraint grades_school_year_check
  check (school_year between 1 and 3);
