-- Smoke test for RLS rules on incidents flow and classes hardening.
-- Run in Supabase SQL Editor after applying:
-- 1) 2026-02-09_incidents_role_rls.sql
-- 2) 2026-02-09_z_classes_admin_rls.sql

do $$
declare
  v_admin_id uuid;
  v_admin_email text;
  v_director_id uuid;
  v_director_email text;
  v_professor_id uuid;
  v_professor_email text;
  v_director_class_id uuid;
  v_other_class_id uuid;

  v_incident_director_class uuid;
  v_incident_other_class uuid;
  v_incident_professor uuid;
  v_followup_id uuid;
  v_comment_id uuid;

  v_blocked boolean;
  v_row_count integer;
begin
  -- Pick one user per role (must exist in your project)
  select u.id, lower(u.email)
    into v_admin_id, v_admin_email
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.authorized_emails ae on lower(ae.email) = lower(u.email)
  where u.email is not null
    and u.deleted_at is null
    and coalesce(
      nullif(lower(trim(coalesce(p.role, ''))), ''),
      nullif(lower(trim(coalesce(ae.role, ''))), '')
    ) = 'admin'
  order by lower(u.email)
  limit 1;

  select u.id, lower(u.email)
    into v_director_id, v_director_email
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.authorized_emails ae on lower(ae.email) = lower(u.email)
  where u.email is not null
    and u.deleted_at is null
    and coalesce(
      nullif(lower(trim(coalesce(p.role, ''))), ''),
      nullif(lower(trim(coalesce(ae.role, ''))), '')
    ) = 'diretor'
  order by lower(u.email)
  limit 1;

  select u.id, lower(u.email)
    into v_professor_id, v_professor_email
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.authorized_emails ae on lower(ae.email) = lower(u.email)
  where u.email is not null
    and u.deleted_at is null
    and coalesce(
      nullif(lower(trim(coalesce(p.role, ''))), ''),
      nullif(lower(trim(coalesce(ae.role, ''))), '')
    ) = 'professor'
  order by lower(u.email)
  limit 1;

  if v_admin_id is null or v_director_id is null or v_professor_id is null then
    raise notice 'Available profile roles: %',
      coalesce(
        (select string_agg(distinct lower(trim(p.role)), ', ' order by lower(trim(p.role))) from public.profiles p),
        '(none)'
      );
    raise notice 'Available authorized_emails roles: %',
      coalesce(
        (
          select string_agg(
            distinct lower(trim(coalesce(ae.role, ''))),
            ', '
            order by lower(trim(coalesce(ae.role, '')))
          )
          from public.authorized_emails ae
        ),
        '(none)'
      );
    raise exception
      'Missing test users. admin_found=%, diretor_found=%, professor_found=%',
      (v_admin_id is not null),
      (v_director_id is not null),
      (v_professor_id is not null);
  end if;

  -- Class assigned to selected director (id or email fallback)
  select c.id
    into v_director_class_id
  from public.classes c
  where c.director_id = v_director_id
     or lower(coalesce(c.director_email, '')) = v_director_email
  limit 1;

  -- Another class not assigned to this director
  select c.id
    into v_other_class_id
  from public.classes c
  where c.id <> v_director_class_id
  limit 1;

  if v_director_class_id is null or v_other_class_id is null then
    raise exception 'Could not find director class and/or other class.';
  end if;

  raise notice 'Context -> admin: %, diretor: %, professor: %', v_admin_email, v_director_email, v_professor_email;
  raise notice 'Classes -> diretor_class: %, other_class: %', v_director_class_id, v_other_class_id;

  -- Apply RLS role for actual smoke checks after loading context
  execute 'set local role authenticated';

  -- ===========================================================================
  -- Admin bootstrap data
  -- ===========================================================================
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin_id::text, 'email', v_admin_email, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  perform set_config('request.jwt.claim.email', v_admin_email, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  insert into public.incidents (
    owner_id, class_id, date, student_ids, episodes,
    calculated_severity, final_severity, description, status, created_by
  )
  values (
    auth.uid(), v_director_class_id, current_date, '{}'::uuid[], '{}'::text[],
    'leve', 'leve', 'SMOKE: incident director class', 'aberta', auth.uid()
  )
  returning id into v_incident_director_class;

  insert into public.incidents (
    owner_id, class_id, date, student_ids, episodes,
    calculated_severity, final_severity, description, status, created_by
  )
  values (
    auth.uid(), v_other_class_id, current_date, '{}'::uuid[], '{}'::text[],
    'leve', 'leve', 'SMOKE: incident other class', 'aberta', auth.uid()
  )
  returning id into v_incident_other_class;

  raise notice 'PASS: admin inserted base incidents.';

  -- ===========================================================================
  -- Professor: can INSERT incident, cannot UPDATE incident/follow_up/comment, cannot UPDATE class
  -- ===========================================================================
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_professor_id::text, 'email', v_professor_email, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', v_professor_id::text, true);
  perform set_config('request.jwt.claim.email', v_professor_email, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  insert into public.incidents (
    owner_id, class_id, date, student_ids, episodes,
    calculated_severity, final_severity, description, status, created_by
  )
  values (
    auth.uid(), v_director_class_id, current_date, '{}'::uuid[], '{}'::text[],
    'leve', 'leve', 'SMOKE: professor open incident', 'aberta', auth.uid()
  )
  returning id into v_incident_professor;

  raise notice 'PASS: professor inserted incident.';

  update public.incidents
    set status = 'acompanhamento'
  where id = v_incident_professor;
  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then
    raise notice 'PASS: professor blocked on incident update (0 rows).';
  else
    raise exception 'FAIL: professor should not update incidents (updated % row(s)).', v_row_count;
  end if;

  v_blocked := false;
  begin
    insert into public.follow_ups (
      owner_id, incident_id, type, date, created_by
    )
    values (
      auth.uid(), v_incident_professor, 'conversa_individual', current_date, auth.uid()
    );
  exception when others then
    v_blocked := true;
    raise notice 'PASS: professor blocked on follow_up insert (%).', sqlerrm;
  end;
  if not v_blocked then
    raise exception 'FAIL: professor should not insert follow_ups.';
  end if;

  v_blocked := false;
  begin
    insert into public.comments (
      owner_id, incident_id, user_id, user_name, text
    )
    values (
      auth.uid(), v_incident_professor, auth.uid(), v_professor_email, 'SMOKE: professor comment'
    );
  exception when others then
    v_blocked := true;
    raise notice 'PASS: professor blocked on comment insert (%).', sqlerrm;
  end;
  if not v_blocked then
    raise exception 'FAIL: professor should not insert comments.';
  end if;

  update public.classes
    set archived_reason = archived_reason
  where id = v_other_class_id;
  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then
    raise notice 'PASS: professor blocked on class update (0 rows).';
  else
    raise exception 'FAIL: professor should not update classes (updated % row(s)).', v_row_count;
  end if;

  -- ===========================================================================
  -- Diretor: manage own class only
  -- ===========================================================================
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_director_id::text, 'email', v_director_email, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', v_director_id::text, true);
  perform set_config('request.jwt.claim.email', v_director_email, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  update public.incidents
    set status = 'acompanhamento'
  where id = v_incident_director_class;

  if not found then
    raise exception 'FAIL: diretor could not update own class incident.';
  end if;
  raise notice 'PASS: diretor updated own class incident.';

  insert into public.follow_ups (
    owner_id, incident_id, type, date, created_by, motivo
  )
  values (
    auth.uid(), v_incident_director_class, 'conversa_individual', current_date, auth.uid(), 'SMOKE'
  )
  returning id into v_followup_id;

  raise notice 'PASS: diretor inserted follow_up on own class incident.';

  insert into public.comments (
    owner_id, incident_id, user_id, user_name, text
  )
  values (
    auth.uid(), v_incident_director_class, auth.uid(), v_director_email, 'SMOKE: diretor comment'
  )
  returning id into v_comment_id;

  raise notice 'PASS: diretor inserted comment on own class incident.';

  update public.incidents
    set status = 'acompanhamento'
  where id = v_incident_other_class;
  get diagnostics v_row_count = row_count;
  if v_row_count = 0 then
    raise notice 'PASS: diretor blocked on other class incident update (0 rows).';
  else
    raise exception 'FAIL: diretor should not manage other class incidents (updated % row(s)).', v_row_count;
  end if;

  -- ===========================================================================
  -- Admin: full management (including classes update)
  -- ===========================================================================
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin_id::text, 'email', v_admin_email, 'role', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  perform set_config('request.jwt.claim.email', v_admin_email, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  update public.incidents
    set status = 'acompanhamento'
  where id = v_incident_other_class;

  if not found then
    raise exception 'FAIL: admin could not update other class incident.';
  end if;
  raise notice 'PASS: admin updated other class incident.';

  update public.classes
    set archived_reason = archived_reason
  where id = v_other_class_id;

  if not found then
    raise exception 'FAIL: admin could not update classes.';
  end if;
  raise notice 'PASS: admin can update classes.';

  -- Cleanup
  if v_comment_id is not null then
    delete from public.comments where id = v_comment_id;
  end if;
  if v_followup_id is not null then
    delete from public.follow_ups where id = v_followup_id;
  end if;
  if v_incident_professor is not null then
    delete from public.incidents where id = v_incident_professor;
  end if;
  if v_incident_director_class is not null then
    delete from public.incidents where id = v_incident_director_class;
  end if;
  if v_incident_other_class is not null then
    delete from public.incidents where id = v_incident_other_class;
  end if;

  raise notice 'SMOKE TEST PASSED: RLS behavior is consistent with role rules.';
end $$;
