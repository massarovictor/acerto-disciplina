create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.build_class_name(
  start_calendar_year int,
  end_calendar_year int,
  series text,
  letter text,
  course text
)
returns text
language plpgsql
stable
as $$
declare
  base_name text;
begin
  if start_calendar_year is not null and end_calendar_year is not null then
    base_name := format('%s-%s', start_calendar_year, end_calendar_year);
  else
    base_name := btrim(series);
  end if;

  if course is not null and btrim(course) <> '' then
    base_name := base_name || ' ' || btrim(course);
  end if;

  if letter is not null and btrim(letter) <> '' then
    base_name := base_name || ' ' || upper(btrim(letter));
  end if;

  return base_name;
end;
$$;

create or replace function public.set_class_name()
returns trigger
language plpgsql
as $$
begin
  new.name := public.build_class_name(
    new.start_calendar_year,
    new.end_calendar_year,
    new.series,
    new.letter,
    new.course
  );
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'diretor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Usuario'),
    coalesce(new.raw_user_meta_data->>'role', 'diretor')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  series text not null,
  letter text,
  course text,
  director_id uuid references public.profiles(id),
  director_email text,
  active boolean not null default true,
  start_year smallint,
  current_year smallint,
  start_year_date date,
  start_calendar_year int,
  end_calendar_year int,
  archived boolean not null default false,
  archived_at timestamptz,
  archived_reason text,
  template_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

drop trigger if exists set_class_name on public.classes;
create trigger set_class_name
before insert or update on public.classes
for each row execute function public.set_class_name();

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id),
  name text not null,
  birth_date date not null,
  gender text not null,
  enrollment text,
  census_id text,
  cpf text,
  rg text,
  photo_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject text not null,
  quarter text not null,
  school_year smallint not null default 1,
  grade numeric(4,1) not null,
  observation text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, class_id, subject, quarter, school_year)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  date date not null,
  status text not null,
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id),
  date date not null,
  student_ids uuid[] not null default '{}',
  episodes text[] not null default '{}',
  calculated_severity text not null,
  final_severity text not null,
  severity_override_reason text,
  description text,
  actions text,
  suggested_action text,
  status text not null,
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  type text not null,
  date date not null,
  responsavel text,
  motivo text,
  providencias text,
  assuntos_tratados text,
  encaminhamentos text,
  disciplina text,
  tipo_situacao text,
  descricao_situacao text,
  nome_responsavel_pai text,
  grau_parentesco text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id uuid references auth.users(id),
  user_name text,
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.professional_subject_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  course text not null,
  subjects_by_year jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_subjects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, subject)
);

create table if not exists public.school_config (
  id uuid primary key default '00000000-0000-0000-0000-000000000000'::uuid,
  school_name text not null default 'INSTITUIÇÃO DE ENSINO',
  address text,
  city text,
  state text,
  cep text,
  phone text,
  email text,
  director_name text,
  inep text,
  logo_base64 text,
  signature_base64 text,
  theme_color text default '#0F172A',
  additional_info text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint single_row_check check (id = '00000000-0000-0000-0000-000000000000'::uuid)
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_classes_updated_at on public.classes;
create trigger set_classes_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

drop trigger if exists set_students_updated_at on public.students;
create trigger set_students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists set_grades_updated_at on public.grades;
create trigger set_grades_updated_at
before update on public.grades
for each row execute function public.set_updated_at();

drop trigger if exists set_attendance_updated_at on public.attendance;
create trigger set_attendance_updated_at
before update on public.attendance
for each row execute function public.set_updated_at();

drop trigger if exists set_incidents_updated_at on public.incidents;
create trigger set_incidents_updated_at
before update on public.incidents
for each row execute function public.set_updated_at();

drop trigger if exists set_follow_ups_updated_at on public.follow_ups;
create trigger set_follow_ups_updated_at
before update on public.follow_ups
for each row execute function public.set_updated_at();

drop trigger if exists set_professional_subject_templates_updated_at on public.professional_subject_templates;
create trigger set_professional_subject_templates_updated_at
before update on public.professional_subject_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_professional_subjects_updated_at on public.professional_subjects;
create trigger set_professional_subjects_updated_at
before update on public.professional_subjects
for each row execute function public.set_updated_at();

drop trigger if exists set_school_config_updated_at on public.school_config;
create trigger set_school_config_updated_at
before update on public.school_config
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.grades enable row level security;
alter table public.attendance enable row level security;
alter table public.incidents enable row level security;
alter table public.follow_ups enable row level security;
alter table public.comments enable row level security;
alter table public.professional_subject_templates enable row level security;
alter table public.professional_subjects enable row level security;
alter table public.school_config enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "classes_owner_access" on public.classes;
create policy "classes_authenticated_access" on public.classes
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "students_owner_access" on public.students;
create policy "students_authenticated_access" on public.students
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "grades_owner_access" on public.grades;
create policy "grades_authenticated_access" on public.grades
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "attendance_owner_access" on public.attendance;
create policy "attendance_authenticated_access" on public.attendance
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "incidents_owner_access" on public.incidents;
create policy "incidents_authenticated_access" on public.incidents
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "follow_ups_owner_access" on public.follow_ups;
create policy "follow_ups_authenticated_access" on public.follow_ups
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "comments_owner_access" on public.comments;
create policy "comments_authenticated_access" on public.comments
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "professional_subject_templates_owner_access" on public.professional_subject_templates;
create policy "professional_subject_templates_authenticated_access" on public.professional_subject_templates
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "professional_subjects_owner_access" on public.professional_subjects;
create policy "professional_subjects_authenticated_access" on public.professional_subjects
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Política: Qualquer usuário autenticado pode ler e modificar a configuração da escola
-- No futuro, isso será ajustado para incluir permissões baseadas em roles
drop policy if exists "school_config_authenticated_access" on public.school_config;
create policy "school_config_authenticated_access" on public.school_config
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table public.attendance
  add constraint attendance_status_check
  check (status in ('presente', 'falta', 'falta_justificada', 'atestado'));

alter table public.incidents
  add constraint incidents_status_check
  check (status in ('aberta', 'acompanhamento', 'resolvida'));

alter table public.incidents
  add constraint incidents_severity_check
  check (calculated_severity in ('leve', 'intermediaria', 'grave', 'gravissima'));

alter table public.incidents
  add constraint incidents_final_severity_check
  check (final_severity in ('leve', 'intermediaria', 'grave', 'gravissima'));

alter table public.follow_ups
  add constraint follow_ups_type_check
  check (type in ('conversa_individual', 'conversa_pais', 'situacoes_diversas'));

alter table public.grades
  add constraint grades_grade_check
  check (grade >= 0 and grade <= 10);

alter table public.grades
  add constraint grades_school_year_check
  check (school_year between 1 and 3);
