# Guia Final de Autenticação (Email OTP + Whitelist)

Este sistema utiliza **Login por Código (OTP)** via Email. 
- O usuário digita o email.
- Recebe um código de 6 dígitos.
- Entra no sistema sem precisar de senha.
- A segurança é garantida pela **Whitelist** no banco de dados.

## 1. Configurando o Supabase

1. No painel do Supabase, vá em **Authentication** > **Providers**.
2. Clique em **Email**.
3. Certifique-se de que **Enable Email Provider** está **LIGADO**.
4. Certifique-se de que **Confirm email** está **LIGADO**.
5. **Configuração Crítica**: 
   - Procure por **Email OTP Length** (provavelmente está 8).
   - Mude para **6**.
   - Se deixar 8, o login não funcionará (nosso campo tem 6 dígitos).
6. Em **Authentication** > **URL Configuration**, defina a **Site URL** correta (ex: `http://localhost:8080`).

## 2. IMPORTANTE: Configurar o Template para Código (OTP)

Por padrão, o Supabase envia um Link. Para enviar o **Código Numérico**:

1. Vá em **Authentication** > **Email Templates**.
2. Selecione **Magic Link**.
3. Altere o **Subject** para: `Seu código de acesso MAVIC`.
4. Substitua o **Body** por este HTML (para exibir o código grande):

```html
<h2>Olá!</h2>
<p>Seu código de acesso ao MAVIC é:</p>
<h1 style="color: #2563EB; font-size: 32px; letter-spacing: 5px;">{{ .Token }}</h1>
<p>Insira este código na tela de login.</p>
```

5. Clique em **Save**.

6. **MUITO IMPORTANTE**: Repita o processo para o template **Confirm sign up** (Confirmação de Cadastro).
   - Quando um professor entra pela primeira vez, ele recebe este email.
   - **CONFIRMADO**: Você DEVE substituir `{{ .ConfirmationURL }}` por `{{ .Token }}` neste template também.
   - Esta é a única forma oficial do Supabase enviar o código em vez do link.
   - Se não fizer isso, novos usuários continuarão recebendo links.

## 3. Whitelist de Emails (Segurança Real)

Como qualquer pessoa pode solicitar um código, a segurança real está no banco de dados.
O script SQL abaixo garante que **apenas** os emails na lista `authorized_emails` consigam efetivamente criar conta ou logar.

**Execute este script no SQL Editor do Supabase:**

```sql
-- 1. Criar tabela de emails permitidos
create table if not exists public.authorized_emails (
  email text primary key,
  role text default 'professor',
  created_at timestamp with time zone default now()
);

alter table public.authorized_emails enable row level security;

-- 2. Função de bloqueio
create or replace function public.check_email_whitelist()
returns trigger as $$
begin
  if not exists (select 1 from public.authorized_emails where email = new.email) then
    raise exception 'Acesso negado. O email % não está autorizado.', new.email;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 3. Trigger de Segurança (Impede criação de users não autorizados)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  before insert on auth.users
  for each row execute procedure public.check_email_whitelist();

-- 4. Inserir Emails na Whitelist
insert into public.authorized_emails (email, role) 
values 
  -- Gestão
  ('admin@mavic.com', 'diretor'),
  ('gestor@mavic.com', 'diretor'),
  ('massaro.alves@prof.ce.gov.br', 'diretor'),
  -- Lista de Professores
  ('antonia.leite@prof.ce.gov.br', 'professor'),
  ('maria.souza94@prof.ce.gov.br', 'professor'),
  ('tallyne.silveira@prof.ce.gov.br', 'professor'),
  -- (Adicione o restante dos emails aqui...)
  ('lucas.oliveira8@prof.ce.gov.br', 'professor')
on conflict (email) do nothing;
```

## 4. Como funciona para o Usuário

1. O professor acessa `mavic.app`.
2. Digita `antonia.leite@prof.ce.gov.br`.
3. Se estiver na lista acima, o Supabase envia um código para o email dela.
4. Ela digita o código e entra.

---
**Observação**: Se um usuário não estiver na lista, ele verá uma mensagem de erro ("Erro ao entrar") e nenhum código será enviado (o Supabase bloqueia a criação do usuário antes de enviar).
