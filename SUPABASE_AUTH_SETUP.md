# Configuração de Whitelist para Autenticação Google no Supabase

Para restringir o login com Google (ou qualquer outro método) apenas para emails específicos que você controlar, a melhor abordagem é criar uma **Trigger** no banco de dados do Supabase.

Isso impede que usuários não autorizados criem uma conta no seu sistema, mesmo que tenham uma conta Google válida.

## Passo a Passo

1. Acesse o painel do seu projeto no Supabase (https://supabase.com/dashboard).
2. Vá para a seção **SQL Editor** (ícone de terminal na barra lateral esquerda).
3. Crie uma nova query (New Query) e cole o código abaixo.
4. **IMPORTANTE**: Antes de rodar, substitua `'seu.email@exemplo.com'` pelo seu próprio e-mail real na última linha, ou você poderá se bloquear!

```sql
-- 1. Criar tabela de emails permitidos (Whitelist)
create table if not exists public.authorized_emails (
  email text primary key,
  role text default 'professor', -- Pode ser 'diretor', 'coordenador', etc.
  created_at timestamp with time zone default now()
);

-- 2. Habilitar segurança na tabela (apenas admins do banco podem mexer nela por enquanto)
alter table public.authorized_emails enable row level security;

-- 3. Função que verifica se o email está na whitelist
create or replace function public.check_email_whitelist()
returns trigger as $$
begin
  -- Verifica se o email do novo usuário está na tabela authorized_emails
  if not exists (select 1 from public.authorized_emails where email = new.email) then
    raise exception 'Acesso negado. O email % não está autorizado a acessar o sistema MAVIC.', new.email;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 4. Trigger que dispara ANTES de um usuário ser criado no sistema de Auth
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  before insert on auth.users
  for each row execute procedure public.check_email_whitelist();

-- 5. Função para popular perfil automaticamente (Opcional - Ajuda a já criar o Profile)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
begin
  -- Pegar a role definida na whitelist
  select role into user_role from public.authorized_emails where email = new.email;
  
  insert into public.profiles (id, email, name, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Usuário'),
    coalesce(user_role, 'professor')
  );
  return new;
end;
$$ language plpgsql security definer;

-- 6. Trigger para criar perfil após inserção bem sucedida (AFTER INSERT)
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 7. ADICIONE SEUS EMAILS INICIAIS AQUI
-- ==========================================
insert into public.authorized_emails (email, role) 
values 
  ('seu.email@exemplo.com', 'diretor') -- SUBSTITUA PELO SEU EMAIL
on conflict (email) do nothing;
```

## Como gerenciar usuários depois?

Para liberar um novo usuário, você tem duas opções:

1. **Via Tabela SQL (Mais simples para começar)**:
   Acesse o Table Editor no Supabase, abra a tabela `authorized_emails` e adicione uma nova linha com o email e permissão da pessoa.

2. **Via Interface do MAVIC (Futuro)**:
   Podemos criar uma página de "Gestão de Acessos" no sistema onde o Diretor pode adicionar emails a essa tabela.
