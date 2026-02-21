# Supabase Setup

## 1) Novo projeto (bootstrap inicial)
1. Crie um projeto no Supabase.
2. Em Auth, habilite Email/Password.
3. No SQL Editor, rode `supabase/schema.sql`.

## 2) Projeto existente (upgrade incremental obrigatório)
Para ambientes que ja estao em uso (producao/homologacao), **nao basta** rodar `schema.sql`.
E necessario aplicar as migrations incrementais da pasta `supabase/migrations` em ordem cronologica.

Para certificados com QR e validacao publica, a ordem minima e:
1. `2026-02-21_certificate_events.sql` (se a base de certificados ainda nao existir).
2. `2026-02-22_certificate_verification_and_signature.sql` (**obrigatoria** para `verification_code` e `verification_status`).
3. `2026-02-23_school_config_storage_paths.sql` e `2026-02-23_storage_school_assets_bucket.sql` (baseline atual de assets em Storage).

Se o PostgREST continuar usando cache antigo apos migration, execute:
```sql
NOTIFY pgrst, 'reload schema';
```

## 3) Verificacao rapida de saude (certificados)
Rode no SQL Editor:

```sql
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'certificate_event_students'
  and column_name in ('verification_code', 'verification_status')
order by column_name;
```

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'certificate_event_students'
  and indexname ilike '%verification_code%';
```

```sql
select
  count(*) filter (where verification_code is null or btrim(verification_code) = '') as sem_codigo,
  count(*) filter (where verification_status is null) as sem_status
from public.certificate_event_students;
```

```sql
select public.verify_certificate_code('CODIGO_INVALIDO_APENAS_TESTE');
```

Atalho:
- Script pronto de checagem: `supabase/manual/certificates_schema_healthcheck.sql`.

## 4) Erro conhecido e causa
Se aparecer erro:
`Could not find the 'verification_code' column of 'certificate_event_students' in the schema cache`

A causa e schema remoto desatualizado/incompleto para o modulo novo de certificados.
Aplicar migration `2026-02-22_certificate_verification_and_signature.sql` e recarregar cache do PostgREST.

## 5) Variaveis de ambiente
Crie `.env.local` com:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Opcional para QR em dominios externos:
```env
VITE_CERTIFICATE_VERIFICATION_BASE_URL=https://seu-dominio-publico
```

## 6) Notas
- Dados sao isolados por usuario (`owner_id`) via RLS.
- Novos usuarios recebem linha em `profiles` via trigger.
