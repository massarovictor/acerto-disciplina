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
      coalesce(array_length($1, 1), 0) > 0
      or $2 is not null
    )
    and (
      $1 is null
      or (coalesce(array_length($1, 1), 0) > 0 and g.class_id = any($1))
    )
    and ($2 is null or g.student_id = $2)
    and ($3 is null or g.quarter = $3)
    and ($4 is null or g.school_year = $4);
$$;
