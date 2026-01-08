-- Script para adicionar a tabela school_config ao banco existente
-- Execute este script separadamente no Supabase SQL Editor
-- Não modifica nenhuma tabela existente

-- Criar a tabela school_config (configuração global da escola)
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

-- Habilitar RLS na tabela
alter table public.school_config enable row level security;

-- Criar trigger para atualizar updated_at automaticamente
drop trigger if exists set_school_config_updated_at on public.school_config;
create trigger set_school_config_updated_at
before update on public.school_config
for each row execute function public.set_updated_at();

-- Política RLS: Qualquer usuário autenticado pode ler e modificar a configuração da escola
-- No futuro, isso será ajustado para incluir permissões baseadas em roles
drop policy if exists "school_config_authenticated_access" on public.school_config;
create policy "school_config_authenticated_access" on public.school_config
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
