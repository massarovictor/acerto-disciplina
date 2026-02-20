alter table public.incidents
add column if not exists incident_type text;

update public.incidents
set incident_type = 'disciplinar'
where incident_type is null;

alter table public.incidents
alter column incident_type set default 'disciplinar';

alter table public.incidents
alter column incident_type set not null;

alter table public.incidents
drop constraint if exists incidents_incident_type_check;

alter table public.incidents
add constraint incidents_incident_type_check
check (incident_type in ('disciplinar', 'acompanhamento_familiar'));

create index if not exists incidents_type_class_date_idx
on public.incidents (incident_type, class_id, date desc);

