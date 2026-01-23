-- Aggregated grades fetch for analytics (single call, avoids pagination)
create or replace function public.fetch_grades_analytics(
  class_ids uuid[] default null,
  student_id uuid default null,
  quarter text default null,
  school_year smallint default null
)
returns jsonb
language sql
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', g.id,
        'student_id', g.student_id,
        'class_id', g.class_id,
        'subject', g.subject,
        'quarter', g.quarter,
        'school_year', g.school_year,
        'grade', g.grade,
        'recorded_at', g.recorded_at
      )
    ),
    '[]'::jsonb
  )
  from public.grades g
  where (
      coalesce(array_length(class_ids, 1), 0) > 0
      or student_id is not null
    )
    and (
      class_ids is null
      or (coalesce(array_length(class_ids, 1), 0) > 0 and g.class_id = any(class_ids))
    )
    and (student_id is null or g.student_id = student_id)
    and (quarter is null or g.quarter = quarter)
    and (school_year is null or g.school_year = school_year);
$$;
