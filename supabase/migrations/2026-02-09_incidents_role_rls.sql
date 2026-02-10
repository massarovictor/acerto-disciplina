-- Role-aware RLS for incidents flow
-- Rules:
-- - admin: full access
-- - diretor: full management only for own classes
-- - professor: can only create/open incidents

set check_function_bodies = off;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.role
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    (
      select ae.role
      from public.authorized_emails ae
      where lower(ae.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      limit 1
    )
  );
$$;

create or replace function public.is_director_of_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = target_class_id
      and (
        c.director_id = auth.uid()
        or (
          c.director_email is not null
          and lower(c.director_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      )
  );
$$;

create or replace function public.can_manage_incident_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_app_role() = 'admin'
    or (
      public.current_app_role() = 'diretor'
      and target_class_id is not null
      and public.is_director_of_class(target_class_id)
    );
$$;

revoke all on function public.current_app_role() from public;
revoke all on function public.is_director_of_class(uuid) from public;
revoke all on function public.can_manage_incident_class(uuid) from public;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_director_of_class(uuid) to authenticated;
grant execute on function public.can_manage_incident_class(uuid) to authenticated;

alter table public.incidents enable row level security;
alter table public.follow_ups enable row level security;
alter table public.comments enable row level security;

drop policy if exists "incidents_owner_access" on public.incidents;
drop policy if exists "incidents_authenticated_access" on public.incidents;
drop policy if exists "incidents_select_authenticated" on public.incidents;
drop policy if exists "incidents_insert_open_by_role" on public.incidents;
drop policy if exists "incidents_update_manage_by_role" on public.incidents;
drop policy if exists "incidents_delete_manage_by_role" on public.incidents;

create policy "incidents_select_authenticated"
on public.incidents
for select
to authenticated
using (true);

create policy "incidents_insert_open_by_role"
on public.incidents
for insert
to authenticated
with check (
  public.current_app_role() in ('admin', 'diretor', 'professor')
  and owner_id = auth.uid()
  and created_by = auth.uid()
);

create policy "incidents_update_manage_by_role"
on public.incidents
for update
to authenticated
using (public.can_manage_incident_class(class_id))
with check (public.can_manage_incident_class(class_id));

create policy "incidents_delete_manage_by_role"
on public.incidents
for delete
to authenticated
using (public.can_manage_incident_class(class_id));

drop policy if exists "follow_ups_owner_access" on public.follow_ups;
drop policy if exists "follow_ups_authenticated_access" on public.follow_ups;
drop policy if exists "follow_ups_select_authenticated" on public.follow_ups;
drop policy if exists "follow_ups_insert_manage_by_role" on public.follow_ups;
drop policy if exists "follow_ups_update_manage_by_role" on public.follow_ups;
drop policy if exists "follow_ups_delete_manage_by_role" on public.follow_ups;

create policy "follow_ups_select_authenticated"
on public.follow_ups
for select
to authenticated
using (true);

create policy "follow_ups_insert_manage_by_role"
on public.follow_ups
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and created_by = auth.uid()
  and public.can_manage_incident_class(
    (
      select i.class_id
      from public.incidents i
      where i.id = incident_id
    )
  )
);

create policy "follow_ups_update_manage_by_role"
on public.follow_ups
for update
to authenticated
using (
  public.can_manage_incident_class(
    (
      select i.class_id
      from public.incidents i
      where i.id = incident_id
    )
  )
)
with check (
  public.can_manage_incident_class(
    (
      select i.class_id
      from public.incidents i
      where i.id = incident_id
    )
  )
);

create policy "follow_ups_delete_manage_by_role"
on public.follow_ups
for delete
to authenticated
using (
  public.can_manage_incident_class(
    (
      select i.class_id
      from public.incidents i
      where i.id = incident_id
    )
  )
);

drop policy if exists "comments_owner_access" on public.comments;
drop policy if exists "comments_authenticated_access" on public.comments;
drop policy if exists "comments_select_authenticated" on public.comments;
drop policy if exists "comments_insert_manage_by_role" on public.comments;
drop policy if exists "comments_delete_manage_by_role" on public.comments;

create policy "comments_select_authenticated"
on public.comments
for select
to authenticated
using (true);

create policy "comments_insert_manage_by_role"
on public.comments
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and (user_id is null or user_id = auth.uid())
  and public.can_manage_incident_class(
    (
      select i.class_id
      from public.incidents i
      where i.id = incident_id
    )
  )
);

create policy "comments_delete_manage_by_role"
on public.comments
for delete
to authenticated
using (
  public.can_manage_incident_class(
    (
      select i.class_id
      from public.incidents i
      where i.id = incident_id
    )
  )
);
