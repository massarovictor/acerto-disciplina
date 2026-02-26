# Sistema MAVIC - Snapshot Tecnico Completo

## Metadados do snapshot
- Sistema: `MAVIC` (acerto-disciplina)
- Repositorio: `massarovictor/acerto-disciplina`
- Branch: `main`
- Data deste documento: `2026-02-26`
- Fonte de verdade usada: codigo em `src/`, `supabase/functions/`, `supabase/schema.sql`, `supabase/migrations/`, scripts SQL auxiliares em `supabase/`
- Versao para publicacao no GitHub: dados sensiveis de ambiente removidos (refs de projeto, chaves, endpoints privados, identificadores operacionais)

## 1) Arquitetura atual

### 1.1 Stack
- Frontend SPA: React 18 + TypeScript + Vite
- Roteamento: `react-router-dom`
- Estado servidor/cache: `@tanstack/react-query`
- Estado local: `zustand`
- UI: Tailwind + Radix + shadcn
- Backend: Supabase (Auth, Postgres, RLS, Storage, Edge Functions)

### 1.2 Componentes de execucao
- Browser client chama:
  - Supabase Auth (OTP por email)
  - Supabase REST/RPC (tabelas e funcoes SQL)
  - Supabase Edge Functions (`create-user`, `send-incident-email`)
  - Supabase Storage (`school-assets`)
- Edge Functions usam `SUPABASE_SERVICE_ROLE_KEY` para operacoes administrativas

### 1.3 Variaveis de ambiente usadas pelo frontend
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CERTIFICATE_VERIFICATION_BASE_URL` (opcional)

### 1.4 Variaveis de ambiente usadas nas Edge Functions
- `create-user`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- `send-incident-email`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SMTP_SERVER`
  - `SMTP_PORT`
  - `SMTP_USERNAME`
  - `SMTP_PASSWORD`
  - `FROM_EMAIL`
  - `APP_URL` (opcional, para CTA no email)

## 2) Rotas da aplicacao e controle de acesso

Fonte: `src/App.tsx`, `src/pages/Users.tsx`, `src/components/auth/AdminOnlyRoute.tsx`.

### 2.1 Rotas publicas
- `/login`
- `/certificados/verificar`
- `/certificados/verificar/:codigo`

### 2.2 Rotas protegidas (exigem sessao)
Dentro de `/` com `ProtectedRoute` + `AppLayout`:
- `/` (Dashboard)
- `/acompanhamentos`
- `/ocorrencias` (redirect para `/acompanhamentos`)
- `/turmas` (admin)
- `/turmas-arquivadas` (admin)
- `/alunos` (admin)
- `/notas-frequencia` (admin)
- `/relatorios-integrados`
- `/slides`
- `/certificados`
- `/relatorios` (redirect legado por query `tab`)
- `/analytics`
- `/trajetoria`
- `/usuarios` (pagina aplica guard admin internamente)

### 2.3 Regras de autenticacao e sessao
- `ProtectedRoute` redireciona sem sessao para `/login?next=<rota>`.
- Sanitizacao de `next` no login:
  - aceita apenas path iniciando com `/`
  - bloqueia `//`, `http://`, `https://`, `javascript:`
- `AuthContext` carrega perfil em `public.profiles` por `id = auth.user.id`.
- Fallback de perfil quando `profiles` nao existe:
  - `name` via `user_metadata.name` ou prefixo do email
  - `role` via `user_metadata.role` ou `diretor`

### 2.4 Fluxo de login
- Tela `/login` usa OTP por email (`signInWithOtp` + `verifyOtp`).
- Antes de enviar OTP, consulta `authorized_emails` para whitelist de acesso.
- `shouldCreateUser: true` no envio OTP.

### 2.5 Mapa pagina por pagina (funcional)

#### Rotas publicas
- `/login` (`src/pages/Login.tsx`)
  - Objetivo: autenticar por OTP de email.
  - Regras: email precisa existir em `authorized_emails` antes de enviar OTP.
  - Fluxo:
    - Passo 1: email.
    - Passo 2: token OTP de 6 digitos.
    - Redireciona para `next` sanitizado.
- `/certificados/verificar` e `/certificados/verificar/:codigo` (`src/pages/CertificateVerification.tsx`)
  - Objetivo: validacao publica de certificado.
  - Entrada de codigo:
    - Parametro de rota `:codigo`.
    - Query string `?codigo=...`.
    - Campo manual na tela.
  - Processamento:
    - Normaliza para alfanumerico maiusculo.
    - Chama RPC `verify_certificate_code`.
    - Exibe status (`valid` ou `revoked`) e metadados do certificado.
  - Tratamento de erro:
    - Mapeia erros de schema cache/RPC ausente com mensagem amigavel.

#### Rotas protegidas (app principal com layout)
- `/` Dashboard (`src/pages/Dashboard.tsx`)
  - Componentes principais:
    - `OperatingStatus`
    - `RecentActivity`
    - `BirthdayWidget`
    - menu de aplicativos
  - Dados: `classes`, `students`, `incidents`.
  - Regras de escopo por papel:
    - Admin: visao global.
    - Diretor: recorte por turmas dirigidas.
    - Professor: cards administrativos ocultados.
  - Acoes:
    - Atalho para busca global (`open-global-search`).
    - Abrir dialog de configuracao escolar (`SchoolConfigDialog`).
- `/acompanhamentos` (`src/pages/Incidents.tsx`)
  - Objetivo: gestao de ocorrencias disciplinares e acompanhamentos familiares.
  - Dados: `incidents`, `classes`, `students`.
  - Filtros:
    - Busca textual.
    - Filtro por tipo (`disciplinar` / `acompanhamento_familiar` / todos).
    - Filtro por turma.
    - Abas de status (`aberta`, `acompanhamento`, `resolvida`).
  - Acoes:
    - Nova ocorrencia disciplinar.
    - Novo acompanhamento familiar.
    - Abrir `IncidentManagementDialog`.
    - Excluir ocorrencia com confirmacao.
  - Deep-link suportado por query:
    - `?action=nova-ocorrencia&tipo=...`
    - `?action=open-incident&incidentId=<uuid>&tab=info|followup|comments`
- `/turmas` (`src/pages/Classes.tsx`)
  - Objetivo: administrar estrutura de turmas.
  - Abas:
    - `Gerenciar Turmas` (`ClassesManage`)
    - `Criar Nova Turma` (`ClassesCreate`)
    - `Templates` (`SubjectTemplatesManager`)
  - Acoes:
    - Navegar para turmas arquivadas.
    - Highlight de turma via query `?highlight=...` com auto-limpeza.
- `/turmas-arquivadas` (`src/pages/ArchivedClasses.tsx`)
  - Objetivo: consultar e restaurar turmas arquivadas.
  - Dados: `archivedClasses`, `students`.
  - Acoes:
    - Busca por nome/curso/motivo.
    - Visualizar detalhes da turma (dialog).
    - Desarquivar turma e reativar alunos (`status = active`).
- `/alunos` (`src/pages/Students.tsx`)
  - Objetivo: cadastro e manutencao de alunos.
  - Abas:
    - `Gerenciar Alunos` (`StudentsManage`)
    - `Cadastrar` (`StudentsRegister`)
    - `Aprovações` (`StudentApprovalManager`)
  - Acoes:
    - Highlight de aluno via query `?highlight=...` com auto-limpeza.
- `/notas-frequencia` (`src/pages/GradesAttendance.tsx`)
  - Objetivo atual: lancamento de notas.
  - Componente ativo: `GradesManager`.
  - Observacao: modulo de frequencia esta desativado na UI desta rota.
- `/relatorios-integrados` (`src/pages/IntegratedReportsPage.tsx`)
  - Objetivo: relatorios consolidados academicos/comportamentais.
  - Componente principal: `IntegratedReports`.
  - Dados injetados: `classes`, `students`, `incidents`.
- `/slides` (`src/pages/SlidesPage.tsx`)
  - Objetivo: gerar apresentacoes.
  - Componente principal: `ClassSlides`.
  - Dados injetados: `classes`, `students`, `incidents`.
- `/certificados` (`src/pages/CertificatesPage.tsx`)
  - Objetivo: emitir, editar, baixar e validar certificados.
  - Componente principal: `CertificatesReports`.
  - Acoes:
    - Botao `Emitir Certificados` incrementa `createRequestNonce`.
    - Suporta gatilho por query `?action=emitir`.
- `/analytics` (`src/pages/Analytics.tsx`)
  - Objetivo: exploracao analitica.
  - Filtros globais via `AnalyticsFilters`.
  - Abas funcionais:
    - `dashboard` (Visao 360)
    - `subjects` (Disciplinas)
    - `classes` (Ranking de Turma)
    - `ranking-alunos` (Ranking de Alunos)
    - `behavior` (Convivencia Disciplinar)
    - `family` (Convivencia Familiar)
  - Motor: `useSchoolAnalyticsWorker`.
  - Acoes por insight:
    - aplica filtros locais.
    - navega para `/acompanhamentos` em cenarios de risco.
- `/trajetoria` (`src/pages/StudentTrajectory.tsx`)
  - Objetivo: historico longitudinal por aluno/turma.
  - Fontes de dados:
    - `grades` (regular)
    - `historical_grades`
    - `external_assessments`
    - `incidents`
    - disciplinas profissionais/templates
  - Modos:
    - `ClassTrajectoryView` (visao de turma)
    - visao individual com abas `summary`, `trajectory`, `entry`
    - sub-abas em entrada: historico escolar e avaliacoes externas
  - Acoes:
    - importacao em lote (`TrajectoryImportDialog`)
    - cadastro em lote de avaliacoes externas (`ExternalAssessmentBatchDialog`)
    - deep-link por query (`classId`, `studentId`, `subject`)
- `/usuarios` (`src/pages/Users.tsx`)
  - Objetivo: administracao de acessos.
  - Restricao: somente admin (guard na pagina + regras backend).
  - Componente principal: `UsersManage`.
  - Acoes:
    - criar/editar/remover usuario via Edge Function `create-user`.
    - controle de papeis (`admin`, `diretor`, `professor`).

#### Rotas de compatibilidade/redirect
- `/ocorrencias`
  - Redirect para `/acompanhamentos` preservando query/hash.
- `/relatorios`
  - Redirect legado para:
    - `/slides` se `tab=slides`
    - `/certificados` se `tab=certificates`
    - `/relatorios-integrados` caso contrario

#### Fallback de rota
- `*` (`src/pages/NotFound.tsx`)
  - Tela 404.

#### Paginas existentes nao ativas por rota no `App.tsx`
- `src/pages/NewIncident.tsx` (wizard isolado, nao roteado atualmente)
- `src/pages/Reports.tsx` (componente legado de redirect; rota real tratada em `App.tsx`)
- `src/pages/Index.tsx` (alias historico para `Dashboard`)

## 3) Inventario de dados acessados pelo frontend

### 3.1 Tabelas consultadas/escritas pelo frontend
Detectadas em `src/`:
- `attendance`
- `authorized_emails`
- `certificate_events`
- `certificate_event_students`
- `classes`
- `comments`
- `external_assessments`
- `follow_ups`
- `grades`
- `historical_grades`
- `incidents`
- `professional_subject_templates`
- `professional_subjects`
- `profiles`
- `school_config`
- `students`

### 3.2 RPC usadas pelo frontend
- `fetch_grades_analytics`
- `verify_certificate_code`
- `save_certificate_event_atomic`

### 3.3 Storage usado pelo frontend
- Bucket: `school-assets`

## 4) Banco de dados - schema atual (public)

Base: `supabase/schema.sql` + migrations de `supabase/migrations`.

## 4.1 Tabelas e colunas

### `public.attendance`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `owner_id uuid NOT NULL`
- `student_id uuid NOT NULL`
- `class_id uuid NOT NULL`
- `date date NOT NULL`
- `status text NOT NULL CHECK (presente|falta|falta_justificada|atestado)`
- `recorded_by uuid`
- `recorded_at timestamptz NOT NULL DEFAULT now()`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- PK: `attendance_pkey(id)`
- FK: `owner_id -> auth.users(id)`
- FK: `student_id -> public.students(id)`
- FK: `class_id -> public.classes(id)`
- FK: `recorded_by -> auth.users(id)`

### `public.authorized_emails`
- `email text NOT NULL`
- `role text DEFAULT 'professor'`
- `display_name text` (adicionado em `2026-02-26_authorized_emails_display_name.sql`)
- `created_at timestamptz DEFAULT now()`
- PK: `authorized_emails_pkey(email)`

### `public.classes`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `owner_id uuid NOT NULL`
- `name text NOT NULL`
- `series text NOT NULL`
- `letter text`
- `course text`
- `director_id uuid`
- `director_email text`
- `active boolean NOT NULL DEFAULT true`
- `start_year smallint`
- `current_year smallint`
- `start_year_date date`
- `start_calendar_year integer`
- `end_calendar_year integer`
- `archived boolean NOT NULL DEFAULT false`
- `archived_at timestamptz`
- `archived_reason text`
- `template_id uuid`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- PK: `classes_pkey(id)`
- FK: `owner_id -> auth.users(id)`
- FK: `director_id -> public.profiles(id)`

### `public.certificate_events`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `owner_id uuid NOT NULL`
- `created_by_name text NOT NULL`
- `title text NOT NULL`
- `certificate_type text NOT NULL CHECK (monitoria|destaque|evento_participacao|evento_organizacao)`
- `class_id uuid`
- `class_name_snapshot text NOT NULL`
- `school_year smallint NOT NULL CHECK (1..3)`
- `period_mode text NOT NULL CHECK (quarters|annual)`
- `selected_quarters text[] NOT NULL DEFAULT '{}'`
- `period_label text NOT NULL`
- `reference_type text CHECK (subject|area)`
- `reference_value text`
- `reference_label text`
- `base_text text NOT NULL`
- `teacher_name text`
- `director_name text`
- `signature_mode text NOT NULL DEFAULT 'digital_cursive' CHECK (digital_cursive|physical_print)`
- `type_meta jsonb NOT NULL DEFAULT '{}'`
- `students_count integer NOT NULL DEFAULT 0 CHECK (students_count >= 0)`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- PK: `certificate_events_pkey(id)`
- FK: `owner_id -> auth.users(id)`
- FK: `class_id -> public.classes(id) ON DELETE SET NULL`

### `public.certificate_event_students`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `owner_id uuid NOT NULL`
- `certificate_event_id uuid NOT NULL`
- `student_id uuid`
- `student_name_snapshot text NOT NULL`
- `text_override text`
- `highlight_status text CHECK (confirmed|pending)`
- `highlight_average numeric`
- `verification_code text NOT NULL DEFAULT upper(replace(gen_random_uuid()::text,'-',''))`
- `verification_status text NOT NULL DEFAULT 'valid' CHECK (valid|revoked)`
- `created_at timestamptz NOT NULL DEFAULT now()`
- PK: `certificate_event_students_pkey(id)`
- FK: `owner_id -> auth.users(id)`
- FK: `certificate_event_id -> public.certificate_events(id) ON DELETE CASCADE`
- FK: `student_id -> public.students(id) ON DELETE SET NULL`

### `public.comments`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `owner_id uuid NOT NULL`
- `incident_id uuid NOT NULL`
- `user_id uuid`
- `user_name text`
- `text text NOT NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`
- PK: `comments_pkey(id)`
- FK: `owner_id -> auth.users(id)`
- FK: `incident_id -> public.incidents(id)`
- FK: `user_id -> auth.users(id)`

### `public.external_assessments`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `student_id uuid NOT NULL`
- `assessment_type text NOT NULL`
- `assessment_name text NOT NULL`
- `subject text`
- `score numeric NOT NULL`
- `max_score numeric NOT NULL DEFAULT 100`
- `proficiency_level text`
- `applied_date date`
- `temporal_position jsonb DEFAULT '{}'`
- `notes text`
- `created_at timestamptz DEFAULT now()`
- `updated_at timestamptz DEFAULT now()`
- `grade_year integer`
- `quarter text`
- `school_level text`
- PK: `external_assessments_pkey(id)`
- FK: `student_id -> public.students(id)`

### `public.follow_ups`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `owner_id uuid NOT NULL`
- `incident_id uuid NOT NULL`
- `type text NOT NULL CHECK (conversa_individual|conversa_pais|situacoes_diversas)`
- `date date NOT NULL`
- `suspension_applied boolean NOT NULL DEFAULT false`
- `responsavel text`
- `motivo text`
- `providencias text`
- `assuntos_tratados text`
- `encaminhamentos text`
- `disciplina text`
- `tipo_situacao text`
- `descricao_situacao text`
- `nome_responsavel_pai text`
- `grau_parentesco text`
- `created_by uuid`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- PK: `follow_ups_pkey(id)`
- FK: `owner_id -> auth.users(id)`
- FK: `incident_id -> public.incidents(id)`
- FK: `created_by -> auth.users(id)`

### `public.grades`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `owner_id uuid NOT NULL`
- `student_id uuid NOT NULL`
- `class_id uuid NOT NULL`
- `subject text NOT NULL`
- `quarter text NOT NULL`
- `school_year smallint NOT NULL DEFAULT 1 CHECK (1..3)`
- `grade numeric NOT NULL CHECK (0 <= grade <= 10)`
- `observation text`
- `recorded_at timestamptz NOT NULL DEFAULT now()`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- PK: `grades_pkey(id)`
- FK: `owner_id -> auth.users(id)`
- FK: `student_id -> public.students(id)`
- FK: `class_id -> public.classes(id)`
- Unique (migration): `(student_id, class_id, subject, quarter, school_year)`

### `public.historical_grades`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `student_id uuid NOT NULL`
- `school_level text NOT NULL DEFAULT 'fundamental'`
- `grade_year integer NOT NULL`
- `subject text NOT NULL`
- `quarter text NOT NULL`
- `grade numeric NOT NULL CHECK (0 <= grade <= 10)`
- `school_name text`
- `calendar_year integer NOT NULL`
- `created_at timestamptz DEFAULT now()`
- `updated_at timestamptz DEFAULT now()`
- PK: `historical_grades_pkey(id)`
- FK: `student_id -> public.students(id)`

### `public.incidents`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `owner_id uuid NOT NULL`
- `class_id uuid NOT NULL`
- `date date NOT NULL`
- `student_ids uuid[] NOT NULL DEFAULT '{}'`
- `episodes text[] NOT NULL DEFAULT '{}'`
- `incident_type text NOT NULL DEFAULT 'disciplinar' CHECK (disciplinar|acompanhamento_familiar)`
- `calculated_severity text NOT NULL CHECK (leve|intermediaria|grave|gravissima)`
- `final_severity text NOT NULL CHECK (leve|intermediaria|grave|gravissima)`
- `severity_override_reason text`
- `description text`
- `actions text`
- `suggested_action text`
- `status text NOT NULL CHECK (aberta|acompanhamento|resolvida)`
- `validated_by uuid`
- `validated_at timestamptz`
- `validated_by_name text` (migration `2026-02-26_zz_incidents_validated_by_name_snapshot.sql`)
- `disciplinary_reset_applied boolean NOT NULL DEFAULT false`
- `disciplinary_reset_at date`
- `disciplinary_reset_inferred boolean NOT NULL DEFAULT false`
- `created_by uuid`
- `created_by_name text` (migration `2026-02-26_incidents_created_by_name_snapshot.sql`)
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- PK: `incidents_pkey(id)`
- FK: `owner_id -> auth.users(id)`
- FK: `class_id -> public.classes(id)`
- FK: `validated_by -> auth.users(id)`
- FK: `created_by -> auth.users(id)`

### `public.professional_subject_templates`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `owner_id uuid NOT NULL`
- `name text NOT NULL`
- `course text NOT NULL`
- `subjects_by_year jsonb NOT NULL DEFAULT '[]'`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- PK: `professional_subject_templates_pkey(id)`
- FK: `owner_id -> auth.users(id)`

### `public.professional_subjects`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `owner_id uuid NOT NULL`
- `class_id uuid NOT NULL`
- `subject text NOT NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- PK: `professional_subjects_pkey(id)`
- FK: `owner_id -> auth.users(id)`
- FK: `class_id -> public.classes(id)`

### `public.profiles`
- `id uuid NOT NULL`
- `name text NOT NULL`
- `role text NOT NULL DEFAULT 'diretor'`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- PK: `profiles_pkey(id)`
- FK: `id -> auth.users(id)`

### `public.school_config`
- `id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`
- `school_name text NOT NULL DEFAULT 'INSTITUIÇÃO DE ENSINO'`
- `address text`
- `city text`
- `state text`
- `cep text`
- `phone text`
- `email text`
- `director_name text`
- `inep text`
- `logo_base64 text`
- `signature_base64 text`
- `logo_storage_path text` (migration `2026-02-23_school_config_storage_paths.sql`)
- `certificate_frame_storage_path text` (migration `2026-02-23_school_config_storage_paths.sql`)
- `theme_color text DEFAULT '#0F172A'`
- `additional_info text`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- PK: `school_config_pkey(id)`
- Check: linha unica (id fixo)

### `public.students`
- `id uuid NOT NULL DEFAULT gen_random_uuid()`
- `owner_id uuid NOT NULL`
- `class_id uuid NOT NULL`
- `name text NOT NULL`
- `birth_date date NOT NULL`
- `gender text NOT NULL`
- `enrollment text`
- `census_id text`
- `cpf text`
- `rg text`
- `photo_url text`
- `status text NOT NULL DEFAULT 'active'`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- PK: `students_pkey(id)`
- FK: `owner_id -> auth.users(id)`
- FK: `class_id -> public.classes(id)`

## 4.2 Indexes ativos definidos no repositorio
- `classes_owner_id_name_key` (unique) em `classes(owner_id, name)`
- `grades_class_year_quarter_idx` em `grades(class_id, school_year, quarter)`
- `grades_student_year_quarter_idx` em `grades(student_id, school_year, quarter)`
- `incidents_type_class_date_idx` em `incidents(incident_type, class_id, date desc)`
- `incidents_disciplinary_reset_idx` em `incidents(disciplinary_reset_applied, disciplinary_reset_at)`
- `certificate_events_owner_created_at_idx` em `certificate_events(owner_id, created_at desc)`
- `certificate_events_type_created_at_idx` em `certificate_events(certificate_type, created_at desc)`
- `certificate_events_class_created_at_idx` em `certificate_events(class_id, created_at desc)`
- `certificate_event_students_event_idx` em `certificate_event_students(certificate_event_id)`
- `certificate_event_students_owner_idx` em `certificate_event_students(owner_id)`
- `certificate_event_students_verification_code_uidx` (unique) em `certificate_event_students(verification_code)`
- `certificate_event_students_verification_status_idx` em `certificate_event_students(verification_status)`

## 4.3 Funcoes SQL/RPC (estado atual)

### Funcoes de permissao e RLS
- `public.current_app_role()`
  - Resolve role por `profiles.role` (prioritario) ou `authorized_emails.role` por email JWT
  - `security definer`
  - `grant execute to authenticated`
- `public.is_director_of_class(target_class_id uuid)`
  - Verifica direcao por `classes.director_id` ou `classes.director_email == jwt email`
  - `security definer`
  - `grant execute to authenticated`
- `public.can_manage_incident_class(target_class_id uuid)`
  - `admin` sempre
  - `diretor` somente para turma dirigida
  - `security definer`
  - `grant execute to authenticated`

### Funcoes de dominio
- `public.fetch_grades_analytics(class_ids uuid[], student_id uuid, quarter text, school_year smallint) -> jsonb`
  - Agrega notas para analytics em uma chamada
- `public.verify_certificate_code(p_code text) -> table(...)`
  - Publica validacao de certificado por codigo
  - `security definer`
  - `grant execute to anon, authenticated`
- `public.save_certificate_event_atomic(...) -> void`
  - Atualizacao atomica de evento de certificado e alunos
  - Apaga/insere alunos dentro da mesma transacao logica da funcao
  - `security definer`
  - `grant execute to authenticated`
- `public.normalize_display_name(input_value text) -> text`
  - Normaliza nomes para snapshots legiveis
  - definida em migrations de backfill de criador/validador
- `public.apply_incident_reset_from_follow_up() -> trigger`
  - Aplica reset disciplinar em `incidents` quando follow-up com `suspension_applied = true`
  - garante `disciplinary_reset_at >= incidents.date`

### Funcoes de nomeacao de turma (legado mantido)
- `public.build_class_name(start_calendar_year, end_calendar_year, series, letter, course)`
- `public.set_class_name()` (trigger function)

## 4.4 Triggers ativos definidos no repositorio
- `set_class_name` em `public.classes`
  - `BEFORE INSERT OR UPDATE`
  - executa `public.set_class_name()`
- `trg_follow_ups_apply_incident_reset` em `public.follow_ups`
  - `AFTER INSERT OR UPDATE OF suspension_applied, date`
  - executa `public.apply_incident_reset_from_follow_up()`

### Trigger em script auxiliar (nao migration)
- `set_school_config_updated_at` em `public.school_config`
  - criado por `supabase/add_school_config.sql`
  - usa `public.set_updated_at()` (funcao nao versionada neste repositorio)

## 4.5 RLS e policies

### Policies finais explicitamente definidas nas migrations

#### `public.classes`
- `classes_select_authenticated` (SELECT): authenticated pode ler
- `classes_insert_admin_only` (INSERT): somente admin e `owner_id = auth.uid()`
- `classes_update_admin_only` (UPDATE): somente admin
- `classes_delete_admin_only` (DELETE): somente admin

#### `public.incidents`
- `incidents_select_authenticated` (SELECT): authenticated pode ler
- `incidents_insert_open_by_role` (INSERT): role em {admin,diretor,professor} e `owner_id = created_by = auth.uid()`
- `incidents_update_manage_by_role` (UPDATE): `can_manage_incident_class(class_id)`
- `incidents_delete_manage_by_role` (DELETE): `can_manage_incident_class(class_id)`

#### `public.follow_ups`
- `follow_ups_select_authenticated` (SELECT)
- `follow_ups_insert_manage_by_role` (INSERT): owner/created_by = auth.uid e permissao pela classe da ocorrencia
- `follow_ups_update_manage_by_role` (UPDATE): permissao pela classe da ocorrencia
- `follow_ups_delete_manage_by_role` (DELETE): permissao pela classe da ocorrencia

#### `public.comments`
- `comments_select_authenticated` (SELECT)
- `comments_insert_manage_by_role` (INSERT): owner + user_id coerente com auth.uid + permissao pela classe da ocorrencia
- `comments_delete_manage_by_role` (DELETE): permissao pela classe da ocorrencia

#### `public.students`
- `students_authenticated_access` (ALL): authenticated

#### `public.grades`
- `grades_authenticated_access` (ALL): authenticated

#### `public.attendance`
- `attendance_authenticated_access` (ALL): authenticated

#### `public.professional_subject_templates`
- `professional_subject_templates_authenticated_access` (ALL): authenticated

#### `public.professional_subjects`
- `professional_subjects_authenticated_access` (ALL): authenticated

#### `public.certificate_events`
- `certificate_events_select_by_role` (SELECT): admin ou owner
- `certificate_events_insert_own` (INSERT): owner = auth.uid
- `certificate_events_update_by_role` (UPDATE): admin ou owner
- `certificate_events_delete_by_role` (DELETE): admin ou owner

#### `public.certificate_event_students`
- `certificate_event_students_select_by_role` (SELECT): admin ou owner
- `certificate_event_students_insert_own` (INSERT): owner = auth.uid
- `certificate_event_students_update_by_role` (UPDATE): admin ou owner
- `certificate_event_students_delete_by_role` (DELETE): admin ou owner

#### `storage.objects` para bucket `school-assets`
- `school_assets_authenticated_select`
- `school_assets_authenticated_insert`
- `school_assets_authenticated_update`
- `school_assets_authenticated_delete`
- Todas limitadas por `bucket_id = 'school-assets'`

### Policies fora de migrations (script auxiliar)
- `school_config_authenticated_access` em `public.school_config` (ALL authenticated)
  - definida em `supabase/add_school_config.sql`

### Observacao importante de rastreabilidade
As migrations versionadas nao trazem definicoes explicitas de policy para:
- `public.authorized_emails`
- `public.profiles`
- `public.historical_grades`
- `public.external_assessments`

`supabase_trajectory_tables.sql` (script auxiliar) define policy `Allow all for authenticated` para `historical_grades` e `external_assessments`.

## 4.6 Storage

### Bucket
- `school-assets`
- `public = false`
- `file_size_limit = 5242880` (5MB)
- `allowed_mime_types = image/png, image/jpeg, image/webp, image/svg+xml`

### Uso no dominio
- `school_config.logo_storage_path`
- `school_config.certificate_frame_storage_path`

## 5) Edge Functions (contratos do codigo)

Fonte: `supabase/functions/*`.

### Observacao de seguranca para publicacao
- Este documento descreve contratos e comportamento.
- Nao inclui IDs de projeto, URL de ambiente, chaves, versoes operacionais ou timestamps de deploy.

## 5.1 `create-user`
- Endpoint: `POST/PUT/DELETE /functions/v1/create-user`
- CORS methods: `POST, OPTIONS, DELETE, PUT`
- Auth:
  - exige Bearer token
  - valida token via `adminClient.auth.getUser(accessToken)`
  - exige perfil `admin` em `public.profiles`
- Entrada minima:
  - `email` obrigatorio e valido para todos os metodos
  - `name` e `role` usados em `POST`/`PUT`

### Regras por metodo
- `POST` (criar usuario)
  - valida duplicidade em `authorized_emails`
  - tenta criar `auth.users` com `email_confirm: true` e metadata `{name, role}`
  - NAO usa senha
  - insere em `authorized_emails (email, role, display_name)`
  - upsert em `profiles` quando userId disponivel
  - se email duplicado: retorna `409` com `reason: email_exists`
- `PUT` (atualizar usuario)
  - atualiza `authorized_emails.role` e `authorized_emails.display_name`
  - procura usuario no Auth por email (pagina por pagina)
  - atualiza `profiles.role` e `profiles.name` quando encontrado
  - atualiza `auth.users.user_metadata`
- `DELETE` (remover usuario)
  - remove usuario de `auth.users` por email (se existir)
  - remove email de `authorized_emails`

### Status HTTP relevantes
- `200`: sucesso
- `400`: payload invalido (`invalid_json`, `invalid_email`, `auth_create_user_failed`)
- `401`: token ausente/invalido (`missing_bearer_header`, `empty_bearer_token`, `invalid_token`, `user_not_found`)
- `403`: nao autorizado (nao-admin)
- `409`: email ja cadastrado (`email_exists`)
- `500`: falhas internas de DB/ambiente

## 5.2 `send-incident-email`
- Endpoint: `POST /functions/v1/send-incident-email`
- CORS methods: `POST, OPTIONS`
- Dependencias: `nodemailer`
- Auth:
  - exige Bearer token
  - valida token via `adminClient.auth.getUser`
  - resolve papel por `profiles.role`

### Payload esperado
- `type`: `new_incident | incident_followup | incident_resolved`
- `incident.id` obrigatorio
- Demais campos sao reconciliados com banco antes de enviar

### Validacoes e autorizacao
- Carrega incidente real por `incident.id`
- Carrega turma (`classes`) e email do diretor (`director_email`)
- Permissao para envio:
  - `admin`: sempre
  - `diretor`: apenas se for diretor da turma (id ou email)
  - `professor`: apenas se criador da ocorrencia ou owner da ocorrencia

### Comportamento de envio
- Monta assunto/corpo com variacao por tipo e por `incident_type`
- Busca nomes dos alunos por `incident.student_ids`
- Usa SMTP (`SMTP_*`) e remetente `FROM_EMAIL`
- Se `APP_URL` existir, inclui CTA para `/acompanhamentos`

### Status HTTP relevantes
- `200`: enviado com sucesso (`{ ok: true, sent: true, ctaEnabled }`)
- `400`: payload incompleto ou email diretor nao configurado
- `401`: nao autenticado
- `403`: sem permissao
- `404`: ocorrencia nao encontrada
- `500`: erro interno/SMTP

## 6) Fluxos criticos do sistema

### 6.1 Gestao de usuarios (`/usuarios`)
- Frontend chama `create-user` via `fetch` direto no endpoint da function.
- Token de acesso e renovado automaticamente antes da chamada.
- Retry automatico em `401` com `refreshSession`.
- Erro de duplicidade de email retorna para a UI com mensagem e `reason`.

### 6.2 Certificados
- Criacao/edicao de evento com alunos usa RPC `save_certificate_event_atomic`.
- Se RPC nao existir no ambiente, frontend cai em fallback legado (update + inserts/deletes separados).
- Verificacao publica de certificado usa RPC `verify_certificate_code` (anon permitido).

### 6.3 Incidentes e reset disciplinar
- `follow_ups.suspension_applied = true` aciona trigger para marcar reset em `incidents`.
- Data de reset sempre protegida para nao ficar anterior a data da ocorrencia.
- Scope de inferencia retroativa corrigido para incidentes disciplinares apenas.

## 7) Scripts SQL auxiliares e observacoes de operacao

### 7.1 Scripts auxiliares fora de migrations
- `supabase/add_school_config.sql`
  - cria `school_config`
  - habilita RLS e policy authenticated
  - cria trigger `set_school_config_updated_at`
- `supabase_trajectory_tables.sql`
  - cria/ajusta `historical_grades` e `external_assessments`
  - habilita RLS e policy authenticated nessas tabelas

### 7.2 Scripts de validacao
- `supabase/tests/rls_smoke_test.sql` (smoke test de RLS para classes/incidents/follow_ups/comments)
- `supabase/manual/certificates_schema_healthcheck.sql` (healthcheck de schema de certificados)

## 8) Pontos de atencao de rastreabilidade
- `supabase/schema.sql` e declarado como "for context only" e nao contem todo o historico de RLS/funcoes/triggers.
- O estado final do banco depende de:
  - aplicacao completa das migrations em ordem
  - execucao dos scripts auxiliares quando o ambiente foi criado com esse fluxo
- Nao existe `supabase/config.toml` versionado neste repositorio.

---

Este documento representa o estado tecnico atual do sistema com base no codigo e SQL versionados no repositorio no momento desta atualizacao.
