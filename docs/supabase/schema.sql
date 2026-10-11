-- ============================================================
-- Seed Connection · schema.sql (GERADO — não editar à mão)
-- Concatenação de docs/supabase/migrations/0001..0007.
-- Nota Lovable Cloud: buckets 'captures' (500MB) e 'sid-attachments'
-- (100MB) são criados pela Storage API; o INSERT em storage.buckets
-- abaixo vale para um Supabase externo auto-hospedado.
-- ============================================================


-- ================= 0001_foundation.sql =================

-- 0001 · Fundação: schema privado, enums, papéis da equipe, funções auxiliares.
-- Idempotente. NÃO executado. Revisar antes de aplicar em um Supabase NOVO e exclusivo.

-- Schema privado: NÃO deve ser adicionado aos "Exposed schemas" da API.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated; -- necessário para as políticas chamarem as funções

do $$ begin create type public.app_role as enum ('admin','gestor','operacional'); exception when duplicate_object then null; end $$;
do $$ begin create type public.visibility as enum ('privado','equipe','projeto'); exception when duplicate_object then null; end $$;
do $$ begin create type public.proximity as enum ('multidao','seguidor','discipulo','amigo_proximo','amigo_intimo'); exception when duplicate_object then null; end $$;
do $$ begin create type public.priority as enum ('alta','media','baixa'); exception when duplicate_object then null; end $$;
do $$ begin create type public.review_status as enum ('extraido','sugerido','aprovado','rejeitado'); exception when duplicate_object then null; end $$;
do $$ begin create type public.source_kind as enum ('manual','captura','sid','importacao','plaud','integracao'); exception when duplicate_object then null; end $$;

-- Papéis: um registro por usuário convidado. Sem papel = sem acesso a nada.
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (user_id)
);

-- Funções auxiliares (SECURITY DEFINER apenas no schema privado, search_path vazio).
create or replace function private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r where r.user_id = (select auth.uid())) $$;

create or replace function private.has_role(_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = _role) $$;

create or replace function private.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role in ('admin','gestor')) $$;

create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

-- owner_id só muda por admin.
create or replace function private.protect_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id and not private.has_role('admin') then
    raise exception 'owner_id só pode ser alterado por administrador';
  end if;
  return new;
end $$;

-- Limite: proprietário + 5 colaboradores (6 usuários) e nunca ficar sem admin.
create or replace function private.guard_user_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and (select count(*) from public.user_roles) >= 6 then
    raise exception 'Limite de 6 usuários (proprietário + 5) atingido';
  end if;
  if tg_op in ('UPDATE','DELETE') and old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'Não é permitido remover o último administrador';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_guard_user_roles on public.user_roles;
create trigger trg_guard_user_roles before insert or update or delete on public.user_roles
  for each row execute function private.guard_user_roles();

revoke all on all functions in schema private from public, anon;
grant execute on function private.is_member(), private.has_role(public.app_role), private.is_manager() to authenticated;

grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
revoke all on public.user_roles from anon;
alter table public.user_roles enable row level security;
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.has_role('admin'));
drop policy if exists user_roles_admin_insert on public.user_roles;
create policy user_roles_admin_insert on public.user_roles for insert to authenticated
  with check (private.has_role('admin') and granted_by = (select auth.uid()));
drop policy if exists user_roles_admin_update on public.user_roles;
create policy user_roles_admin_update on public.user_roles for update to authenticated
  using (private.has_role('admin')) with check (private.has_role('admin'));
drop policy if exists user_roles_admin_delete on public.user_roles;
create policy user_roles_admin_delete on public.user_roles for delete to authenticated
  using (private.has_role('admin'));

-- ================= 0002_projects_access.sql =================

-- 0002 · Projetos e regras centrais de acesso por owner/visibilidade.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text,
  status text not null default 'ativo' check (status in ('ativo','pausado','concluido')),
  progress int not null default 0 check (progress between 0 and 100),
  risk text,
  owner_id uuid not null default auth.uid() references auth.users(id),
  visibility public.visibility not null default 'equipe',
  project_id uuid generated always as (id) stored, -- permite reutilizar a mesma regra
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists project_members_user_idx on public.project_members(user_id);

create or replace function private.is_project_member(_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.project_members pm
                 where pm.project_id = _project and pm.user_id = (select auth.uid())) $$;

-- Leitura: privado = só dono; equipe = membros; projeto = membros do projeto.
-- Decisão: admin NÃO lê registros privados de outros (privacidade > conveniência).
create or replace function private.can_read(_owner uuid, _vis public.visibility, _project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_member() and (
    _owner = (select auth.uid())
    or _vis = 'equipe'
    or (_vis = 'projeto' and private.is_project_member(_project))
  ) $$;

-- Edição: dono, ou admin/gestor em registros não privados que consegue ler.
create or replace function private.can_write(_owner uuid, _vis public.visibility, _project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_member() and (
    _owner = (select auth.uid())
    or (_vis <> 'privado' and private.is_manager() and private.can_read(_owner, _vis, _project))
  ) $$;

-- Exclusão: dono, ou admin em registros não privados.
create or replace function private.can_delete(_owner uuid, _vis public.visibility, _project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_member() and (
    _owner = (select auth.uid())
    or (_vis <> 'privado' and private.has_role('admin') and private.can_read(_owner, _vis, _project))
  ) $$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.is_project_member(uuid),
  private.can_read(uuid, public.visibility, uuid),
  private.can_write(uuid, public.visibility, uuid),
  private.can_delete(uuid, public.visibility, uuid) to authenticated;

grant select, insert, update, delete on public.projects, public.project_members to authenticated;
grant all on public.projects, public.project_members to service_role;
revoke all on public.projects, public.project_members from anon;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id
                 and private.can_read(p.owner_id, p.visibility, p.id)));
drop policy if exists project_members_manage on public.project_members;
create policy project_members_manage on public.project_members for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id
                 and private.can_write(p.owner_id, p.visibility, p.id)))
  with check (exists (select 1 from public.projects p where p.id = project_id
                 and private.can_write(p.owner_id, p.visibility, p.id))
              and exists (select 1 from public.user_roles r where r.user_id = project_members.user_id));
-- Políticas de public.projects são aplicadas em 0006 (mesmo padrão das demais tabelas com dono).

-- ================= 0003_people_sid.sql =================

-- 0003 · Pessoas, contatos, organizações, relações e conversas do SID.

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',
  city text, company text, role text, sphere text,
  proximity public.proximity not null default 'multidao',
  priority public.priority not null default 'media',   -- separado de proximidade
  owner_id uuid not null default auth.uid() references auth.users(id),
  visibility public.visibility not null default 'privado',
  project_id uuid references public.projects(id) on delete set null,
  source public.source_kind not null default 'manual',
  last_interaction_at timestamptz, next_followup_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint people_project_chk check (visibility <> 'projeto' or project_id is not null)
);
create index if not exists people_owner_idx on public.people(owner_id);
create index if not exists people_visibility_idx on public.people(visibility, project_id);
create index if not exists people_followup_idx on public.people(next_followup_at);
create index if not exists people_name_idx on public.people(lower(name));

create table if not exists public.contact_methods (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  kind text not null check (kind in ('telefone','email','outro')),
  value_raw text not null, value_normalized text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists contact_methods_person_idx on public.contact_methods(person_id);
create index if not exists contact_methods_norm_idx on public.contact_methods(kind, value_normalized);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists organizations_name_uidx on public.organizations(lower(name));

create table if not exists public.people_organizations (
  person_id uuid not null references public.people(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  primary key (person_id, organization_id)
);
create index if not exists people_orgs_org_idx on public.people_organizations(organization_id);

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references public.people(id) on delete cascade,
  b uuid not null references public.people(id) on delete cascade,
  kind text, evidence text,
  status public.review_status not null default 'sugerido',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint relationships_distinct check (a <> b)
);
create index if not exists relationships_a_idx on public.relationships(a);
create index if not exists relationships_b_idx on public.relationships(b);

create table if not exists public.sid_conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  owner_id uuid not null default auth.uid() references auth.users(id),
  visibility public.visibility not null default 'privado',
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint sid_conv_project_chk check (visibility <> 'projeto' or project_id is not null)
);
create index if not exists sid_conversations_owner_idx on public.sid_conversations(owner_id, updated_at desc);

create table if not exists public.sid_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.sid_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  mode text check (mode in ('perguntar','registrar')),
  author_id uuid references auth.users(id), -- null para respostas do assistente (backend)
  content text not null default '',
  status text not null default 'concluido' check (status in ('pendente','processando','concluido','erro')),
  created_at timestamptz not null default now()
);
create index if not exists sid_messages_conv_idx on public.sid_messages(conversation_id, created_at);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.sid_messages(id) on delete cascade,
  kind text not null check (kind in ('arquivo','imagem','audio','video')),
  storage_path text not null unique,  -- <user_id>/<conversation_id>/<arquivo> no bucket sid-attachments
  mime text, size_bytes bigint check (size_bytes >= 0), content_hash text,
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists message_attachments_msg_idx on public.message_attachments(message_id);

create or replace function private.can_read_person(_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.people p where p.id = _id and private.can_read(p.owner_id, p.visibility, p.project_id)) $$;
create or replace function private.can_write_person(_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.people p where p.id = _id and private.can_write(p.owner_id, p.visibility, p.project_id)) $$;
create or replace function private.can_read_conversation(_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sid_conversations c where c.id = _id and private.can_read(c.owner_id, c.visibility, c.project_id)) $$;
create or replace function private.can_write_conversation(_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sid_conversations c where c.id = _id and private.can_write(c.owner_id, c.visibility, c.project_id)) $$;
create or replace function private.can_read_message(_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.sid_messages m where m.id = _id and private.can_read_conversation(m.conversation_id)) $$;

-- Revoke pontual (o revoke global em schema private removeria EXECUTE já
-- concedido a authenticated em 0001/0002; manter EXECUTE é obrigatório).
revoke execute on function private.can_read_person(uuid), private.can_write_person(uuid),
  private.can_read_conversation(uuid), private.can_write_conversation(uuid), private.can_read_message(uuid)
  from public, anon;
grant execute on function private.can_read_person(uuid), private.can_write_person(uuid),
  private.can_read_conversation(uuid), private.can_write_conversation(uuid), private.can_read_message(uuid) to authenticated;

grant select, insert, update, delete on public.people, public.contact_methods, public.organizations,
  public.people_organizations, public.relationships, public.sid_conversations to authenticated;
grant select, insert on public.sid_messages, public.message_attachments to authenticated;
grant delete on public.message_attachments to authenticated;
grant all on public.people, public.contact_methods, public.organizations, public.people_organizations,
  public.relationships, public.sid_conversations, public.sid_messages, public.message_attachments to service_role;
revoke all on public.people, public.contact_methods, public.organizations, public.people_organizations,
  public.relationships, public.sid_conversations, public.sid_messages, public.message_attachments from anon;

alter table public.people enable row level security;
alter table public.contact_methods enable row level security;
alter table public.organizations enable row level security;
alter table public.people_organizations enable row level security;
alter table public.relationships enable row level security;
alter table public.sid_conversations enable row level security;
alter table public.sid_messages enable row level security;
alter table public.message_attachments enable row level security;

-- Organizações: referência compartilhada entre membros.
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations for select to authenticated using (private.is_member());
drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations for insert to authenticated
  with check (private.is_member() and created_by = (select auth.uid()));
drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations for update to authenticated
  using (private.is_member() and (created_by = (select auth.uid()) or private.is_manager()))
  with check (private.is_member());
drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations for delete to authenticated using (private.has_role('admin'));

-- Relações: ler exige acesso às duas pessoas; escrever exige editar A e ler B.
drop policy if exists relationships_select on public.relationships;
create policy relationships_select on public.relationships for select to authenticated
  using (private.can_read_person(a) and private.can_read_person(b));
drop policy if exists relationships_write on public.relationships;
create policy relationships_write on public.relationships for all to authenticated
  using (private.can_write_person(a) and private.can_read_person(b))
  with check (private.can_write_person(a) and private.can_read_person(b));

-- Mensagens: usuário só insere mensagens próprias de papel 'user'; respostas vêm do backend (service_role).
drop policy if exists sid_messages_select on public.sid_messages;
create policy sid_messages_select on public.sid_messages for select to authenticated
  using (private.can_read_conversation(conversation_id));
drop policy if exists sid_messages_insert on public.sid_messages;
create policy sid_messages_insert on public.sid_messages for insert to authenticated
  with check (role = 'user' and author_id = (select auth.uid()) and private.can_write_conversation(conversation_id));

drop policy if exists message_attachments_select on public.message_attachments;
create policy message_attachments_select on public.message_attachments for select to authenticated
  using (private.can_read_message(message_id));
drop policy if exists message_attachments_insert on public.message_attachments;
create policy message_attachments_insert on public.message_attachments for insert to authenticated
  with check (uploaded_by = (select auth.uid())
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and exists (select 1 from public.sid_messages m where m.id = message_id
                and m.author_id = (select auth.uid()) and private.can_write_conversation(m.conversation_id)));
drop policy if exists message_attachments_delete on public.message_attachments;
create policy message_attachments_delete on public.message_attachments for delete to authenticated
  using (uploaded_by = (select auth.uid()));

-- ================= 0004_captures_knowledge.sql =================

-- 0004 · Capturas, transcrições, jobs, interações e fatos (com origem e status de revisão).

create table if not exists public.captures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  visibility public.visibility not null default 'privado',
  project_id uuid references public.projects(id) on delete set null,
  source public.source_kind not null default 'manual',
  kind text not null check (kind in ('audio','arquivo','foto','nota','plaud','video')),
  status text not null default 'esperando'
    check (status in ('esperando','enviando','processando','revisar','concluido','erro')),
  title text, note text,
  captured_at timestamptz, received_at timestamptz not null default now(),
  storage_path text unique,   -- <user_id>/<capture_id>/<arquivo> no bucket captures
  mime text, size_bytes bigint check (size_bytes >= 0), content_hash text,
  external_id text, error text,
  source_message_id uuid references public.sid_messages(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint captures_project_chk check (visibility <> 'projeto' or project_id is not null),
  constraint captures_external_uq unique (owner_id, source, external_id)
);
create index if not exists captures_owner_idx on public.captures(owner_id, received_at desc);
create index if not exists captures_status_idx on public.captures(status);
create index if not exists captures_hash_idx on public.captures(owner_id, content_hash);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references public.captures(id) on delete cascade,
  text text, segments jsonb, provider text, language text,
  status public.review_status not null default 'extraido',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists transcripts_capture_idx on public.transcripts(capture_id);

-- Somente o backend (service_role) cria/atualiza jobs; membros só leem.
create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid not null references public.captures(id) on delete cascade,
  step text not null, status text not null default 'pendente'
    check (status in ('pendente','executando','concluido','erro')),
  attempts int not null default 0, last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists processing_jobs_capture_idx on public.processing_jobs(capture_id);
create index if not exists processing_jobs_status_idx on public.processing_jobs(status, created_at);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  occurred_at timestamptz, kind text check (kind in ('reuniao','ligacao','mensagem','nota','captura')),
  summary text, confidence numeric check (confidence between 0 and 1),
  source public.source_kind not null default 'manual',
  source_capture_id uuid references public.captures(id) on delete set null,
  source_message_id uuid references public.sid_messages(id) on delete set null,
  status public.review_status not null default 'aprovado',
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  author_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists interactions_person_idx on public.interactions(person_id, occurred_at desc);

create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  kind text not null check (kind in ('necessidade','habilidade','recurso','outro')),
  text text not null,
  is_inference boolean not null default false, -- separa fato de inferência
  confidence numeric check (confidence between 0 and 1),
  source public.source_kind not null default 'manual',
  source_capture_id uuid references public.captures(id) on delete set null,
  source_message_id uuid references public.sid_messages(id) on delete set null,
  status public.review_status not null default 'sugerido',
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  author_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists facts_person_idx on public.facts(person_id, status);

create or replace function private.can_read_capture(_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.captures c where c.id = _id and private.can_read(c.owner_id, c.visibility, c.project_id)) $$;
create or replace function private.can_write_capture(_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.captures c where c.id = _id and private.can_write(c.owner_id, c.visibility, c.project_id)) $$;
-- Revoke pontual (o revoke global removeria EXECUTE de authenticated; mantê-lo é obrigatório).
revoke execute on function private.can_read_capture(uuid), private.can_write_capture(uuid) from public, anon;
grant execute on function private.can_read_capture(uuid), private.can_write_capture(uuid) to authenticated;

grant select, insert, update, delete on public.captures, public.transcripts, public.interactions, public.facts to authenticated;
grant select on public.processing_jobs to authenticated;
grant all on public.captures, public.transcripts, public.processing_jobs, public.interactions, public.facts to service_role;
revoke all on public.captures, public.transcripts, public.processing_jobs, public.interactions, public.facts from anon;

alter table public.captures enable row level security;
alter table public.transcripts enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.interactions enable row level security;
alter table public.facts enable row level security;

-- Caminho do arquivo precisa estar na pasta do próprio usuário.
drop policy if exists captures_path_restrict on public.captures;
create policy captures_path_restrict on public.captures as restrictive for insert to authenticated
  with check (storage_path is null or split_part(storage_path, '/', 1) = (select auth.uid())::text);

drop policy if exists processing_jobs_select on public.processing_jobs;
create policy processing_jobs_select on public.processing_jobs for select to authenticated
  using (private.can_read_capture(capture_id));

-- ================= 0005_work_imports_audit.sql =================

-- 0005 · Oportunidades, tarefas, follow-ups, importações e auditoria.

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null, need text, resources text, third_party text,
  scores jsonb not null default '{}'::jsonb,
  recommendation text check (recommendation in ('RESOLVER','CONECTAR','ADIAR','ENCERRAR')),
  decision text, status text not null default 'aberta' check (status in ('aberta','em_decisao','decidida')),
  review_at date,
  source public.source_kind not null default 'manual',
  source_capture_id uuid references public.captures(id) on delete set null,
  owner_id uuid not null default auth.uid() references auth.users(id),
  visibility public.visibility not null default 'equipe',
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint opportunities_project_chk check (visibility <> 'projeto' or project_id is not null)
);
create index if not exists opportunities_owner_idx on public.opportunities(owner_id, status);

create table if not exists public.opportunity_people (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  primary key (opportunity_id, person_id)
);
create index if not exists opportunity_people_person_idx on public.opportunity_people(person_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'a_fazer' check (status in ('a_fazer','fazendo','aguardando','feito')),
  priority public.priority not null default 'media',
  due_date date, completed_at timestamptz,
  assignee_id uuid references auth.users(id),
  person_id uuid references public.people(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  source public.source_kind not null default 'manual',
  source_message_id uuid references public.sid_messages(id) on delete set null,
  owner_id uuid not null default auth.uid() references auth.users(id),
  visibility public.visibility not null default 'equipe',
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint tasks_project_chk check (visibility <> 'projeto' or project_id is not null)
);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id, status, due_date);
create index if not exists tasks_owner_idx on public.tasks(owner_id, status);

create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  reason text, due_date date, result text, done_at timestamptz,
  assignee_id uuid references auth.users(id),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists followups_person_idx on public.followups(person_id, due_date);
create index if not exists followups_assignee_idx on public.followups(assignee_id, due_date);

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  file_name text, row_count int,
  status text not null default 'revisar' check (status in ('revisar','aplicado','descartado')),
  owner_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete cascade,
  raw jsonb not null,
  action text check (action in ('criar','mesclar','ignorar')),
  person_id uuid references public.people(id) on delete set null,
  result text,
  created_at timestamptz not null default now()
);
create index if not exists import_rows_import_idx on public.import_rows(import_id);

-- Auditoria: só triggers escrevem; só admin lê; ninguém altera/apaga.
-- Decisão LGPD: registra NOMES das colunas alteradas, nunca os valores.
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid, table_name text not null, row_id text, action text not null,
  changed_columns text[], at timestamptz not null default now()
);
create index if not exists audit_log_at_idx on public.audit_log(at desc);
create index if not exists audit_log_row_idx on public.audit_log(table_name, row_id);

create or replace function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cols text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(n.key) into cols from jsonb_each(to_jsonb(new)) n
      where n.value is distinct from (to_jsonb(old) -> n.key);
  end if;
  insert into public.audit_log(actor_id, table_name, row_id, action, changed_columns)
  values ((select auth.uid()), tg_table_name,
          coalesce(to_jsonb(coalesce(new, old)) ->> 'id', null), tg_op, cols);
  return coalesce(new, old);
end $$;
revoke all on function private.audit() from public, anon, authenticated;

create or replace function private.can_read_import(_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.imports i where i.id = _id and i.owner_id = (select auth.uid())) and private.is_member() $$;
-- Revoke pontual (o revoke global removeria EXECUTE de authenticated; mantê-lo é obrigatório).
revoke execute on function private.can_read_import(uuid) from public, anon;
grant execute on function private.can_read_import(uuid) to authenticated;

grant select, insert, update, delete on public.opportunities, public.opportunity_people, public.tasks,
  public.followups, public.imports, public.import_rows to authenticated;
grant select on public.audit_log to authenticated;
grant all on public.opportunities, public.opportunity_people, public.tasks, public.followups,
  public.imports, public.import_rows, public.audit_log to service_role;
revoke all on public.opportunities, public.opportunity_people, public.tasks, public.followups,
  public.imports, public.import_rows, public.audit_log from anon;

alter table public.opportunities enable row level security;
alter table public.opportunity_people enable row level security;
alter table public.tasks enable row level security;
alter table public.followups enable row level security;
alter table public.imports enable row level security;
alter table public.import_rows enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists audit_log_admin_select on public.audit_log;
create policy audit_log_admin_select on public.audit_log for select to authenticated using (private.has_role('admin'));

-- Responsável pela tarefa pode ler e atualizar mesmo sem ser dono.
drop policy if exists tasks_assignee_select on public.tasks;
create policy tasks_assignee_select on public.tasks for select to authenticated
  using (private.is_member() and assignee_id = (select auth.uid()));
drop policy if exists tasks_assignee_update on public.tasks;
create policy tasks_assignee_update on public.tasks for update to authenticated
  using (private.is_member() and assignee_id = (select auth.uid()))
  with check (private.is_member() and assignee_id = (select auth.uid()));

-- Follow-ups: via pessoa, ou responsável.
drop policy if exists followups_select on public.followups;
create policy followups_select on public.followups for select to authenticated
  using (private.can_read_person(person_id) or (private.is_member() and assignee_id = (select auth.uid())));
drop policy if exists followups_write on public.followups;
create policy followups_write on public.followups for all to authenticated
  using (private.can_write_person(person_id) or (private.is_member() and assignee_id = (select auth.uid())))
  with check (private.can_write_person(person_id) or (private.is_member() and assignee_id = (select auth.uid())));

drop policy if exists opportunity_people_select on public.opportunity_people;
create policy opportunity_people_select on public.opportunity_people for select to authenticated
  using (private.can_read_person(person_id) and exists (select 1 from public.opportunities o
    where o.id = opportunity_id and private.can_read(o.owner_id, o.visibility, o.project_id)));
drop policy if exists opportunity_people_write on public.opportunity_people;
create policy opportunity_people_write on public.opportunity_people for all to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id
    and private.can_write(o.owner_id, o.visibility, o.project_id)))
  with check (private.can_read_person(person_id) and exists (select 1 from public.opportunities o
    where o.id = opportunity_id and private.can_write(o.owner_id, o.visibility, o.project_id)));

-- Importações: estritamente do autor.
drop policy if exists imports_owner on public.imports;
create policy imports_owner on public.imports for all to authenticated
  using (private.is_member() and owner_id = (select auth.uid()))
  with check (private.is_member() and owner_id = (select auth.uid()));
drop policy if exists import_rows_owner on public.import_rows;
create policy import_rows_owner on public.import_rows for all to authenticated
  using (private.can_read_import(import_id))
  with check (private.can_read_import(import_id) and (person_id is null or private.can_write_person(person_id)));

-- ================= 0006_policies_triggers_storage.sql =================

-- 0006 · Políticas padronizadas, triggers (updated_at, owner, auditoria) e Storage privado.

-- Tabelas com dono + visibilidade.
do $$
declare t text;
begin
  foreach t in array array['projects','people','captures','opportunities','tasks','sid_conversations'] loop
    execute format('drop policy if exists %1$s_select on public.%1$I', t);
    execute format('create policy %1$s_select on public.%1$I for select to authenticated
      using (private.can_read(owner_id, visibility, project_id))', t);
    execute format('drop policy if exists %1$s_insert on public.%1$I', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated
      with check (private.is_member() and owner_id = (select auth.uid())
        and (visibility <> %2$L or %3$s))', t, 'projeto',
      case when t = 'projects' then 'true' else 'private.is_project_member(project_id)' end);
    execute format('drop policy if exists %1$s_update on public.%1$I', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated
      using (private.can_write(owner_id, visibility, project_id))
      with check (private.can_write(owner_id, visibility, project_id))', t);
    execute format('drop policy if exists %1$s_delete on public.%1$I', t);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated
      using (private.can_delete(owner_id, visibility, project_id))', t);
    execute format('drop trigger if exists trg_protect_owner on public.%I', t);
    execute format('create trigger trg_protect_owner before update on public.%I
      for each row execute function private.protect_owner()', t);
  end loop;
end $$;

-- Tabelas filhas de pessoa / captura: herdam acesso do registro pai.
do $$
declare r record;
begin
  for r in select * from (values
      ('contact_methods','person_id','person'),
      ('people_organizations','person_id','person'),
      ('interactions','person_id','person'),
      ('facts','person_id','person'),
      ('transcripts','capture_id','capture')) v(tbl, col, parent) loop
    execute format('drop policy if exists %1$s_select on public.%1$I', r.tbl);
    execute format('create policy %1$s_select on public.%1$I for select to authenticated
      using (private.can_read_%3$s(%2$I))', r.tbl, r.col, r.parent);
    execute format('drop policy if exists %1$s_write on public.%1$I', r.tbl);
    execute format('create policy %1$s_write on public.%1$I for all to authenticated
      using (private.can_write_%3$s(%2$I)) with check (private.can_write_%3$s(%2$I))', r.tbl, r.col, r.parent);
  end loop;
end $$;

-- updated_at
do $$
declare t text;
begin
  foreach t in array array['projects','people','contact_methods','organizations','relationships',
    'sid_conversations','captures','transcripts','processing_jobs','interactions','facts',
    'opportunities','tasks','followups','imports'] loop
    execute format('drop trigger if exists trg_updated_at on public.%I', t);
    execute format('create trigger trg_updated_at before update on public.%I
      for each row execute function private.set_updated_at()', t);
  end loop;
end $$;

-- Auditoria
do $$
declare t text;
begin
  foreach t in array array['user_roles','projects','project_members','people','contact_methods',
    'relationships','captures','facts','interactions','opportunities','tasks','followups',
    'imports','sid_conversations','message_attachments'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I
      for each row execute function private.audit()', t);
  end loop;
end $$;

-- ===== Storage privado =====
insert into storage.buckets (id, name, public, file_size_limit)
values ('captures','captures', false, 524288000),
       ('sid-attachments','sid-attachments', false, 104857600)
on conflict (id) do update set public = false;

create or replace function private.can_read_object(_bucket text, _name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case _bucket
    when 'captures' then exists (select 1 from public.captures c where c.storage_path = _name
                                 and private.can_read(c.owner_id, c.visibility, c.project_id))
    when 'sid-attachments' then exists (select 1 from public.message_attachments a where a.storage_path = _name
                                 and private.can_read_message(a.message_id))
    else false end $$;
revoke all on all functions in schema private from public, anon;
grant execute on function private.can_read_object(text, text) to authenticated;

-- Upload apenas na pasta <auth.uid()>/...
drop policy if exists seed_objects_insert on storage.objects;
create policy seed_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('captures','sid-attachments') and private.is_member()
              and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Leitura: próprio arquivo, ou arquivo referenciado por registro que o usuário pode ler.
drop policy if exists seed_objects_select on storage.objects;
create policy seed_objects_select on storage.objects for select to authenticated
  using (bucket_id in ('captures','sid-attachments') and private.is_member()
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or private.can_read_object(bucket_id, name)));
-- Exclusão: só o dono do arquivo. Sem UPDATE (arquivos imutáveis).
drop policy if exists seed_objects_delete on storage.objects;
create policy seed_objects_delete on storage.objects for delete to authenticated
  using (bucket_id in ('captures','sid-attachments') and private.is_member()
         and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ================= 0007_bootstrap_admin.sql =================

-- 0007 · Bootstrap auditável do primeiro administrador.
-- Executável SOMENTE no SQL Editor (role postgres). Não exposto à API.
-- Uso, após convidar o proprietário em Authentication → Users → Invite:
--   select private.bootstrap_first_admin('email-do-proprietario@exemplo.com');

create or replace function private.bootstrap_first_admin(_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  if exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'Já existe administrador; use o fluxo normal de convites';
  end if;
  select id into uid from auth.users where lower(email) = lower(_email);
  if uid is null then raise exception 'Usuário não encontrado; convide-o primeiro'; end if;
  insert into public.user_roles(user_id, role, granted_by) values (uid, 'admin', uid);
  insert into public.audit_log(actor_id, table_name, row_id, action, changed_columns)
  values (uid, 'user_roles', uid::text, 'BOOTSTRAP_ADMIN', array['role']);
  return uid;
end $$;
revoke all on function private.bootstrap_first_admin(text) from public, anon, authenticated, service_role;
