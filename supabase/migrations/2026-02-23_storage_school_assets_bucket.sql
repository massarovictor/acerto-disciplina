-- Private bucket for school branding assets used in documents/certificates.

set check_function_bodies = off;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'school-assets',
  'school-assets',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "school_assets_authenticated_select" on storage.objects;
drop policy if exists "school_assets_authenticated_insert" on storage.objects;
drop policy if exists "school_assets_authenticated_update" on storage.objects;
drop policy if exists "school_assets_authenticated_delete" on storage.objects;

create policy "school_assets_authenticated_select"
on storage.objects
for select
to authenticated
using (bucket_id = 'school-assets');

create policy "school_assets_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'school-assets');

create policy "school_assets_authenticated_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'school-assets')
with check (bucket_id = 'school-assets');

create policy "school_assets_authenticated_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'school-assets');

