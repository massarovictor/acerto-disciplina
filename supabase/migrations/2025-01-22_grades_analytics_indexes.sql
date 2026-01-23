-- Indexes to speed up analytics-grade filters
create index if not exists grades_class_year_quarter_idx
  on public.grades (class_id, school_year, quarter);

create index if not exists grades_student_year_quarter_idx
  on public.grades (student_id, school_year, quarter);
