-- School config: storage paths for logo and certificate side frame.

set check_function_bodies = off;

alter table public.school_config
  add column if not exists logo_storage_path text;

alter table public.school_config
  add column if not exists certificate_frame_storage_path text;

