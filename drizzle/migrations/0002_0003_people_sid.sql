-- 0003 · Pessoas, contatos, organizações, relações e conversas do SID.
-- Nota: sem "revoke all on all functions in schema private" aqui: o revoke global
-- removeria os EXECUTE concedidos a authenticated em 0001/0002. Revogações pontuais
-- já foram feitas por função em 0001; as funções novas abaixo recebem grant explícito.

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

-- revoke de public/anon nas funções novas (authenticated mantém EXECUTE via grant abaixo).
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