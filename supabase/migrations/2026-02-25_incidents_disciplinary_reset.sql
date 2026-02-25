alter table public.incidents
add column if not exists disciplinary_reset_applied boolean not null default false;

alter table public.incidents
add column if not exists disciplinary_reset_at date;

alter table public.incidents
add column if not exists disciplinary_reset_inferred boolean not null default false;

create index if not exists incidents_disciplinary_reset_idx
on public.incidents (disciplinary_reset_applied, disciplinary_reset_at);

