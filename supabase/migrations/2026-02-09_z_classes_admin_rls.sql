-- Harden classes RLS to avoid privilege escalation through director assignment changes.
-- Depends on public.current_app_role() created in 2026-02-09_incidents_role_rls.sql

alter table public.classes enable row level security;

drop policy if exists "classes_owner_access" on public.classes;
drop policy if exists "classes_authenticated_access" on public.classes;
drop policy if exists "classes_select_authenticated" on public.classes;
drop policy if exists "classes_insert_admin_only" on public.classes;
drop policy if exists "classes_update_admin_only" on public.classes;
drop policy if exists "classes_delete_admin_only" on public.classes;

create policy "classes_select_authenticated"
on public.classes
for select
to authenticated
using (true);

create policy "classes_insert_admin_only"
on public.classes
for insert
to authenticated
with check (
  public.current_app_role() = 'admin'
  and owner_id = auth.uid()
);

create policy "classes_update_admin_only"
on public.classes
for update
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "classes_delete_admin_only"
on public.classes
for delete
to authenticated
using (public.current_app_role() = 'admin');
