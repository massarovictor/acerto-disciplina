-- Atomic update for certificate events + recipients.
-- Prevents partial writes when editing certificates with multiple students.

set check_function_bodies = off;

drop function if exists public.save_certificate_event_atomic(
  uuid,
  text,
  text,
  uuid,
  text,
  smallint,
  text,
  text[],
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  integer,
  jsonb
);

create or replace function public.save_certificate_event_atomic(
  p_event_id uuid,
  p_title text,
  p_certificate_type text,
  p_class_id uuid,
  p_class_name_snapshot text,
  p_school_year smallint,
  p_period_mode text,
  p_selected_quarters text[],
  p_period_label text,
  p_reference_type text,
  p_reference_value text,
  p_reference_label text,
  p_base_text text,
  p_teacher_name text,
  p_director_name text,
  p_signature_mode text,
  p_type_meta jsonb,
  p_students_count integer,
  p_students jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_current_role text;
  v_students jsonb := coalesce(p_students, '[]'::jsonb);
begin
  if jsonb_typeof(v_students) <> 'array' then
    raise exception 'p_students must be a JSON array';
  end if;

  select ce.owner_id
  into v_owner_id
  from public.certificate_events ce
  where ce.id = p_event_id
  for update;

  if v_owner_id is null then
    raise exception 'Certificate event not found: %', p_event_id;
  end if;

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_current_role := public.current_app_role();
  if v_current_role <> 'admin' and v_owner_id <> auth.uid() then
    raise exception 'Not authorized to update this certificate event';
  end if;

  update public.certificate_events
  set
    title = btrim(coalesce(p_title, title)),
    certificate_type = coalesce(p_certificate_type, certificate_type),
    class_id = p_class_id,
    class_name_snapshot = btrim(coalesce(p_class_name_snapshot, class_name_snapshot)),
    school_year = coalesce(p_school_year, school_year),
    period_mode = coalesce(p_period_mode, period_mode),
    selected_quarters = coalesce(p_selected_quarters, '{}'::text[]),
    period_label = btrim(coalesce(p_period_label, period_label)),
    reference_type = p_reference_type,
    reference_value = p_reference_value,
    reference_label = p_reference_label,
    base_text = btrim(coalesce(p_base_text, base_text)),
    teacher_name = nullif(btrim(coalesce(p_teacher_name, '')), ''),
    director_name = nullif(btrim(coalesce(p_director_name, '')), ''),
    signature_mode = coalesce(p_signature_mode, signature_mode),
    type_meta = coalesce(p_type_meta, '{}'::jsonb),
    students_count = greatest(
      coalesce(p_students_count, jsonb_array_length(v_students)),
      0
    ),
    updated_at = now()
  where id = p_event_id;

  delete from public.certificate_event_students
  where certificate_event_id = p_event_id;

  insert into public.certificate_event_students (
    owner_id,
    certificate_event_id,
    student_id,
    student_name_snapshot,
    text_override,
    highlight_status,
    highlight_average,
    verification_code,
    verification_status
  )
  select
    v_owner_id,
    p_event_id,
    nullif(btrim(student_item->>'student_id'), '')::uuid,
    coalesce(
      nullif(btrim(student_item->>'student_name_snapshot'), ''),
      'Aluno sem nome'
    ),
    nullif(student_item->>'text_override', ''),
    case
      when student_item->>'highlight_status' in ('confirmed', 'pending')
        then student_item->>'highlight_status'
      else null
    end,
    case
      when (student_item->>'highlight_average') ~ '^-?[0-9]+(\\.[0-9]+)?$'
        then (student_item->>'highlight_average')::numeric
      else null
    end,
    upper(
      coalesce(
        nullif(
          regexp_replace(
            student_item->>'verification_code',
            '[^a-zA-Z0-9]',
            '',
            'g'
          ),
          ''
        ),
        replace(gen_random_uuid()::text, '-', '')
      )
    ),
    case
      when student_item->>'verification_status' = 'revoked' then 'revoked'
      else 'valid'
    end
  from jsonb_array_elements(v_students) as student_item;
end;
$$;

revoke all on function public.save_certificate_event_atomic(
  uuid,
  text,
  text,
  uuid,
  text,
  smallint,
  text,
  text[],
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  integer,
  jsonb
) from public;

grant execute on function public.save_certificate_event_atomic(
  uuid,
  text,
  text,
  uuid,
  text,
  smallint,
  text,
  text[],
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  integer,
  jsonb
) to authenticated;
